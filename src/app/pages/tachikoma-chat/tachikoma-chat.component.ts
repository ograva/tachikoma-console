import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { GoogleGenAI } from '@google/genai';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
  AgentProfileService,
  AgentProfile,
} from '../../services/agent-profile.service';
import {
  ChatStorageService,
  ChatSession,
  ChatMessage as StoredChatMessage,
} from '../../services/chat-storage.service';
import {
  UserProfileService,
  GeminiModel,
} from '../../services/user-profile.service';
import { AuthService } from '../../services/auth.service';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { MatDialog } from '@angular/material/dialog';
import { ChatExplainerDialogComponent } from './chat-explainer-dialog.component';
import { ApiKeySyncDialogComponent } from './api-key-sync-dialog.component';

interface Agent {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  role: 'chatter' | 'moderator';
  status: 'idle' | 'thinking';
  silenceProtocol?: 'standard' | 'always_speak' | 'conservative' | 'agreeable';
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string; // Raw text
  html: string; // Parsed markdown
  isUser: boolean;
  agentId?: string;
  timestamp: number;
}

import { MaterialModule } from '../../material.module';

@Component({
  selector: 'app-tachikoma-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatSidenavModule],
  templateUrl: './tachikoma-chat.component.html',
  styleUrls: ['./tachikoma-chat.component.scss'],
})
export class TachikomaChatComponent {
  @ViewChild('chatFeed') chatFeed!: ElementRef;

  private userProfileService = inject(UserProfileService);
  private authService = inject(AuthService);

  apiKey = '';
  selectedModel: GeminiModel = 'gemini-2.5-flash';
  userInput = '';
  chatTitle = ''; // Title for new chat
  chatDescription = ''; // Description for new chat context
  isProcessing = false;
  showNeuralActivity = signal<boolean>(false); // Show/hide neural activity panel
  messages: ChatMessage[] = [];
  conversationSummary = ''; // Running summary of the conversation
  messagesSinceLastSummary = 0; // Counter for when to trigger summary
  readonly SUMMARY_INTERVAL = 6; // Summarize every 6 exchanges (user + agent responses)

  // API Request Metrics for O(n) complexity tracking
  requestMetrics = {
    totalRequests: 0,
    requestsThisSession: 0,
    averageResponseTime: 0,
    lastRequestTime: 0,
    requestTimestamps: [] as number[],
    errorsThisSession: 0,
    requestsPerMessage: 0,
  };
  readonly REQUEST_WINDOW_MS = 60000; // Track requests in 1-minute windows
  readonly MIN_REQUEST_INTERVAL_MS = 1000; // Minimum 1 second between requests

  // Get rate limit from user profile (default to free tier)
  get maxRequestsPerMinute(): number {
    return this.userProfileService.profile()?.rateLimitRPM || 15;
  }

  // Get chat username from profile service
  get chatUsername(): string {
    return this.userProfileService.getChatUsername();
  }

  // Get current chat description
  get currentChatDescription(): string | undefined {
    return this.chatStorage.getCurrentChat()?.description;
  }

  // Agents State - now loaded dynamically
  agents: Agent[] = [];
  availableAgents: AgentProfile[] = []; // All available agents from profile service
  selectedAgentIds = signal<Set<string>>(new Set()); // IDs of agents selected for new chat
  showAgentSelector = signal<boolean>(false); // Show agent selection dialog

  // Chat history drawer state
  historyDrawerOpened = signal<boolean>(false);

  // Edit chat dialog state
  showEditDialog = signal<boolean>(false);
  editingChatId = signal<string | null>(null);
  editChatTitle = '';
  editChatDescription = '';

  // File context for all agents
  uploadedFiles = signal<
    Array<{ name: string; content: string; type: string }>
  >([]);
  isUploadingFile = signal<boolean>(false);

  // Auto-scroll has been removed to prevent automatic scrolling when new messages arrive.
  // User scroll position is now preserved - they can manually scroll to see new messages.

  // Export constants
  private readonly MAX_FILENAME_LENGTH = 50;
  private readonly PDF_MARGIN = 15;
  private readonly PDF_LINE_HEIGHT = 6;
  private readonly PDF_PAGE_BOTTOM_MARGIN = 30;
  private readonly PDF_CONTENT_BOTTOM_MARGIN = 20;

  get isInitialized(): boolean {
    return this.apiKey.length > 0;
  }

  get hasUploadedFiles(): boolean {
    return this.uploadedFiles().length > 0;
  }

  private getCleanKey(): string {
    return this.apiKey.replace(/[^\x00-\x7F]/g, '').trim();
  }

  constructor(
    private profileService: AgentProfileService,
    private chatStorage: ChatStorageService,
    private dialog: MatDialog
  ) {
    // Load agent profiles from service
    this.loadAgents();

    // Load current chat or create new one
    this.loadCurrentChat();

    // Load API key and model from user profile if authenticated
    // Otherwise, fallback to localStorage for backward compatibility
    this.loadApiSettings();

    // Show explainer dialog on first visit
    this.checkAndShowExplainer();

    // React to user profile changes (e.g., after login)
    effect(() => {
      const profile = this.userProfileService.profile();
      if (profile && this.authService.isAuthenticated()) {
        // Update API key and model from profile when it changes
        if (profile.geminiApiKey) {
          this.apiKey = profile.geminiApiKey;
        }
        if (profile.geminiModel) {
          this.selectedModel = profile.geminiModel;
        }
      }
    });

    // React to authentication state changes
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        // User just logged in - check if we need to sync localStorage key to profile
        this.checkAndSyncApiKey();
      }
    });
  }

  /**
   * Check if user has seen the explainer and show if first time
   */
  private checkAndShowExplainer(): void {
    const hasSeenExplainer = localStorage.getItem(
      'tachikoma_chat_explainer_seen'
    );
    if (!hasSeenExplainer) {
      // Small delay to let the component render first
      setTimeout(() => {
        this.dialog
          .open(ChatExplainerDialogComponent, {
            width: '600px',
            maxWidth: '90vw',
            disableClose: false,
            panelClass: 'chat-explainer-dialog',
          })
          .afterClosed()
          .subscribe(() => {
            // Mark as seen
            localStorage.setItem('tachikoma_chat_explainer_seen', 'true');
          });
      }, 500);
    }
  }

  /**
   * Check if we need to sync API key from localStorage to user profile
   * Called when user becomes authenticated
   */
  private async checkAndSyncApiKey(): Promise<void> {
    // Only proceed if authenticated
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // Check if profile already has an API key
    const profileKey = this.userProfileService.getGeminiApiKey();
    if (profileKey) {
      // Profile already has a key, no need to sync
      return;
    }

    // Check if localStorage has an API key
    const localStorageKey = localStorage.getItem('gemini_api_key');
    if (!localStorageKey || !localStorageKey.trim()) {
      // No key in localStorage to sync
      return;
    }

    // Check if user has already declined syncing this key
    const syncDeclined = localStorage.getItem('api_key_sync_declined');
    if (syncDeclined === localStorageKey) {
      // User previously declined syncing this specific key
      return;
    }

    // Use setTimeout to wait for the UI to settle after login and avoid showing
    // multiple dialogs simultaneously (e.g., with the explainer dialog)
    // The delay is intentionally generous to ensure a good user experience
    setTimeout(() => {
      this.dialog
        .open(ApiKeySyncDialogComponent, {
          width: '500px',
          maxWidth: '90vw',
          disableClose: false,
        })
        .afterClosed()
        .subscribe(async (accepted: boolean) => {
          if (accepted) {
            // User wants to sync - save to profile
            try {
              const cleanKey = localStorageKey
                .replace(/[^\x00-\x7F]/g, '')
                .trim();
              await this.userProfileService.updateGeminiApiKey(cleanKey);
              console.log('API key synced to user profile');
              // Remove the declined flag if it exists
              localStorage.removeItem('api_key_sync_declined');
            } catch (error: any) {
              console.error('Failed to sync API key to profile:', error);
              const errorMessage = error?.message || 'Unknown error';
              alert(
                `Failed to save API key to profile: ${errorMessage}\n\nPlease try again from your Profile page or check your internet connection.`
              );
            }
          } else {
            // User declined - remember this decision for this specific key
            localStorage.setItem('api_key_sync_declined', localStorageKey);
            console.log('User declined API key sync');
          }
        });
    }, 1000);
  }

  /**
   * Load API settings from user profile or localStorage
   */
  private loadApiSettings(): void {
    if (this.authService.isAuthenticated()) {
      // For authenticated users: Check profile first, then localStorage
      const profileKey = this.userProfileService.getGeminiApiKey();
      const profileModel = this.userProfileService.getGeminiModel();

      if (profileKey) {
        // API key exists in profile - use it
        this.apiKey = profileKey;
        this.selectedModel = profileModel;
        console.log('API key loaded from user profile');
      } else {
        // No API key in profile - check localStorage
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
          // Sanitize on load
          this.apiKey = storedKey.replace(/[^\x00-\x7F]/g, '').trim();
          console.log('API key loaded from localStorage (authenticated user)');
          // Note: We'll prompt to sync to profile after auth state stabilizes
        }
      }
    } else {
      // For unauthenticated users: Only check localStorage
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        // Sanitize on load in case a dirty key was stored before fix
        this.apiKey = storedKey.replace(/[^\x00-\x7F]/g, '').trim();
        // Re-save cleaned version if it was dirty
        if (this.apiKey !== storedKey && this.apiKey) {
          localStorage.setItem('gemini_api_key', this.apiKey);
        }
        console.log('API key loaded from localStorage (unauthenticated user)');
      }
    }
  }

  loadAgents(): void {
    const profiles = this.profileService.getProfiles();
    this.agents = profiles.map((p) => ({ ...p, status: 'idle' as const }));
    this.availableAgents = profiles;
  }

  loadAgentsFromChat(chatAgents: AgentProfile[]): void {
    // Load agents specifically from a saved chat (may include deleted/modified agents)
    this.agents = chatAgents.map((p) => ({ ...p, status: 'idle' as const }));
  }

  loadCurrentChat(): void {
    const currentChat = this.chatStorage.getCurrentChat();
    if (currentChat) {
      this.messages = currentChat.messages;
      this.conversationSummary = currentChat.conversationSummary;
      // Load agents from this specific chat
      if (
        currentChat.participatingAgents &&
        currentChat.participatingAgents.length > 0
      ) {
        this.loadAgentsFromChat(currentChat.participatingAgents);
      } else {
        // Fallback to all agents if chat has no saved agents (legacy chats)
        this.loadAgents();
      }
      // Reset summary counter based on messages
      this.messagesSinceLastSummary =
        currentChat.messages.length % this.SUMMARY_INTERVAL;
    } else {
      // Create a new chat if none exists
      this.showNewChatDialog();
    }
  }

  showNewChatDialog(): void {
    // Reset selection to all agents by default
    const allIds = new Set(this.availableAgents.map((a) => a.id));
    this.selectedAgentIds.set(allIds);
    this.showAgentSelector.set(true);
  }

  async createNewChat(): Promise<void> {
    // Get selected agents
    const selectedAgents = this.availableAgents.filter((a) =>
      this.selectedAgentIds().has(a.id)
    );

    if (selectedAgents.length === 0) {
      alert('Please select at least one agent to participate in the chat.');
      return;
    }

    const title = this.chatTitle.trim() || undefined;
    const description = this.chatDescription.trim() || undefined;
    const newChat = await this.chatStorage.createNewChat(
      title,
      selectedAgents,
      description
    );
    this.messages = [];
    this.conversationSummary = '';
    this.messagesSinceLastSummary = 0;
    this.chatTitle = ''; // Clear title after creating chat
    this.chatDescription = ''; // Clear description after creating chat
    this.loadAgentsFromChat(selectedAgents);
    this.showAgentSelector.set(false);
    this.historyDrawerOpened.set(false);
  }

  cancelNewChat(): void {
    this.showAgentSelector.set(false);
    // If no chat exists, load default agents
    if (!this.chatStorage.getCurrentChat()) {
      this.loadAgents();
    }
  }

  showEditChatDialog(chatId: string): void {
    const session = this.chatStorage.getChatById(chatId);
    if (session) {
      this.editingChatId.set(chatId);
      this.editChatTitle = session.title;
      this.editChatDescription = session.description || '';
      this.showEditDialog.set(true);
    }
  }

  async saveEditedChat(): Promise<void> {
    const chatId = this.editingChatId();
    if (!chatId) return;

    const title = this.editChatTitle.trim() || this.chatStorage.getChatById(chatId)?.title || 'Untitled Chat';
    const description = this.editChatDescription.trim() || undefined;

    await this.chatStorage.updateChatMetadata(chatId, title, description);
    
    // Description updates automatically via getter when chat is updated
    this.cancelEditChat();
  }

  cancelEditChat(): void {
    this.showEditDialog.set(false);
    this.editingChatId.set(null);
    this.editChatTitle = '';
    this.editChatDescription = '';
  }

  toggleAgentSelection(agentId: string): void {
    this.selectedAgentIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(agentId)) {
        newIds.delete(agentId);
      } else {
        newIds.add(agentId);
      }
      return newIds;
    });
  }

  selectAllAgents(): void {
    const allIds = new Set(this.availableAgents.map((a) => a.id));
    this.selectedAgentIds.set(allIds);
  }

  deselectAllAgents(): void {
    this.selectedAgentIds.set(new Set());
  }

  switchChat(chatId: string): void {
    const chat = this.chatStorage.switchToChat(chatId);
    if (chat) {
      this.messages = chat.messages;
      this.conversationSummary = chat.conversationSummary;
      // Load agents from this specific chat
      if (chat.participatingAgents && chat.participatingAgents.length > 0) {
        this.loadAgentsFromChat(chat.participatingAgents);
      } else {
        // Fallback to all agents if chat has no saved agents
        this.loadAgents();
      }
      this.messagesSinceLastSummary =
        chat.messages.length % this.SUMMARY_INTERVAL;
      this.historyDrawerOpened.set(false); // Close drawer after switching
    }
  }

  toggleHistoryDrawer(): void {
    this.historyDrawerOpened.update((v) => !v);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isUploadingFile.set(true);

    try {
      const filesArray = Array.from(input.files);
      const filePromises = filesArray.map((file) => this.readFileContent(file));
      const fileContents = await Promise.all(filePromises);

      this.uploadedFiles.update((existing) => [...existing, ...fileContents]);

      console.log(
        `📎 ${fileContents.length} file(s) uploaded and available to all agents`
      );
    } catch (error) {
      console.error('Error reading files:', error);
      alert('Error reading file(s). Please try again.');
    } finally {
      this.isUploadingFile.set(false);
      input.value = ''; // Reset input
    }
  }

  private readFileContent(
    file: File
  ): Promise<{ name: string; content: string; type: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve({
          name: file.name,
          content: content,
          type: file.type,
        });
      };

      reader.onerror = () => reject(reader.error);

      // Read as text for most file types
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xml') ||
        file.name.endsWith('.log')
      ) {
        reader.readAsText(file);
      } else {
        // For other types, try to read as text anyway
        reader.readAsText(file);
      }
    });
  }

  removeFile(index: number): void {
    this.uploadedFiles.update((files) => files.filter((_, i) => i !== index));
  }

  clearAllFiles(): void {
    this.uploadedFiles.set([]);
  }

  getChatSessions(): ChatSession[] {
    return this.chatStorage.getSessions();
  }

  getCurrentChatId(): string | null {
    return this.chatStorage.getCurrentChatId();
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.chatStorage.deleteChat(chatId);
    this.loadCurrentChat();
  }

  private async saveCurrentChat(): Promise<void> {
    // Save with current participating agents
    const agentProfiles: AgentProfile[] = this.agents.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      hex: a.hex,
      temp: a.temp,
      system: a.system,
      role: a.role,
      silenceProtocol: a.silenceProtocol,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    await this.chatStorage.updateCurrentChat(
      this.messages,
      this.conversationSummary,
      agentProfiles
    );
  }

  getAgentColor(agentId?: string): string {
    if (!agentId) return '#888888';
    const agent = this.agents.find((a) => a.id === agentId);
    return agent?.hex || '#888888';
  }

  scrollToBottom(): void {
    // Force scroll to bottom (used when user sends a message)
    try {
      // Use setTimeout to ensure DOM has updated before scrolling
      // This is necessary because the message is added to the array
      // but the DOM hasn't re-rendered yet
      setTimeout(() => {
        if (this.chatFeed?.nativeElement) {
          this.chatFeed.nativeElement.scrollTop =
            this.chatFeed.nativeElement.scrollHeight;
        }
      }, 0);
    } catch (err) {}
  }

  async saveKey() {
    const cleanKey = this.getCleanKey();
    if (cleanKey) {
      this.apiKey = cleanKey;

      // Always save to localStorage for unauthenticated users
      localStorage.setItem('gemini_api_key', cleanKey);

      // If authenticated, also save to user profile
      if (this.authService.isAuthenticated()) {
        try {
          await this.userProfileService.updateGeminiApiKey(cleanKey);
          console.log('API key saved to both localStorage and user profile');
        } catch (error: any) {
          console.error('Failed to save API key to profile:', error);
          const errorMessage = error?.message || 'Unknown error';
          // Show warning since localStorage save worked but profile sync failed
          alert(
            `⚠️ WARNING: KEY SAVED LOCALLY BUT PROFILE SYNC FAILED\n\nYour API key is saved locally and will work on this device.\n\nProfile sync error: ${errorMessage}\n\nTo sync to your profile, please visit the Profile page.`
          );
          return;
        }
      }

      // List available models
      await this.listAvailableModels();

      alert('LINK ESTABLISHED. KEY SAVED.');
    } else {
      alert('INVALID KEY DETECTED');
    }
  }

  async listAvailableModels() {
    try {
      const cleanKey = this.getCleanKey();
      if (!cleanKey) return;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('=== AVAILABLE GEMINI MODELS ===');
      if (data.models) {
        data.models.forEach((model: any) => {
          console.log(`Model: ${model.name}`);
          console.log(`  Display Name: ${model.displayName}`);
          console.log(
            `  Supported Methods: ${model.supportedGenerationMethods?.join(
              ', '
            )}`
          );
          console.log(`  Input Token Limit: ${model.inputTokenLimit}`);
          console.log(`  Output Token Limit: ${model.outputTokenLimit}`);
          console.log('---');
        });
      }
    } catch (error) {
      console.error('Error listing models:', error);
    }
  }

  async triggerProtocol() {
    if (!this.userInput.trim() || this.isProcessing) return;

    // Validate the CLEANED key to ensure it's not empty after sanitization
    const cleanKey = this.getCleanKey();
    if (!cleanKey) {
      alert('PLEASE ENTER A VALID API KEY');
      return;
    }

    const text = this.userInput.trim();
    this.userInput = '';
    this.isProcessing = true;
    this.showNeuralActivity.set(true); // Show panel when processing starts

    try {
      // Log complexity analysis before processing
      this.logComplexityAnalysis(text);

      // Add User Message with custom username from profile
      this.addMessage(this.chatUsername, text, true);

      // Force scroll to bottom when user sends a message
      this.scrollToBottom();

      // Build full conversation history for context
      let conversationHistory = this.buildConversationHistory();

      // Include chat description if available (provides context to agents)
      const chatDescription = this.currentChatDescription;
      if (chatDescription) {
        conversationHistory = `[CHAT CONTEXT: ${chatDescription}]\n\n${conversationHistory}`;
      }

      // Shuffle chatter agents (role === 'chatter')
      let activeAgents = this.shuffle(
        this.agents.filter((a) => a.role === 'chatter')
      );
      console.log('Agent order:', activeAgents.map((a) => a.name).join(' → '));
      let conversationContext = `${conversationHistory}\n\nCURRENT USER INPUT: "${text}"\n`;

      // Process Chatter Agents
      for (let i = 0; i < activeAgents.length; i++) {
        const agent = activeAgents[i];
        agent.status = 'thinking';

        // Build prompt with current context (includes file content and agent responses so far)
        let prompt = conversationContext;

        try {
          const response = await this.callGemini(
            prompt,
            agent.system,
            agent.temp
          );
          agent.status = 'idle';

          // Debug: Log raw response
          console.log(
            `${agent.name} RAW RESPONSE:`,
            response.substring(0, 100)
          );

          // Check if response is empty or whitespace only
          if (!response || response.trim().length === 0) {
            console.error(`${agent.name}: Returned empty response!`);
            this.addMessage(
              agent.name,
              `[ERROR: Empty response from AI model]`,
              false,
              agent.id
            );
            continue;
          }

          // Only check for SILENCE if this is NOT the first agent, and response is exactly "SILENCE"
          const isSilent = i > 0 && response.trim().toUpperCase() === 'SILENCE';

          if (isSilent) {
            console.log(`${agent.name}: SILENCED (agent #${i + 1})`);
          } else {
            console.log(
              `${agent.name}: Speaking (agent #${i + 1}, length: ${
                response.length
              })`
            );
            this.addMessage(agent.name, response, false, agent.id);
            conversationContext += `\n${agent.name} SAID: "${response}"\n`;
          }
        } catch (error) {
          agent.status = 'idle';
          console.error(`${agent.name} Error:`, error);
          this.addMessage(
            agent.name,
            `[SYSTEM ERROR: Unable to process]`,
            false,
            agent.id
          );
        }
      }

      // Process Moderators (agents with role === 'moderator')
      const moderators = this.agents.filter((a) => a.role === 'moderator');

      for (const moderator of moderators) {
        moderator.status = 'thinking';
        const modPrompt = `${conversationContext}\n\nCONTEXT_SO_FAR: You have the full conversation history above. The user just asked a new question, and the agents responded (or stayed silent). Synthesize the final answer taking into account the conversation history.`;

        try {
          const modResponse = await this.callGemini(
            modPrompt,
            moderator.system,
            moderator.temp
          );
          moderator.status = 'idle';
          if (!modResponse.includes('SILENCE')) {
            this.addMessage(moderator.name, modResponse, false, moderator.id);
          }
        } catch (error) {
          moderator.status = 'idle';
          console.error(`${moderator.name} Error:`, error);
          this.addMessage(
            moderator.name,
            `[SYSTEM ERROR: Unable to synthesize]`,
            false,
            moderator.id
          );
        }
      }

      // Auto-generate chat title from first user message using AI
      const currentChat = this.chatStorage.getCurrentChat();
      if (
        currentChat &&
        currentChat.messages.length === 1 &&
        currentChat.title.startsWith('Chat ')
      ) {
        await this.generateChatTitle(text, currentChat.id);
      }

      // Increment message counter and generate summary if needed
      this.messagesSinceLastSummary++;
      if (this.messagesSinceLastSummary >= this.SUMMARY_INTERVAL) {
        console.log('🔄 Generating conversation summary...');
        await this.generateSummary();
      }
    } finally {
      // Always reset processing state, even if errors occur
      this.isProcessing = false;
      this.showNeuralActivity.set(false); // Hide panel when processing completes
    }
  }

  async generateChatTitle(firstMessage: string, chatId: string): Promise<void> {
    try {
      const titlePrompt = `Generate a concise, descriptive title (max 6 words) for a chat that starts with this message: "${firstMessage}"

Respond with ONLY the title, no quotes, no explanation. Make it brief and specific.`;

      const title = await this.callGemini(
        titlePrompt,
        'You are a helpful assistant that creates brief, descriptive titles for conversations.',
        0.3 // Low temperature for consistent, focused titles
      );

      // Clean up the title (remove quotes, trim, limit length)
      const cleanTitle = title.replace(/["']/g, '').trim().substring(0, 60);

      if (cleanTitle) {
        await this.chatStorage.updateChatTitle(chatId, cleanTitle);
        console.log('✨ Generated chat title:', cleanTitle);
      }
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to simple truncation if AI fails
      const fallbackTitle =
        firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
      await this.chatStorage.updateChatTitle(chatId, fallbackTitle);
    }
  }

  buildConversationHistory(): string {
    // Build a text representation of the conversation history
    let history = '';

    // Include uploaded files context if any
    if (this.uploadedFiles().length > 0) {
      history += 'UPLOADED FILES (shared context for all agents):\n';
      for (const file of this.uploadedFiles()) {
        history += `\n=== FILE: ${file.name} ===\n`;
        history += `${file.content}\n`;
        history += `=== END OF FILE ===\n\n`;
      }
      history += '\n';
    }

    // Include the running summary if it exists
    if (this.conversationSummary) {
      history += `CONVERSATION SUMMARY (from earlier exchanges):\n${this.conversationSummary}\n\n`;
    } // Get recent messages (last 6 messages to keep context manageable)
    const recentMessages = this.messages.slice(-6);

    if (recentMessages.length === 0) {
      return 'CONVERSATION HISTORY: [New conversation]';
    }

    history += 'RECENT CONVERSATION:\n';
    for (const msg of recentMessages) {
      if (msg.isUser) {
        history += `USER: ${msg.text}\n`;
      } else {
        history += `${msg.sender}: ${msg.text}\n`;
      }
      history += '\n';
    }

    return history;
  }

  async generateSummary(): Promise<void> {
    try {
      // Get all messages except the most recent exchange
      const messagesToSummarize = this.messages.slice(0, -3);

      if (messagesToSummarize.length === 0) {
        return;
      }

      // Build the text to summarize
      let textToSummarize = '';
      if (this.conversationSummary) {
        textToSummarize += `PREVIOUS SUMMARY:\n${this.conversationSummary}\n\n`;
      }
      textToSummarize += 'NEW MESSAGES TO INCORPORATE:\n';

      for (const msg of messagesToSummarize) {
        if (msg.isUser) {
          textToSummarize += `USER: ${msg.text}\n`;
        } else {
          textToSummarize += `${msg.sender}: ${msg.text}\n`;
        }
      }

      // Find a moderator to do the summary
      const moderator = this.agents.find((a) => a.role === 'moderator');
      if (!moderator) {
        return;
      }

      const summaryPrompt = `${textToSummarize}\n\nTASK: Create a concise summary (2-3 sentences) of the key topics, questions, and conclusions discussed so far. Focus on what's important to remember for future context.`;

      const summary = await this.callGemini(
        summaryPrompt,
        'You are a conversation summarizer. Create brief, focused summaries that capture essential context.',
        0.3
      );

      this.conversationSummary = summary;
      this.messagesSinceLastSummary = 0;

      // Save updated summary
      await this.saveCurrentChat();

      console.log('📝 Conversation summary updated:', summary);
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  }

  addMessage(sender: string, text: string, isUser: boolean, agentId?: string) {
    const html = marked.parse(text) as string;
    this.messages.push({
      id: Date.now().toString() + Math.random(),
      sender,
      text,
      html,
      isUser,
      agentId,
      timestamp: Date.now(),
    });

    // Auto-save to storage (fire and forget)
    this.saveCurrentChat().catch((err) =>
      console.error('Error saving chat:', err)
    );
  }

  async callGemini(
    prompt: string,
    systemInstruction: string,
    temp: number
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      await this.checkRateLimit();

      const cleanKey = this.getCleanKey();

      // Validate cleaned key before API call
      if (!cleanKey) {
        throw new Error('API key is invalid or empty after sanitization');
      }

      // Track request metrics
      this.requestMetrics.totalRequests++;
      this.requestMetrics.requestsThisSession++;
      this.requestMetrics.requestTimestamps.push(startTime);
      this.requestMetrics.lastRequestTime = startTime;

      // Clean up old timestamps (keep only last minute)
      this.requestMetrics.requestTimestamps =
        this.requestMetrics.requestTimestamps.filter(
          (ts) => startTime - ts < this.REQUEST_WINDOW_MS
        );

      console.log(
        `📊 API Request #${this.requestMetrics.totalRequests} | RPM: ${this.requestMetrics.requestTimestamps.length}`
      );

      const ai = new GoogleGenAI({ apiKey: cleanKey });

      const response = await ai.models.generateContent({
        model: this.selectedModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: temp,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        },
      });

      // Track response time
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      console.log(
        `✅ Request completed in ${responseTime}ms | Avg: ${Math.round(
          this.requestMetrics.averageResponseTime
        )}ms`
      );

      // Check if response was blocked by safety filters
      if (response.promptFeedback?.blockReason) {
        const blockReason = response.promptFeedback.blockReason;
        const blockMessage =
          response.promptFeedback.blockReasonMessage || 'Content was blocked';
        console.error(
          'Content blocked by safety filters:',
          blockReason,
          blockMessage
        );
        throw new Error(
          `Content blocked by safety filters: ${blockReason}. ${blockMessage}`
        );
      }

      const text = response.text || '';

      // Debug: Log response details
      console.log('API Response candidates:', response.candidates?.length);
      console.log('API Response text length:', text.length);

      return text;
    } catch (error: any) {
      this.requestMetrics.errorsThisSession++;
      console.error(
        `❌ Gemini API Error [${this.requestMetrics.errorsThisSession} errors this session]:`,
        error
      );

      // Analyze error type for better debugging
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        console.error(
          '🚨 RATE LIMIT ERROR: Too many requests. Implement throttling.'
        );
      } else if (
        error.message?.includes('401') ||
        error.message?.includes('authentication')
      ) {
        console.error('🔑 AUTH ERROR: Invalid API key.');
      } else if (error.message?.includes('timeout')) {
        console.error('⏱️ TIMEOUT ERROR: Request took too long.');
      }

      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Check rate limit before making API request
   * Implements exponential backoff if too many requests
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Minimum interval between requests
    const timeSinceLastRequest = now - this.requestMetrics.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
      const waitTime = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      console.log(
        `⏳ Throttling: waiting ${waitTime}ms before next request...`
      );
      await this.sleep(waitTime);
    }

    // Check requests per minute (use dynamic limit from user profile)
    const recentRequests = this.requestMetrics.requestTimestamps.filter(
      (ts) => now - ts < this.REQUEST_WINDOW_MS
    );
    const maxRPM = this.maxRequestsPerMinute;

    if (recentRequests.length >= maxRPM) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = this.REQUEST_WINDOW_MS - (now - oldestRequest) + 1000; // Add 1s buffer
      console.warn(
        `⚠️ RATE LIMIT: ${
          recentRequests.length
        }/${maxRPM} requests in last minute. Waiting ${Math.round(
          waitTime / 1000
        )}s...`
      );
      await this.sleep(waitTime);
    }
  }

  /**
   * Update running average of response times
   */
  private updateAverageResponseTime(newResponseTime: number): void {
    const currentAvg = this.requestMetrics.averageResponseTime;
    const totalRequests = this.requestMetrics.totalRequests;

    // Weighted average: more weight to recent measurements
    this.requestMetrics.averageResponseTime =
      currentAvg === 0
        ? newResponseTime
        : (currentAvg * (totalRequests - 1) + newResponseTime) / totalRequests;
  }

  /**
   * Sleep utility for throttling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log O(n) complexity analysis for current protocol execution
   */
  logComplexityAnalysis(userMessage: string): void {
    const numAgents = this.agents.length;
    const numChatters = this.agents.filter((a) => a.role === 'chatter').length;
    const numModerators = this.agents.filter(
      (a) => a.role === 'moderator'
    ).length;

    // Base requests: 1 per chatter + 1 per moderator
    const baseRequests = numChatters + numModerators;

    // Additional requests: title generation (if first message) + summary (every N messages)
    const additionalRequests =
      (this.messages.length === 0 ? 1 : 0) + // Title generation
      (this.messagesSinceLastSummary >= this.SUMMARY_INTERVAL ? 1 : 0); // Summary

    const totalExpectedRequests = baseRequests + additionalRequests;

    this.requestMetrics.requestsPerMessage = totalExpectedRequests;

    console.log('🔬 O(n) COMPLEXITY ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `👥 Total Agents: ${numAgents} (${numChatters} chatters + ${numModerators} moderators)`
    );
    console.log(`📨 Expected API Requests: ${totalExpectedRequests}`);
    console.log(`  ├─ Agent responses: ${baseRequests}`);
    console.log(`  ├─ Title generation: ${this.messages.length === 0 ? 1 : 0}`);
    console.log(
      `  └─ Summary generation: ${
        this.messagesSinceLastSummary >= this.SUMMARY_INTERVAL ? 1 : 0
      }`
    );
    console.log(`⚡ Complexity: O(n) where n = number of agents`);
    console.log(`📊 Current Session Stats:`);
    console.log(`  ├─ Total requests: ${this.requestMetrics.totalRequests}`);
    console.log(
      `  ├─ Requests this session: ${this.requestMetrics.requestsThisSession}`
    );
    console.log(`  ├─ Errors: ${this.requestMetrics.errorsThisSession}`);
    console.log(
      `  ├─ Avg response time: ${Math.round(
        this.requestMetrics.averageResponseTime
      )}ms`
    );
    console.log(
      `  ├─ Requests in last minute: ${this.requestMetrics.requestTimestamps.length}`
    );
    console.log(
      `  └─ Rate limit: ${this.maxRequestsPerMinute} requests/min (${
        this.maxRequestsPerMinute === 15
          ? 'Free'
          : this.maxRequestsPerMinute === 60
          ? 'Pay-as-you-go'
          : 'Paid'
      } tier)`
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Export functionality
  showExportMenu = signal<boolean>(false);

  toggleExportMenu(): void {
    this.showExportMenu.update((v) => !v);
  }

  closeExportMenu(): void {
    this.showExportMenu.set(false);
  }

  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  private getPlainTextTranscript(): string {
    const currentChat = this.chatStorage.getCurrentChat();
    const title = currentChat?.title || 'Chat Transcript';
    const date = new Date().toLocaleString();

    let transcript = `=== ${title} ===\n`;
    transcript += `Exported: ${date}\n`;
    transcript += `${'='.repeat(50)}\n\n`;

    for (const msg of this.messages) {
      const time = this.formatTimestamp(msg.timestamp);
      const sender = msg.isUser ? 'USER' : msg.sender;
      transcript += `[${time}] ${sender}:\n`;
      transcript += `${msg.text}\n\n`;
    }

    return transcript;
  }

  exportAsText(): void {
    const transcript = this.getPlainTextTranscript();
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const filename = this.getSafeFilename('txt');
    saveAs(blob, filename);
    this.closeExportMenu();
  }

  exportAsPdf(): void {
    const doc = new jsPDF();
    const currentChat = this.chatStorage.getCurrentChat();
    const title = currentChat?.title || 'Chat Transcript';

    // Set up document
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - this.PDF_MARGIN * 2;
    let yPosition = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, this.PDF_MARGIN, yPosition);
    yPosition += this.PDF_LINE_HEIGHT * 2;

    // Export date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Exported: ${new Date().toLocaleString()}`,
      this.PDF_MARGIN,
      yPosition
    );
    yPosition += this.PDF_LINE_HEIGHT * 2;

    // Messages
    doc.setFontSize(10);

    for (const msg of this.messages) {
      const time = this.formatTimestamp(msg.timestamp);
      const sender = msg.isUser ? 'USER' : msg.sender;

      // Check if we need a new page
      if (
        yPosition >
        doc.internal.pageSize.getHeight() - this.PDF_PAGE_BOTTOM_MARGIN
      ) {
        doc.addPage();
        yPosition = 20;
      }

      // Sender header
      doc.setFont('helvetica', 'bold');
      doc.text(`[${time}] ${sender}:`, this.PDF_MARGIN, yPosition);
      yPosition += this.PDF_LINE_HEIGHT;

      // Message content - split into lines
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(msg.text, maxLineWidth);

      for (const line of lines) {
        if (
          yPosition >
          doc.internal.pageSize.getHeight() - this.PDF_CONTENT_BOTTOM_MARGIN
        ) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, this.PDF_MARGIN, yPosition);
        yPosition += this.PDF_LINE_HEIGHT;
      }

      yPosition += this.PDF_LINE_HEIGHT; // Extra space between messages
    }

    const filename = this.getSafeFilename('pdf');
    doc.save(filename);
    this.closeExportMenu();
  }

  async exportAsWord(): Promise<void> {
    const currentChat = this.chatStorage.getCurrentChat();
    const title = currentChat?.title || 'Chat Transcript';

    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 32,
          }),
        ],
      })
    );

    // Export date
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Exported: ${new Date().toLocaleString()}`,
            size: 20,
            italics: true,
          }),
        ],
      })
    );

    // Empty line
    paragraphs.push(new Paragraph({}));

    // Messages
    for (const msg of this.messages) {
      const time = this.formatTimestamp(msg.timestamp);
      const sender = msg.isUser ? 'USER' : msg.sender;

      // Sender header
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${time}] ${sender}:`,
              bold: true,
              size: 22,
            }),
          ],
        })
      );

      // Message content - split by newlines to preserve formatting
      const textLines = msg.text.split('\n');
      for (const line of textLines) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22,
              }),
            ],
          })
        );
      }

      // Empty line between messages
      paragraphs.push(new Paragraph({}));
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const filename = this.getSafeFilename('docx');
    saveAs(blob, filename);
    this.closeExportMenu();
  }

  private getSafeFilename(extension: string): string {
    const currentChat = this.chatStorage.getCurrentChat();
    const title = currentChat?.title || 'chat-transcript';
    // Sanitize filename: remove special characters, replace spaces with dashes
    const safeName = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, this.MAX_FILENAME_LENGTH);
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${safeName}-${timestamp}.${extension}`;
  }
}
