import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { FirestoreService } from './services/firestore.service';
import { ChatStorageService } from './services/chat-storage.service';
import { AgentProfileService } from './services/agent-profile.service';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockFirestoreService: jasmine.SpyObj<FirestoreService>;
  let mockChatStorageService: jasmine.SpyObj<ChatStorageService>;
  let mockAgentProfileService: jasmine.SpyObj<AgentProfileService>;

  beforeEach(async () => {
    // Create mock services
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isRealUser',
      'user',
      'isLoading',
      'isAuthenticated'
    ]);
    
    mockFirestoreService = jasmine.createSpyObj('FirestoreService', [
      'getDocuments'
    ]);
    
    mockChatStorageService = jasmine.createSpyObj('ChatStorageService', [
      'getSessions',
      'loadFromCloud'
    ]);
    
    mockAgentProfileService = jasmine.createSpyObj('AgentProfileService', [
      'getProfiles',
      'loadFromCloud'
    ]);

    // Setup default mock behaviors
    (mockAuthService as any).user = signal(null);
    (mockAuthService as any).isLoading = signal(true);
    (mockAuthService as any).isAuthenticated = signal(false);
    mockAuthService.isRealUser.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: FirestoreService, useValue: mockFirestoreService },
        { provide: ChatStorageService, useValue: mockChatStorageService },
        { provide: AgentProfileService, useValue: mockAgentProfileService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have correct title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Tachikoma Console');
  });

  it('should skip sync for anonymous users', async () => {
    mockAuthService.isRealUser.and.returnValue(false);
    (mockAuthService as any).user = signal({ uid: 'anon123', email: null, displayName: null, photoURL: null });
    (mockAuthService as any).isLoading = signal(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Wait for async operations
    await fixture.whenStable();
    
    // Should not call firestore methods for anonymous users
    expect(mockFirestoreService.getDocuments).not.toHaveBeenCalled();
  });

  it('should check and sync Firestore data for authenticated users', async () => {
    mockAuthService.isRealUser.and.returnValue(true);
    (mockAuthService as any).user = signal({ 
      uid: 'user123', 
      email: 'test@example.com', 
      displayName: 'Test User', 
      photoURL: null 
    });
    (mockAuthService as any).isLoading = signal(false);

    // Mock localStorage data
    mockChatStorageService.getSessions.and.returnValue([]);
    mockAgentProfileService.getProfiles.and.returnValue([]);

    // Mock Firestore data
    mockFirestoreService.getDocuments.and.returnValues(
      Promise.resolve([{ id: 'chat1', title: 'Test Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() }]),
      Promise.resolve([{ id: 'agent1', name: 'Test Agent', createdAt: Date.now(), updatedAt: Date.now() }])
    );

    mockChatStorageService.loadFromCloud.and.returnValue(Promise.resolve());
    mockAgentProfileService.loadFromCloud.and.returnValue(Promise.resolve());

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Wait for async operations
    await fixture.whenStable();
    
    // Should call sync methods
    expect(mockFirestoreService.getDocuments).toHaveBeenCalledWith('chat_sessions');
    expect(mockFirestoreService.getDocuments).toHaveBeenCalledWith('agent_profiles');
  });

  it('should not sync if all data already in localStorage', async () => {
    mockAuthService.isRealUser.and.returnValue(true);
    (mockAuthService as any).user = signal({ 
      uid: 'user123', 
      email: 'test@example.com', 
      displayName: 'Test User', 
      photoURL: null 
    });
    (mockAuthService as any).isLoading = signal(false);

    const existingChat = { 
      id: 'chat1', 
      title: 'Test Chat', 
      messages: [], 
      conversationSummary: '',
      participatingAgents: [],
      createdAt: Date.now(), 
      updatedAt: Date.now() 
    };
    
    const existingAgent = { 
      id: 'agent1', 
      name: 'Test Agent',
      color: 'test',
      hex: '#fff',
      temp: 0.5,
      system: 'test',
      role: 'chatter' as const,
      status: 'idle' as const,
      createdAt: Date.now(), 
      updatedAt: Date.now() 
    };

    // Mock localStorage already has the data
    mockChatStorageService.getSessions.and.returnValue([existingChat]);
    mockAgentProfileService.getProfiles.and.returnValue([existingAgent]);

    // Mock Firestore has same data
    mockFirestoreService.getDocuments.and.returnValues(
      Promise.resolve([existingChat]),
      Promise.resolve([existingAgent])
    );

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Wait for async operations
    await fixture.whenStable();
    
    // Should not call loadFromCloud since data already exists
    expect(mockChatStorageService.loadFromCloud).not.toHaveBeenCalled();
    expect(mockAgentProfileService.loadFromCloud).not.toHaveBeenCalled();
  });
});
