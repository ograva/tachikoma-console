import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

/**
 * AUTH-001: Sign In and Resume
 * Firebase Auth state transitions require real network access; those belong in
 * E2E (T000-T004). Unit scope covers session state defaults, first-login
 * detection, sync callback, and logout-adjacent helpers — all testable
 * without a live Firebase connection.
 *
 * Auth is deliberately NOT provided so the service self-configures in
 * degraded mode (firebaseConfigured = false), which is the safe baseline
 * for unit testing pure business logic.
 */
describe('AuthService (AUTH-001)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService],
      // Auth intentionally omitted — service catches the missing dep gracefully
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  // ── Degraded-mode initial state ────────────────────────────────────────────

  describe('initial state (Firebase not configured)', () => {
    it('should be unauthenticated', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should not be loading', () => {
      expect(service.isLoading()).toBeFalse();
    });

    it('should have no error', () => {
      expect(service.error()).toBeNull();
    });

    it('should not flag first login', () => {
      expect(service.firstLogin()).toBeFalse();
    });

    it('isFirebaseConfigured should return false', () => {
      expect(service.isFirebaseConfigured()).toBeFalse();
    });

    it('getCurrentUserId should return null', () => {
      expect(service.getCurrentUserId()).toBeNull();
    });

    it('isRealUser should return false', () => {
      expect(service.isRealUser()).toBeFalse();
    });
  });

  // ── signInWithEmail throws user-friendly error ────────────────────────────

  describe('signInWithEmail (unconfigured)', () => {
    it('should reject with a human-readable message', async () => {
      await expectAsync(
        service.signInWithEmail('a@b.com', 'pw')
      ).toBeRejectedWithError(/not configured/i);
    });

    it('should set error signal on failure', async () => {
      await service.signInWithEmail('a@b.com', 'pw').catch(() => {});
      expect(service.error()).toBeTruthy();
    });
  });

  // ── signInAsGuest (unconfigured) ───────────────────────────────────────────

  describe('signInAsGuest (unconfigured)', () => {
    it('should reject with a human-readable message', async () => {
      await expectAsync(service.signInAsGuest()).toBeRejectedWithError(/not configured/i);
    });
  });

  // ── checkForLocalData / firstLogin ────────────────────────────────────────

  describe('first-login detection', () => {
    it('should flag firstLogin when chat sessions exist in localStorage', () => {
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{ id: 'c1' }]));
      (service as any).checkForLocalData();
      expect(service.firstLogin()).toBeTrue();
    });

    it('should flag firstLogin when agent profiles exist in localStorage', () => {
      localStorage.setItem('tachikoma_agent_profiles', JSON.stringify([{ id: 'a1' }]));
      (service as any).checkForLocalData();
      expect(service.firstLogin()).toBeTrue();
    });

    it('should not flag firstLogin when localStorage is empty', () => {
      (service as any).checkForLocalData();
      expect(service.firstLogin()).toBeFalse();
    });
  });

  // ── clearFirstLogin ────────────────────────────────────────────────────────

  describe('clearFirstLogin', () => {
    it('should reset the firstLogin flag to false', () => {
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{}]));
      (service as any).checkForLocalData();
      expect(service.firstLogin()).toBeTrue();

      service.clearFirstLogin();
      expect(service.firstLogin()).toBeFalse();
    });
  });

  // ── setSyncCallback / syncData ─────────────────────────────────────────────

  describe('syncData', () => {
    it('should invoke the registered callback with the chosen strategy', async () => {
      const cb = jasmine.createSpy('syncCb').and.returnValue(Promise.resolve());
      service.setSyncCallback(cb);

      await service.syncData('merge');

      expect(cb).toHaveBeenCalledOnceWith('merge');
    });

    it('should invoke callback with cloud-to-local strategy', async () => {
      const cb = jasmine.createSpy('syncCb').and.returnValue(Promise.resolve());
      service.setSyncCallback(cb);
      await service.syncData('cloud-to-local');
      expect(cb).toHaveBeenCalledOnceWith('cloud-to-local');
    });

    it('should invoke callback with local-to-cloud strategy', async () => {
      const cb = jasmine.createSpy('syncCb').and.returnValue(Promise.resolve());
      service.setSyncCallback(cb);
      await service.syncData('local-to-cloud');
      expect(cb).toHaveBeenCalledOnceWith('local-to-cloud');
    });

    it('should clear firstLogin after sync completes', async () => {
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{}]));
      (service as any).checkForLocalData();

      const cb = jasmine.createSpy('syncCb').and.returnValue(Promise.resolve());
      service.setSyncCallback(cb);

      await service.syncData('merge');
      expect(service.firstLogin()).toBeFalse();
    });

    it('should do nothing (not throw) when no callback is registered', async () => {
      await expectAsync(service.syncData('merge')).toBeResolved();
    });
  });

  // ── clearError ─────────────────────────────────────────────────────────────

  describe('clearError', () => {
    it('should reset error signal to null', async () => {
      await service.signInWithEmail('x@y.com', 'pw').catch(() => {});
      expect(service.error()).toBeTruthy();

      service.clearError();
      expect(service.error()).toBeNull();
    });
  });
});
