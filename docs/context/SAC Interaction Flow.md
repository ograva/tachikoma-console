To achieve the multi-agent "round table" effect without a heavy backend, the interaction flow must follow a precise client-side loop. Because the system uses structured JSON schemas and a "Snowball" history pattern, the flow is highly predictable but yields emergent behavioral outcomes.  
Here is exactly how data and control flow through the app during a typical chat session:

## **1\. The Trigger Phase (User Initiative)**

1. **Input:** The user types a message (e.g., *"Should AI have rights?"*) into the Angular chat console and hits send.  
2. **Local Append:** The app immediately renders the user's chat bubble on the screen.  
3. **Context Injection:** The user's input is pushed into the active client-side array (history\[\]).

## **2\. The Orchestration Loop (The Round Table)**

Instead of a single response, the app triggers a cascading chain of agent turns managed sequentially by the front-end code. A standard turn loop follows this progression:

\[User Message\] ──\> \[1. Moderator Evaluates\]   
                         │  
                         ├──\> \[2. Logikoma (Data/Logic)\] ──\> Appends to History  
                         │  
                         └──\> \[3. Ghost-1 (Philosophy)\]   ──\> Appends to History

### **Turn A: The Moderator's Opening**

* **The Call:** The app triggers the GeminiService, packaging the entire history and prepending the **Moderator Persona Seed**.  
* **The Mission:** The Moderator analyzes the user's prompt, establishes the baseline context for the debate, and formally tags which agent should address it first.

### **Turn B: Logikoma’s Analysis (The Machine)**

* **The History Snowball:** The app takes the user message \+ the Moderator's response, pushes them to history\[\], and passes them to the next API call with the **Logikoma Persona Seed**.  
* **The Output:** Logikoma processes the text and returns a strict JSON package containing its data-driven view and its hidden logical validation checks.

### **Turn C: Ghost-1’s Counterpoint (The Soul)**

* **The Escalation:** The app appends Logikoma's JSON dialogue to the history array. It calls the API a third time, now utilizing the **Ghost-1 Persona Seed**.  
* **The Output:** Ghost-1 reads the entire debate string, evaluates Logikoma’s logic against its internal existential parameters, and crafts a philosophical rebuttal.

## **3\. The API Payload & Execution Layer**

Every time a specific agent's turn is called in the loop above, the transaction with the gemini-3.5-flash API follows a strict data contract:

* **Payload Construction:** The service packages the dynamic request payload:  
  * system\_instruction: The XML Personality Seed of the active agent.  
  * safety\_settings: Relaxed bounds (BLOCK\_ONLY\_HIGH) to ensure high-conviction debate.  
  * generationConfig: Strict schema forcing a application/json mime-type response.  
  * contents: The accumulated, chronological history\[\] array.

## **4\. The Response & Render Layer (The Ghost View)**

When the API returns the JSON string for an agent, the Angular app parses the payload and splits the stream visually:

┌────────────────────────────────────────────────────────┐  
│  \[LOGIKOMA LOG\]                                        │  
│  Thought: "User is emotional. Correcting with data..." │  \<-- Faint/Glitchy Font  
├────────────────────────────────────────────────────────┤  
│  "Analysis indicates a 94.2% probability that..."      │  \<-- Standard Chat Bubble  
└────────────────────────────────────────────────────────┘

1. **The Split:** The app reads internal\_monologue and injects it into the faint "Ghost View" line, while mapping dialogue to the prominent speaker bubble.  
2. **Memory Update:** The raw stringified JSON response is pushed into the permanent background history\[\] array as a model role turn, priming the next agent to know exactly what its peer just thought and said.

Would you like to explore how to design the "Cool-down Protocol" within this loop to ensure the automated agent replies don't breach your Per-Minute Request (RPM) limits?