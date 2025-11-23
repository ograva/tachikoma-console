import { Injectable, signal } from '@angular/core';
import { AgentProfile } from './agent-profile.service';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversationSummary: string;
  participatingAgents: AgentProfile[]; // Store the actual agent profiles used in this chat
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  html: string;
  isUser: boolean;
  agentId?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatStorageService {
  private readonly STORAGE_KEY = 'tachikoma_chat_sessions';
  private readonly CURRENT_CHAT_KEY = 'tachikoma_current_chat_id';

  private sessionsSignal = signal<ChatSession[]>([]);
  private currentChatIdSignal = signal<string | null>(null);

  constructor() {
    this.loadSessions();
    this.loadCurrentChatId();
  }

  private loadSessions(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const sessions = JSON.parse(stored);
        // Migrate legacy chats that don't have participatingAgents
        const migratedSessions = sessions.map((session: any) => ({
          ...session,
          participatingAgents: session.participatingAgents || [],
        }));
        this.sessionsSignal.set(migratedSessions);
      } catch (e) {
        console.error('Error loading chat sessions', e);
        this.sessionsSignal.set([]);
      }
    }
  }

  private loadCurrentChatId(): void {
    const stored = localStorage.getItem(this.CURRENT_CHAT_KEY);
    if (stored) {
      this.currentChatIdSignal.set(stored);
    }
  }

  private saveSessions(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this.sessionsSignal())
    );
  }

  private saveCurrentChatId(): void {
    const currentId = this.currentChatIdSignal();
    if (currentId) {
      localStorage.setItem(this.CURRENT_CHAT_KEY, currentId);
    } else {
      localStorage.removeItem(this.CURRENT_CHAT_KEY);
    }
  }

  getSessions(): ChatSession[] {
    return this.sessionsSignal();
  }

  getCurrentChatId(): string | null {
    return this.currentChatIdSignal();
  }

  getCurrentChat(): ChatSession | null {
    const currentId = this.currentChatIdSignal();
    if (!currentId) return null;
    return this.sessionsSignal().find((s) => s.id === currentId) || null;
  }

  createNewChat(
    title?: string,
    participatingAgents: AgentProfile[] = []
  ): ChatSession {
    const newChat: ChatSession = {
      id: this.generateId(),
      title: title || `Chat ${new Date().toLocaleString()}`,
      messages: [],
      conversationSummary: '',
      participatingAgents: participatingAgents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessionsSignal.update((sessions) => [newChat, ...sessions]);
    this.currentChatIdSignal.set(newChat.id);
    this.saveSessions();
    this.saveCurrentChatId();

    return newChat;
  }

  switchToChat(chatId: string): ChatSession | null {
    const chat = this.sessionsSignal().find((s) => s.id === chatId);
    if (chat) {
      this.currentChatIdSignal.set(chatId);
      this.saveCurrentChatId();
      return chat;
    }
    return null;
  }

  updateCurrentChat(
    messages: ChatMessage[],
    conversationSummary: string,
    participatingAgents?: AgentProfile[]
  ): void {
    const currentId = this.currentChatIdSignal();
    if (!currentId) return;

    this.sessionsSignal.update((sessions) =>
      sessions.map((session) =>
        session.id === currentId
          ? {
              ...session,
              messages,
              conversationSummary,
              participatingAgents:
                participatingAgents || session.participatingAgents,
              updatedAt: Date.now(),
            }
          : session
      )
    );
    this.saveSessions();
  }

  updateChatTitle(chatId: string, title: string): void {
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) =>
        session.id === chatId
          ? { ...session, title, updatedAt: Date.now() }
          : session
      )
    );
    this.saveSessions();
  }

  deleteChat(chatId: string): void {
    this.sessionsSignal.update((sessions) =>
      sessions.filter((s) => s.id !== chatId)
    );

    if (this.currentChatIdSignal() === chatId) {
      const remaining = this.sessionsSignal();
      this.currentChatIdSignal.set(
        remaining.length > 0 ? remaining[0].id : null
      );
      this.saveCurrentChatId();
    }

    this.saveSessions();
  }

  clearAllChats(): void {
    this.sessionsSignal.set([]);
    this.currentChatIdSignal.set(null);
    this.saveSessions();
    this.saveCurrentChatId();
  }

  exportChat(chatId: string): string {
    const chat = this.sessionsSignal().find((s) => s.id === chatId);
    if (!chat) return '';
    return JSON.stringify(chat, null, 2);
  }

  exportAllChats(): string {
    return JSON.stringify(this.sessionsSignal(), null, 2);
  }

  importChat(jsonString: string): boolean {
    try {
      const chat = JSON.parse(jsonString) as ChatSession;
      // Ensure it has required properties
      if (!chat.id || !chat.title || !Array.isArray(chat.messages)) {
        return false;
      }

      // Generate new ID to avoid conflicts
      chat.id = this.generateId();
      chat.updatedAt = Date.now();

      this.sessionsSignal.update((sessions) => [chat, ...sessions]);
      this.saveSessions();
      return true;
    } catch (e) {
      console.error('Error importing chat', e);
      return false;
    }
  }

  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
