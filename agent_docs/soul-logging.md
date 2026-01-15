# Soul Engine Logging & Observability

Comprehensive logging system for monitoring LLM calls and WorkingMemory formation during development.

## Quick Start

Enable logging via environment variables in `.env`:

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
