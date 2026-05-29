import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { EncryptionService } from './encryption.service';
import { signal } from '@angular/core';

/**
 * AUTH-002: Save API Credentials Safely
 * Covers key validation path, save/restore, local-first write,
 * and encrypted cloud write. Firebase writes are mocked.
 */
describe('UserProfileService (AUTH-002)', () => {
  let service: UserProfileService;
  let mockFirestore: jasmine.SpyObj<FirestoreService>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockEncryption: jasmine.SpyObj<EncryptionService>;

  const isAuthenticatedSig = signal(false);
  const userSig = signal<any>(null);
  const isRealUserResult = { value: false };

  beforeEach(() => {
    localStorage.clear();

    mockFirestore = jasmine.createSpyObj('FirestoreService', [
      'getDocument',
      'saveDocument',
    ]);
    mockFirestore.getDocument.and.returnValue(Promise.resolve(null));
    mockFirestore.saveDocument.and.returnValue(Promise.resolve());

    mockAuth = jasmine.createSpyObj('AuthService', ['isRealUser'], {
      user: userSig,
      isAuthenticated: isAuthenticatedSig,
    });
    mockAuth.isRealUser.and.callFake(() => isRealUserResult.value);

    mockEncryption = jasmine.createSpyObj('EncryptionService', [
      'encrypt',
      'decrypt',
    ]);
    mockEncryption.encrypt.and.returnValue(Promise.resolve('encrypted-key'));
    mockEncryption.decrypt.and.returnValue(Promise.resolve('decrypted-key'));

    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: FirestoreService, useValue: mockFirestore },
        { provide: AuthService, useValue: mockAuth },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    });

    service = TestBed.inject(UserProfileService);
  });

  afterEach(() => {
    localStorage.clear();
    isRealUserResult.value = false; // reset shared mutable state between tests
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should return default username when no profile is loaded', () => {
      expect(service.getChatUsername()).toBe('USER');
    });

    it('should return empty API key when no profile is loaded', () => {
      expect(service.getGeminiApiKey()).toBe('');
    });
  });

  // ── validateGeminiApiKey ───────────────────────────────────────────────────

  describe('validateGeminiApiKey', () => {
    it('should reject empty key without making a network request', async () => {
      spyOn(window, 'fetch');
      const result = await service.validateGeminiApiKey('');
      expect(result.valid).toBeFalse();
      expect(result.error).toMatch(/empty|invalid/i);
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only key', async () => {
      spyOn(window, 'fetch');
      const result = await service.validateGeminiApiKey('   ');
      expect(result.valid).toBeFalse();
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should return valid:false when the API responds with 400', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ error: { message: 'API_KEY_INVALID' } }), { status: 400 }))
      );
      const result = await service.validateGeminiApiKey('bad-key');
      expect(result.valid).toBeFalse();
      expect(result.error).toBeTruthy();
    });

    it('should return valid:true when the API responds with 200', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      );
      const result = await service.validateGeminiApiKey('AIzaSy-valid');
      expect(result.valid).toBeTrue();
    });

    it('should return valid:false and surface error message on network failure', async () => {
      spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network offline')));
      const result = await service.validateGeminiApiKey('AIzaSy-x');
      expect(result.valid).toBeFalse();
      expect(result.error).toContain('Network offline');
    });
  });

  // ── updateGeminiApiKey — validation gate ───────────────────────────────────

  describe('updateGeminiApiKey', () => {
    it('should throw when given an invalid key', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response('{}', { status: 403 }))
      );
      await expectAsync(service.updateGeminiApiKey('bad')).toBeRejected();
    });
  });

  // ── local-first write ──────────────────────────────────────────────────────

  describe('updateProfile — local-first', () => {
    it('should write to localStorage before attempting Firestore', async () => {
      service.createAnonymousProfile();
      const setSpy = spyOn(localStorage, 'setItem').and.callThrough();

      await service.updateChatUsername('TACHIKOMA');

      expect(setSpy).toHaveBeenCalled();
      // Firestore not called for anonymous user
      expect(mockFirestore.saveDocument).not.toHaveBeenCalled();
    });

    it('should update the in-memory profile signal immediately', async () => {
      service.createAnonymousProfile();
      await service.updateChatUsername('GHOST');
      expect(service.getChatUsername()).toBe('GHOST');
    });
  });

  // ── cloud write with encryption ────────────────────────────────────────────

  describe('cloud write', () => {
    it('should encrypt API key before saving to Firestore', async () => {
      isRealUserResult.value = true;
      service.createAnonymousProfile();

      // Bypass validateGeminiApiKey for this test
      spyOn(service, 'validateGeminiApiKey').and.returnValue(
        Promise.resolve({ valid: true })
      );

      await service.updateProfile({ geminiApiKey: 'AIzaSy-test' });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith('AIzaSy-test', jasmine.any(String));
      expect(mockFirestore.saveDocument).toHaveBeenCalled();

      const saved = mockFirestore.saveDocument.calls.mostRecent().args[1] as any;
      // Plain key must NOT appear in the Firestore document
      expect(saved.geminiApiKey).toBeUndefined();
      expect(saved.geminiApiKeyEncrypted).toBe('encrypted-key');
    });

    it('should not call Firestore when user is not authenticated', async () => {
      isRealUserResult.value = false;
      service.createAnonymousProfile();
      await service.updateDisplayName('Ghost');
      expect(mockFirestore.saveDocument).not.toHaveBeenCalled();
    });
  });

  // ── cloud failure does not block local usage ───────────────────────────────

  describe('cloud failure resilience', () => {
    it('should still update local profile even when Firestore throws', async () => {
      isRealUserResult.value = true;
      mockFirestore.saveDocument.and.returnValue(Promise.reject(new Error('Firestore down')));
      service.createAnonymousProfile();

      await expectAsync(service.updateDisplayName('Offline User')).toBeRejected();

      // But local state was updated before the throw
      expect(service.profile()?.displayName).toBe('Offline User');
    });
  });

  // ── createAnonymousProfile ─────────────────────────────────────────────────

  describe('createAnonymousProfile', () => {
    it('should create a profile without email', () => {
      const profile = service.createAnonymousProfile();
      expect(profile).toBeTruthy();
      expect(profile.email).toBeFalsy();
    });

    it('should persist the anonymous profile to localStorage', () => {
      service.createAnonymousProfile();
      const stored = localStorage.getItem('tachikoma_user_profile');
      expect(stored).toBeTruthy();
    });
  });
});
