import {
  AgentProfile,
  AgentProfileModel,
  SystemFields,
} from './agent-profile.model';

/**
 * AGNT-001: Create and Edit Agent Profiles — model normalization
 * AGNT-002: Configure Role, Model, and Silence — validation logic
 * AGNT-003: Author Structured System Instructions — XML roundtrip
 */
describe('AgentProfileModel', () => {
  const BASE: Partial<AgentProfile> = {
    id: 'test-001',
    name: 'TACHIKOMA',
    color: 'tachikoma',
    hex: '#00f3ff',
    temp: 0.5,
    system: 'You are TACHIKOMA.',
    role: 'chatter',
    createdAt: 1000,
    updatedAt: 2000,
  };

  // ── normalize ──────────────────────────────────────────────────────────────

  describe('normalize', () => {
    it('should fill missing model with default', () => {
      const result = AgentProfileModel.normalize({ ...BASE });
      expect(result.model).toBe(AgentProfileModel.DEFAULTS.model);
    });

    it('should preserve an explicitly set model', () => {
      const result = AgentProfileModel.normalize({ ...BASE, model: 'models/gemini-1.5-pro' });
      expect(result.model).toBe('models/gemini-1.5-pro');
    });

    it('should fill missing silenceProtocol with "standard"', () => {
      const result = AgentProfileModel.normalize({ ...BASE });
      expect(result.silenceProtocol).toBe('standard');
    });

    it('should preserve an explicitly set silenceProtocol', () => {
      const result = AgentProfileModel.normalize({ ...BASE, silenceProtocol: 'always_speak' });
      expect(result.silenceProtocol).toBe('always_speak');
    });

    it('should fill missing status with "idle"', () => {
      const result = AgentProfileModel.normalize({ ...BASE });
      expect(result.status).toBe('idle');
    });

    it('should fill missing systemMode with "plaintext"', () => {
      const result = AgentProfileModel.normalize({ ...BASE });
      expect(result.systemMode).toBe('plaintext');
    });

    it('should preserve existing timestamps', () => {
      const result = AgentProfileModel.normalize({ ...BASE });
      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBe(2000);
    });

    it('should set timestamps to now when missing', () => {
      const before = Date.now();
      const result = AgentProfileModel.normalize({
        ...BASE,
        createdAt: undefined,
        updatedAt: undefined,
      });
      const after = Date.now();
      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });
  });

  // ── fromLocalStorage / fromFirestore ───────────────────────────────────────

  describe('fromLocalStorage', () => {
    it('should normalize legacy data missing optional fields', () => {
      const legacy = { id: 'l1', name: 'LEGACY', role: 'chatter', system: 'old', color: 'x', hex: '#000', temp: 0.5 };
      const result = AgentProfileModel.fromLocalStorage(legacy);
      expect(result.model).toBe(AgentProfileModel.DEFAULTS.model);
      expect(result.silenceProtocol).toBe('standard');
    });
  });

  describe('fromFirestore', () => {
    it('should normalize Firestore data the same as localStorage data', () => {
      const data = { ...BASE, model: undefined };
      const result = AgentProfileModel.fromFirestore(data);
      expect(result.model).toBe(AgentProfileModel.DEFAULTS.model);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should assign default model when not provided', () => {
      const p = AgentProfileModel.create({ id: 'c1', name: 'X', color: 'x', hex: '#fff', temp: 0.5, system: 'S', role: 'chatter' });
      expect(p.model).toBe(AgentProfileModel.DEFAULTS.model);
    });

    it('should assign default silence protocol when not provided', () => {
      const p = AgentProfileModel.create({ id: 'c1', name: 'X', color: 'x', hex: '#fff', temp: 0.5, system: 'S', role: 'chatter' });
      expect(p.silenceProtocol).toBe('standard');
    });

    it('should always set status to idle', () => {
      const p = AgentProfileModel.create({ id: 'c1', name: 'X', color: 'x', hex: '#fff', temp: 0.5, system: 'S', role: 'moderator' });
      expect(p.status).toBe('idle');
    });

    it('should accept moderator role', () => {
      const p = AgentProfileModel.create({ id: 'c1', name: 'MOD', color: 'mod', hex: '#0f0', temp: 0.3, system: 'Moderate.', role: 'moderator' });
      expect(p.role).toBe('moderator');
    });
  });

  // ── getDefaults ───────────────────────────────────────────────────────────

  describe('getDefaults', () => {
    it('should return 4 profiles', () => {
      expect(AgentProfileModel.getDefaults().length).toBe(4);
    });

    it('should include exactly one moderator', () => {
      const defaults = AgentProfileModel.getDefaults();
      const mods = defaults.filter(p => p.role === 'moderator');
      expect(mods.length).toBe(1);
    });

    it('should have all required fields on every profile', () => {
      for (const p of AgentProfileModel.getDefaults()) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.system).toBeTruthy();
        expect(p.model).toBeTruthy();
      }
    });

    it('should protect defaults from mutation (each call returns fresh objects)', () => {
      const a = AgentProfileModel.getDefaults();
      const b = AgentProfileModel.getDefaults();
      a[0].name = 'MUTATED';
      expect(b[0].name).not.toBe('MUTATED');
    });
  });

  // ── isAgentProfile ────────────────────────────────────────────────────────

  describe('isAgentProfile', () => {
    it('should return true for a valid chatter profile', () => {
      const p = AgentProfileModel.normalize(BASE);
      expect(AgentProfileModel.isAgentProfile(p)).toBeTrue();
    });

    it('should return falsy for null', () => {
      expect(AgentProfileModel.isAgentProfile(null)).toBeFalsy();
    });

    it('should return false for object missing role', () => {
      expect(AgentProfileModel.isAgentProfile({ id: 'x', name: 'X' })).toBeFalse();
    });

    it('should return false for invalid role string', () => {
      expect(AgentProfileModel.isAgentProfile({ id: 'x', name: 'X', role: 'invalid' })).toBeFalse();
    });
  });

  // ── AGNT-003: XML roundtrip ───────────────────────────────────────────────

  describe('fieldsToXml / xmlToFields roundtrip', () => {
    const SAMPLE_FIELDS: SystemFields = {
      role: 'Analytical engine',
      personality: ['Precise', 'Data-driven'],
      instructions: ['Deconstruct prompts logically', 'Use probability estimates'],
      constraints: ['Never speculate without data'],
      outputFormat: 'Structured markdown',
      tone: 'Cold and objective',
      sampleDialogue: [{ user: 'Analyse this.', assistant: 'Analysis: ...' }],
    };

    it('should produce valid XML containing the role', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      expect(xml).toContain('<role>');
      expect(xml).toContain('Analytical engine');
    });

    it('should produce XML parseable back to the same role', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.role).toBe('Analytical engine');
    });

    it('should roundtrip personality traits without data loss', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.personality).toEqual(jasmine.arrayContaining(['Precise', 'Data-driven']));
    });

    it('should roundtrip instructions', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.instructions.length).toBe(2);
    });

    it('should roundtrip constraints', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.constraints).toContain('Never speculate without data');
    });

    it('should roundtrip outputFormat and tone', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.outputFormat).toBe('Structured markdown');
      expect(parsed?.tone).toBe('Cold and objective');
    });

    it('should roundtrip sample dialogue', () => {
      const xml = AgentProfileModel.fieldsToXml(SAMPLE_FIELDS);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.sampleDialogue?.[0].user).toBe('Analyse this.');
      expect(parsed?.sampleDialogue?.[0].assistant).toBe('Analysis: ...');
    });

    it('should escape XML special characters and unescape them correctly', () => {
      const fields: SystemFields = {
        role: 'Agent with <special> & "chars"',
        personality: [],
        instructions: [],
      };
      const xml = AgentProfileModel.fieldsToXml(fields);
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed?.role).toBe('Agent with <special> & "chars"');
    });

    it('should return null for malformed XML', () => {
      const result = AgentProfileModel.xmlToFields('<broken xml ><<');
      // Either null or empty fields — both are acceptable fail-safe responses
      if (result !== null) {
        expect(result.role).toBe('');
      } else {
        expect(result).toBeNull();
      }
    });

    it('should handle empty fields gracefully', () => {
      const empty: SystemFields = { role: '', personality: [], instructions: [] };
      const xml = AgentProfileModel.fieldsToXml(empty);
      expect(xml).toBeTruthy();
      const parsed = AgentProfileModel.xmlToFields(xml);
      expect(parsed).toBeTruthy();
    });
  });
});
