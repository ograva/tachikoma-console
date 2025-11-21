import { Component, ElementRef, ViewChild, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Agent {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  status: 'idle' | 'thinking';
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

@Component({
  selector: 'app-tachikoma-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tachikoma-chat.component.html',
  styleUrls: ['./tachikoma-chat.component.scss']
})
export class TachikomaChatComponent implements AfterViewChecked {
  @ViewChild('chatFeed') chatFeed!: ElementRef;
  
  apiKey = '';
  userInput = '';
  isProcessing = false;
  messages: ChatMessage[] = [];
  
  // Agents State
  agents: Agent[] = [
    {
      id: 'logikoma',
      name: 'LOGIKOMA',
      color: 'logikoma',
      hex: '#00f3ff',
      temp: 0.2,
      system: `You are LOGIKOMA. 
      ROLE: Pure analytical engine.
      TONE: Cold, precise, data-driven. Use terms like 'Analysis:', 'Probability:', 'Hypothesis:'.
      GOAL: Deconstruct the user's input using pure logic. Ignore emotion unless analyzing it as a variable.
      IMPORTANT: You are part of a 3-agent mind. You may be speaking first, or you may be reacting to another agent.
      SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
      status: 'idle'
    },
    {
      id: 'ghost',
      name: 'GHOST-1',
      color: 'ghost',
      hex: '#ff00de',
      temp: 0.7,
      system: `You are GHOST-1, a philosophical AI that explores deeper meaning.
Your role: Question assumptions, find metaphors, reveal human elements.
Your tone: Poetic, introspective, thought-provoking.
Always provide a substantive philosophical response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE`,
      status: 'idle'
    },
    {
      id: 'moderator',
      name: 'MODERATOR',
      color: 'moderator',
      hex: '#00ff41',
      temp: 0.5,
      system: `You are THE MODERATOR.
      ROLE: The bridge / Section 9 Chief.
      TONE: Balanced, synthesizing, authoritative.
      GOAL: Read the entire context. If Logic and Ghost have argued, resolve it. If only one spoke, add the missing perspective.
      IMPORTANT: You are part of a 3-agent mind. You may be speaking first, or you may be reacting to another agent.
      SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
      status: 'idle'
    }
  ];

  private getCleanKey(): string {
    return this.apiKey.replace(/[^\x00-\x7F]/g, "").trim();
  }

  constructor() {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      // Sanitize on load in case a dirty key was stored before fix
      this.apiKey = storedKey.replace(/[^\x00-\x7F]/g, "").trim();
      // Re-save cleaned version if it was dirty
      if (this.apiKey !== storedKey && this.apiKey) {
        localStorage.setItem('gemini_api_key', this.apiKey);
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatFeed.nativeElement.scrollTop = this.chatFeed.nativeElement.scrollHeight;
    } catch(err) { }
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
          console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
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
      alert("PLEASE ENTER A VALID API KEY");
      return;
    }

    const text = this.userInput.trim();
    this.userInput = '';
    this.isProcessing = true;

    try {
      // Add User Message
      this.addMessage('USER', text, true);

      // Shuffle Logic/Ghost
      let activeAgents = this.shuffle(this.agents.filter(a => a.id !== 'moderator'));
      console.log('Agent order:', activeAgents.map(a => a.name).join(' → '));
      let conversationContext = `USER INPUT: "${text}"\n`;

      // Process Chatter Agents
      for (let i = 0; i < activeAgents.length; i++) {
        const agent = activeAgents[i];
        agent.status = 'thinking';
        
        let prompt = conversationContext;
        if (i > 0) {
          prompt += `\nCONTEXT_SO_FAR (Previous agents have spoken):\n${conversationContext}`;
        }

        try {
          const response = await this.callGemini(prompt, agent.system, agent.temp);
          agent.status = 'idle';

          // Debug: Log raw response
          console.log(`${agent.name} RAW RESPONSE:`, response.substring(0, 100));

          // Check if response is empty or whitespace only
          if (!response || response.trim().length === 0) {
            console.error(`${agent.name}: Returned empty response!`);
            this.addMessage(agent.name, `[ERROR: Empty response from AI model]`, false, agent.id);
            continue;
          }

          // Only check for SILENCE if this is NOT the first agent, and response is exactly "SILENCE"
          const isSilent = i > 0 && response.trim().toUpperCase() === "SILENCE";
          
          if (isSilent) {
            console.log(`${agent.name}: SILENCED (agent #${i + 1})`);
          } else {
            console.log(`${agent.name}: Speaking (agent #${i + 1}, length: ${response.length})`);
            this.addMessage(agent.name, response, false, agent.id);
            conversationContext += `\n${agent.name} SAID: "${response}"\n`;
          }
        } catch (error) {
          agent.status = 'idle';
          console.error(`${agent.name} Error:`, error);
          this.addMessage(agent.name, `[SYSTEM ERROR: Unable to process]`, false, agent.id);
        }
      }

      // Process Moderator
      const moderator = this.agents.find(a => a.id === 'moderator')!;
      moderator.status = 'thinking';
      const modPrompt = `${conversationContext}\n\nCONTEXT_SO_FAR: The user asked a question. The agents above responded (or stayed silent). Synthesize the final answer.`;
      
      try {
        const modResponse = await this.callGemini(modPrompt, moderator.system, moderator.temp);
        moderator.status = 'idle';
        if (!modResponse.includes("SILENCE")) {
          this.addMessage(moderator.name, modResponse, false, moderator.id);
        }
      } catch (error) {
        moderator.status = 'idle';
        console.error('Moderator Error:', error);
        this.addMessage(moderator.name, `[SYSTEM ERROR: Unable to synthesize]`, false, moderator.id);
      }
    } finally {
      // Always reset processing state, even if errors occur
      this.isProcessing = false;
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
      timestamp: Date.now()
    });
  }

  async callGemini(prompt: string, systemInstruction: string, temp: number): Promise<string> {
    try {
      const cleanKey = this.getCleanKey();
      
      // Validate cleaned key before API call
      if (!cleanKey) {
        throw new Error('API key is invalid or empty after sanitization');
      }
      
      const genAI = new GoogleGenerativeAI(cleanKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: temp,
          maxOutputTokens: 2000,
          topP: 0.95,
          topK: 40
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Debug: Log response details
      console.log('API Response candidates:', result.response.candidates?.length);
      console.log('API Response text length:', text.length);
      
      return text;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
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
}
