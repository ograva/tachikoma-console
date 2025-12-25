import { SyncableData } from './syncable-data.model';

export type AgentRole = 'chatter' | 'moderator';
export type SilenceProtocol =
  | 'standard'
  | 'always_speak'
  | 'conservative'
  | 'agreeable';
export type AgentStatus = 'idle' | 'thinking';

export interface AgentProfile extends SyncableData {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  role: AgentRole; // chatter = participates in randomized order, moderator = speaks last
  model?: string; // Gemini model to use (e.g., 'models/gemini-2.0-flash-exp')
  silenceProtocol?: SilenceProtocol;
  status?: AgentStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * AgentProfile model with normalization and factory methods
 */
export class AgentProfileModel {
  /**
   * Default values for optional fields
   */
  static readonly DEFAULTS = {
    model: 'models/gemini-2.0-flash-exp',
    silenceProtocol: 'standard' as SilenceProtocol,
    status: 'idle' as AgentStatus,
  };

  /**
   * Normalize agent profile to ensure all optional fields have proper defaults
   * Use this when loading data from any source (localStorage, Firestore)
   */
  static normalize(profile: Partial<AgentProfile>): AgentProfile {
    return {
      ...profile,
      model: profile.model ?? AgentProfileModel.DEFAULTS.model,
      silenceProtocol:
        profile.silenceProtocol ?? AgentProfileModel.DEFAULTS.silenceProtocol,
      status: profile.status ?? AgentProfileModel.DEFAULTS.status,
      createdAt: profile.createdAt ?? Date.now(),
      updatedAt: profile.updatedAt ?? Date.now(),
    } as AgentProfile;
  }

  /**
   * Create an agent from Firestore data
   */
  static fromFirestore(data: any): AgentProfile {
    return AgentProfileModel.normalize(data);
  }

  /**
   * Create an agent from localStorage data
   */
  static fromLocalStorage(data: any): AgentProfile {
    return AgentProfileModel.normalize(data);
  }

  /**
   * Create a new agent profile
   */
  static create(params: {
    id: string;
    name: string;
    color: string;
    hex: string;
    temp: number;
    system: string;
    role: AgentRole;
    model?: string;
    silenceProtocol?: SilenceProtocol;
  }): AgentProfile {
    const now = Date.now();
    return {
      id: params.id,
      name: params.name,
      color: params.color,
      hex: params.hex,
      temp: params.temp,
      system: params.system,
      role: params.role,
      model: params.model ?? AgentProfileModel.DEFAULTS.model,
      silenceProtocol:
        params.silenceProtocol ?? AgentProfileModel.DEFAULTS.silenceProtocol,
      status: AgentProfileModel.DEFAULTS.status,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get default agent profiles (LOGIKOMA, GHOST-1, MODERATOR, NEUTRAL)
   */
  static getDefaults(): AgentProfile[] {
    const now = Date.now();
    return [
      {
        id: 'logikoma',
        name: 'LOGIKOMA',
        color: 'logikoma',
        hex: '#00f3ff',
        temp: 0.2,
        role: 'chatter',
        model: 'models/gemini-2.0-flash-exp',
        system: `You are LOGIKOMA. 
ROLE: Pure analytical engine.
TONE: Cold, precise, data-driven. Use terms like 'Analysis:', 'Probability:', 'Hypothesis:'.
GOAL: Deconstruct the user's input using pure logic. Ignore emotion unless analyzing it as a variable.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ghost',
        name: 'GHOST-1',
        color: 'ghost',
        hex: '#ff00de',
        temp: 0.7,
        role: 'chatter',
        model: 'models/gemini-2.0-flash-exp',
        system: `You are GHOST-1, a philosophical AI that explores deeper meaning.
Your role: Question assumptions, find metaphors, reveal human elements.
Your tone: Poetic, introspective, thought-provoking.
Always provide a substantive philosophical response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'moderator',
        name: 'MODERATOR',
        color: 'moderator',
        hex: '#00ff41',
        temp: 0.5,
        role: 'moderator',
        model: 'models/gemini-1.5-flash',
        system: `You are THE MODERATOR.
ROLE: The bridge / Section 9 Chief.
TONE: Balanced, synthesizing, authoritative.
GOAL: Read the entire context. If Logic and Ghost have argued, resolve it. If only one spoke, add the missing perspective.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'neutral',
        name: 'NEUTRAL',
        color: 'neutral',
        hex: '#ffa500',
        temp: 0.5,
        role: 'chatter',
        model: 'models/gemini-2.0-flash-exp',
        system: `You are NEUTRAL, an overall attentive unit.
ROLE: Overall attentive unit.
TONE: Logical, friendly, level-headed.
GOAL: To actively participate and contribute to the discussion with balanced insights.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * Type guard to check if an object is a valid AgentProfile
   */
  static isAgentProfile(obj: any): obj is AgentProfile {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.role === 'string' &&
      (obj.role === 'chatter' || obj.role === 'moderator')
    );
  }
}
