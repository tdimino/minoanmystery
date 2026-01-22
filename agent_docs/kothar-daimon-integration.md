# Kothar-Daimon Chamber Integration

## Status: Implemented ✅

Enable Kothar to generate contextual images via Gemini during subprocesses, displaying them as backgrounds (like the goddess) or inline in messages.

**Core Pattern**: Following Open Souls paradigm, the `embodiesTheVision` subprocess:
1. Detects vision-worthy moments via `mentalQuery` gate
2. Generates Gemini-optimized prompts via `visionPrompt` cognitive step
3. Calls Gemini Image API
4. Emits SSE `image` event for client display

---

## Architecture

```
User Message → Chat API → Response Stream → [fire-and-forget] → embodiesTheVision
                                                                      ↓
                                                              mentalQuery gate
                                                                      ↓
                                                              visionPrompt (LLM)
                                                                      ↓
                                                              Gemini Image API
                                                                      ↓
                                                              SSE image event
                                                                      ↓
                                                              Client display
                                                              (background)
```

---

## Files Created

### 1. Gemini Image Provider ✅
**Path**: `src/lib/soul/opensouls/providers/gemini-image.ts`

TypeScript wrapper for Gemini Image API:
- `generate(prompt, style, aspectRatio)` → `{ success, imageDataUrl, error }`
- Handles `responseModalities: ["TEXT", "IMAGE"]`
- Returns base64 data URL for direct use
- Built-in Minoan aesthetic style modifiers

### 2. visionPrompt Cognitive Step ✅
**Path**: `src/lib/soul/opensouls/cognitiveSteps/visionPrompt.ts`

LLM step that generates image prompts with Minoan aesthetic:
- Takes conversation context, mood, visitor whispers
- Returns detailed prompt (2-4 sentences) optimized for Gemini
- Follows `createCognitiveStep` pattern

### 3. embodiesTheVision Subprocess ✅
**Path**: `src/lib/soul/opensouls/subprocesses/embodiesTheVision.ts`

Background subprocess (fire-and-forget):
- **Gate 1**: Session limit (max 3 visions)
- **Gate 2**: Explicit request detection (show me, visualize, manifest)
- **Gate 3**: Min interactions (default: 3)
- **Gate 4**: Cooldown (60s between automatic triggers)
- **Gate 5**: Mythological trigger terms
- **Gate 6**: `mentalQuery` LLM gate for automatic detection
- Calls `visionPrompt` → Gemini API → emits image via callback

### 4. Vision API Endpoint ✅
**Path**: `src/pages/api/soul/vision.ts`

Server-side vision generation:
- Rate limited (5/min per IP)
- Accepts conversation history, returns image data URL
- Alternative to inline generation in chat stream

---

## Files Modified

### `src/pages/api/soul/chat.ts` ✅
- Added SSE `event: image` emission after response
- Fire-and-forget subprocess call with vision callback

### `src/lib/soul/types.ts` ✅
```typescript
export interface VisionPayload {
  dataUrl: string;
  prompt: string;
  displayMode: 'background' | 'inline' | 'both';
  duration?: number;
  style?: 'ethereal' | 'mythological' | 'labyrinthine' | 'divine' | 'ancient';
}

export type SoulActionType = ... | 'vision';
```

### `src/lib/soul/dispatch.ts` ✅
- Added `setVision(payload)` method
- Added `vision()` convenience method
- Dispatches `soul:vision` custom event

### `src/lib/soul/opensouls/perception/SoulOrchestrator.ts` ✅
- Added SSE `image` event handler
- Dispatches `soul:vision` custom event to client

### `src/pages/labyrinth.astro` ✅
- Added vision background element
- Added CSS styles (similar to goddess background)
- Added `handleVisionBackground()` method
- Added `soul:vision` event listener

### Index Files ✅
- `src/lib/soul/opensouls/providers/index.ts` - exports GeminiImageProvider
- `src/lib/soul/opensouls/cognitiveSteps/index.ts` - exports visionPrompt
- `src/lib/soul/opensouls/subprocesses/index.ts` - exports embodiesTheVision

---

## Trigger Strategy

| Trigger Type | Examples | Gate |
|--------------|----------|------|
| **Explicit** | "show me", "visualize", "manifest" | Direct match → bypasses other gates |
| **Mythological** | goddess, labyrinth, Knossos, Thera | Term match → mentalQuery gate |
| **Depth** | 4+ turns on topic | mentalQuery gate |

### Explicit Patterns (bypass LLM gate)
```typescript
const EXPLICIT_PATTERNS = [
  /show\s+me/i, /visualize/i, /manifest/i, /let\s+me\s+see/i,
  /reveal/i, /vision\s+of/i, /picture\s+of/i, /image\s+of/i,
  /draw\s+me/i, /paint\s+me/i,
];
```

### Mythological Triggers (require LLM gate)
```typescript
const MYTHOLOGICAL_TRIGGERS = [
  'goddess', 'labyrinth', 'knossos', 'thera', 'santorini', 'minoan',
  'minotaur', 'ariadne', 'pasiphae', 'minos', 'daedalus', 'bull',
  'snake', 'priestess', 'potnia', 'labrys', 'double axe',
  'horns of consecration', 'fresco', 'palace', 'ritual', 'sacred',
  'divine', 'ancient', 'bronze age',
];
```

---

## Display Mode: Background

- Fixed position, z-index: 0
- Opacity: 0.15, fade transition (2.5s)
- 30s duration, breathing animation (15s cycle)
- Vignette overlay for depth
- Dynamic `background-image` via data URL

---

## Environment Setup

Add to `.env`:
```
GEMINI_API_KEY=your-gemini-api-key
```

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Per IP (vision endpoint) | 5 visions/minute |
| Per session | 3 visions max |
| Cooldown (auto-trigger) | 60s between triggers |

---

## Usage Examples

### 1. Explicit Request
```
User: "Show me the labyrinth"
→ Bypasses gates → visionPrompt → Gemini → SSE image → background display
```

### 2. Mythological Discussion
```
User: "Tell me about the goddess at Knossos"
Kothar: [responds about Potnia Theron]
→ After response → embodiesTheVision fires
→ "goddess" + "Knossos" triggers detected
→ mentalQuery confirms vision is appropriate
→ Vision manifests
```

### 3. Direct API Call
```typescript
const response = await fetch('/api/soul/vision', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    request: 'The labyrinth at Knossos',
    style: 'mythological',
  }),
});
const { dataUrl, prompt } = await response.json();
```

---

## Cost Estimate

- Gemini Image: ~$0.02-0.05/image
- 100 visions/day: ~$3-5/day
- Gates reduce unnecessary calls by ~80%

---

## Verification Checklist

- [ ] Type "Show me the labyrinth" → Vision background fades in
- [ ] Discuss goddess topics → Vision manifests after response
- [ ] Rate limit test → 6th request in 1 min blocked
- [ ] Mobile test → Background displays correctly
- [ ] Session limit test → 4th vision blocked
- [ ] Cooldown test → Rapid triggers blocked

---

## Related Files

- `src/lib/soul/opensouls/subprocesses/modelsTheVisitor.ts` - Subprocess pattern reference
- `src/lib/soul/triggers.ts` - Goddess trigger implementation
- `src/pages/labyrinth.astro` - Goddess background reference
- `~/.claude/skills/gemini-claude-resonance/SKILL.md` - Daimon Chamber reference
- `~/.claude/skills/nano-banana-pro/SKILL.md` - Gemini Image API reference
