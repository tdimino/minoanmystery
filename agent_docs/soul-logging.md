# Soul Engine Logging & Observability

Three-layer logging system for Soul Engine debugging:

| Layer | File | Format | Purpose |
|-------|------|--------|---------|
| **LocalLogger** | `logs/soul.log` | File + console | Subprocess lifecycle, gates, tarot, vision |
| **SoulLogger** | Terminal (ANSI) | Colored boxes | Cognitive steps, token usage, memory mutations |
| **API Logs** | Vercel | JSON structured | Production monitoring |

## Quick Start - Local File Logging (Recommended)

The `localLogger` writes to `logs/soul.log` for real-time debugging:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Tail the log file
tail -f logs/soul.log

# Filter by category
tail -f logs/soul.log | grep TAROT
tail -f logs/soul.log | grep GATE
tail -f logs/soul.log | grep SUBPROCESS
tail -f logs/soul.log | grep MEMORY
```

**No configuration needed** - automatically enabled in development, server-side only.

## Quick Start - SoulLogger (Environment Variables)

Enable via `.env`:

```bash
SOUL_DEBUG=true                    # Enable logging
SOUL_LOG_LEVEL=verbose             # minimal | standard | verbose
```

Restart dev server after changes. Logs appear in terminal during `/api/soul/chat` requests.

## Log Levels

| Level | Output |
|-------|--------|
| `minimal` | Cognitive step names, durations, errors |
| `standard` | + Memory sizes, models, token usage |
| `verbose` | + Full prompts, responses (DEFAULT) |

## What Gets Logged

### Cognitive Step Boxes
```
┌─ 🧠 cognitiveStep ──────────────────────────────────────────┐
│  Memory: 2 → 3 messages (+1)
│  Model: groq/kimi-k2
│  Tokens: 1,356 prompt + 22 completion = 1,378 total
│  Duration: 837ms
│
│  [Prompt] "Respond to the visitor's message..."
│  [Response] "The labyrinth hears you..."
└─────────────────────────────────────────────────────────────────┘
```

### Memory Mutations
```
📝 Memory [personality]: 0 → 1 (+1)
📝 Memory: 1 → 2 (+1)
```

### Provider Calls & Token Usage
```
🎟️ Provider: groq/kimi-k2 (3 messages)
🎟️ Tokens: 1356 prompt + 22 completion = 1378 total (837ms)
```

### State Transitions
```
🔄 State: greeting → curious (user showed interest)
```

### Memory Compression
```
📝 Memory Compression: 15 → 8 memories (auto_compress)
```

## Architecture

```
src/lib/soul/opensouls/core/
├── SoulLogger.ts          # Singleton logger with ANSI formatting
├── CognitiveStep.ts       # Logging hooks in createCognitiveStep()
└── WorkingMemory.ts       # Mutation logging in withMemory(), withRegion()

src/lib/soul/opensouls/providers/
├── groq.ts                # Token usage via onUsage callback
└── openrouter.ts          # Token usage via onUsage callback

src/lib/soul/opensouls/perception/
└── SoulOrchestrator.ts    # State transition logging
```

## Key Implementation Details

### Environment Variable Access (Astro/Vite)

Uses `import.meta.env` (not `process.env`) for Astro compatibility:

```typescript
// SoulLogger.ts:72-87
if (typeof import.meta !== 'undefined' && import.meta.env) {
  envDebug = import.meta.env.SOUL_DEBUG;
  envLevel = import.meta.env.SOUL_LOG_LEVEL;
}
```

### Token Tracking

Providers pass usage via `onUsage` callback:

```typescript
// CognitiveStep.ts:169
onUsage: (usage) => {
  logger.providerResponse(provider.name, usage, Date.now() - startTime);
},
```

### Non-Invasive Design

- All logging hooks check `if (!this.enabled) return;`
- No modification to return values or behavior
- Zero overhead when disabled

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No logs appearing | Check `SOUL_DEBUG=true` in `.env`, restart server |
| `SOUL_DEBUG=undefined` | Using `process.env` instead of `import.meta.env` |
| Logs missing tokens | Provider may not return `usage` object |
| Server not restarting | Kill old process, check port availability |

## Session Summary

Call `getSoulLogger().printSummary()` to output cumulative stats:

```
📊 Session Summary
├── Cognitive Steps: 3 types (externalDialog: 2, internalMonologue: 1)
├── Total LLM Calls: 3
├── Total Tokens: 3,142 (prompt: 2,847 + completion: 295)
├── Total Duration: 2,847ms
└── State Transitions: greeting → curious
```

---

## Vercel CLI Logging (Production)

API endpoints output structured JSON logs for Vercel CLI filtering.

### Structured Log Schema

```typescript
{
  event: 'request_start' | 'response_complete' | 'error';
  correlationId: string;     // e.g., "soul_abc12345"
  endpoint: string;          // e.g., "/api/soul/chat"
  timestamp: string;         // ISO 8601

  // Request metrics
  messageLength?: number;    // Chat query length
  historyLength?: number;    // Conversation history size
  stream?: boolean;          // Streaming mode

  // Response metrics
  latencyMs?: number;        // Total request duration
  responseLength?: number;   // Response character count
  audioBytes?: number;       // TTS audio size

  // Error details
  error?: string;            // Error message
  ip?: string;               // Rate-limited IP (truncated)
}
```

### Vercel CLI Commands

```bash
# Real-time log streaming
vercel logs --follow

# Filter to Soul Engine requests
vercel logs --follow 2>&1 | grep '"endpoint":"/api/soul'

# View errors only
vercel logs --since 1h 2>&1 | grep '"event":"error"'

# Trace a specific request by correlation ID
vercel logs --since 1h 2>&1 | grep "soul_abc12345"

# Filter by endpoint
vercel logs --follow 2>&1 | grep '"/api/soul/chat"'
vercel logs --follow 2>&1 | grep '"/api/soul/tts"'
vercel logs --follow 2>&1 | grep '"/api/soul/subprocess"'

# JSON output for programmatic analysis
vercel logs --output json --since 1h
```

### Log Retention

| Vercel Plan | Retention |
|-------------|-----------|
| Hobby | 1 hour |
| Pro | 3 days |
| Enterprise | Custom |

### Two-Layer Logging System

| Layer | Format | Purpose | When Active |
|-------|--------|---------|-------------|
| **SoulLogger** | ANSI (colored boxes) | Local development | `SOUL_DEBUG=true` |
| **API Logs** | JSON structured | Vercel CLI filtering | Always on |

The SoulLogger provides rich visual debugging locally, while JSON API logs enable production monitoring via `vercel logs`.

---

## LocalLogger - File-Based Logging

### Overview

`src/lib/soul/localLogger.ts` provides comprehensive file-based logging following the Open Souls paradigm of explicit state and observable behavior.

**Features:**
- Writes to `logs/soul.log` (auto-created)
- Buffered writes (50ms batches) for near-realtime performance
- Also logs to console for immediate feedback
- Server-side only (disabled in browser/production)

### Log Categories

| Category | Description | Example |
|----------|-------------|---------|
| `API` | Request/response lifecycle | `POST /api/soul/chat` |
| `MEMORY` | WorkingMemory mutations | `withMemory: 2 → 3 messages` |
| `MEMORY:SNAPSHOT` | Full memory dump | All messages with truncated content |
| `SUBPROCESS:*` | Subprocess lifecycle | `embodiesTheTarot START/END/SKIP` |
| `GATE:*` | Gate pass/block decisions | `sessionLimit: ✓ PASS` |
| `TAROT` | Tarot generation events | Card selection, prompt, errors |
| `TAROT:GATES` | Tarot gate check details | Turn formula, should trigger |
| `VISION` | Vision subprocess events | Image generation triggers |
| `IMAGE:GEN` | Image generation results | Provider, prompt, success |
| `VISITOR` | Visitor model updates | Notes, whispers, topics |
| `COGNITIVE:*` | Cognitive step execution | Duration, instructions |
| `SESSION` | Session state snapshots | Turn count, tarot count |
| `LLM` | Provider calls | Model, tokens, duration |

### API Reference

```typescript
import { localLogger } from '../lib/soul/localLogger';

// Request lifecycle
localLogger.requestStart(correlationId, endpoint);
localLogger.requestEnd(correlationId, duration);

// API calls
localLogger.apiRequest(endpoint, { method, messageLength, hasImage, historyLength });
localLogger.apiResponse(endpoint, { status, duration, error? });

// WorkingMemory
localLogger.workingMemory(action, { messageCount, roles?, regions?, lastMessage? });
localLogger.memorySnapshot(memories);  // Full dump

// Subprocesses
localLogger.subprocess(name, 'start' | 'end' | 'skip', data?);
localLogger.gate(subprocess, gateName, passed, { threshold?, actual?, reason? });

// Tarot-specific
localLogger.tarot(event, { turnCount?, tarotCount?, cardName?, error? });
localLogger.tarotGateCheck({ userTurnCount, turnInterval, moduloResult, lastTarotTurn, tarotCount, maxTarots, shouldTrigger });

// Vision-specific
localLogger.vision(event, { hasImage?, imageSize?, provider?, error? });
localLogger.imageGeneration(event, { provider?, prompt?, success?, duration? });

// Visitor modeling
localLogger.visitorModel(event, { userName?, notes?, whispers?, topics? });

// Cognitive steps
localLogger.cognitiveStep(stepName, 'start' | 'end', { instructions?, result?, duration? });

// Session state
localLogger.sessionState({ userTurnCount, tarotCount, lastTarotTurn, userName? });

// Visual separators
localLogger.separator(label?);  // Creates ═══ line in log
```

### Sample Output

```
═══════════════════ REQUEST soul_abc123 - /api/soul/chat ═══════════════════

[2024-01-24 12:34:56.789] 📘 [API] POST /api/soul/chat | {"method":"POST","messageLength":42}
[2024-01-24 12:34:56.790] 📘 [SUBPROCESS:embodiesTheTarot] ▶️ START
[2024-01-24 12:34:56.791] 📘 [TAROT:GATES] Turn 10 check | {"formula":"10 % 10 = 0","willTrigger":"YES"}
[2024-01-24 12:34:56.792] 📘 [GATE:tarot] sessionLimit: ✓ PASS | {"threshold":3,"actual":0}
[2024-01-24 12:34:56.793] 📘 [GATE:tarot] turnInterval: ✓ PASS | {"threshold":10,"actual":10}
[2024-01-24 12:34:57.500] 📘 [TAROT] Generated | {"cardName":"The Priestess","cardNumber":"II"}
[2024-01-24 12:34:57.501] 📘 [SUBPROCESS:embodiesTheTarot] ✅ END | {"result":"generated"}

═══════════════════════════════════════════════════════════════════════════
```

### Files Integrated

| File | Logging Added |
|------|---------------|
| `src/pages/api/soul/chat.ts` | Request lifecycle, session state |
| `src/lib/soul/opensouls/subprocesses/embodiesTheTarot.ts` | Gate checks, tarot events |
| `src/lib/soul/opensouls/subprocesses/embodiesTheVision.ts` | Gate checks, image generation |
| `src/lib/soul/opensouls/subprocesses/modelsTheVisitor.ts` | Gate checks, visitor model updates |

### Utilities

```typescript
import { clearLocalLog, getLogFilePath } from '../lib/soul/localLogger';

// Clear the log file
clearLocalLog();

// Get log file path
const path = getLogFilePath();  // logs/soul.log
```
