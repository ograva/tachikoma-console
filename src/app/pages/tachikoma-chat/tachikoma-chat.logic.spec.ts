import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { TachikomaChatComponent } from './tachikoma-chat.component';
import { AgentProfileService } from '../../services/agent-profile.service';
import { ChatStorageService } from '../../services/chat-storage.service';
import { UserProfileService } from '../../services/user-profile.service';
import { AuthService } from '../../services/auth.service';
import { AgentProfileModel } from '../../models/agent-profile.model';
import { ChatSessionModel } from '../../models/chat-session.model';
import { provideRouter } from '@angular/router';

/**
 * ORCH-001: Round-Robin Agent Cycles — shuffle + ordering determinism
 * ORCH-002: Silence and Synthesis Rules — isSilent classification
 * ORCH-003: Share Chat and File Context — buildConversationHistory context assembly
 * ORCH-004: Handle Failed Persona Steps — addFailedStepCard output
 * OPER-001: Token and Cost Estimates — formatTokenCount + formatCostEstimate
 * OPER-003: Prevent Context Overflow — round-based windowing in buildConversationHistory
 * CHAT-003: Export Filename Sanitization — getSafeFilename edge cases
 */
describe('TachikomaChatComponent — pure logic (ORCH/OPER/CHAT-003)', () => {
  let component: TachikomaChatComponent;

  const fakeSession = ChatSessionModel.create('Test Chat');
  const fakeProfiles = AgentProfileModel.getDefaults();

  beforeEach(async () => {
    const mockAgentProfileService = jasmine.createSpyObj('AgentProfileService', ['getProfiles']);
    mockAgentProfileService.getProfiles.and.returnValue(fakeProfiles);

    const mockChatStorage = jasmine.createSpyObj('ChatStorageService', [
      'getCurrentChat',
      'getCurrentChatId',
      'getSessions',
      'createNewChat',
      'updateCurrentChat',
      'updateChatTitle',
      'switchToChat',
    ]);
    mockChatStorage.getCurrentChat.and.returnValue(fakeSession);
    mockChatStorage.getCurrentChatId.and.returnValue(fakeSession.id);
    mockChatStorage.getSessions.and.returnValue([fakeSession]);
    mockChatStorage.createNewChat.and.returnValue(Promise.resolve(fakeSession));
    mockChatStorage.updateCurrentChat.and.returnValue(Promise.resolve());
    mockChatStorage.updateChatTitle.and.returnValue(Promise.resolve());
    mockChatStorage.switchToChat.and.returnValue(fakeSession);

    const mockUserProfile = jasmine.createSpyObj('UserProfileService', [
      'getChatUsername', 'getGeminiApiKey', 'getGeminiModel',
    ], {
      profile: signal(null),
    });
    mockUserProfile.getChatUsername.and.returnValue('USER');
    mockUserProfile.getGeminiApiKey.and.returnValue('');
    mockUserProfile.getGeminiModel.and.returnValue('gemini-3.5-flash');

    const mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isRealUser'], {
      user: signal(null),
      isAuthenticated: signal(false),
      isLoading: signal(false),
    });
    mockAuth.isRealUser.and.returnValue(false);

    const mockDialogRef = { afterClosed: () => of(null), close: jasmine.createSpy('close') };
    const mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue(mockDialogRef);

    // Prevent the explainer-dialog setTimeout from firing after the test completes
    localStorage.setItem('tachikoma_chat_explainer_seen', 'true');

    await TestBed.configureTestingModule({
      imports: [TachikomaChatComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AgentProfileService, useValue: mockAgentProfileService },
        { provide: ChatStorageService, useValue: mockChatStorage },
        { provide: UserProfileService, useValue: mockUserProfile },
        { provide: AuthService, useValue: mockAuth },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TachikomaChatComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges — we're testing logic only, not the template
  });

  afterEach(() => localStorage.clear());

  // ── ORCH-001: shuffle ──────────────────────────────────────────────────────

  describe('shuffle (ORCH-001)', () => {
    it('should return all original elements', () => {
      const arr = ['A', 'B', 'C', 'D', 'E'];
      const shuffled = component.shuffle([...arr]);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should return an array of the same length', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(component.shuffle([...arr]).length).toBe(arr.length);
    });

    it('should mutate and return the same array reference', () => {
      const arr = [1, 2, 3];
      const result = component.shuffle(arr);
      expect(result).toBe(arr);
    });

    it('should handle empty array', () => {
      expect(component.shuffle([])).toEqual([]);
    });

    it('should handle single-element array', () => {
      expect(component.shuffle(['only'])).toEqual(['only']);
    });
  });

  // ── ORCH-002: silence classification ──────────────────────────────────────

  describe('silence classification (ORCH-002)', () => {
    it('addMessage should record a message with messageType "normal" by default', () => {
      component.messages = [];
      component.addMessage('AGENT', 'Hello', false, 'agent-1');
      expect(component.messages[0].messageType).toBe('normal');
    });

    it('addMessage should record a user message correctly', () => {
      component.messages = [];
      component.addMessage('USER', 'Question?', true);
      expect(component.messages[0].isUser).toBeTrue();
      expect(component.messages[0].sender).toBe('USER');
    });
  });

  // ── ORCH-004: addFailedStepCard ────────────────────────────────────────────

  describe('addFailedStepCard (ORCH-004)', () => {
    it('should add a failed-step message for generic errors', () => {
      component.messages = [];
      (component as any).addFailedStepCard('LOGIKOMA', 'logikoma', 'error', 3);

      expect(component.messages.length).toBe(1);
      const card = component.messages[0];
      expect(card.messageType).toBe('failed-step');
      expect(card.sender).toBe('LOGIKOMA');
      expect(card.retryCount).toBe(3);
    });

    it('should add a rate-limit message for quota errors', () => {
      component.messages = [];
      (component as any).addFailedStepCard('GHOST-1', 'ghost', 'rate-limit', 3);

      const card = component.messages[0];
      expect(card.messageType).toBe('rate-limit');
      expect(card.text).toContain('quota');
    });

    it('should include actionable text for generic errors', () => {
      component.messages = [];
      (component as any).addFailedStepCard('MODERATOR', 'mod', 'error', 1);

      expect(component.messages[0].text).toContain('processing error');
    });

    it('should not set isUser on failed-step cards', () => {
      component.messages = [];
      (component as any).addFailedStepCard('X', 'x', 'error', 1);
      expect(component.messages[0].isUser).toBeFalse();
    });

    it('should record the correct retryCount', () => {
      component.messages = [];
      (component as any).addFailedStepCard('X', 'x', 'error', 5);
      expect(component.messages[0].retryCount).toBe(5);
    });
  });

  // ── ORCH-003: buildConversationHistory ────────────────────────────────────

  describe('buildConversationHistory (ORCH-003)', () => {
    it('should return new-conversation placeholder when no messages', () => {
      component.messages = [];
      expect(component.buildConversationHistory()).toContain('New conversation');
    });

    it('should include user messages in history', () => {
      component.messages = [{
        id: '1', sender: 'USER', text: 'Hello world', html: 'Hello world',
        isUser: true, timestamp: Date.now(), roundId: 0,
      }];
      component.agents = [];
      const history = component.buildConversationHistory();
      expect(history).toContain('Hello world');
    });

    it('should include agent messages in history', () => {
      component.agents = fakeProfiles.map(p => ({ ...p, status: 'idle' as const }));
      component.messages = [{
        id: '2', sender: 'LOGIKOMA', text: 'Analysis complete', html: '',
        isUser: false, agentId: 'logikoma', timestamp: Date.now(), roundId: 0,
      }];
      const history = component.buildConversationHistory();
      expect(history).toContain('Analysis complete');
    });

    it('should include file context when files are uploaded', () => {
      // Need at least one message so buildConversationHistory doesn't return
      // the empty-conversation placeholder before appending file content
      component.messages = [{ id: '1', sender: 'USER', text: 'Hi', html: '', isUser: true, timestamp: 1, roundId: 0 }];
      component.agents = [];
      (component as any).uploadedFiles.set([{ name: 'data.txt', content: 'important data', type: 'text/plain' }]);
      const history = component.buildConversationHistory();
      expect(history).toContain('data.txt');
      expect(history).toContain('important data');
      // Reset
      (component as any).uploadedFiles.set([]);
    });
  });

  // ── OPER-003: round-based context windowing ───────────────────────────────

  describe('context windowing (OPER-003)', () => {
    it('should include active round in full detail and older rounds compacted', () => {
      component.agents = fakeProfiles.map(p => ({ ...p, status: 'idle' as const }));
      component.currentRoundId = 1;
      component.messages = [
        { id: '1', sender: 'USER', text: 'Q1', html: '', isUser: true, timestamp: 1, roundId: 0 },
        { id: '2', sender: 'MODERATOR', text: 'Summary1', html: '', isUser: false, agentId: 'moderator', timestamp: 2, roundId: 0 },
        { id: '3', sender: 'USER', text: 'Q2', html: '', isUser: true, timestamp: 3, roundId: 1 },
        { id: '4', sender: 'LOGIKOMA', text: 'Brainstorming2', html: '', isUser: false, agentId: 'logikoma', timestamp: 4, roundId: 1 },
      ];
      const history = component.buildConversationHistory();
      // Compacted round 0 should have USER and MODERATOR
      expect(history).toContain('USER: Q1');
      expect(history).toContain('MODERATOR (Moderator): Summary1');
      // Active round 1 should have USER and chatter brainstorming
      expect(history).toContain('Round 1 (Active)');
      expect(history).toContain('USER: Q2');
      expect(history).toContain('LOGIKOMA: Brainstorming2');
    });

    it('should fall back to including chatter responses if no moderator is found for older rounds', () => {
      component.agents = fakeProfiles.map(p => ({ ...p, status: 'idle' as const }));
      component.currentRoundId = 1;
      component.messages = [
        { id: '1', sender: 'USER', text: 'Q1', html: '', isUser: true, timestamp: 1, roundId: 0 },
        { id: '2', sender: 'LOGIKOMA', text: 'Brainstorming1', html: '', isUser: false, agentId: 'logikoma', timestamp: 2, roundId: 0 },
        { id: '3', sender: 'USER', text: 'Q2', html: '', isUser: true, timestamp: 3, roundId: 1 },
      ];
      const history = component.buildConversationHistory();
      expect(history).toContain('USER: Q1');
      expect(history).toContain('LOGIKOMA: Brainstorming1');
    });
  });

  // ── OPER-001: formatTokenCount ────────────────────────────────────────────

  describe('formatTokenCount (OPER-001)', () => {
    it('should format millions with M suffix', () => {
      expect(component.formatTokenCount(1048576)).toContain('M');
    });

    it('should format thousands with K suffix', () => {
      expect(component.formatTokenCount(8192)).toContain('K');
    });

    it('should return plain number for small counts', () => {
      expect(component.formatTokenCount(500)).toBe('500');
    });

    it('should handle exactly 1M', () => {
      expect(component.formatTokenCount(1000000)).toBe('1.0M');
    });

    it('should handle exactly 1K', () => {
      expect(component.formatTokenCount(1000)).toBe('1.0K');
    });
  });

  // ── OPER-001: formatCostEstimate ──────────────────────────────────────────

  describe('formatCostEstimate (OPER-001)', () => {
    it('should show < $0.001 for tiny costs', () => {
      expect(component.formatCostEstimate(0.0001)).toBe('< $0.001');
    });

    it('should format non-tiny costs with ~ prefix', () => {
      expect(component.formatCostEstimate(0.005)).toContain('~$');
    });

    it('should show 4 decimal places', () => {
      const result = component.formatCostEstimate(0.0123456);
      expect(result).toContain('0.0123');
    });
  });

  // ── CHAT-003: getSafeFilename ─────────────────────────────────────────────

  describe('getSafeFilename (CHAT-003)', () => {
    it('should produce a filename with the given extension', () => {
      const name = (component as any).getSafeFilename('pdf');
      expect(name).toMatch(/\.pdf$/);
    });

    it('should include today\'s date in the filename', () => {
      const today = new Date().toISOString().slice(0, 10);
      const name = (component as any).getSafeFilename('txt');
      expect(name).toContain(today);
    });

    it('should strip special characters from the title', () => {
      // The chat mock returns title "Test Chat"
      const name = (component as any).getSafeFilename('txt');
      expect(name).not.toMatch(/[^a-z0-9\-_.]/);
    });

    it('should replace spaces with dashes', () => {
      const name = (component as any).getSafeFilename('txt');
      expect(name).not.toContain(' ');
    });
  });

  // ── OPER-001: round cost tracking ─────────────────────────────────────────

  describe('round cost tracking (OPER-001)', () => {
    it('should have no estimate for a round that has not been finalized', () => {
      expect(component.getRoundEstimate(999)).toBeUndefined();
    });

    it('should record estimate after finalizeRoundCostEstimate', () => {
      (component as any).currentRoundInputTokens = 1000;
      (component as any).currentRoundOutputTokens = 500;
      component.currentRoundId = 42;
      (component as any).finalizeRoundCostEstimate();

      const estimate = component.getRoundEstimate(42);
      expect(estimate).toBeTruthy();
      expect(estimate!.inputTokens).toBe(1000);
      expect(estimate!.outputTokens).toBe(500);
      expect(estimate!.estimatedCostUSD).toBeGreaterThan(0);
    });

    it('should reset token counters to zero after finalizing', () => {
      (component as any).currentRoundInputTokens = 2000;
      (component as any).currentRoundOutputTokens = 1000;
      (component as any).finalizeRoundCostEstimate();
      expect((component as any).currentRoundInputTokens).toBe(0);
      expect((component as any).currentRoundOutputTokens).toBe(0);
    });
  });

  // ── CHAT-004: unreadCount ─────────────────────────────────────────────────

  describe('unreadCount (CHAT-004)', () => {
    it('should return 0 when no messages', () => {
      component.messages = [];
      expect(component.unreadCount()).toBe(0);
    });

    it('should count messages after the last read index', () => {
      component.messages = Array.from({ length: 5 }, (_, i) => ({
        id: String(i), sender: 'A', text: 'T', html: '', isUser: false, timestamp: i,
      }));
      (component as any).lastReadIndex.set(2);
      expect(component.unreadCount()).toBe(2);
    });

    it('should return 0 when all messages have been read', () => {
      component.messages = [{ id: '1', sender: 'A', text: 'T', html: '', isUser: false, timestamp: 1 }];
      (component as any).lastReadIndex.set(0);
      expect(component.unreadCount()).toBe(0);
    });
  });
});
