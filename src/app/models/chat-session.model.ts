import { SyncableData } from './syncable-data.model';
import { AgentProfile, AgentProfileModel } from './agent-profile.model';
import { ChatMessage, ChatMessageModel } from './chat-message.model';

export interface ChatSession extends SyncableData {
  id: string;
  title: string;
  description?: string; // Context/description for agents
  messages: ChatMessage[];
  conversationSummary: string;
  participatingAgents: AgentProfile[]; // Store the actual agent profiles used in this chat
  createdAt: number;
  updatedAt: number;
}

/**
 * ChatSession model with normalization and factory methods
 */
export class ChatSessionModel {
  /**
   * Default values for optional fields
   */
  static readonly DEFAULTS = {
    description: '',
    messages: [] as ChatMessage[],
    conversationSummary: '',
    participatingAgents: [] as AgentProfile[],
  };

  /**
   * Normalize chat session to ensure all optional fields have proper defaults
   * Use this when loading data from any source (localStorage, Firestore)
   */
  static normalize(session: Partial<ChatSession>): ChatSession {
    return {
      ...session,
      description: session.description ?? ChatSessionModel.DEFAULTS.description,
      messages: session.messages ?? ChatSessionModel.DEFAULTS.messages,
      conversationSummary:
        session.conversationSummary ??
        ChatSessionModel.DEFAULTS.conversationSummary,
      participatingAgents:
        session.participatingAgents ??
        ChatSessionModel.DEFAULTS.participatingAgents,
      createdAt: session.createdAt ?? Date.now(),
      updatedAt: session.updatedAt ?? Date.now(),
    } as ChatSession;
  }

  /**
   * Create a session from Firestore data
   */
  static fromFirestore(data: any): ChatSession {
    const normalized = ChatSessionModel.normalize(data);
    // Ensure messages are properly normalized
    normalized.messages = normalized.messages.map((msg: any) =>
      ChatMessageModel.normalize(msg)
    );
    // Ensure participating agents are properly normalized (handles old data without model field)
    normalized.participatingAgents = normalized.participatingAgents.map(
      (agent: any) => AgentProfileModel.normalize(agent)
    );
    return normalized;
  }

  /**
   * Create a session from localStorage data
   */
  static fromLocalStorage(data: any): ChatSession {
    const normalized = ChatSessionModel.normalize(data);
    // Ensure messages are properly normalized
    normalized.messages = normalized.messages.map((msg: any) =>
      ChatMessageModel.normalize(msg)
    );
    // Ensure participating agents are properly normalized (handles old data without model field)
    normalized.participatingAgents = normalized.participatingAgents.map(
      (agent: any) => AgentProfileModel.normalize(agent)
    );
    return normalized;
  }

  /**
   * Create a new chat session
   */
  static create(
    title?: string,
    participatingAgents: AgentProfile[] = [],
    description?: string
  ): ChatSession {
    const now = Date.now();
    return {
      id: `chat_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `Chat ${new Date().toLocaleString()}`,
      description: description,
      messages: [],
      conversationSummary: '',
      participatingAgents: participatingAgents,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Type guard to check if an object is a valid ChatSession
   */
  static isChatSession(obj: any): obj is ChatSession {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      Array.isArray(obj.messages)
    );
  }

  /**
   * Get the size of a chat session in KB (for Firestore 1MB limit checks)
   */
  static getSizeInKB(session: ChatSession): number {
    const json = JSON.stringify(session);
    return new Blob([json]).size / 1024;
  }

  /**
   * Check if a chat session exceeds Firestore size limits
   */
  static exceedsFirestoreLimit(session: ChatSession): boolean {
    return ChatSessionModel.getSizeInKB(session) > 900; // Leave buffer below 1MB
  }
}
