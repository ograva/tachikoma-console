import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService, AuthUser } from './services/auth.service';
import { FirestoreService } from './services/firestore.service';
import { ChatStorageService } from './services/chat-storage.service';
import { AgentProfileService } from './services/agent-profile.service';
import { signal, WritableSignal } from '@angular/core';

describe('AppComponent', () => {
  let mockAuthService: Partial<AuthService> & jasmine.SpyObj<Pick<AuthService, 'isRealUser'>>;
  let mockFirestoreService: jasmine.SpyObj<FirestoreService>;
  let mockChatStorageService: jasmine.SpyObj<ChatStorageService>;
  let mockAgentProfileService: jasmine.SpyObj<AgentProfileService>;
  
  // Writable signals for test control
  let userSignal: WritableSignal<AuthUser | null>;
  let isLoadingSignal: WritableSignal<boolean>;
  let isAuthenticatedSignal: WritableSignal<boolean>;

  beforeEach(async () => {
    // Create writable signals that we can control in tests
    userSignal = signal(null);
    isLoadingSignal = signal(true);
    isAuthenticatedSignal = signal(false);
    
    // Create mock services
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isRealUser']);
    
    // Setup signal properties properly typed
    mockAuthService = {
      ...authServiceSpy,
      user: userSignal,
      isLoading: isLoadingSignal,
      isAuthenticated: isAuthenticatedSignal
    };
    
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
    userSignal.set({ uid: 'anon123', email: null, displayName: null, photoURL: null });
    isLoadingSignal.set(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Wait for async operations
    await fixture.whenStable();
    
    // Should not call firestore methods for anonymous users
    expect(mockFirestoreService.getDocuments).not.toHaveBeenCalled();
  });

  it('should check and sync Firestore data for authenticated users', async () => {
    mockAuthService.isRealUser.and.returnValue(true);
    userSignal.set({ 
      uid: 'user123', 
      email: 'test@example.com', 
      displayName: 'Test User', 
      photoURL: null 
    });
    isLoadingSignal.set(false);

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
    userSignal.set({ 
      uid: 'user123', 
      email: 'test@example.com', 
      displayName: 'Test User', 
      photoURL: null 
    });
    isLoadingSignal.set(false);

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
