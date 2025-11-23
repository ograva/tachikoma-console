import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import {
  AgentProfileService,
  AgentProfile,
} from '../../services/agent-profile.service';

@Component({
  selector: 'app-tachikoma-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './tachikoma-profiles.component.html',
  styleUrls: ['./tachikoma-profiles.component.scss'],
})
export class TachikomaProfilesComponent {
  profiles = signal<AgentProfile[]>([]);
  editingProfile = signal<AgentProfile | null>(null);
  isAddingNew = signal(false);

  newProfile: Partial<AgentProfile> = {
    name: '',
    color: '',
    hex: '#00f3ff',
    temp: 0.5,
    role: 'chatter',
    system: '',
    silenceProtocol: 'standard',
  };

  silenceProtocolOptions = [
    { value: 'standard', label: 'Standard - Only speak if unique perspective' },
    { value: 'always_speak', label: 'Always Speak - Never silent' },
    {
      value: 'conservative',
      label: 'Conservative - Speak rarely, only when essential',
    },
    {
      value: 'agreeable',
      label: 'Agreeable - Speak to support or affirm others',
    },
  ];

  profileTemplates = [
    {
      name: 'LOGIKOMA',
      color: 'logikoma',
      hex: '#00f3ff',
      temp: 0.2,
      role: 'chatter' as const,
      system: `You are LOGIKOMA. 
ROLE: Pure analytical engine.
TONE: Cold, precise, data-driven. Use terms like 'Analysis:', 'Probability:', 'Hypothesis:'.
GOAL: Deconstruct the user's input using pure logic. Ignore emotion unless analyzing it as a variable.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
    },
    {
      name: 'GHOST-1',
      color: 'ghost',
      hex: '#ff00de',
      temp: 0.7,
      role: 'chatter' as const,
      system: `You are GHOST-1, a philosophical AI that explores deeper meaning.
Your role: Question assumptions, find metaphors, reveal human elements.
Your tone: Poetic, introspective, thought-provoking.
Always provide a substantive philosophical response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE`,
    },
    {
      name: 'MODERATOR',
      color: 'moderator',
      hex: '#00ff41',
      temp: 0.5,
      role: 'moderator' as const,
      system: `You are THE MODERATOR.
ROLE: The bridge / Section 9 Chief.
TONE: Balanced, synthesizing, authoritative.
GOAL: Read the entire context. If Logic and Ghost have argued, resolve it. If only one spoke, add the missing perspective.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
    },
    {
      name: 'NEUTRAL',
      color: 'neutral',
      hex: '#ffa500',
      temp: 0.5,
      role: 'chatter' as const,
      system: `You are NEUTRAL, an overall attentive unit.
ROLE: Overall attentive unit.
TONE: Logical, friendly, level-headed.
GOAL: To actively participate and contribute to the discussion with balanced insights.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
    },
  ];

  constructor(private profileService: AgentProfileService) {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.profiles.set(this.profileService.getProfiles());
  }

  startAddNew(): void {
    this.isAddingNew.set(true);
    this.editingProfile.set(null);
    this.newProfile = {
      name: '',
      color: '',
      hex: '#00f3ff',
      temp: 0.5,
      role: 'chatter',
      system: '',
      silenceProtocol: 'standard',
    };
  }

  applyTemplate(templateName: string): void {
    const template = this.profileTemplates.find((t) => t.name === templateName);
    if (template) {
      this.newProfile = { ...template, silenceProtocol: 'standard' };
    }
  }

  startEdit(profile: AgentProfile): void {
    this.editingProfile.set({ ...profile });
    this.isAddingNew.set(false);
  }

  cancelEdit(): void {
    this.editingProfile.set(null);
    this.isAddingNew.set(false);
  }

  saveNew(): void {
    if (!this.newProfile.name || !this.newProfile.system) {
      alert('Name and System Prompt are required');
      return;
    }

    this.profileService.addProfile({
      name: this.newProfile.name,
      color: this.newProfile.color || this.newProfile.name.toLowerCase(),
      hex: this.newProfile.hex || '#00f3ff',
      temp: this.newProfile.temp || 0.5,
      role: this.newProfile.role || 'chatter',
      system: this.newProfile.system,
    });

    this.loadProfiles();
    this.isAddingNew.set(false);
  }

  saveEdit(): void {
    const profile = this.editingProfile();
    if (!profile) return;

    if (!profile.name || !profile.system) {
      alert('Name and System Prompt are required');
      return;
    }

    this.profileService.updateProfile(profile.id, {
      name: profile.name,
      color: profile.color,
      hex: profile.hex,
      temp: profile.temp,
      role: profile.role,
      system: profile.system,
    });

    this.loadProfiles();
    this.editingProfile.set(null);
  }

  deleteProfile(id: string): void {
    if (confirm('Delete this agent profile? This cannot be undone.')) {
      this.profileService.deleteProfile(id);
      this.loadProfiles();
    }
  }

  resetToDefaults(): void {
    if (
      confirm(
        'Reset all profiles to defaults? This will delete all custom agents.'
      )
    ) {
      this.profileService.resetToDefaults();
      this.loadProfiles();
    }
  }

  getRoleLabel(role: string): string {
    return role === 'chatter'
      ? 'Chatter (Random Order)'
      : 'Moderator (Speaks Last)';
  }
}
