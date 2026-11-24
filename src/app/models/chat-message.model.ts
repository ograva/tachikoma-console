export type ChatMessageType = 'normal' | 'failed-step' | 'rate-limit';

/**
 * Individual chat message interface
 */
export interface ChatMessage {
  id: string;
  sender: string;
  text: string; // Raw text
  html: string; // Parsed markdown HTML
  isUser: boolean;
  agentId?: string;
  timestamp: number;
  /** Orchestration round this message belongs to (CanonicalDataModelSpec: live chat contract) */
  roundId?: number;
  /** Persona step outcome (CanonicalDataModelSpec) */
  status?: 'ok' | 'failed';
  failureCode?: string;
  failureMessage?: string;
  /** Explicit message type for failed-step and rate-limit transcript cards (ORCH-004) */
  messageType?: ChatMessageType;
  /** Number of retry attempts made before failure */
  retryCount?: number;
}

/**
 * ChatMessage model with factory methods
 */
export class ChatMessageModel {
  /**
   * Create a new chat message
   */
  static create(params: {
    sender: string;
    text: string;
    html: string;
    isUser: boolean;
    agentId?: string;
  }): ChatMessage {
    const now = Date.now();
    return {
      id: `msg_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sender: params.sender,
      text: params.text,
      html: params.html,
      isUser: params.isUser,
      agentId: params.agentId,
      timestamp: now,
    };
  }

  /**
   * Normalize message data (ensure all fields exist)
   */
  static normalize(message: Partial<ChatMessage>): ChatMessage {
    const normalized: ChatMessage = {
      id:
        message.id ||
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: message.sender || 'Unknown',
      text: message.text || '',
      html: message.html || message.text || '',
      isUser: message.isUser !== undefined ? message.isUser : false,
      timestamp: message.timestamp || Date.now(),
    };

    // Preserve the documented optional fields (round grouping, failure state,
    // retry metadata). Only defined values are copied so the normalized
    // message never carries `undefined`/`null` toward Firestore (DAT-302).
    for (const field of ChatMessageModel.OPTIONAL_FIELDS) {
      const value = message[field];
      if (value !== undefined && value !== null) {
        (normalized as any)[field] = value;
      }
    }

    return normalized;
  }

  /** Optional ChatMessage fields that normalize() must carry through. */
  static readonly OPTIONAL_FIELDS: readonly (keyof ChatMessage)[] = [
    'agentId',
    'roundId',
    'messageType',
    'retryCount',
    'status',
    'failureCode',
    'failureMessage',
  ];

  /**
   * Type guard to check if an object is a valid ChatMessage
   */
  static isChatMessage(obj: any): obj is ChatMessage {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.sender === 'string' &&
      typeof obj.text === 'string' &&
      typeof obj.isUser === 'boolean'
    );
  }
}
