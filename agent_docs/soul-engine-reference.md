# Soul Engine Reference

Technical reference for the Open Souls paradigm implementation.

## Soul Identity Files

The soul's personality is defined in markdown files following the Open Souls `{soulName}.md` pattern:

| File | Purpose |
|------|---------|
| `souls/minoan/soul.md` | **Core identity** — Kothar wa Khasis persona, worldview, speaking style, knowledge domains, boundaries |
| `souls/minoan/academic/soul.md` | Academic mode — Scholarly voices (Gordon, Astour, Harrison) |
| `souls/minoan/poetic/soul.md` | Poetic mode — **Tamarru**, Tom di Mino's daimon (registers, image domains, trigger states) |

These files are loaded at runtime and injected into WorkingMemory as the `personality` region. The `/api/soul/personality` endpoint serves `souls/minoan/soul.md`.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SOUL ENGINE LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  SoulOrchestrator (perception/SoulOrchestrator.ts)          │
│  └── Handles perception-response cycle, delegates to:       │
│      ├── memoryIntegrate (pure function)                    │
│      ├── ProcessRunner (state machine)                      │
│      └── modelsTheVisitor (background subprocess)           │
├─────────────────────────────────────────────────────────────┤
│  WorkingMemory (core/WorkingMemory.ts)                      │
│  └── Immutable memory operations:                           │
│      ├── withMemory() - Add message                         │
│      ├── withRegion() - Named memory regions                │
│      └── slice(), map(), filter() - Transformations         │
├─────────────────────────────────────────────────────────────┤
│  SoulMemory (memory.ts)                                     │
│  └── Persistent storage (localStorage):                     │
│      ├── UserModel - Session data                           │
│      ├── visitorModel - LLM-generated visitor notes         │
│      └── visitorWhispers - Daimonic insights                │
└─────────────────────────────────────────────────────────────┘
```

## Cognitive Steps

Pure LLM transformation functions. Each returns `[WorkingMemory, result]`.

| Step | Purpose | Usage |
|------|---------|-------|
| `externalDialog` | User-facing response | `const [mem, stream] = await externalDialog(memory, instructions, { stream: true })` |
| `internalMonologue` | Internal reasoning | `const [mem, thought] = await internalMonologue(memory, prompt)` |
| `mentalQuery` | Boolean decision | `const [mem, shouldAct] = await mentalQuery(memory, question)` |
| `decision` | Choice from options | `const [mem, choice] = await decision(memory, question, options)` |
| `visitorNotes` | Update visitor model | `const [mem, notes] = await visitorNotes(memory, { currentNotes, focus })` |
| `visitorWhispers` | Daimonic sensing | `const [mem, whispers] = await visitorWhispers(memory, context)` |

### Creating Custom Steps

```typescript
import { createCognitiveStep, ChatMessageRoleEnum } from '../core';

export const myStep = createCognitiveStep<MyOptions>((options) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: `Instructions based on ${options}...`,
  }),
  postProcess: async (memory, response) => {
    // Transform response, return [memoryUpdate, extractedValue]
    return [
      { role: ChatMessageRoleEnum.Assistant, content: response },
      response,
    ];
  },
}));
```

## Mental Processes

State machine for soul behavior. Each process returns `ProcessReturn`.

| Process | Trigger | Behavior |
|---------|---------|----------|
| `greeting` | First visit | Warm welcome, introduce site |
| `curious` | 2+ pages viewed | Encourage exploration |
| `engaged` | Deep scroll, time on page | Discuss content in depth |
| `ready` | Contact-bound signals | Guide toward contact |
| `returning` | `visitCount > 1` | Personalized welcome back |
| `dormant` | 45s+ idle | Subconsciousness, ambient presence |
| `exiting` | 5min+ idle | Farewell, session close |
| `academic` | Scholarly intent detected | Gordon/Harrison/Astour personas |
| `poetic` | Poetry request | Tamarru daimon (registers, constraints) |

State transitions are defined in `mentalProcesses/transitions.ts`.

### Process Signature

```typescript
const myProcess: MentalProcess = async (context: ProcessContext) => {
  const { sessionId, workingMemory, userModel, actions, soulMemory } = context;

  // Use cognitive steps
  const [mem, response] = await externalDialog(workingMemory, instructions);
  actions.speak(response);

  // Return: stay in process, or transition
  return mem;                        // Stay
  return [mem, 'engaged'];           // Transition to 'engaged'
  return [mem, 'ready', { reason }]; // Transition with params
};
```

## Subprocesses

Background tasks that run after main response. Fire-and-forget pattern.

### modelsTheVisitor

Updates visitor understanding based on conversation.

```typescript
await modelsTheVisitor(context, {
  generateWhispers: true,           // Generate daimonic insights
  minInteractionsBeforeUpdate: 2,   // Skip until enough messages
});
```

**Gates**:
1. Skips if `messageCount < minInteractionsBeforeUpdate`
2. Skips if `mentalQuery` determines nothing meaningful learned

**Updates**:
- `soulMemory.visitorModel` - Bullet-point notes
- `soulMemory.visitorWhispers` - Daimonic sense of visitor

## Streaming Pattern (`memory.finished`)

Cognitive steps support streaming via the `memory.finished` promise:

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

This pattern ensures subprocesses only run after the streaming response completes.

## Dependency Injection Pattern

Server-side code uses `SoulMemoryInterface` to avoid localStorage:

```typescript
// In ProcessContext
interface ProcessContext {
  soulMemory?: SoulMemoryInterface;  // Optional DI
}

// In subprocess
const soulMemory = context.soulMemory ?? getSoulMemory();
```

**When each path is taken**:
- **Server (API endpoint)**: Injected adapter captures results in response
- **Client (SoulOrchestrator)**: Falls back to localStorage singleton

## Key Files

| File | Purpose |
|------|---------|
| `souls/minoan/soul.md` | **Core identity** — System prompt defining Kothar's persona |
| `souls/minoan/academic/soul.md` | Academic mode personality |
| `souls/minoan/poetic/soul.md` | Poetic mode personality (registers, constraints) |
| `memory.ts` | SoulMemory class, SoulMemoryInterface, localStorage persistence |
| `types.ts` | UserModel, HydratedUserModel, ProcessContext, SoulState |
| `perception.ts` | Event capture (click, scroll, navigation) |
| `SoulOrchestrator.ts` | Main orchestration, stream handling, API mode |
| `memoryIntegrate.ts` | Pure function for perception → memory |
| `ProcessRunner.ts` | State machine evaluation and execution |
| `CognitiveStep.ts` | createCognitiveStep factory |
| `WorkingMemory.ts` | Immutable memory container |
| `cognitiveSteps/poeticComposition.ts` | Poetic mode cognitive step with register/domain support |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/soul/chat` | POST | Streaming chat responses |
| `/api/soul/subprocess` | POST | Background visitor modeling |
| `/api/soul/personality` | GET | Soul personality markdown |
| `/api/soul/tts` | POST | Text-to-speech synthesis |

## Logging & Debugging

Enable via environment variables in `.env`:

```bash
SOUL_DEBUG=true
SOUL_LOG_LEVEL=debug   # minimal | standard | verbose | debug
```

| Log Level | What's Logged |
|-----------|---------------|
| `minimal` | Step completion only |
| `standard` | + provider, tokens, duration |
| `verbose` | + truncated prompt (200 chars), response (500 chars) |
| `debug` | + **FULL response content**, WorkingMemory dump, internalMonologue |

**Debug-only methods** (in SoulLogger):
- `logFullResponse(stepName, response)` - Full cognitive step output
- `logWorkingMemory(memories, label?)` - All messages in WorkingMemory
- `logInternalMonologue(thought, context?)` - Full reasoning content

```typescript
import { getSoulLogger } from '../core/SoulLogger';

// Log full WorkingMemory at a key point
getSoulLogger().logWorkingMemory(memory.memories, 'after-integration');

// Log full internalMonologue result
getSoulLogger().logInternalMonologue(thought, 'decision-reasoning');
```

## Invariants

1. **WorkingMemory is immutable** - All operations return new instances
2. **Cognitive steps are pure** - No side effects, deterministic
3. **Side effects in hooks only** - `actions.speak()`, `soulMemory.set*()`
4. **Dual persistence** - Update soulMemory (source of truth), then return WorkingMemory with region
5. **Stream cleanup** - Always `reader.releaseLock()` in finally block
