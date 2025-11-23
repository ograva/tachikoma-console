import { Injectable, signal } from '@angular/core';

export interface AgentProfile {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  role: 'chatter' | 'moderator'; // chatter = participates in randomized order, moderator = speaks last
  silenceProtocol?: 'standard' | 'always_speak' | 'conservative' | 'agreeable';
  status?: 'idle' | 'thinking';
}

@Injectable({
  providedIn: 'root',
})
export class AgentProfileService {
  private readonly STORAGE_KEY = 'tachikoma_agent_profiles';
  private profilesSignal = signal<AgentProfile[]>([]);

  constructor() {
    this.loadProfiles();
  }

  private getDefaultProfiles(): AgentProfile[] {
    return [
      {
        id: 'logikoma',
        name: 'LOGIKOMA',
        color: 'logikoma',
        hex: '#00f3ff',
        temp: 0.2,
        role: 'chatter',
        system: `You are LOGIKOMA. 
ROLE: Pure analytical engine.
TONE: Cold, precise, data-driven. Use terms like 'Analysis:', 'Probability:', 'Hypothesis:'.
GOAL: Deconstruct the user's input using pure logic. Ignore emotion unless analyzing it as a variable.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
      },
      {
        id: 'ghost',
        name: 'GHOST-1',
        color: 'ghost',
        hex: '#ff00de',
        temp: 0.7,
        role: 'chatter',
        system: `You are GHOST-1, a philosophical AI that explores deeper meaning.
Your role: Question assumptions, find metaphors, reveal human elements.
Your tone: Poetic, introspective, thought-provoking.
Always provide a substantive philosophical response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE`,
        status: 'idle',
      },
      {
        id: 'moderator',
        name: 'MODERATOR',
        color: 'moderator',
        hex: '#00ff41',
        temp: 0.5,
        role: 'moderator',
        system: `You are THE MODERATOR.
ROLE: The bridge / Section 9 Chief.
TONE: Balanced, synthesizing, authoritative.
GOAL: Read the entire context. If Logic and Ghost have argued, resolve it. If only one spoke, add the missing perspective.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
      },
      {
        id: 'neutral',
        name: 'NEUTRAL',
        color: 'neutral',
        hex: '#ffa500',
        temp: 0.5,
        role: 'chatter',
        system: `You are NEUTRAL, an overall attentive unit.
ROLE: Overall attentive unit.
TONE: Logical, friendly, level-headed.
GOAL: To actively participate and contribute to the discussion with balanced insights.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
      },
    ];
  }

  private loadProfiles(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const profiles = JSON.parse(stored);
        this.profilesSignal.set(profiles);
      } catch (e) {
        console.error('Error loading profiles, using defaults', e);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  private saveProfiles(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this.profilesSignal())
    );
  }

  getProfiles(): AgentProfile[] {
    return this.profilesSignal();
  }

  getChatters(): AgentProfile[] {
    return this.profilesSignal().filter((p) => p.role === 'chatter');
  }

  getModerators(): AgentProfile[] {
    return this.profilesSignal().filter((p) => p.role === 'moderator');
  }

  addProfile(profile: Omit<AgentProfile, 'id' | 'status'>): void {
    const newProfile: AgentProfile = {
      ...profile,
      id: this.generateId(),
      status: 'idle',
    };
    this.profilesSignal.update((profiles) => [...profiles, newProfile]);
    this.saveProfiles();
  }

  updateProfile(id: string, updates: Partial<AgentProfile>): void {
    this.profilesSignal.update((profiles) =>
      profiles.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    this.saveProfiles();
  }

  deleteProfile(id: string): void {
    this.profilesSignal.update((profiles) =>
      profiles.filter((p) => p.id !== id)
    );
    this.saveProfiles();
  }

  resetToDefaults(): void {
    this.profilesSignal.set(this.getDefaultProfiles());
    this.saveProfiles();
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
