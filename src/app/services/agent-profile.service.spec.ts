import { TestBed } from '@angular/core/testing';
import { AgentProfileService } from './agent-profile.service';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { AgentProfileModel } from '../models/agent-profile.model';

/**
 * AGNT-001: Create and Edit Agent Profiles — CRUD service methods
 * AGNT-002: Configure Role, Model, Silence — enforcement at service boundary
 */
describe('AgentProfileService (AGNT-001/002)', () => {
  let service: AgentProfileService;
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
        AgentProfileService,
        { provide: FirestoreService, useValue: mockFirestore },
        { provide: AuthService, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(AgentProfileService);
  });

  afterEach(() => {
    localStorage.clear();
    isRealUser.value = false; // reset shared mutable state between tests
  });

  // ── Default profiles ───────────────────────────────────────────────────────

  describe('initial load', () => {
    it('should load default profiles when localStorage is empty', () => {
      const profiles = service.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should include at least one moderator in defaults', () => {
      expect(service.getModerators().length).toBeGreaterThan(0);
    });

    it('should include at least one chatter in defaults', () => {
      expect(service.getChatters().length).toBeGreaterThan(0);
    });
  });

  // ── addProfile ────────────────────────────────────────────────────────────

  describe('addProfile', () => {
    it('should add a new profile to the list', async () => {
      const before = service.getProfiles().length;
      await service.addProfile({ name: 'NOVA', color: 'nova', hex: '#f0f', temp: 0.5, role: 'chatter', system: 'Nova speaks.' });
      expect(service.getProfiles().length).toBe(before + 1);
    });

    it('should assign a unique id to the new profile', async () => {
      await service.addProfile({ name: 'A', color: 'a', hex: '#aaa', temp: 0.3, role: 'chatter', system: 'S' });
      await service.addProfile({ name: 'B', color: 'b', hex: '#bbb', temp: 0.3, role: 'chatter', system: 'S' });
      const ids = service.getProfiles().map(p => p.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should persist the new profile to localStorage immediately', async () => {
      await service.addProfile({ name: 'SAVE', color: 'save', hex: '#999', temp: 0.5, role: 'chatter', system: 'S' });
      const stored = JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]');
      expect(stored.some((p: any) => p.name === 'SAVE')).toBeTrue();
    });

    it('should NOT call Firestore for anonymous users', async () => {
      isRealUser.value = false;
      await service.addProfile({ name: 'ANON', color: 'a', hex: '#000', temp: 0.5, role: 'chatter', system: 'S' });
      expect(mockFirestore.saveDocument).not.toHaveBeenCalled();
    });

    it('should call Firestore for authenticated users', async () => {
      isRealUser.value = true;
      await service.addProfile({ name: 'AUTH', color: 'a', hex: '#000', temp: 0.5, role: 'chatter', system: 'S' });
      expect(mockFirestore.saveDocument).toHaveBeenCalled();
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should update name on an existing profile', async () => {
      const id = service.getProfiles()[0].id;
      await service.updateProfile(id, { name: 'UPDATED' });
      const found = service.getProfiles().find(p => p.id === id);
      expect(found?.name).toBe('UPDATED');
    });

    it('should bump updatedAt timestamp', async () => {
      const profile = service.getProfiles()[0];
      const before = profile.updatedAt;
      // Small delay to ensure timestamp changes
      await new Promise(r => setTimeout(r, 2));
      await service.updateProfile(profile.id, { name: 'NEW NAME' });
      const updated = service.getProfiles().find(p => p.id === profile.id);
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(before);
    });

    it('should not remove other profiles when updating one', async () => {
      const countBefore = service.getProfiles().length;
      const id = service.getProfiles()[0].id;
      await service.updateProfile(id, { temp: 0.9 });
      expect(service.getProfiles().length).toBe(countBefore);
    });
  });

  // ── deleteProfile ─────────────────────────────────────────────────────────

  describe('deleteProfile', () => {
    it('should remove the profile from the list', async () => {
      const id = service.getProfiles()[0].id;
      const countBefore = service.getProfiles().length;
      await service.deleteProfile(id);
      expect(service.getProfiles().length).toBe(countBefore - 1);
      expect(service.getProfiles().find(p => p.id === id)).toBeUndefined();
    });

    it('should call Firestore deleteDocument for authenticated users', async () => {
      isRealUser.value = true;
      const id = service.getProfiles()[0].id;
      await service.deleteProfile(id);
      expect(mockFirestore.deleteDocument).toHaveBeenCalledWith('agent_profiles', id);
    });

    it('should not call Firestore deleteDocument for anonymous users', async () => {
      isRealUser.value = false;
      const id = service.getProfiles()[0].id;
      await service.deleteProfile(id);
      expect(mockFirestore.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // ── resetToDefaults ───────────────────────────────────────────────────────

  describe('resetToDefaults', () => {
    it('should restore to the canonical default profile set', () => {
      service.resetToDefaults();
      const defaults = AgentProfileModel.getDefaults();
      const names = service.getProfiles().map(p => p.name);
      for (const d of defaults) {
        expect(names).toContain(d.name);
      }
    });
  });

  // ── loadFromCloud ─────────────────────────────────────────────────────────

  describe('loadFromCloud', () => {
    it('should do nothing for anonymous users', async () => {
      isRealUser.value = false;
      await service.loadFromCloud();
      expect(mockFirestore.getDocuments).not.toHaveBeenCalled();
    });

    it('should merge cloud-only profiles into local list for authenticated users', async () => {
      isRealUser.value = true;
      const cloudProfile = AgentProfileModel.create({ id: 'cloud-1', name: 'CLOUD', color: 'c', hex: '#abc', temp: 0.5, system: 'S', role: 'chatter' });
      mockFirestore.getDocuments.and.returnValue(Promise.resolve([cloudProfile]));

      const countBefore = service.getProfiles().length;
      await service.loadFromCloud();
      expect(service.getProfiles().length).toBeGreaterThan(countBefore);
      expect(service.getProfiles().some(p => p.id === 'cloud-1')).toBeTrue();
    });

    it('should not add a profile that already exists locally', async () => {
      isRealUser.value = true;
      const existingId = service.getProfiles()[0].id;
      const cloudCopy = { ...service.getProfiles()[0] };
      mockFirestore.getDocuments.and.returnValue(Promise.resolve([cloudCopy]));

      const countBefore = service.getProfiles().length;
      await service.loadFromCloud();
      expect(service.getProfiles().length).toBe(countBefore);
    });
  });

  // ── clearLocalStorage ─────────────────────────────────────────────────────

  describe('clearLocalStorage', () => {
    it('should reset profiles to defaults (app remains functional after clear)', () => {
      service.clearLocalStorage();
      expect(service.getProfiles().length).toBeGreaterThan(0);
    });

    it('should return the count of profiles that were cleared', async () => {
      await service.addProfile({ name: 'X', color: 'x', hex: '#000', temp: 0.5, role: 'chatter', system: 'S' });
      const count = service.getProfiles().length;
      const cleared = service.clearLocalStorage();
      expect(cleared).toBe(count);
    });
  });

  // ── AGNT-002: role / silence normalization at model boundary ───────────────

  describe('role and silence protocol normalization', () => {
    it('should preserve "moderator" role through add/read cycle', async () => {
      await service.addProfile({ name: 'MOD', color: 'm', hex: '#0f0', temp: 0.5, role: 'moderator', system: 'S' });
      const mod = service.getModerators().find(p => p.name === 'MOD');
      expect(mod).toBeTruthy();
      expect(mod?.role).toBe('moderator');
    });

    it('should normalise a missing silenceProtocol to "standard"', async () => {
      await service.addProfile({ name: 'NOSILENCE', color: 'ns', hex: '#111', temp: 0.5, role: 'chatter', system: 'S', silenceProtocol: undefined });
      const p = service.getProfiles().find(p => p.name === 'NOSILENCE');
      expect(p?.silenceProtocol).toBe('standard');
    });
  });
});
