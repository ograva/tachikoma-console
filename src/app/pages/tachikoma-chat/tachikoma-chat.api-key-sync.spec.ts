import { TestBed, fakeAsync, tick, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NEVER } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { TachikomaChatComponent } from './tachikoma-chat.component';
import { ApiKeySyncDialogComponent } from './api-key-sync-dialog.component';
import { AgentProfileService } from '../../services/agent-profile.service';
import { ChatStorageService } from '../../services/chat-storage.service';
import { UserProfileService } from '../../services/user-profile.service';
import { AuthService } from '../../services/auth.service';
import { AgentProfileModel } from '../../models/agent-profile.model';
import { ChatSessionModel } from '../../models/chat-session.model';

/**
 * A1 (STABILISATION_TRIAGE.md): the "Save API Key to Profile?" dialog must be
 * offered to real (non-guest) users only, and at most once per sign-in.
 */
describe('TachikomaChatComponent — API-key sync dialog (A1)', () => {
  let fixture: ComponentFixture<TachikomaChatComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let authUser: WritableSignal<{ email: string | null } | null>;
  let profile: WritableSignal<{ geminiApiKey?: string } | null>;

  const syncDialogOpens = () =>
    dialog.open.calls.allArgs().filter(([cmp]) => cmp === ApiKeySyncDialogComponent).length;

  beforeEach(async () => {
    authUser = signal(null);
    profile = signal(null);

    const session = ChatSessionModel.create('Test Chat');
    const agents = jasmine.createSpyObj('AgentProfileService', ['getProfiles']);
    agents.getProfiles.and.returnValue(AgentProfileModel.getDefaults());

    const chats = jasmine.createSpyObj('ChatStorageService', [
      'getCurrentChat', 'getCurrentChatId', 'getSessions', 'createNewChat',
      'updateCurrentChat', 'updateChatTitle', 'switchToChat',
    ]);
    chats.getCurrentChat.and.returnValue(session);
    chats.getCurrentChatId.and.returnValue(session.id);
    chats.getSessions.and.returnValue([session]);

    // The profile and auth mocks read real signals so the effect tracks them as the app does.
    const userProfile = jasmine.createSpyObj('UserProfileService', [
      'getChatUsername', 'getGeminiApiKey', 'getGeminiModel',
    ], { profile });
    userProfile.getChatUsername.and.returnValue('USER');
    userProfile.getGeminiApiKey.and.callFake(() => profile()?.geminiApiKey || '');
    userProfile.getGeminiModel.and.returnValue('models/gemini-3.5-flash');

    const auth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isRealUser'], {
      user: authUser,
      isLoading: signal(false),
    });
    auth.isAuthenticated.and.callFake(() => authUser() !== null);
    auth.isRealUser.and.callFake(() => {
      const user = authUser();
      return user !== null && user.email !== null && !user.email.startsWith('anonymous');
    });

    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    // The dialog stays open (as it does while the user reads it), so nothing
    // records a decision that would mask a second open.
    dialog.open.and.returnValue({ afterClosed: () => NEVER, close: () => {} } as any);

    localStorage.setItem('tachikoma_chat_explainer_seen', 'true');
    localStorage.setItem('gemini_api_key', 'AIza-local-key');

    await TestBed.configureTestingModule({
      imports: [TachikomaChatComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AgentProfileService, useValue: agents },
        { provide: ChatStorageService, useValue: chats },
        { provide: UserProfileService, useValue: userProfile },
        { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TachikomaChatComponent);
    // The standalone component imports MatDialogModule, so it holds its own
    // MatDialog instance: spy on that one rather than the root provider.
    const componentDialog = (fixture.componentInstance as any).dialog as MatDialog;
    if (componentDialog !== dialog) {
      spyOn(componentDialog, 'open').and.returnValue({ afterClosed: () => NEVER, close: () => {} } as any);
      dialog = componentDialog as jasmine.SpyObj<MatDialog>;
    }
  });

  afterEach(() => localStorage.clear());

  /** Run change detection (which runs the component's effects), then let the dialog's 1 s settle delay elapse. */
  function settle(): void {
    fixture.detectChanges();
    tick(1500);
  }

  it('does not offer the dialog to an anonymous guest with a local key', fakeAsync(() => {
    authUser.set({ email: null });
    settle();
    expect(syncDialogOpens()).toBe(0);
  }));

  it('offers the dialog once to a real user with a local key and no profile key', fakeAsync(() => {
    authUser.set({ email: 'major@section9.test' });
    settle();
    expect(syncDialogOpens()).toBe(1);
  }));

  it('does not open a second dialog when the profile signal changes after sign-in', fakeAsync(() => {
    authUser.set({ email: 'major@section9.test' });
    settle();
    // The profile loads after sign-in (still no key): with tracked reads this re-fired the effect.
    profile.set({});
    settle();
    profile.set({ geminiApiKey: '' });
    settle();
    expect(syncDialogOpens()).toBe(1);
  }));
});
