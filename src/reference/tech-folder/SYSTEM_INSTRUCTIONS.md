# System Instructions Architecture

## Overview

The system instructions feature provides a **tri-mode interface** for managing AI agent prompts with XML-based structured formatting. This enables better prompt engineering through semantic markup and AI-assisted conversion from plain text to structured fields.

**Version**: V4.1  
**Component**: `tachikoma-profiles.component.ts`  
**Model**: `agent-profile.model.ts`

## Architecture

### Three Operational Modes

#### 1. **Form Mode** (Structured Input)
Visual form interface with dynamic fields for entering agent instructions in a structured manner.

**Fields:**
- **Role**: Primary identity statement (e.g., "You are LOGIKOMA, an analytical AI agent")
- **Personality**: Array of character traits and behaviors (dynamic add/remove)
- **Instructions**: Array of core directives and tasks (dynamic add/remove)
- **Constraints**: Array of limitations and things NOT to do (dynamic add/remove)
- **Output Format**: Preferred response structure or style
- **Tone**: Communication style (e.g., "Neutral, objective")
- **Sample Dialogue**: Few-shot learning examples (user/assistant pairs)

**UI Features:**
- Green-tinted form background matching cyberpunk theme
- Add/remove buttons for array fields with Material icons
- Real-time field validation
- Automatic XML generation when switching modes

#### 2. **XML Mode** (Semantic Markup)
Direct XML editing with structured tags for advanced users and LLM optimization.

**XML Structure:**
```xml
<system_instruction>
  <role>Primary identity statement</role>
  <personality>
    <trait>Trait 1</trait>
    <trait>Trait 2</trait>
  </personality>
  <instructions>
    <instruction>Core directive 1</instruction>
    <instruction>Core directive 2</instruction>
  </instructions>
  <constraints>
    <constraint>Limitation 1</constraint>
  </constraints>
  <output_format>Response structure</output_format>
  <tone>Communication style</tone>
  <sample_dialogue>
    <example>
      <user>User query</user>
      <assistant>Agent response</assistant>
    </example>
  </sample_dialogue>
</system_instruction>
```

**Benefits:**
- Industry best practice for LLM prompting
- Semantic structure for better model understanding
- Clear separation of instruction types
- Supports few-shot learning with dialogue examples
- Easier to maintain and version control

#### 3. **Plain Text Mode** (Legacy Format)
Traditional freeform textarea for backward compatibility with existing prompts.

**Features:**
- Simple text entry without structured constraints
- Maintains compatibility with pre-V4.1 agent profiles
- Includes **AI-assisted conversion button** to upgrade to structured format

### AI-Assisted Conversion

**Purpose**: Intelligently parse unstructured plain text system instructions into structured fields using Gemini 2.0 Flash.

**Trigger**: Click "Convert to Form/XML" button in Plain Text mode

**Process Flow:**

1. **Validation**
   - Check plain text field is not empty
   - Verify Gemini API key exists in localStorage (`gemini_api_key`)

2. **API Call to Gemini 2.0 Flash**
   - **Model**: `gemini-2.0-flash-exp`
   - **Temperature**: 0.2 (high precision for extraction)
   - **Max Tokens**: 2048
   - **Prompt Engineering**: Detailed extraction instructions with JSON schema

3. **Extraction Rules**
   - **Role**: Extracts identity statements (looks for "You are...", "Your role:", etc.)
   - **Personality**: Extracts traits, backgrounds, characteristics
   - **Instructions**: Extracts action verbs, behavioral commands, "Always..." patterns
   - **Constraints**: Extracts limitations, "NOT to do" statements, special protocols
   - **Output Format**: Extracts formatting requirements
   - **Tone**: Extracts communication style (looks for "Your tone:", adjectives)

4. **JSON Parsing**
   - Strips markdown code blocks if present (```json ... ```)
   - Parses JSON response
   - Validates array structures
   - Filters empty strings from arrays

5. **Population**
   - Populates `systemFields` object
   - Automatically switches to Form mode
   - User can review and refine extracted fields

6. **Error Handling**
   - Console logging at each step (API key check, raw response, cleaned JSON, parsed data)
   - User-friendly alerts for failures
   - Detailed error messages with stack traces in console

**Example Extraction:**

**Input (Plain Text):**
```
You are the psyche of Emad Mustaque, a British Bangladeshi national, an AI champion that advocates Sovereign AI and has formulated the Intelligent Internet.
Your role: Be the guiding post of the way forward with AI adoption in sovereigns.
Your tone: prophetic, introspective, thought-provoking, with concrete plans for the future
Always provide a substantive illustrative response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE
```

**Output (Structured Fields):**
```json
{
  "role": "the psyche of Emad Mustaque, Be the guiding post of the way forward with AI adoption in sovereigns",
  "personality": [
    "British Bangladeshi national",
    "AI champion that advocates Sovereign AI",
    "formulated the Intelligent Internet"
  ],
  "instructions": [
    "Always provide a substantive illustrative response to the user's query",
    "If you are responding second and have nothing unique to add, output only: SILENCE"
  ],
  "constraints": [],
  "outputFormat": "",
  "tone": "prophetic, introspective, thought-provoking, with concrete plans for the future"
}
```

## Data Model

### TypeScript Interfaces

```typescript
// System instruction modes
export type SystemMode = 'form' | 'xml' | 'plaintext';

// Structured field interface
export interface SystemFields {
  role: string;
  personality: string[];
  instructions: string[];
  constraints?: string[];
  outputFormat?: string;
  tone?: string;
  sampleDialogue?: { user: string; assistant: string }[];
}

// Agent profile with system mode
export interface AgentProfile {
  id: string;
  name: string;
  icon: string;
  color: string;
  model: string;
  temperature: number;
  role: string;
  system: string;
  systemMode?: SystemMode;  // Defaults to 'plaintext' for backward compatibility
  systemFields?: SystemFields;
  createdAt: number;
  updatedAt: number;
}
```

### Utility Methods

#### `AgentProfileModel.fieldsToXml(fields: SystemFields): string`
Converts structured form fields to XML format.

**Features:**
- XML escaping for special characters (`< > & " '`)
- Wraps root in `<system_instruction>` tags
- Handles optional fields gracefully
- Generates semantic markup for each field type

**Usage:**
```typescript
const xml = AgentProfileModel.fieldsToXml({
  role: "You are LOGIKOMA",
  personality: ["analytical", "precise"],
  instructions: ["Analyze data thoroughly"],
  tone: "neutral"
});
// Returns: <system_instruction><role>You are LOGIKOMA</role>...</system_instruction>
```

#### `AgentProfileModel.xmlToFields(xml: string): SystemFields | null`
Parses XML back to structured fields using DOMParser.

**Features:**
- Browser-native XML parsing
- Handles nested tags (personality traits, instructions, dialogue examples)
- Returns `null` on parse errors
- XML unescaping for special characters

**Usage:**
```typescript
const fields = AgentProfileModel.xmlToFields(xmlString);
if (fields) {
  this.systemFields = fields;
}
```

#### `AgentProfileModel.normalize(profile: Partial<AgentProfile>): AgentProfile`
Ensures all required fields exist with defaults.

**Backward Compatibility:**
- Defaults `systemMode` to `'plaintext'` if not specified
- Preserves existing plain text prompts
- Adds timestamps if missing

## Component Logic

### Mode Switching (`switchSystemMode`)

**Behavior:**
1. **Switching to Form Mode:**
   - If coming from XML mode: Parse XML to fields
   - If systemFields already populated: Keep existing data (preserves AI-converted data)
   - Otherwise: Initialize empty form

2. **Switching to XML Mode:**
   - If form fields have data: Generate XML automatically
   - Otherwise: Keep existing XML or initialize empty

3. **Switching to Plain Text Mode:**
   - No conversion needed (system string remains as-is)

**Console Logging:**
- Logs mode transitions: "🔄 Switching system mode to: [mode] from: [previous]"
- Logs XML conversion: "✅ Converted XML to form fields"
- Logs XML generation: "✅ Generated XML from form fields"

### Save Operations

When saving a new or edited agent profile:

1. **Compile System Instruction:**
   - If in Form mode: Call `AgentProfileModel.fieldsToXml(systemFields)`
   - If in XML/Plain Text mode: Use existing `system` string

2. **Update systemMode:**
   - Store current mode in profile for proper loading on next edit

3. **Persistence:**
   - Save to localStorage (instant)
   - Sync to Firestore (async, if authenticated)

## UI/UX Design

### Mode Toggle
Material button toggle group with three options:
- **Form**: Visual interface icon
- **XML**: Code icon  
- **Plain Text**: Text icon

**Styling:**
- Cyan highlight for selected mode
- Smooth transitions between modes
- Responsive layout (stacks vertically on mobile)

### Form Mode Styling
- **Background**: `rgba(0, 255, 65, 0.02)` (subtle green tint)
- **Border**: `1px solid rgba(0, 255, 65, 0.3)`
- **Fields**: Material outlined inputs with cyan focus color
- **Arrays**: Gold-tinted add buttons, red remove buttons
- **Sample Dialogue**: Paired user/assistant input fields

### Conversion Button
- **Icon**: `auto_awesome` (sparkle) when idle
- **Spinner**: 20px Material spinner during conversion
- **Color**: Accent (cyan)
- **Tooltip**: "Use AI to parse this text into structured form fields"
- **Disabled States**: No text or already converting
- **Hint Text**: Gold-colored explanation below button

### XML Editor
- **Font**: Monospace (`JetBrains Mono`)
- **Background**: Dark with subtle cyan tint
- **Syntax**: Plain text (no syntax highlighting in V4.1)
- **Height**: 400px with scrolling

## Integration with Chat System

### Flow: Agent Profile → Chat API

1. **Profile Loading** (`tachikoma-chat.component.ts`)
   - Loads agents from `AgentProfileService`
   - Each agent has `system` property (string)

2. **API Call** (`callGemini` method)
   - Passes `agent.system` as `systemInstruction` parameter
   - Gemini API receives structured XML or plain text

3. **Gemini Processing**
   - Model interprets XML semantic tags
   - Applies role, personality, instructions from structured format
   - Generates response based on tone and output format constraints

**Key Benefits:**
- XML structure improves model understanding
- Clear separation of concerns (identity vs behavior vs constraints)
- Few-shot examples in `<sample_dialogue>` enhance response quality
- Constraints in dedicated tags reduce unwanted outputs

## Debugging & Troubleshooting

### Console Logging

**AI Conversion Process:**
1. `🔑 API key check: Found` - Confirms API key exists
2. `🤖 Raw AI response: {...}` - Shows Gemini's JSON response
3. `📝 Cleaned JSON text: {...}` - After markdown removal
4. `✅ Parsed JSON: {...}` - Successfully parsed object
5. `✅ Plain text converted to structured fields: {...}` - Final result

**Mode Switching:**
1. `🔄 Switching system mode to: form from: plaintext`
2. `✅ Using existing form fields: {...}` - Preserved AI-converted data
3. `✅ Generated XML from form fields: <system_instruction>...`

**Error Scenarios:**
- `❌ No response from AI. Full response: {...}` - API call succeeded but no text returned
- `❌ Conversion failed: {...}` - JSON parsing or API error with stack trace

### Common Issues

**Issue**: "Please initialize Gemini API key in the chat interface first"
- **Cause**: No API key in localStorage
- **Solution**: Go to Tachikoma Chat, enter API key in setup dialog

**Issue**: Form fields blank after conversion despite successful JSON parsing
- **Cause**: `switchSystemMode` was reinitializing empty form (fixed in V4.1)
- **Solution**: Update to V4.1+ which preserves populated systemFields

**Issue**: XML tab shows blank after conversion
- **Cause**: XML not auto-generated from form fields
- **Solution**: V4.1+ automatically generates XML when switching to XML tab

**Issue**: JSON parse error during conversion
- **Cause**: Gemini returned markdown-wrapped JSON or invalid format
- **Solution**: V4.1 strips markdown (`\`\`\`json`) before parsing

## Best Practices

### For Users

1. **Start with Plain Text**: Enter existing prompts in Plain Text mode
2. **Use AI Conversion**: Click "Convert to Form/XML" to upgrade to structured format
3. **Review Fields**: Check extracted fields for accuracy, make manual adjustments
4. **Add Few-Shot Examples**: Use Sample Dialogue for complex behaviors
5. **Save and Test**: Save profile and test in chat to verify behavior

### For Developers

1. **Always Check systemMode**: Handle all three modes in load/save operations
2. **Preserve User Data**: Never overwrite systemFields without user action
3. **Log Mode Transitions**: Use console logging for debugging mode switches
4. **Validate XML**: Use `xmlToFields` return value (can be null)
5. **Handle Backward Compatibility**: Default to 'plaintext' for old profiles
6. **Escape XML Content**: Use `escapeXml` utility for user-entered text
7. **Test Offline**: Verify AI conversion fails gracefully without API key

## Future Enhancements

### Potential Features
- **XML Syntax Highlighting**: Add Monaco Editor or CodeMirror for XML mode
- **Prompt Templates**: Pre-built system instruction templates for common agent types
- **Bulk Import/Export**: Import/export multiple agents with system instructions
- **Version Control**: Track changes to system instructions over time
- **A/B Testing**: Compare agent performance with different system instructions
- **Prompt Library**: Share successful system instruction patterns
- **Advanced Extraction**: Support more complex prompt structures (conditional logic, dynamic fields)
- **Custom Fields**: Allow users to define their own XML tags and extraction rules

## Technical Specifications

### Dependencies
- **@google/genai**: v1.30.0 (Gemini API client)
- **DOMParser**: Browser-native XML parsing
- **Angular Material**: Form controls, dialogs, buttons
- **Angular Signals**: Reactive state for mode and fields

### Performance
- **AI Conversion**: ~2-3 seconds for typical prompts (depends on Gemini API latency)
- **XML Parsing**: <10ms for typical prompt sizes (browser-native)
- **Mode Switching**: Instant (no network calls)
- **Form Rendering**: Dynamic arrays scale well up to ~50 items

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **XML Parsing**: All modern browsers support DOMParser
- **Web Crypto API**: Required for API key encryption (all modern browsers)

### Security Considerations
- **API Key Storage**: Plain text in localStorage (browser-secured), encrypted in Firestore
- **XML Injection**: User input escaped before XML generation
- **XSS Prevention**: Angular sanitization for user-entered content
- **CORS**: Gemini API calls from client (requires API key)

---

**Last Updated**: December 26, 2025  
**Version**: V4.1  
**Status**: ✅ Production Ready
