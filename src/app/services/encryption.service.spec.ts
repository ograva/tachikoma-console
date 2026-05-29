import { TestBed } from '@angular/core/testing';
import { EncryptionService } from './encryption.service';

/**
 * AUTH-002: Save API Credentials Safely
 * Covers encrypt/decrypt roundtrip, empty-value handling, and key isolation.
 * Uses the browser's SubtleCrypto API directly — no mocking needed.
 */
describe('EncryptionService (AUTH-002)', () => {
  let service: EncryptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EncryptionService] });
    service = TestBed.inject(EncryptionService);
  });

  // ── Roundtrip integrity ────────────────────────────────────────────────────

  describe('encrypt / decrypt roundtrip', () => {
    it('should decrypt to the original plaintext for the same userId', async () => {
      const key = 'AIzaSy-test-key-1234567890abcdef';
      const userId = 'user-001';

      const encrypted = await service.encrypt(key, userId);
      const decrypted = await service.decrypt(encrypted, userId);

      expect(decrypted).toBe(key);
    });

    it('should produce different ciphertext on each encryption (random IV)', async () => {
      const key = 'same-plaintext';
      const userId = 'user-001';

      const enc1 = await service.encrypt(key, userId);
      const enc2 = await service.encrypt(key, userId);

      expect(enc1).not.toBe(enc2);
    });

    it('should handle long API keys correctly', async () => {
      const longKey = 'A'.repeat(500);
      const userId = 'user-long';

      const encrypted = await service.encrypt(longKey, userId);
      const decrypted = await service.decrypt(encrypted, userId);

      expect(decrypted).toBe(longKey);
    });
  });

  // ── Empty / null guards ────────────────────────────────────────────────────

  describe('empty value handling', () => {
    it('should return empty string when encrypting empty input', async () => {
      const result = await service.encrypt('', 'user-x');
      expect(result).toBe('');
    });

    it('should return empty string when decrypting empty input', async () => {
      const result = await service.decrypt('', 'user-x');
      expect(result).toBe('');
    });
  });

  // ── Wrong userId fails decryption ─────────────────────────────────────────

  describe('key isolation', () => {
    it('should fail to decrypt when a different userId is used', async () => {
      const key = 'secret-api-key';
      const encrypted = await service.encrypt(key, 'user-A');

      await expectAsync(
        service.decrypt(encrypted, 'user-B')
      ).toBeRejectedWithError(/decrypt/i);
    });
  });

  // ── Invalid ciphertext ────────────────────────────────────────────────────

  describe('malformed ciphertext', () => {
    it('should throw when given non-base64 garbage', async () => {
      await expectAsync(
        service.decrypt('not-valid-base64!!!', 'user-x')
      ).toBeRejected();
    });

    it('should throw when ciphertext is too short (no IV)', async () => {
      const tooShort = btoa('tiny'); // less than 12-byte IV
      await expectAsync(
        service.decrypt(tooShort, 'user-x')
      ).toBeRejected();
    });
  });
});
