import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  AgentProfileService,
  AgentProfile,
} from '../../services/agent-profile.service';
import {
  SystemMode,
  SystemFields,
  AgentProfileModel,
} from '../../models/agent-profile.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-tachikoma-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, ConfirmDialogComponent],
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
    model: 'models/gemini-3.5-flash',
    system: '',
    systemMode: 'plaintext',
    silenceProtocol: 'standard',
  };

  // Current system mode for new/edit forms
  currentSystemMode = signal<SystemMode>('plaintext');

  // System fields for form mode
  systemFields: SystemFields = {
    role: '',
    personality: [],
    instructions: [],
    constraints: [],
    outputFormat: '',
    tone: '',
    sampleDialogue: [],
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

  constructor(
    private profileService: AgentProfileService,
    private dialog: MatDialog
  ) {
    this.loadProfiles();
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '420px',
      maxWidth: '90vw',
      autoFocus: data.alertOnly ? 'dialog' : 'first-tabbable',
      restoreFocus: true,
    });
    return !!(await firstValueFrom(ref.afterClosed()));
  }

  private alert(message: string, title = 'NOTICE'): Promise<void> {
    return this.confirm({ title, message, alertOnly: true }).then(() => undefined);
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

    // Load system mode and fields
    const mode = profile.systemMode || 'plaintext';
    this.currentSystemMode.set(mode);

    if (mode === 'form' && profile.systemFields) {
      this.systemFields = { ...profile.systemFields };
    } else if (mode === 'xml' && profile.system) {
      // Try to parse XML to fields for form view
      const parsed = AgentProfileModel.xmlToFields(profile.system);
      if (parsed) {
        this.systemFields = parsed;
      }
    }
  }

  cancelEdit(): void {
    this.editingProfile.set(null);
    this.isAddingNew.set(false);
  }

  saveNew(): void {
    if (
      !this.newProfile.name ||
      (!this.newProfile.system && this.currentSystemMode() !== 'form')
    ) {
      this.alert('Name and System Prompt are required.', 'VALIDATION ERROR');
      return;
    }

    // Compile system from fields if in form mode
    let finalSystem = this.newProfile.system;
    let finalSystemFields = this.newProfile.systemFields;

    if (this.currentSystemMode() === 'form') {
      finalSystem = AgentProfileModel.fieldsToXml(this.systemFields);
      finalSystemFields = { ...this.systemFields };
    }

    this.profileService.addProfile({
      name: this.newProfile.name,
      color: this.newProfile.color || this.newProfile.name.toLowerCase(),
      hex: this.newProfile.hex || '#00f3ff',
      temp: this.newProfile.temp || 0.5,
      role: this.newProfile.role || 'chatter',
      model: this.newProfile.model,
      system: finalSystem,
      systemMode: this.currentSystemMode(),
      systemFields: finalSystemFields,
      silenceProtocol: this.newProfile.silenceProtocol,
    });

    this.loadProfiles();
    this.isAddingNew.set(false);
  }

  saveEdit(): void {
    const profile = this.editingProfile();
    if (!profile) return;

    if (
      !profile.name ||
      (!profile.system && this.currentSystemMode() !== 'form')
    ) {
      this.alert('Name and System Prompt are required.', 'VALIDATION ERROR');
      return;
    }

    // Compile system from fields if in form mode
    let finalSystem = profile.system;
    let finalSystemFields = profile.systemFields;

    if (this.currentSystemMode() === 'form') {
      finalSystem = AgentProfileModel.fieldsToXml(this.systemFields);
      finalSystemFields = { ...this.systemFields };
    }

    this.profileService.updateProfile(profile.id, {
      name: profile.name,
      color: profile.color,
      hex: profile.hex,
      temp: profile.temp,
      role: profile.role,
      model: profile.model,
      system: finalSystem,
      systemMode: this.currentSystemMode(),
      systemFields: finalSystemFields,
      silenceProtocol: profile.silenceProtocol,
    });

    this.loadProfiles();
    this.editingProfile.set(null);
  }

  async deleteProfile(id: string): Promise<void> {
    const confirmed = await this.confirm({
      title: 'DELETE AGENT PROFILE',
      message: 'Delete this agent profile? This action cannot be undone.',
      confirmLabel: 'DELETE',
      cancelLabel: 'CANCEL',
      confirmColor: 'warn',
    });
    if (confirmed) {
      this.profileService.deleteProfile(id);
      this.loadProfiles();
    }
  }

  async resetToDefaults(): Promise<void> {
    const confirmed = await this.confirm({
      title: 'RESET TO DEFAULTS',
      message: 'Reset all profiles to defaults? This will permanently delete all custom agents.',
      confirmLabel: 'RESET',
      cancelLabel: 'CANCEL',
      confirmColor: 'warn',
    });
    if (confirmed) {
      this.profileService.resetToDefaults();
      this.loadProfiles();
    }
  }

  getRoleLabel(role: string): string {
    return role === 'chatter'
      ? 'Chatter (Random Order)'
      : 'Moderator (Speaks Last)';
  }

  // System Mode Management

  switchSystemMode(
    mode: SystemMode,
    profile?: AgentProfile | Partial<AgentProfile>
  ): void {
    const targetProfile = profile || this.newProfile;
    console.log(
      '🔄 Switching system mode to:',
      mode,
      'from:',
      targetProfile.systemMode
    );
    this.currentSystemMode.set(mode);

    if (mode === 'form') {
      // Convert current system to form fields
      if (targetProfile.systemMode === 'xml' && targetProfile.system) {
        const parsed = AgentProfileModel.xmlToFields(targetProfile.system);
        if (parsed) {
          this.systemFields = parsed;
          console.log('✅ Converted XML to form fields:', this.systemFields);
        }
      } else if (
        !this.systemFields.role &&
        this.systemFields.personality.length === 0
      ) {
        // Only initialize empty form if systemFields is actually empty
        // (don't overwrite if AI conversion just populated it)
        this.systemFields = {
          role: '',
          personality: [],
          instructions: [],
          constraints: [],
          outputFormat: '',
          tone: '',
          sampleDialogue: [],
        };
        console.log('🆕 Initialized empty form fields');
      } else {
        console.log('✅ Using existing form fields:', this.systemFields);
      }
      // Otherwise, keep existing systemFields (e.g., from AI conversion)
    } else if (mode === 'xml') {
      // Generate XML from form fields if they have data
      if (
        this.systemFields.role ||
        this.systemFields.personality.length > 0 ||
        this.systemFields.instructions.length > 0
      ) {
        targetProfile.system = AgentProfileModel.fieldsToXml(this.systemFields);
        console.log('✅ Generated XML from form fields:', targetProfile.system);
      } else if (!targetProfile.system) {
        // Initialize empty XML template if no data exists
        targetProfile.system = '';
        console.log('🆕 Initialized empty XML');
      }
    }

    // Update the profile's system mode
    targetProfile.systemMode = mode;
    console.log('✅ Profile system mode updated to:', mode);
  }

  // Add/remove dynamic array items
  addPersonalityTrait(): void {
    this.systemFields.personality.push('');
  }

  removePersonalityTrait(index: number): void {
    this.systemFields.personality.splice(index, 1);
  }

  addInstruction(): void {
    this.systemFields.instructions.push('');
  }

  removeInstruction(index: number): void {
    this.systemFields.instructions.splice(index, 1);
  }

  addConstraint(): void {
    if (!this.systemFields.constraints) this.systemFields.constraints = [];
    this.systemFields.constraints.push('');
  }

  removeConstraint(index: number): void {
    this.systemFields.constraints?.splice(index, 1);
  }

  addSampleDialogue(): void {
    if (!this.systemFields.sampleDialogue)
      this.systemFields.sampleDialogue = [];
    this.systemFields.sampleDialogue.push({ user: '', assistant: '' });
  }

  removeSampleDialogue(index: number): void {
    this.systemFields.sampleDialogue?.splice(index, 1);
  }

  // Compile system instruction from form fields
  compileSystemFromFields(): string {
    if (this.currentSystemMode() === 'form') {
      return AgentProfileModel.fieldsToXml(this.systemFields);
    }
    return this.newProfile.system || '';
  }

  // AGNT-004: Draft persona from intent
  intentText = '';
  isDrafting = signal<boolean>(false);
  draftResult = signal<Partial<AgentProfile> | null>(null);

  async draftFromIntent(): Promise<void> {
    if (!this.intentText.trim()) {
      this.alert('Please describe the kind of agent you want to create.', 'INTENT REQUIRED');
      return;
    }

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      this.alert('API key not found. Please initialize your Gemini API key in the chat interface first.', 'API KEY REQUIRED');
      return;
    }

    this.isDrafting.set(true);
    this.draftResult.set(null);

    try {
      const prompt = `You are an AI agent profile generator for a multi-agent chat platform.

USER INTENT: "${this.intentText}"

Generate a complete agent profile as valid JSON only (no markdown, no code blocks):

{
  "name": "SHORT_UPPERCASE_NAME",
  "color": "css-class-name",
  "hex": "#hexcolor",
  "temp": 0.5,
  "role": "chatter",
  "silenceProtocol": "standard",
  "system": "Full system prompt defining role, personality, tone, and silence protocol."
}

RULES:
- name: 1-2 words, uppercase, evocative (e.g. AXIOM, EMBER, VELOS)
- color: lowercase kebab-case version of name
- hex: a color that matches the persona theme
- temp: 0.1-0.3 = analytical, 0.5 = balanced, 0.7-0.9 = creative
- role: "chatter" for most agents, "moderator" only if explicitly a synthesizer/judge
- silenceProtocol: "standard"|"always_speak"|"conservative"|"agreeable"
- system: 3-5 sentences defining the agent completely, include silence protocol instructions at the end

Return ONLY the JSON object.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from AI');

      let jsonText = text.trim().replace(/^```json\n?/g, '').replace(/```\n?$/g, '');
      const draft = JSON.parse(jsonText) as Partial<AgentProfile>;

      // Normalize and provide defaults for any missing fields
      const normalized: Partial<AgentProfile> = {
        name: draft.name || 'AGENT',
        color: draft.color || (draft.name || 'agent').toLowerCase().replace(/\s+/g, '-'),
        hex: draft.hex || '#888888',
        temp: typeof draft.temp === 'number' ? Math.min(1, Math.max(0, draft.temp)) : 0.5,
        role: draft.role === 'moderator' ? 'moderator' : 'chatter',
        silenceProtocol: (['standard','always_speak','conservative','agreeable'] as const).includes(draft.silenceProtocol as any)
          ? draft.silenceProtocol : 'standard',
        system: draft.system || '',
        model: 'models/gemini-3.5-flash',
        systemMode: 'plaintext',
      };

      this.draftResult.set(normalized);
    } catch (error: any) {
      console.error('Draft from intent failed:', error);
      this.alert(`Draft failed: ${error.message}. Please try again.`, 'DRAFT FAILED');
    } finally {
      this.isDrafting.set(false);
    }
  }

  applyDraft(): void {
    const draft = this.draftResult();
    if (!draft) return;
    this.newProfile = { ...draft };
    this.currentSystemMode.set('plaintext');
    this.draftResult.set(null);
    this.intentText = '';
    this.isAddingNew.set(true);
  }

  async saveDraftDirectly(): Promise<void> {
    const draft = this.draftResult();
    if (!draft?.name || !draft.system) return;
    await this.profileService.addProfile({
      name: draft.name!,
      color: draft.color || draft.name!.toLowerCase().replace(/\s+/g, '-'),
      hex: draft.hex || '#00f3ff',
      temp: draft.temp ?? 0.5,
      role: draft.role || 'chatter',
      model: draft.model || 'models/gemini-3.5-flash',
      system: draft.system!,
      systemMode: 'plaintext',
      silenceProtocol: draft.silenceProtocol,
    });
    this.loadProfiles();
    this.draftResult.set(null);
    this.intentText = '';
  }

  discardDraft(): void {
    this.draftResult.set(null);
    this.intentText = '';
  }

  // AI-Assisted Plain Text to Structured Conversion
  isConverting = signal<boolean>(false);

  async convertPlainTextToStructured(
    profile?: AgentProfile | Partial<AgentProfile>
  ): Promise<void> {
    const targetProfile = profile || this.newProfile;
    const plainText = targetProfile.system;

    if (!plainText || plainText.trim().length === 0) {
      this.alert('No plain text to convert. Please enter a system instruction first.', 'NOTHING TO CONVERT');
      return;
    }

    // Check if API key is available
    const apiKey = localStorage.getItem('gemini_api_key');
    console.log('🔑 API key check:', apiKey ? 'Found' : 'Not found');
    if (!apiKey) {
      this.alert('API key not found. Please initialize your Gemini API key in the chat interface first.', 'API KEY REQUIRED');
      return;
    }

    this.isConverting.set(true);

    try {
      const prompt = `You are an expert at analyzing AI system prompts and extracting structured information.

TASK: Parse the following plain text AI system instruction and extract structured fields in valid JSON format.

PLAIN TEXT INSTRUCTION:
"""
${plainText}
"""

OUTPUT REQUIREMENTS:
Extract the following fields and return ONLY valid JSON (no markdown, no code blocks, no explanations):

{
  "role": "The primary role/identity statement",
  "personality": ["trait1", "trait2", "trait3"],
  "instructions": ["instruction1", "instruction2"],
  "constraints": ["constraint1", "constraint2"],
  "outputFormat": "How to format responses",
  "tone": "Communication tone"
}

EXTRACTION RULES:
- "role": Extract the main identity/role. Look for phrases like "You are...", "Your role:", or identity descriptions
- "personality": Extract character traits, behaviors, backgrounds, characteristics. Look for descriptive phrases about who/what the agent is
- "instructions": Extract core directives and tasks. Look for "Always...", "If...", action verbs, behavioral commands
- "constraints": Extract limitations, things NOT to do, conditions, special protocols (like "SILENCE")
- "outputFormat": Extract any specified output formatting or structure requirements
- "tone": Extract communication style. Look for "Your tone:", "tone:", adjectives describing how to communicate
- Break down compound sentences into individual array items
- If a field cannot be extracted, use empty string "" or empty array []
- Return ONLY the JSON object - no markdown code blocks, no explanations, no extra text`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('❌ No response from AI. Full response:', data);
        throw new Error('No response from AI');
      }

      console.log('🤖 Raw AI response:', text);

      // Extract JSON from response (remove markdown code blocks if present)
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      console.log('📝 Cleaned JSON text:', jsonText);

      const extracted = JSON.parse(jsonText);
      console.log('✅ Parsed JSON:', extracted);

      // Populate systemFields
      this.systemFields = {
        role: extracted.role || '',
        personality: Array.isArray(extracted.personality)
          ? extracted.personality.filter((t: string) => t.trim())
          : [],
        instructions: Array.isArray(extracted.instructions)
          ? extracted.instructions.filter((i: string) => i.trim())
          : [],
        constraints: Array.isArray(extracted.constraints)
          ? extracted.constraints.filter((c: string) => c.trim())
          : [],
        outputFormat: extracted.outputFormat || '',
        tone: extracted.tone || '',
        sampleDialogue: [],
      };

      // Switch to form mode
      this.switchSystemMode('form', targetProfile);

      console.log(
        '✅ Plain text converted to structured fields:',
        this.systemFields
      );
      this.alert('Conversion successful! Review the extracted fields and make any adjustments.', 'CONVERSION COMPLETE');
    } catch (error: any) {
      console.error('❌ Conversion failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      this.alert(`Conversion failed: ${error.message}. Please check the browser console for details, then try again or convert manually.`, 'CONVERSION FAILED');
    } finally {
      this.isConverting.set(false);
    }
  }
}
