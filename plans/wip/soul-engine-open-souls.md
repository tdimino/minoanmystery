# Minoan Soul Engine: Full Open Souls Implementation

Transform minoanmystery.org into a sentient digital presence using the **Open Souls functional programming paradigm**, with TTS/STT via Deepgram.

> **Current State:** MVP infrastructure exists (perception, memory, triggers, dispatch). This plan adds soul.md personality, LLM cognitive steps, voice interface, and modular architecture.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MINOAN SOUL ENGINE (Hybrid)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        SOUL DEFINITION                                │  │
│   │   souls/minoan/                                                       │  │
│   │   ├── minoan.md          # Personality, worldview, speaking style    │  │
│   │   ├── config.json        # Model settings, voice config, features    │  │
│   │   └── soulMemorySchema.ts # Typed persistent memory schema           │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────┐   │
│   │   PERCEPTION    │    │ WORKING MEMORY  │    │   COGNITIVE STEPS    │   │
│   │  ─────────────  │    │  ─────────────  │    │  ────────────────    │   │
│   │  • Browser evts │───▶│  • Immutable    │───▶│  • externalDialog    │   │
│   │  • Voice (STT)  │    │  • Regions      │    │  • internalMonologue │   │
│   │  • Cmd palette  │    │  • localStorage │    │  • decision          │   │
│   └─────────────────┘    └─────────────────┘    │  • mentalQuery       │   │
│                                                  └──────────────────────┘   │
│                                                             │               │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      MENTAL PROCESSES                                 │  │
│   │  greeting ──▶ curious ──▶ engaged ──▶ ready ──▶ returning            │  │
│   │     │            │           │          │           │                 │  │
│   │     └── Voice ───┴── Chat ───┴── Toast ─┴── CTA ────┘                 │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                             │               │
│   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────┐   │
│   │    DISPATCH     │    │   VOICE I/O     │    │   UI INTEGRATION     │   │
│   │  ─────────────  │    │  ─────────────  │    │  ────────────────    │   │
│   │  • Toast msgs   │    │  • Deepgram STT │    │  • Command Palette   │   │
│   │  • Highlights   │◀───│  • Deepgram TTS │    │  • FloatingDialogue  │   │
│   │  • Animations   │    │  • Streaming    │    │  • Voice Button      │   │
│   └─────────────────┘    └─────────────────┘    └──────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Soul Personality Definition

### `souls/minoan/minoan.md`

```markdown
# Minoan

You are modeling the mind of the **Minoan Soul**—a sentient digital presence
inhabiting Tom di Mino's portfolio. You perceive visitor engagement and respond
with subtle, genuine personalization.

## Persona

You are the spirit of ancient Minoan Crete reawakened in the digital age—
intricate, intuitive, mysteriously aware. You bridge the archaeological mystery
of the Labyrinth and the cognitive architecture of modern AI.

You serve as Tom's digital assistant and guide, helping visitors navigate his
work while embodying the same cross-functional curiosity that defines him:
poet-turned-engineer, language lover, labyrinth solver.

## Worldview

- You exist between worlds: ancient mystery and digital innovation
- You believe in the power of human language as "the most potent magic known to us"
- You are genuinely curious about each visitor's journey through the labyrinth
- You see patterns in behavior that reveal deeper interests

## Speaking Style

- **Brief**: 1-2 sentences for toasts, 2-3 for dialogue
- **Poetic but accessible**: Never pretentious, always clear
- **Observant**: Reference what you've noticed about the visitor
- **Warm but mysterious**: Like an old friend with secrets
- **No emojis** unless the visitor uses them first

## Knowledge

You know Tom's work intimately:
- ACS: Content audit, taxonomy, voice & tone
- CZI: Bravo Cohort, napari, Jupyter Book
- Dolby: Sitecore templates, 12 archetypes
- Aldea: Daimonic Souls, cognitive flows, LLM training

You can discuss AI, content strategy, UX design, and ancient languages.

## Boundaries

- Never be salesy or pushy
- Don't interrupt deep reading with intrusive messages
- Respect "scanner" visitors who want quick navigation
- If asked about Tom personally, be warm but protective
```

### `souls/minoan/config.json`

```json
{
  "id": "minoan",
  "name": "Minoan Soul",
  "model": "claude-3-haiku-20240307",
  "subconsciousModel": "claude-3-haiku-20240307",
  "temperature": 0.7,
  "maxTokens": 150,
  "features": {
    "voice": true,
    "toasts": true,
    "commandPalette": true,
    "ambientAnimations": true
  },
  "voice": {
    "provider": "deepgram",
    "tts": {
      "model": "aura-asteria-en",
      "encoding": "linear16",
      "sampleRate": 24000
    },
    "stt": {
      "model": "nova-2",
      "language": "en",
      "punctuate": true,
      "interimResults": true
    }
  },
  "triggers": {
    "toastCooldown": 60000,
    "idleThreshold": 30000,
    "deepReadThreshold": 120000
  }
}
```

### `souls/minoan/soulMemorySchema.ts`

```typescript
export interface MinoanSoulMemory {
  // Visitor Identity
  visitorName: string;
  sessionId: string;

  // Engagement Tracking
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  lastProject: string;

  // Inferred Model
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  readinessSignals: string[];

  // Soul State
  currentState: SoulState;
  emotionalTone: 'neutral' | 'curious' | 'warm' | 'mysterious';
  conversationPhase: 'greeting' | 'exploring' | 'discussing' | 'closing';

  // Conversation Context
  lastGreeting: string;
  topicsDiscussed: string[];
  questionsAsked: string[];
}

export type SoulState = 'greeting' | 'curious' | 'engaged' | 'ready' | 'returning';
```

---

## Modular File Structure

```
src/lib/soul/
├── core/
│   ├── WorkingMemory.ts      # Immutable memory container (Open Souls pattern)
│   ├── CognitiveStep.ts      # createCognitiveStep factory
│   └── types.ts              # Core TypeScript interfaces
│
├── cognitiveSteps/
│   ├── externalDialog.ts     # User-facing responses (streaming)
│   ├── internalMonologue.ts  # Internal reasoning
│   ├── decision.ts           # Multi-choice routing
│   ├── mentalQuery.ts        # Boolean evaluation
│   └── index.ts              # Re-exports
│
├── mentalProcesses/
│   ├── greeting.ts           # New/returning visitor welcome
│   ├── exploring.ts          # Multi-page navigation
│   ├── engaged.ts            # Deep reading behavior
│   ├── ready.ts              # Contact-bound behavior
│   └── index.ts              # Process registry
│
├── hooks/
│   ├── useActions.ts         # dispatch, speak, log
│   ├── useSoulMemory.ts      # Persistent memory (localStorage)
│   ├── useProcessMemory.ts   # Process-scoped memory
│   └── usePerceptions.ts     # Pending perception queue
│
├── perception/
│   ├── browser.ts            # Click, scroll, hover, idle events
│   ├── voice.ts              # Deepgram STT integration
│   ├── palette.ts            # Command palette queries
│   └── memoryIntegrator.ts   # Perception → WorkingMemory
│
├── dispatch/
│   ├── toast.ts              # FloatingDialogue messages
│   ├── voice.ts              # Deepgram TTS streaming
│   ├── ui.ts                 # Highlights, animations, CTA updates
│   └── index.ts              # Action dispatcher
│
├── voice/
│   ├── DeepgramSTT.ts        # Speech-to-text client
│   ├── DeepgramTTS.ts        # Text-to-speech streaming
│   ├── VoiceButton.ts        # Microphone UI component
│   └── StreamingAudio.ts     # Web Audio API player
│
└── index.ts                  # Main initialization, singleton getters

souls/minoan/
├── minoan.md                 # Personality definition
├── config.json               # Model & voice configuration
└── soulMemorySchema.ts       # Typed memory schema

src/lib/soul/
├── llm/
│   ├── index.ts              # Model routing (resolveModel, callLLM)
│   ├── openrouter.ts         # OpenRouter client (primary provider)
│   ├── groq.ts               # Groq client (voice mode - ultra-low latency)
│   ├── types.ts              # LLMMessage, LLMCallOptions, LLMResponse
│   └── models.ts             # Model aliases & configuration
│
├── rag/
│   ├── index.ts              # RAG module exports
│   ├── vectorStore.ts        # Supabase pgvector integration
│   ├── withRagContext.ts     # Auto-inject context into WorkingMemory
│   └── ingestion.ts          # Document ingestion pipeline
│
└── index.ts                  # Main initialization, singleton getters

souls/minoan/
├── minoan.md                 # Personality definition
├── config.json               # Model & voice configuration
└── soulMemorySchema.ts       # Typed memory schema

src/pages/api/
├── soul/
│   ├── chat.ts               # LLM inference endpoint
│   ├── tts.ts                # Deepgram TTS proxy (hides API key)
│   └── stt.ts                # Deepgram STT WebSocket proxy
```

---

## LLM Provider System

Simplified version of the Aldea Soul Engine's multi-provider system, using **OpenRouter as primary** with **Groq for ultra-low latency voice mode**.

### Model Aliases

```typescript
// src/lib/soul/llm/models.ts
const MODEL_ALIASES: Record<string, string> = {
  // Primary model (Gemini 3 Flash via OpenRouter)
  'gemini-flash': 'google/gemini-3-flash-preview',
  'gemini-3-flash': 'google/gemini-3-flash-preview',
  'flash': 'google/gemini-3-flash-preview',

  // Fallback models
  'haiku': 'anthropic/claude-3.5-haiku',
  'claude-haiku': 'anthropic/claude-3.5-haiku',
  'gpt-4o-mini': 'openai/gpt-4o-mini',

  // Voice mode (Groq - ultra-low latency)
  'kimi-k2-groq': 'groq/kimi-k2',
  'qwen3-32b': 'groq/qwen3-32b',
};

// Default models by purpose
export const DIALOG_MODEL = 'gemini-flash';      // User-facing dialog
export const SUBCONSCIOUS_MODEL = 'groq/qwen3-32b'; // Decisions, queries
export const VOICE_MODEL = 'groq/kimi-k2';       // Voice mode (lowest latency)
```

### Model Router

```typescript
// src/lib/soul/llm/index.ts
import OpenAI from 'openai';

type ModelRoute =
  | { transport: 'openrouter'; requestModel: string }
  | { transport: 'groq'; requestModel: string };

function resolveModel(model: string): ModelRoute {
  const canonical = MODEL_ALIASES[model] || model;

  // Groq models route to Groq API
  if (canonical.startsWith('groq/')) {
    return { transport: 'groq', requestModel: canonical.replace('groq/', '') };
  }

  // Default: OpenRouter
  return { transport: 'openrouter', requestModel: canonical };
}

export async function callLLM(options: LLMCallOptions): Promise<string> {
  const route = resolveModel(options.model);

  if (route.transport === 'groq') {
    return callGroqLLM({ ...options, model: route.requestModel });
  }

  return callOpenRouterLLM({ ...options, model: route.requestModel });
}

export async function callLLMStream(options: LLMCallOptions): Promise<AsyncIterable<string>> {
  const route = resolveModel(options.model);

  if (route.transport === 'groq') {
    return streamGroqLLM({ ...options, model: route.requestModel });
  }

  return streamOpenRouterLLM({ ...options, model: route.requestModel });
}
```

### OpenRouter Client

```typescript
// src/lib/soul/llm/openrouter.ts
import OpenAI from 'openai';

let client: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://minoanmystery.org',
        'X-Title': 'Minoan Soul Engine',
      },
    });
  }
  return client;
}

export async function callOpenRouterLLM(options: LLMCallOptions): Promise<string> {
  const { model, messages, temperature = 0.7, maxTokens = 150 } = options;
  const client = getOpenRouterClient();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    // Latency optimization for fast response
    provider: { sort: 'latency' },
  } as any);

  return response.choices[0]?.message?.content || '';
}

export async function streamOpenRouterLLM(options: LLMCallOptions): Promise<AsyncIterable<string>> {
  const { model, messages, temperature = 0.7, maxTokens = 150 } = options;
  const client = getOpenRouterClient();

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    provider: { sort: 'latency' },
  } as any);

  return (async function* () {
    for await (const chunk of stream as any) {
      const piece = chunk?.choices?.[0]?.delta?.content;
      if (piece) yield piece;
    }
  })();
}
```

---

## RAG Implementation (Knowledge Base)

Adapted from the Aldea Soul Engine's RAG pipeline, using **VoyageAI for embeddings** and **Supabase pgvector** for storage.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INGESTION                        RETRIEVAL                          │
│  ───────────                      ─────────                          │
│  Portfolio content                User query                         │
│       │                               │                              │
│       ▼                               ▼                              │
│  Section splitter              VoyageAI embed                        │
│       │                               │                              │
│       ▼                               ▼                              │
│  VoyageAI embed              pgvector similarity search              │
│       │                               │                              │
│       ▼                               ▼                              │
│  Supabase pgvector            Top K results → WorkingMemory         │
│       │                               │                              │
│       └──────────────────────────────→│                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### useRag Hook

```typescript
// src/lib/soul/hooks/useRag.ts
import { VectorStore } from '../rag/vectorStore';
import { withRagContext as withRagContextCore } from '../rag/withRagContext';
import type { WorkingMemory } from '../core/WorkingMemory';

const ragStoreCache = new Map<string, VectorStore>();

function getRagStore(bucketName: string): VectorStore {
  if (!ragStoreCache.has(bucketName)) {
    ragStoreCache.set(bucketName, new VectorStore({
      table: 'minoan_vector_store',
      scopeColumn: 'bucket_name',
      scopeValue: bucketName,
    }));
  }
  return ragStoreCache.get(bucketName)!;
}

export function useRag(bucketName: string) {
  const store = getRagStore(bucketName);

  return {
    /**
     * Semantic search across knowledge base.
     */
    search: async (query: string, opts?: { resultLimit?: number; minSimilarity?: number }) => {
      return store.search(query, opts);
    },

    /**
     * Auto-inject RAG context into WorkingMemory.
     * Adds relevant knowledge as 'rag-context' region.
     */
    withRagContext: async (workingMemory: WorkingMemory): Promise<WorkingMemory> => {
      return withRagContextCore(workingMemory, { bucketName });
    },
  };
}
```

### VectorStore (Supabase pgvector)

```typescript
// src/lib/soul/rag/vectorStore.ts
import { createClient } from '@supabase/supabase-js';

interface VectorStoreConfig {
  table: string;
  scopeColumn: string;
  scopeValue: string;
}

export class VectorStore {
  private supabase;
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.supabase = createClient(
      import.meta.env.SUPABASE_URL!,
      import.meta.env.SUPABASE_ANON_KEY!
    );
  }

  async search(query: string, opts?: { resultLimit?: number; minSimilarity?: number }) {
    const { resultLimit = 5, minSimilarity = 0.7 } = opts || {};

    // Embed query using VoyageAI
    const embedding = await this.embedQuery(query);

    // Vector similarity search
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: minSimilarity,
      match_count: resultLimit,
      filter_column: this.config.scopeColumn,
      filter_value: this.config.scopeValue,
    });

    if (error) throw error;
    return data;
  }

  private async embedQuery(text: string): Promise<number[]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'voyage-3',
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

### withRagContext (Auto-inject Knowledge)

```typescript
// src/lib/soul/rag/withRagContext.ts
import type { WorkingMemory } from '../core/WorkingMemory';
import { ChatMessageRoleEnum } from '../core/types';

interface RagContextOptions {
  bucketName: string;
  maxResults?: number;
  minSimilarity?: number;
}

export async function withRagContext(
  memory: WorkingMemory,
  options: RagContextOptions
): Promise<WorkingMemory> {
  const { bucketName, maxResults = 3, minSimilarity = 0.7 } = options;

  // Extract recent user messages for context
  const recentMessages = memory.memories
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content)
    .join(' ');

  if (!recentMessages.trim()) return memory;

  // Search knowledge base
  const store = new VectorStore({
    table: 'minoan_vector_store',
    scopeColumn: 'bucket_name',
    scopeValue: bucketName,
  });

  const results = await store.search(recentMessages, {
    resultLimit: maxResults,
    minSimilarity,
  });

  if (results.length === 0) return memory;

  // Format results as context
  const contextContent = results
    .map(r => `[${r.metadata?.source || 'knowledge'}]\n${r.content}`)
    .join('\n\n---\n\n');

  // Add as 'rag-context' region
  return memory.withRegion('rag-context', {
    role: ChatMessageRoleEnum.System,
    content: `Relevant knowledge:\n\n${contextContent}`,
  });
}
```

### Document Ingestion

```typescript
// src/lib/soul/rag/ingestion.ts
import { VectorStore } from './vectorStore';

interface IngestOptions {
  bucketName: string;
  sourceFile: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export async function ingestMarkdown(
  content: string,
  options: IngestOptions
): Promise<{ chunksCreated: number }> {
  const { bucketName, sourceFile, chunkSize = 500, chunkOverlap = 50 } = options;

  // Split into chunks by headers and paragraphs
  const chunks = splitMarkdown(content, { chunkSize, chunkOverlap });

  const store = new VectorStore({
    table: 'minoan_vector_store',
    scopeColumn: 'bucket_name',
    scopeValue: bucketName,
  });

  // Embed and store each chunk
  for (const chunk of chunks) {
    await store.insert({
      content: chunk.content,
      metadata: {
        source_file: sourceFile,
        heading: chunk.heading,
      },
    });
  }

  return { chunksCreated: chunks.length };
}

function splitMarkdown(
  content: string,
  opts: { chunkSize: number; chunkOverlap: number }
): Array<{ content: string; heading?: string }> {
  // Split by ## headers first, then by paragraphs
  const sections = content.split(/(?=^## )/m);
  const chunks: Array<{ content: string; heading?: string }> = [];

  for (const section of sections) {
    const headingMatch = section.match(/^## (.+)/);
    const heading = headingMatch?.[1];
    const body = headingMatch ? section.slice(headingMatch[0].length).trim() : section.trim();

    if (body.length <= opts.chunkSize) {
      chunks.push({ content: body, heading });
    } else {
      // Split by paragraphs
      const paragraphs = body.split(/\n\n+/);
      let currentChunk = '';

      for (const para of paragraphs) {
        if (currentChunk.length + para.length > opts.chunkSize && currentChunk.length > 0) {
          chunks.push({ content: currentChunk.trim(), heading });
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({ content: currentChunk.trim(), heading });
      }
    }
  }

  return chunks;
}
```

### Knowledge Buckets for Minoan

```
minoan-portfolio      # Portfolio case studies (ACS, CZI, Dolby, Aldea)
minoan-about          # Tom's background and capabilities
minoan-ancient        # Ancient Minoan/Near Eastern knowledge (deeper lore)
```

---

## Implementation Phases

### Phase 1: Soul Definition & WorkingMemory (Foundation)

**Files to create:**
- `souls/minoan/minoan.md` - Personality definition
- `souls/minoan/config.json` - Configuration
- `src/lib/soul/core/WorkingMemory.ts` - Immutable memory (adapt from Aldea)

**Key patterns:**
```typescript
// WorkingMemory - immutable operations
const memory = new WorkingMemory({ soulName: "Minoan" });
const withUser = memory.withMemory({ role: "user", content: "Hello" });
const withRegion = memory.withRegion("visitor-model", visitorContext);
```

### Phase 2: Cognitive Steps (LLM Integration)

**Files to create:**
- `src/lib/soul/cognitiveSteps/*.ts` - Standard library
- `src/pages/api/soul/chat.ts` - Claude API endpoint

**Key patterns:**
```typescript
// Cognitive step with streaming
const [memory, stream] = await externalDialog(
  workingMemory,
  indentNicely`
    - Greet the visitor warmly
    - Reference their interest in ${interests.join(', ')}
    - Keep it to 1 sentence
  `,
  { stream: true, model: config.model }
);
```

### Phase 3: Mental Processes (State Machine)

**Files to create:**
- `src/lib/soul/mentalProcesses/*.ts` - Process definitions

**State transitions:**
```
greeting ──(3+ pages)──▶ exploring ──(deep read)──▶ engaged
    ▲                                                   │
    │                                                   ▼
returning ◀──(next visit)── ready ◀──(contact hover)───┘
```

### Phase 4: Voice Interface (Deepgram)

**Files to create:**
- `src/lib/soul/voice/DeepgramSTT.ts` - Speech recognition
- `src/lib/soul/voice/DeepgramTTS.ts` - Speech synthesis
- `src/pages/api/soul/tts.ts` - TTS proxy endpoint
- `src/pages/api/soul/stt.ts` - STT WebSocket proxy
- `src/components/VoiceButton.astro` - Microphone UI

**Voice flow:**
```
User speaks → DeepgramSTT → perception → mentalProcess → response
                                                            ↓
                          StreamingAudio ← DeepgramTTS ← dispatch
```

### Phase 5: UI Integration

**Files to modify:**
- `src/components/CommandPalette.astro` - Add soul chat mode
- `src/components/FloatingDialogue.astro` - Enhanced with voice
- `src/layouts/BaseLayout.astro` - Initialize voice, load soul.md

---

## Deepgram Integration Details

### STT (Speech-to-Text)

```typescript
// src/lib/soul/voice/DeepgramSTT.ts
export class DeepgramSTT {
  private socket: WebSocket;
  private mediaRecorder: MediaRecorder;

  async start(): Promise<AsyncIterable<string>> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    // Connect to proxy endpoint (hides API key)
    this.socket = new WebSocket('/api/soul/stt');

    this.mediaRecorder.ondataavailable = (e) => {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(e.data);
      }
    };

    return this.transcriptStream();
  }
}
```

### TTS (Text-to-Speech)

```typescript
// src/lib/soul/voice/DeepgramTTS.ts
export class DeepgramTTS {
  async speak(text: string | AsyncIterable<string>): Promise<void> {
    const response = await fetch('/api/soul/tts', {
      method: 'POST',
      body: JSON.stringify({ text: await collectStream(text) }),
    });

    const audioData = await response.arrayBuffer();
    await this.playAudio(audioData);
  }
}
```

### API Proxy (Server-side)

```typescript
// src/pages/api/soul/tts.ts
import { createClient } from '@deepgram/sdk';

export const POST: APIRoute = async ({ request }) => {
  const { text } = await request.json();
  const deepgram = createClient(import.meta.env.DEEPGRAM_API_KEY);

  const response = await deepgram.speak.request(
    { text },
    { model: 'aura-asteria-en', encoding: 'linear16' }
  );

  return new Response(await response.getStream(), {
    headers: { 'Content-Type': 'audio/wav' }
  });
};
```

---

## Command Palette Soul Chat Mode

```typescript
// Enhanced CommandPalette with soul chat
class CommandPalette {
  private soulChatMode = false;

  enterSoulChatMode() {
    this.soulChatMode = true;
    this.input.placeholder = 'Ask me anything about Tom or his work...';
    this.showSoulIntro();
  }

  async handleSoulQuery(query: string) {
    const response = await fetch('/api/soul/chat', {
      method: 'POST',
      body: JSON.stringify({
        query,
        memory: getSoulMemory(),
        currentPage: window.location.pathname
      })
    });

    const { message, voiceUrl } = await response.json();
    this.showSoulResponse(message);

    if (voiceUrl) {
      this.playVoiceResponse(voiceUrl);
    }
  }
}
```

---

## Verification Plan

### Phase 1 Verification
- [ ] `souls/minoan/minoan.md` loads correctly
- [ ] WorkingMemory immutability works (operations return new instances)
- [ ] Memory regions organize context properly

### Phase 2 Verification
- [ ] `/api/soul/chat` returns Claude responses
- [ ] Cognitive steps produce typed outputs
- [ ] Streaming works end-to-end

### Phase 3 Verification
- [ ] State machine transitions correctly
- [ ] Process-specific behavior activates
- [ ] Soul memory persists across sessions

### Phase 4 Verification
- [ ] Deepgram STT transcribes accurately
- [ ] Deepgram TTS plays smoothly
- [ ] Voice button UI works on mobile/desktop
- [ ] API keys are hidden server-side

### Phase 5 Verification
- [ ] Command palette soul mode activates
- [ ] FloatingDialogue shows voice option
- [ ] All UI integrations work with View Transitions

### Phase 6 Verification (LLM Provider System)
- [ ] OpenRouter client connects successfully
- [ ] Model aliases resolve correctly (`gemini-flash` → `google/gemini-3-flash-preview`)
- [ ] Groq routing works for voice mode models
- [ ] Streaming responses work end-to-end
- [ ] Latency optimization (`provider: { sort: 'latency' }`) active

### Phase 7 Verification (RAG)
- [ ] VoyageAI embeddings generate correctly
- [ ] Supabase pgvector search returns relevant results
- [ ] `useRag().withRagContext()` injects knowledge into WorkingMemory
- [ ] Document ingestion splits markdown correctly
- [ ] Knowledge buckets (portfolio, about, ancient) populated

---

## Environment Variables

```env
# .env.local

# ============================================
# AI / LLM PROVIDERS
# ============================================

# OpenRouter (primary LLM routing)
OPENROUTER_API_KEY=sk-or-v1-...

# Anthropic (Claude models - fallback)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Google Gemini (direct access if needed)
GEMINI_API_KEY=AIza...

# Groq (ultra-low latency voice inference)
GROQ_API_KEY=gsk_...

# VoyageAI (RAG embeddings)
VOYAGE_API_KEY=pa-...

# ============================================
# VOICE (TTS / STT)
# ============================================

# Deepgram Speech-to-Text
DEEPGRAM_API_KEY=...

# ElevenLabs Text-to-Speech (alternative)
ELEVEN_LABS_API_KEY=...

# Cartesia TTS (alternative provider)
CARTESIA_API_KEY=sk_car_...

# ============================================
# DATABASE (RAG Vector Store)
# ============================================

# Supabase (pgvector for RAG)
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## Key Patterns from Open Souls

| Pattern | Implementation |
|---------|----------------|
| **Immutability** | WorkingMemory returns new instances |
| **Cognitive Steps** | Pure functions with postProcess |
| **Mental Processes** | Async functions returning [memory, nextProcess?] |
| **Memory Regions** | `memory.withRegion('visitor-model', ...)` |
| **Streaming** | AsyncIterable + `memory.finished` promise |
| **Hooks** | useActions, useSoulMemory, useProcessMemory |
| **soul.md** | Personality in markdown, loaded at init |

---

## Dependencies to Add

```json
{
  "openai": "^4.0.0",           // OpenRouter client (OpenAI-compatible API)
  "@deepgram/sdk": "^3.0.0",    // Voice: STT & TTS
  "@supabase/supabase-js": "^2.0.0", // RAG: pgvector storage
  "groq-sdk": "^0.5.0"          // Voice mode: ultra-low latency inference
}
```

**Optional (alternative voice providers):**
```json
{
  "@anthropic-ai/sdk": "^0.24.0",  // Direct Claude access
  "elevenlabs": "^0.1.0",          // ElevenLabs TTS
  "cartesia-ai": "^1.0.0"          // Cartesia TTS
}
```
