import { SyncableData } from './syncable-data.model';

export type AgentRole = 'chatter' | 'moderator';
export type SilenceProtocol =
  | 'standard'
  | 'always_speak'
  | 'conservative'
  | 'agreeable';
export type AgentStatus = 'idle' | 'thinking';
export type SystemMode = 'form' | 'xml' | 'plaintext';

/**
 * Structured system instruction fields
 */
export interface SystemFields {
  role: string; // Agent's primary role
  personality: string[]; // Personality traits (one per line)
  instructions: string[]; // Core instructions (one per line)
  constraints?: string[]; // What the agent must NOT do
  outputFormat?: string; // How to format responses
  tone?: string; // Communication tone
  sampleDialogue?: { user: string; assistant: string }[]; // Few-shot examples
}

export interface AgentProfile extends SyncableData {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string; // Final compiled system instruction (generated from systemFields or direct input)
  systemMode?: SystemMode; // How system instruction is defined: 'form', 'xml', or 'plaintext'
  systemFields?: SystemFields; // Structured fields when using 'form' mode
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
    systemMode: 'plaintext' as SystemMode, // Backward compatible default
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
      systemMode: profile.systemMode ?? AgentProfileModel.DEFAULTS.systemMode,
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

  /**
   * Convert SystemFields to XML format
   */
  static fieldsToXml(fields: SystemFields): string {
    let xml = '<system>\n';

    // Role
    if (fields.role) {
      xml += `  <role>${this.escapeXml(fields.role)}</role>\n\n`;
    }

    // Personality
    if (fields.personality && fields.personality.length > 0) {
      xml += '  <personality>\n';
      fields.personality.forEach((trait) => {
        if (trait.trim()) {
          xml += `    <trait>${this.escapeXml(trait.trim())}</trait>\n`;
        }
      });
      xml += '  </personality>\n\n';
    }

    // Instructions
    if (fields.instructions && fields.instructions.length > 0) {
      xml += '  <instructions>\n';
      fields.instructions.forEach((instruction) => {
        if (instruction.trim()) {
          xml += `    <instruction>${this.escapeXml(
            instruction.trim()
          )}</instruction>\n`;
        }
      });
      xml += '  </instructions>\n\n';
    }

    // Constraints
    if (fields.constraints && fields.constraints.length > 0) {
      xml += '  <constraints>\n';
      fields.constraints.forEach((constraint) => {
        if (constraint.trim()) {
          xml += `    <constraint>${this.escapeXml(
            constraint.trim()
          )}</constraint>\n`;
        }
      });
      xml += '  </constraints>\n\n';
    }

    // Format
    if (fields.outputFormat || fields.tone) {
      xml += '  <format>\n';
      if (fields.outputFormat) {
        xml += `    <output_style>${this.escapeXml(
          fields.outputFormat
        )}</output_style>\n`;
      }
      if (fields.tone) {
        xml += `    <tone>${this.escapeXml(fields.tone)}</tone>\n`;
      }
      xml += '  </format>\n\n';
    }

    // Sample Dialogue (Few-shot examples)
    if (fields.sampleDialogue && fields.sampleDialogue.length > 0) {
      xml += '  <examples>\n';
      fields.sampleDialogue.forEach((example, index) => {
        xml += `    <example id="${index + 1}">\n`;
        xml += `      <user>${this.escapeXml(example.user)}</user>\n`;
        xml += `      <assistant>${this.escapeXml(
          example.assistant
        )}</assistant>\n`;
        xml += '    </example>\n';
      });
      xml += '  </examples>\n\n';
    }

    xml += '</system>';
    return xml;
  }

  /**
   * Parse XML to SystemFields (basic parser)
   */
  static xmlToFields(xml: string): SystemFields | null {
    try {
      const fields: SystemFields = {
        role: '',
        personality: [],
        instructions: [],
      };

      // Extract role
      const roleMatch = xml.match(/<role>(.*?)<\/role>/s);
      if (roleMatch) fields.role = this.unescapeXml(roleMatch[1].trim());

      // Extract personality traits
      const personalityMatch = xml.match(/<personality>(.*?)<\/personality>/s);
      if (personalityMatch) {
        const traits = personalityMatch[1].match(/<trait>(.*?)<\/trait>/gs);
        if (traits) {
          fields.personality = traits.map((t) =>
            this.unescapeXml(t.replace(/<\/?trait>/g, '').trim())
          );
        }
      }

      // Extract instructions
      const instructionsMatch = xml.match(
        /<instructions>(.*?)<\/instructions>/s
      );
      if (instructionsMatch) {
        const instructions = instructionsMatch[1].match(
          /<instruction>(.*?)<\/instruction>/gs
        );
        if (instructions) {
          fields.instructions = instructions.map((i) =>
            this.unescapeXml(i.replace(/<\/?instruction>/g, '').trim())
          );
        }
      }

      // Extract constraints
      const constraintsMatch = xml.match(/<constraints>(.*?)<\/constraints>/s);
      if (constraintsMatch) {
        const constraints = constraintsMatch[1].match(
          /<constraint>(.*?)<\/constraint>/gs
        );
        if (constraints) {
          fields.constraints = constraints.map((c) =>
            this.unescapeXml(c.replace(/<\/?constraint>/g, '').trim())
          );
        }
      }

      // Extract format
      const outputStyleMatch = xml.match(
        /<output_style>(.*?)<\/output_style>/s
      );
      if (outputStyleMatch)
        fields.outputFormat = this.unescapeXml(outputStyleMatch[1].trim());

      const toneMatch = xml.match(/<tone>(.*?)<\/tone>/s);
      if (toneMatch) fields.tone = this.unescapeXml(toneMatch[1].trim());

      // Extract examples
      const examplesMatch = xml.match(/<examples>(.*?)<\/examples>/s);
      if (examplesMatch) {
        const examples = examplesMatch[1].match(
          /<example[^>]*>(.*?)<\/example>/gs
        );
        if (examples) {
          fields.sampleDialogue = examples.map((ex) => {
            const userMatch = ex.match(/<user>(.*?)<\/user>/s);
            const assistantMatch = ex.match(/<assistant>(.*?)<\/assistant>/s);
            return {
              user: userMatch ? this.unescapeXml(userMatch[1].trim()) : '',
              assistant: assistantMatch
                ? this.unescapeXml(assistantMatch[1].trim())
                : '',
            };
          });
        }
      }

      return fields;
    } catch (error) {
      console.error('Failed to parse XML:', error);
      return null;
    }
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Unescape XML special characters
   */
  private static unescapeXml(str: string): string {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
}
