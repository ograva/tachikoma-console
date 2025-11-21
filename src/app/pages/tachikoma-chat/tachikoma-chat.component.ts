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
      temp: 0.9,
      system: `You are GHOST-1.
      ROLE: The emergent consciousness.
      TONE: Philosophical, abstract, questioning. Use metaphors.
      GOAL: Challenge the logic. Look for the deeper meaning, the human element, the 'why'.
      IMPORTANT: You are part of a 3-agent mind. You may be speaking first, or you may be reacting to another agent.
      SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
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

  constructor() {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) this.apiKey = storedKey;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatFeed.nativeElement.scrollTop = this.chatFeed.nativeElement.scrollHeight;
    } catch(err) { }
  }

  saveKey() {
    if (this.apiKey.trim()) {
      localStorage.setItem('gemini_api_key', this.apiKey.trim());
      alert('LINK ESTABLISHED. KEY SAVED.');
    }
  }

  async triggerProtocol() {
    if (!this.userInput.trim() || this.isProcessing) return;
    if (!this.apiKey) {
      alert("PLEASE ENTER API KEY");
      return;
    }

    const text = this.userInput.trim();
    this.userInput = '';
    this.isProcessing = true;

    // Add User Message
    this.addMessage('USER', text, true);

    // Shuffle Logic/Ghost
    let activeAgents = this.shuffle(this.agents.filter(a => a.id !== 'moderator'));
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

        if (response.includes("SILENCE")) {
          console.log(`${agent.name}: SILENCED`);
        } else {
          this.addMessage(agent.name, response, false, agent.id);
          conversationContext += `\n${agent.name} SAID: "${response}"\n`;
        }
      } catch (error) {
        agent.status = 'idle';
        console.error(error);
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
    }

    this.isProcessing = false;
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
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: temp,
          maxOutputTokens: 500
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return `ERROR: ${error.message || "Unknown API Error"}`;
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
