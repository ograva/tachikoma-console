import { Injectable, signal, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import {
  AgentProfile,
  ChatSession,
  ChatSessionModel,
  ChatMessage,
  ChatMessageModel,
} from '../models';

export { ChatSession, ChatMessage };

@Injectable({
  providedIn: 'root',
})
export class ChatStorageService {
  private readonly STORAGE_KEY = 'tachikoma_chat_sessions';
  private readonly CURRENT_CHAT_KEY = 'tachikoma_current_chat_id';
  private readonly COLLECTION_NAME = 'chat_sessions';

  private sessionsSignal = signal<ChatSession[]>([]);
  private currentChatIdSignal = signal<string | null>(null);

  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

  constructor() {
    this.loadSessions();
    this.loadCurrentChatId();
  }

  private loadSessions(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const sessions = JSON.parse(stored);
        const normalizedSessions = sessions.map((session: any) =>
          ChatSessionModel.fromLocalStorage(session)
        );
        this.sessionsSignal.set(normalizedSessions);
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

  async createNewChat(
    title?: string,
    participatingAgents: AgentProfile[] = [],
    description?: string
  ): Promise<ChatSession> {
    const newChat = ChatSessionModel.create(
      title,
      participatingAgents,
      description
    );

    // Update local state immediately
    this.sessionsSignal.update((sessions) => [newChat, ...sessions]);
    this.currentChatIdSignal.set(newChat.id);
    this.saveSessions();
    this.saveCurrentChatId();

    // Sync to cloud
    await this.syncChatToCloud(newChat);

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

  async updateCurrentChat(
    messages: ChatMessage[],
    conversationSummary: string,
    participatingAgents?: AgentProfile[]
  ): Promise<void> {
    const currentId = this.currentChatIdSignal();
    if (!currentId) return;

    const now = Date.now();
    let updatedChat: ChatSession | null = null;

    // Update local state immediately
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id === currentId) {
          updatedChat = {
            ...session,
            messages,
            conversationSummary,
            participatingAgents:
              participatingAgents || session.participatingAgents,
            updatedAt: now,
          };
          return updatedChat;
        }
        return session;
      })
    );
    this.saveSessions();

    // Sync to cloud
    if (updatedChat) {
      await this.syncChatToCloud(updatedChat);
    }
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    const now = Date.now();
    let updatedChat: ChatSession | null = null;

    // Update local state immediately
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id === chatId) {
          updatedChat = { ...session, title, updatedAt: now };
          return updatedChat;
        }
        return session;
      })
    );
    this.saveSessions();

    // Sync to cloud
    if (updatedChat) {
      await this.syncChatToCloud(updatedChat);
    }
  }

  async updateChatDescription(
    chatId: string,
    description: string | undefined
  ): Promise<void> {
    const now = Date.now();
    let updatedChat: ChatSession | null = null;

    // Update local state immediately
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id === chatId) {
          updatedChat = { ...session, description, updatedAt: now };
          return updatedChat;
        }
        return session;
      })
    );
    this.saveSessions();

    // Sync to cloud
    if (updatedChat) {
      await this.syncChatToCloud(updatedChat);
    }
  }

  async updateChatMetadata(
    chatId: string,
    title: string,
    description: string | undefined
  ): Promise<void> {
    const now = Date.now();
    let updatedChat: ChatSession | null = null;

    // Update local state immediately
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id === chatId) {
          updatedChat = { ...session, title, description, updatedAt: now };
          return updatedChat;
        }
        return session;
      })
    );
    this.saveSessions();

    // Sync to cloud
    if (updatedChat) {
      await this.syncChatToCloud(updatedChat);
    }
  }

  getChatById(chatId: string): ChatSession | undefined {
    return this.sessionsSignal().find((s) => s.id === chatId);
  }

  async deleteChat(chatId: string): Promise<void> {
    // Update local state immediately
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

    // Delete from cloud
    if (this.authService.isRealUser()) {
      try {
        await this.firestoreService.deleteDocument(
          this.COLLECTION_NAME,
          chatId
        );
        console.log(`🗑️ Chat ${chatId} deleted from Firestore`);
      } catch (error) {
        console.error(`Error deleting chat ${chatId} from cloud:`, error);
      }
    }
  }

  async clearAllChats(): Promise<void> {
    const allChatIds = this.sessionsSignal().map((s) => s.id);

    // Update local state immediately
    this.sessionsSignal.set([]);
    this.currentChatIdSignal.set(null);
    this.saveSessions();
    this.saveCurrentChatId();

    // Delete from cloud
    if (this.authService.isRealUser()) {
      for (const chatId of allChatIds) {
        try {
          await this.firestoreService.deleteDocument(
            this.COLLECTION_NAME,
            chatId
          );
        } catch (error) {
          console.error(`Error deleting chat ${chatId} from cloud:`, error);
        }
      }
      console.log(`🗑️ Cleared ${allChatIds.length} chats from Firestore`);
    }
  }

  /**
   * Sync a single chat to cloud
   * Handles large chats by splitting if necessary
   */
  private async syncChatToCloud(chat: ChatSession): Promise<void> {
    if (!this.authService.isRealUser()) {
      console.log(
        '💾 Chat saved locally (not syncing - user not authenticated)'
      );
      return;
    }

    console.log(`☁️ Syncing chat ${chat.id} to Firestore...`);
    try {
      // Check chat size using model helper
      const sizeInKB = ChatSessionModel.getSizeInKB(chat);

      if (ChatSessionModel.exceedsFirestoreLimit(chat)) {
        console.warn(
          `Chat ${chat.id} is large (${sizeInKB.toFixed(
            0
          )}KB), consider pagination`
        );
        // TODO: Implement chat message pagination for very large chats
        // For now, still try to save but log warning
      }

      await this.firestoreService.saveDocument(this.COLLECTION_NAME, chat);
      console.log(`✅ Chat ${chat.id} synced to Firestore successfully`);
    } catch (error) {
      console.error(`❌ Error syncing chat ${chat.id} to cloud:`, error);
    }
  }

  /**
   * Load chats from Firestore (called after login sync)
   * Merges cloud data with existing localStorage data
   */
  async loadFromCloud(): Promise<void> {
    if (!this.authService.isRealUser()) {
      return;
    }

    console.log('📥 Loading chats from Firestore...');
    try {
      const chats = await this.firestoreService.getDocuments<ChatSession>(
        this.COLLECTION_NAME
      );

      if (chats.length > 0) {
        // Normalize chats using model
        const normalizedChats = chats.map((chat) =>
          ChatSessionModel.fromFirestore(chat)
        );

        // Merge with existing localStorage data instead of replacing
        const existingChats = this.sessionsSignal();
        const existingChatIds = new Set(existingChats.map((c) => c.id));

        console.log(
          `📊 Existing chats in localStorage: ${existingChats.length}`,
          existingChats.map((c) => c.id)
        );
        console.log(
          `📊 Chats from Firestore: ${normalizedChats.length}`,
          normalizedChats.map((c) => c.id)
        );

        // Add only chats that don't exist locally
        const newChats = normalizedChats.filter(
          (chat) => !existingChatIds.has(chat.id)
        );

        console.log(
          `📊 New chats to merge: ${newChats.length}`,
          newChats.map((c) => c.id)
        );

        if (newChats.length > 0) {
          this.sessionsSignal.update((sessions) => [...newChats, ...sessions]);
          this.saveSessions();

          const finalCount = this.sessionsSignal().length;
          console.log(
            `📊 Final chat count after merge: ${finalCount}`,
            this.sessionsSignal().map((c) => c.id)
          );
          console.log(
            `✅ Merged ${newChats.length} new chats from Firestore (${chats.length} total in cloud)`
          );
        } else {
          console.log(
            `✅ All ${chats.length} Firestore chats already exist locally`
          );
        }
      } else {
        console.log('📭 No chats found in Firestore');
      }
    } catch (error) {
      console.error('❌ Error loading chats from cloud:', error);
    }
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

  /**
   * Manual sync all local chats to Firestore
   * Handles legacy chat structures by migrating them
   */
  async manualSyncAllChatsToCloud(): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    if (!this.authService.isRealUser()) {
      console.log('❌ Cannot sync - user not authenticated');
      return { success: 0, failed: 0, skipped: 1 };
    }

    console.log('🔄 Starting manual sync of all chats to Firestore...');
    const sessions = this.sessionsSignal();
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const session of sessions) {
      try {
        // Normalize session using model (handles migration)
        const migratedSession = ChatSessionModel.fromLocalStorage(session);

        // Check size before syncing using model helper
        const sizeInKB = ChatSessionModel.getSizeInKB(migratedSession);

        if (ChatSessionModel.exceedsFirestoreLimit(migratedSession)) {
          console.warn(
            `⚠️ Chat ${migratedSession.id} is too large (${sizeInKB.toFixed(
              0
            )}KB) - skipping`
          );
          skipped++;
          continue;
        }

        await this.firestoreService.saveDocument(
          this.COLLECTION_NAME,
          migratedSession
        );
        console.log(`✅ Synced chat: ${migratedSession.title}`);
        success++;
      } catch (error) {
        console.error(`❌ Failed to sync chat ${session.id}:`, error);
        failed++;
      }
    }

    console.log(
      `🎉 Manual sync complete: ${success} succeeded, ${failed} failed, ${skipped} skipped`
    );
    return { success, failed, skipped };
  }

  /**
   * Clear all chats from localStorage only (does not affect Firestore)
   * Used when user logs out to clear local data
   * @returns Number of chats cleared
   */
  clearLocalStorage(): number {
    const count = this.sessionsSignal().length;
    this.sessionsSignal.set([]);
    this.currentChatIdSignal.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_CHAT_KEY);
    return count;
  }

  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
