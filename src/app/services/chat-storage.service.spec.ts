import { TestBed } from '@angular/core/testing';
import { ChatStorageService } from './chat-storage.service';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { AgentProfileModel } from '../models/agent-profile.model';
import { ChatSessionModel } from '../models/chat-session.model';

/**
 * CHAT-001: Start a New Chat with Context — creation and metadata persistence
 * CHAT-002: Resume and Manage Saved Chats — restore, switch, edit, delete
 * CHAT-003: Export Conversation Records — filename sanitization + export helpers
 */
describe('ChatStorageService (CHAT-001/002/003)', () => {
  let service: ChatStorageService;
  let mockFirestore: jasmine.SpyObj<FirestoreService>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  const isRealUser = { value: false };

  beforeEach(() => {
    localStorage.clear();

    mockFirestore = jasmine.createSpyObj('FirestoreService', ['saveDocument', 'getDocuments', 'deleteDocument']);
    mockFirestore.saveDocument.and.returnValue(Promise.resolve());
    mockFirestore.getDocuments.and.returnValue(Promise.resolve([]));
    mockFirestore.deleteDocument.and.returnValue(Promise.resolve());

    mockAuth = jasmine.createSpyObj('AuthService', ['isRealUser']);
    mockAuth.isRealUser.and.callFake(() => isRealUser.value);

    TestBed.configureTestingModule({
      providers: [
        ChatStorageService,
        { provide: FirestoreService, useValue: mockFirestore },
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(ChatStorageService);
  });

  afterEach(() => localStorage.clear());

  // ── CHAT-001: createNewChat ────────────────────────────────────────────────

  describe('createNewChat', () => {
    it('should create a session with a generated id', async () => {
      const chat = await service.createNewChat();
      expect(chat.id).toBeTruthy();
      expect(chat.id).toMatch(/^chat_/);
    });

    it('should use provided title', async () => {
      const chat = await service.createNewChat('My Test Chat');
      expect(chat.title).toBe('My Test Chat');
    });

    it('should generate a default title when none is given', async () => {
      const chat = await service.createNewChat();
      expect(chat.title).toBeTruthy();
    });

    it('should store a description when provided', async () => {
      const chat = await service.createNewChat('T', [], 'Context description');
      expect(chat.description).toBe('Context description');
    });

    it('should set the new chat as current', async () => {
      const chat = await service.createNewChat('First');
      expect(service.getCurrentChatId()).toBe(chat.id);
    });

    it('should include the participating agents snapshot', async () => {
      const agents = AgentProfileModel.getDefaults().slice(0, 2);
      const chat = await service.createNewChat('W/agents', agents);
      expect(chat.participatingAgents.length).toBe(2);
    });

    it('should persist to localStorage immediately', async () => {
      await service.createNewChat('Persisted');
      const stored = JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]');
      expect(stored.some((s: any) => s.title === 'Persisted')).toBeTrue();
    });

    it('should start with an empty messages array', async () => {
      const chat = await service.createNewChat();
      expect(chat.messages).toEqual([]);
    });

    it('should NOT call Firestore for anonymous users', async () => {
      isRealUser.value = false;
      await service.createNewChat();
      expect(mockFirestore.saveDocument).not.toHaveBeenCalled();
    });

    it('should call Firestore for authenticated users', async () => {
      isRealUser.value = true;
      await service.createNewChat();
      expect(mockFirestore.saveDocument).toHaveBeenCalled();
    });
  });

  // ── CHAT-002: switchToChat ────────────────────────────────────────────────

  describe('switchToChat', () => {
    it('should return the chat and set it as current', async () => {
      const first = await service.createNewChat('First');
      const second = await service.createNewChat('Second');

      const switched = service.switchToChat(first.id);
      expect(switched?.id).toBe(first.id);
      expect(service.getCurrentChatId()).toBe(first.id);
    });

    it('should return null for an unknown id', () => {
      expect(service.switchToChat('nonexistent')).toBeNull();
    });
  });

  // ── CHAT-002: updateChatTitle / updateChatDescription / updateChatMetadata

  describe('metadata updates', () => {
    it('should update the title', async () => {
      const chat = await service.createNewChat('Old Title');
      await service.updateChatTitle(chat.id, 'New Title');
      expect(service.getChatById(chat.id)?.title).toBe('New Title');
    });

    it('should update the description', async () => {
      const chat = await service.createNewChat('T', [], 'old desc');
      await service.updateChatDescription(chat.id, 'new desc');
      expect(service.getChatById(chat.id)?.description).toBe('new desc');
    });

    it('should update both title and description atomically', async () => {
      const chat = await service.createNewChat('T');
      await service.updateChatMetadata(chat.id, 'Final Title', 'Final Desc');
      const updated = service.getChatById(chat.id);
      expect(updated?.title).toBe('Final Title');
      expect(updated?.description).toBe('Final Desc');
    });

    it('should persist metadata updates to localStorage', async () => {
      const chat = await service.createNewChat('Before');
      await service.updateChatTitle(chat.id, 'After');
      const stored = JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]');
      expect(stored.some((s: any) => s.title === 'After')).toBeTrue();
    });
  });

  // ── CHAT-002: deleteChat ──────────────────────────────────────────────────

  describe('deleteChat', () => {
    it('should remove the chat from the list', async () => {
      const chat = await service.createNewChat('Delete Me');
      await service.deleteChat(chat.id);
      expect(service.getChatById(chat.id)).toBeUndefined();
    });

    it('should switch current chat to another when the current is deleted', async () => {
      const a = await service.createNewChat('A');
      const b = await service.createNewChat('B');
      expect(service.getCurrentChatId()).toBe(b.id);

      await service.deleteChat(b.id);
      expect(service.getCurrentChatId()).toBe(a.id);
    });

    it('should set current to null when the last chat is deleted', async () => {
      await service.clearAllChats();
      const only = await service.createNewChat('Only');
      await service.deleteChat(only.id);
      expect(service.getCurrentChatId()).toBeNull();
    });

    it('should call Firestore deleteDocument for authenticated users', async () => {
      isRealUser.value = true;
      const chat = await service.createNewChat('Gone');
      await service.deleteChat(chat.id);
      expect(mockFirestore.deleteDocument).toHaveBeenCalledWith('chat_sessions', chat.id);
    });
  });

  // ── CHAT-002: getSessions ordering ───────────────────────────────────────

  describe('getSessions', () => {
    it('should return all created sessions', async () => {
      await service.clearAllChats();
      await service.createNewChat('Alpha');
      await service.createNewChat('Beta');
      expect(service.getSessions().length).toBe(2);
    });
  });

  // ── CHAT-002: loadFromCloud ───────────────────────────────────────────────

  describe('loadFromCloud', () => {
    it('should do nothing for anonymous users', async () => {
      isRealUser.value = false;
      await service.loadFromCloud();
      expect(mockFirestore.getDocuments).not.toHaveBeenCalled();
    });

    it('should merge cloud-only chats for authenticated users', async () => {
      isRealUser.value = true;
      const cloudChat = ChatSessionModel.create('Cloud Chat');
      mockFirestore.getDocuments.and.returnValue(Promise.resolve([cloudChat]));

      await service.clearAllChats();
      await service.loadFromCloud();

      expect(service.getSessions().some(s => s.id === cloudChat.id)).toBeTrue();
    });

    it('should not duplicate chats that already exist locally', async () => {
      isRealUser.value = true;
      const local = await service.createNewChat('Local');
      mockFirestore.getDocuments.and.returnValue(Promise.resolve([local]));

      const countBefore = service.getSessions().length;
      await service.loadFromCloud();
      expect(service.getSessions().length).toBe(countBefore);
    });
  });

  // ── CHAT-003: exportChat / filename sanitization ─────────────────────────

  describe('exportChat', () => {
    it('should return a JSON string of the chat', async () => {
      const chat = await service.createNewChat('Export Me');
      const exported = service.exportChat(chat.id);
      const parsed = JSON.parse(exported);
      expect(parsed.title).toBe('Export Me');
    });

    it('should return empty string for an unknown chat id', () => {
      expect(service.exportChat('no-such-id')).toBe('');
    });
  });

  describe('importChat', () => {
    it('should import a valid chat JSON and add it to sessions', async () => {
      const chat = await service.createNewChat('Import Source');
      const json = service.exportChat(chat.id);
      const countBefore = service.getSessions().length;

      const ok = service.importChat(json);
      expect(ok).toBeTrue();
      expect(service.getSessions().length).toBe(countBefore + 1);
    });

    it('should return false for malformed JSON', () => {
      expect(service.importChat('not json')).toBeFalse();
    });

    it('should return false for JSON missing required fields', () => {
      expect(service.importChat(JSON.stringify({ title: 'bad' }))).toBeFalse();
    });

    it('should assign a new id to avoid collision with the source', async () => {
      const chat = await service.createNewChat('Original');
      const json = service.exportChat(chat.id);
      service.importChat(json);
      const sessions = service.getSessions();
      const ids = sessions.map(s => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // ── CHAT-002: clearLocalStorage ───────────────────────────────────────────

  describe('clearLocalStorage', () => {
    it('should empty the sessions list', async () => {
      await service.createNewChat('X');
      service.clearLocalStorage();
      expect(service.getSessions().length).toBe(0);
    });

    it('should return the number of chats cleared', async () => {
      await service.clearAllChats();
      await service.createNewChat('A');
      await service.createNewChat('B');
      const cleared = service.clearLocalStorage();
      expect(cleared).toBe(2);
    });

    it('should set currentChatId to null', async () => {
      await service.createNewChat('X');
      service.clearLocalStorage();
      expect(service.getCurrentChatId()).toBeNull();
    });
  });
});
