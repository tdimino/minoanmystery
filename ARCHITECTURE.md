# Architecture

This document provides a comprehensive map of the Minoan Mystery codebase for developers and AI agents.

## Bird's Eye View

**Problem**: Transform a portfolio site into a sentient digital presence that perceives, remembers, and reacts to visitor behavior.

**Approach**: Open Souls paradigm — functional programming with immutable memory, pure cognitive transformations, and stateful mental processes.

**Key Principles**:
1. **Immutability** — WorkingMemory operations return new instances
2. **Purity** — Cognitive steps have no side effects
3. **Separation** — Memory (state) vs Actions (effects) vs Logging
4. **Streaming** — AsyncIterable responses with `memory.finished` coordination
5. **Modularity** — Each abstraction has single responsibility

---

## High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER INTERACTION                                               │
│  Click → Scroll → Navigation → Voice → Message                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PERCEPTION LAYER                                               │
│  1. Event Capture: onPerception(event)                          │
│  2. Type Conversion: convertPerception()                        │
│  3. Memory Integration: memoryIntegrate() — pure function       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  SOUL ORCHESTRATOR                                              │
│  1. Load UserModel from SoulMemory                              │
│  2. Hydrate with computed values (timeOnSite, isReturning)      │
│  3. Create WorkingMemory from personality + context             │
│  4. Delegate to ProcessRunner                                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  MENTAL PROCESS STATE MACHINE                                   │
│  ProcessRunner.run(context) →                                   │
│  ├─ Current process (greeting/curious/engaged/ready/etc)        │
│  ├─ Executes with context (workingMemory, userModel, actions)   │
│  └─ Returns: WorkingMemory | [WorkingMemory, newState]          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  COGNITIVE STEPS — Pure LLM Transformations                     │
│  Process invokes: externalDialog(), internalMonologue(), etc    │
│  ├─ Receives: WorkingMemory + args                              │
│  ├─ Calls LLM via provider with streaming option                │
│  └─ Returns: [newMemory, result | AsyncIterable]                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  ACTIONS + SUBPROCESSES (side effects)                          │
│  ├─ actions.speak(response) — send to user                      │
│  ├─ actions.dispatch(action) — DOM updates, toasts              │
│  ├─ modelsTheVisitor() — background visitor understanding       │
│  └─ embodiesTheTarot() — turn-interval card generation          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PERSISTENCE                                                    │
│  ├─ SoulMemory updates localStorage (client)                    │
│  ├─ SoulMemoryInterface adapter (server, DI pattern)            │
│  └─ UserModel + visitorModel + visitorWhispers saved            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Codemap

### Core (`src/lib/soul/opensouls/core/`)

Foundation abstractions for the soul engine.

| File | Lines | Purpose |
|------|-------|---------|
| `WorkingMemory.ts` | 518 | Immutable memory container with region support and `finished` promise |
| `CognitiveStep.ts` | 289 | Factory for creating typed LLM transformation functions |
| `SoulLogger.ts` | 508 | Singleton logger with 4 levels (minimal/standard/verbose/debug) |
| `MemoryCompressor.ts` | 316 | Rule-based memory compression (no LLM calls) |
| `MemoryRegions.ts` | 218 | Region configuration with priority ordering |
| `models.ts` | 79 | PERSONA_MODEL, THINKING_MODEL constants |
| `types.ts` | ~200 | Core TypeScript interfaces |
| `utils.ts` | ~100 | indentNicely, safeName, stripEntityAndVerb |
| `meta.ts` | ~50 | Metadata types for manifests |
| `index.ts` | ~80 | Public API exports |

**Key Abstraction: WorkingMemory**
```typescript
class WorkingMemory {
  readonly finished: Promise<void>;  // Resolves when streaming completes

  withMemory(memory: Memory): WorkingMemory;
  withRegion(name: string, content: Memory | string): WorkingMemory;
  withPendingFinished(): WorkingMemory;  // For streaming responses
  resolveFinished(): void;  // Signal stream completion
}
```

### Perception (`src/lib/soul/opensouls/perception/`)

Event capture and memory integration.

| File | Lines | Purpose |
|------|-------|---------|
| `SoulOrchestrator.ts` | 866 | Main orchestration, perception-response cycle |
| `memoryIntegrate.ts` | ~150 | Pure function: perception → memory update |
| `convertPerception.ts` | ~100 | Event normalization to standard format |

**Entry Point**: `SoulOrchestrator.processPerception(event)` handles the full cycle from user input to response.

### Mental Processes (`src/lib/soul/opensouls/mentalProcesses/`)

State machine for soul behavior.

| File | Lines | Purpose |
|------|-------|---------|
| `greeting.ts` | ~150 | First-time visitor welcome |
| `curious.ts` | ~150 | 2+ pages viewed, encourage exploration |
| `engaged.ts` | ~150 | Deep scroll, discuss content |
| `ready.ts` | ~150 | Contact-bound signals present |
| `returning.ts` | ~150 | Recognized visitor, personalized |
| `dormant.ts` | ~100 | 45s+ idle, subconsciousness |
| `exiting.ts` | ~100 | 5min+ idle, farewell |
| `academic.ts` | ~400 | Scholarly mode (Gordon/Harrison/Astour personas) |
| `poetic.ts` | ~400 | Poetry composition mode (Tamarru daimon) |
| `transitions.ts` | ~150 | State transition graph |
| `runner.ts` | ~150 | ProcessRunner state machine executor |
| `types.ts` | ~100 | ProcessContext, ProcessReturn types |
| `index.ts` | ~80 | Registry and exports |

**State Transitions**:
```
greeting ──→ curious ──→ engaged ──→ ready
    │            │           │         ▲
    └────────────┴───────────┴─────────┘
                 │
                 ▼
            dormant ──→ exiting

(+ academic, poetic accessible from any state via intent detection)
```

### Cognitive Steps (`src/lib/soul/opensouls/cognitiveSteps/`)

Pure LLM transformation functions.

| File | Purpose |
|------|---------|
| `externalDialog.ts` | User-facing streaming responses |
| `internalMonologue.ts` | Internal reasoning |
| `mentalQuery.ts` | Boolean decision gate |
| `decision.ts` | Choice from N options |
| `brainstorm.ts` | Ideation step |
| `visitorNotes.ts` | Bullet-point visitor understanding |
| `visitorWhispers.ts` | Daimonic sensing |
| `tarotPrompt.ts` | Tarot card selection and symbolism |
| `poeticComposition.ts` | Multi-register poetry composition |
| `visionPrompt.ts` | Image interpretation (Gemini Vision) |
| `imageCaption.ts` | Alt text generation |
| `index.ts` | Exports |

**Cognitive Step Signature**:
```typescript
type CognitiveStep<Args, Result> = (
  memory: WorkingMemory,
  args: Args,
  opts?: { stream?: boolean; model?: string }
) => Promise<[WorkingMemory, Result | AsyncIterable<string>]>;
```

### Providers (`src/lib/soul/opensouls/providers/`)

LLM backend integrations.

| File | Lines | Purpose |
|------|-------|---------|
| `openrouter.ts` | 147 | Primary provider, all OpenRouter models |
| `groq.ts` | 197 | Fast inference (Kimi K2, Llama) |
| `baseten.ts` | 164 | Custom models, fallback |
| `gemini-vision.ts` | 182 | Image understanding |
| `gemini-image.ts` | 330 | Image generation (Minoan style) |
| `reference-images.server.ts` | ~100 | Server-only reference image loading |
| `index.ts` | ~50 | Factory functions and exports |

**Provider Registry Pattern**:
```typescript
setLLMProvider(provider);              // Set default
registerProvider('groq', groqProvider); // Register with prefix
getLLMProvider('groq/kimi-k2');        // Resolve by model string
```

### Subprocesses (`src/lib/soul/opensouls/subprocesses/`)

Background async tasks (fire-and-forget pattern).

| File | Lines | Purpose |
|------|-------|---------|
| `modelsTheVisitor.ts` | ~250 | Update visitor understanding after conversations |
| `embodiesTheTarot.ts` | ~380 | Generate tarot cards at turn intervals |
| `meta.ts` | ~50 | Subprocess metadata |
| `index.ts` | ~30 | Exports |

**Subprocess Gates** (embodiesTheTarot):
1. Turn interval check (every 10 turns)
2. Session limit (max 3 per session)
3. Provider availability (Gemini API configured)

### Soul Identity (`souls/minoan/`)

Soul personality and knowledge files.

| File | Purpose |
|------|---------|
| `soul.md` | Core Kothar wa Khasis persona |
| `config.json` | Model, provider, trigger configuration |
| `soulMemorySchema.ts` | Persistent memory interface |
| `academic/soul.md` | Scholarly synthesis mode |
| `academic/gordon.md` | Cyrus Gordon voice directives |
| `academic/harrison.md` | Jane Harrison voice directives |
| `academic/astour.md` | Michael Astour voice directives |
| `poetic/soul.md` | Tamarru daimon (5 registers, 10 voice dimensions) |
| `dossiers/` | RAG knowledge base (~120 markdown files) |

**Soul Loading**:
```typescript
// In chat.ts
const personality = readFileSync('souls/minoan/soul.md', 'utf-8');
memory = memory.withRegion('personality', personality);
```

### API Endpoints (`src/pages/api/soul/`)

Server-side soul integration.

| File | Lines | Purpose |
|------|-------|---------|
| `chat.ts` | 1,045 | Streaming chat with RAG, mode detection |
| `subprocess.ts` | ~300 | Background visitor modeling |
| `personality.ts` | ~50 | Serve soul.md for debugging |
| `tts.ts` | ~100 | Text-to-speech synthesis |
| `vision.ts` | ~150 | Image captioning |

---

## Architectural Invariants

Rules that are **NEVER** violated:

1. **WorkingMemory is immutable** — All operations return new instances; `_memories` array is frozen
2. **Cognitive steps are pure** — No side effects (except logging); deterministic given same inputs
3. **Side effects only via hooks** — `actions.speak()`, `actions.dispatch()`, `soulMemory.set*()`
4. **Memory region priority order respected** — LLM always receives memories in consistent order
5. **Streaming coordination via `memory.finished`** — Subprocesses await stream completion
6. **Compression preserves persistent regions** — `soul-personality`, `visitor-context` never removed
7. **Turn counting from conversation history** — Server-side uses message count, not localStorage

---

## Cross-Cutting Concerns

### Logging

`SoulLogger` singleton with environment-driven levels:

```bash
SOUL_DEBUG=true
SOUL_LOG_LEVEL=verbose  # minimal | standard | verbose | debug
```

| Level | Output |
|-------|--------|
| minimal | Step completion only |
| standard | + provider, tokens, duration |
| verbose | + truncated prompt (200 chars), response (500 chars) |
| debug | + full response, WorkingMemory dump, internalMonologue |

### Token Tracking

Providers pass usage via `onUsage` callback:
```typescript
provider.generate(messages, {
  onUsage: (usage) => logger.providerResponse(name, usage, duration)
});
```

### Persistence

**Client-side**: `SoulMemory` class wraps localStorage
**Server-side**: `SoulMemoryInterface` adapter (dependency injection)

```typescript
interface SoulMemoryInterface {
  getVisitorModel(): string;
  setVisitorModel(model: string): void;
  getUserTurnCount(): number;
  incrementUserTurnCount(): number;
  // ... tarot state, whispers, etc.
}
```

---

## Layer Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (Client)                                               │
│  ├─ Labyrinth page (labyrinth.astro)                           │
│  ├─ SoulOrchestrator (perception capture)                       │
│  ├─ SoulMemory (localStorage)                                   │
│  └─ SSE event handling                                          │
├─────────────────────────────────────────────────────────────────┤
│  VERCEL FUNCTIONS (Server)                                      │
│  ├─ /api/soul/chat — streaming responses                        │
│  ├─ /api/soul/subprocess — background modeling                  │
│  └─ SoulMemoryInterface adapters (per-request state)            │
├─────────────────────────────────────────────────────────────────┤
│  SOUL ENGINE (Shared)                                           │
│  ├─ WorkingMemory (immutable)                                   │
│  ├─ CognitiveSteps (pure)                                       │
│  ├─ MentalProcesses (state machine)                             │
│  └─ Providers (LLM backends)                                    │
├─────────────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                              │
│  ├─ OpenRouter / Groq / Baseten (LLM)                          │
│  ├─ Google Gemini (Vision, Image)                               │
│  ├─ VoyageAI (Embeddings)                                       │
│  └─ Supabase (Vector store, RAG)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Streaming Pattern

Cognitive steps support streaming via `memory.finished` promise:

```typescript
// In mental process
const [mem, stream] = await externalDialog(
  memory,
  instructions,
  { stream: true }
);

actions.speak(stream);    // Send AsyncIterable to client
await mem.finished;       // Wait for stream completion

// Now safe to run subprocess with updated memory
await modelsTheVisitor({ ...context, workingMemory: mem });
```

**Implementation** (in CognitiveStep.ts):
1. `withPendingFinished()` creates memory with pending promise
2. Stream generator yields chunks
3. `finally` block calls `resolveFinished()`
4. Consumer awaits `memory.finished`

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/soul/opensouls/core/WorkingMemory.ts` | 518 | Immutable memory container |
| `src/lib/soul/opensouls/core/CognitiveStep.ts` | 289 | LLM transformation factory |
| `src/lib/soul/opensouls/perception/SoulOrchestrator.ts` | 866 | Main orchestration |
| `src/pages/api/soul/chat.ts` | 1,045 | Streaming chat endpoint |
| `src/lib/soul/opensouls/mentalProcesses/academic.ts` | ~400 | Scholarly mode |
| `src/lib/soul/opensouls/mentalProcesses/poetic.ts` | ~400 | Poetry mode |
| `src/lib/soul/opensouls/subprocesses/embodiesTheTarot.ts` | ~380 | Tarot generation |
| `src/lib/soul/opensouls/subprocesses/modelsTheVisitor.ts` | ~250 | Visitor modeling |
| `src/lib/soul/opensouls/core/SoulLogger.ts` | 508 | Logging system |
| `src/lib/soul/memory.ts` | ~200 | SoulMemory + SoulMemoryInterface |
| `souls/minoan/soul.md` | ~150 | Core Kothar persona |
| `souls/minoan/poetic/soul.md` | ~200 | Tamarru daimon |

---

## Common Questions

**Where do I add a new cognitive step?**
→ `src/lib/soul/opensouls/cognitiveSteps/`, follow `externalDialog.ts` pattern

**Where do I add a new mental process?**
→ `src/lib/soul/opensouls/mentalProcesses/`, register in `index.ts`, add to transitions

**Where is the soul personality defined?**
→ `souls/minoan/soul.md` (core), `souls/minoan/academic/soul.md` (scholarly), `souls/minoan/poetic/soul.md` (poetry)

**How do I add a new LLM provider?**
→ `src/lib/soul/opensouls/providers/`, implement `LLMProvider` interface, register with `registerProvider()`

**Where does RAG retrieval happen?**
→ `src/pages/api/soul/chat.ts` lines 360-405, uses VoyageAI + Supabase

**How do I debug the soul engine?**
→ Set `SOUL_DEBUG=true` and `SOUL_LOG_LEVEL=debug` in `.env`, see `agent_docs/soul-logging.md`
