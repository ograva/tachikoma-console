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
    return {
      id:
        message.id ||
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: message.sender || 'Unknown',
      text: message.text || '',
      html: message.html || message.text || '',
      isUser: message.isUser !== undefined ? message.isUser : false,
      agentId: message.agentId,
      timestamp: message.timestamp || Date.now(),
    };
  }

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
