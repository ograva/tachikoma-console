import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  AfterViewChecked,
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
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

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
export class TachikomaChatComponent implements AfterViewChecked {
  @ViewChild('chatFeed') chatFeed!: ElementRef;

  apiKey = '';
  userInput = '';
  isProcessing = false;
  messages: ChatMessage[] = [];
  conversationSummary = ''; // Running summary of the conversation
  messagesSinceLastSummary = 0; // Counter for when to trigger summary
  readonly SUMMARY_INTERVAL = 6; // Summarize every 6 exchanges (user + agent responses)

  // Agents State - now loaded dynamically
  agents: Agent[] = [];
  availableAgents: AgentProfile[] = []; // All available agents from profile service
  selectedAgentIds = signal<Set<string>>(new Set()); // IDs of agents selected for new chat
  showAgentSelector = signal<boolean>(false); // Show agent selection dialog

  // Chat history drawer state
  historyDrawerOpened = signal<boolean>(false);

  // File context for all agents
  uploadedFiles = signal<
    Array<{ name: string; content: string; type: string }>
  >([]);
  isUploadingFile = signal<boolean>(false);

  // Auto-scroll control
  private shouldAutoScroll = true;
  private readonly SCROLL_THRESHOLD = 150; // pixels from bottom to consider "at bottom"

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
    private chatStorage: ChatStorageService
  ) {
    // Load agent profiles from service
    this.loadAgents();

    // Load current chat or create new one
    this.loadCurrentChat();

    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      // Sanitize on load in case a dirty key was stored before fix
      this.apiKey = storedKey.replace(/[^\x00-\x7F]/g, '').trim();
      // Re-save cleaned version if it was dirty
      if (this.apiKey !== storedKey && this.apiKey) {
        localStorage.setItem('gemini_api_key', this.apiKey);
      }
    }
  }

  ngAfterViewChecked() {
    this.smartScroll();
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

  createNewChat(title?: string): void {
    // Get selected agents
    const selectedAgents = this.availableAgents.filter((a) =>
      this.selectedAgentIds().has(a.id)
    );

    if (selectedAgents.length === 0) {
      alert('Please select at least one agent to participate in the chat.');
      return;
    }

    const newChat = this.chatStorage.createNewChat(title, selectedAgents);
    this.messages = [];
    this.conversationSummary = '';
    this.messagesSinceLastSummary = 0;
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

  deleteChat(chatId: string): void {
    this.chatStorage.deleteChat(chatId);
    this.loadCurrentChat();
  }

  private saveCurrentChat(): void {
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
    }));
    this.chatStorage.updateCurrentChat(
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

  smartScroll(): void {
    try {
      const element = this.chatFeed.nativeElement;

      // Only auto-scroll if shouldAutoScroll is true (user hasn't scrolled up)
      if (this.shouldAutoScroll) {
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
  }

  private isUserNearBottom(): boolean {
    try {
      const element = this.chatFeed.nativeElement;
      const scrollPosition = element.scrollTop + element.clientHeight;
      const scrollHeight = element.scrollHeight;

      // User is "near bottom" if within SCROLL_THRESHOLD pixels from bottom
      return scrollHeight - scrollPosition < this.SCROLL_THRESHOLD;
    } catch (err) {
      return true; // Default to true if can't determine
    }
  }

  onScroll(): void {
    // Update shouldAutoScroll based on user's scroll position
    // This allows users to scroll up to read earlier messages
    this.shouldAutoScroll = this.isUserNearBottom();
  }

  scrollToBottom(): void {
    // Force scroll to bottom (used when user sends a message)
    try {
      this.shouldAutoScroll = true;
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
      localStorage.setItem('gemini_api_key', cleanKey);

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

    try {
      // Add User Message
      this.addMessage('USER', text, true);

      // Force scroll to bottom when user sends a message
      this.scrollToBottom();

      // Build full conversation history for context
      let conversationHistory = this.buildConversationHistory();

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

        let prompt = conversationContext;
        if (i > 0) {
          prompt += `\nCONTEXT_SO_FAR (Previous agents have spoken):\n${conversationContext}`;
        }

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
        this.chatStorage.updateChatTitle(chatId, cleanTitle);
        console.log('✨ Generated chat title:', cleanTitle);
      }
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to simple truncation if AI fails
      const fallbackTitle =
        firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
      this.chatStorage.updateChatTitle(chatId, fallbackTitle);
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
      this.saveCurrentChat();

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

    // Auto-save to storage
    this.saveCurrentChat();
  }

  async callGemini(
    prompt: string,
    systemInstruction: string,
    temp: number
  ): Promise<string> {
    try {
      const cleanKey = this.getCleanKey();

      // Validate cleaned key before API call
      if (!cleanKey) {
        throw new Error('API key is invalid or empty after sanitization');
      }

      const ai = new GoogleGenAI({ apiKey: cleanKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: temp,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        },
      });

      const text = response.text || '';

      // Debug: Log response details
      console.log(
        'API Response candidates:',
        response.candidates?.length
      );
      console.log('API Response text length:', text.length);

      return text;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw error; // Re-throw to let caller handle
    }
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
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 20;
    const lineHeight = 6;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += lineHeight * 2;

    // Export date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Messages
    doc.setFontSize(10);

    for (const msg of this.messages) {
      const time = this.formatTimestamp(msg.timestamp);
      const sender = msg.isUser ? 'USER' : msg.sender;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPosition = 20;
      }

      // Sender header
      doc.setFont('helvetica', 'bold');
      doc.text(`[${time}] ${sender}:`, margin, yPosition);
      yPosition += lineHeight;

      // Message content - split into lines
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(msg.text, maxLineWidth);

      for (const line of lines) {
        if (yPosition > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }

      yPosition += lineHeight; // Extra space between messages
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
      .substring(0, 50);
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${safeName}-${timestamp}.${extension}`;
  }
}
