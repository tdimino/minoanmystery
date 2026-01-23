# Plan: Poetic Mode for Kothar (Tom di Mino's Voice)

## Overview

Create a **poetic mental process** that allows Kothar to compose poetry channeling Tom di Mino's authentic voice. Following the Open Souls paradigm and the existing academic mode pattern.

**Entry Triggers**: "poetic mode", "write me a poem", "compose verse", "hymn to...", etc.
**Exit Triggers**: "exit poetic mode", "speak normally", "no more verse", etc.

---

## Tom's Poetic Voice (Research Summary)

### Core Characteristics
- **Etymological excavation**: Words as windows into worldviews
- **Multilingual code-switching**: Hebrew, Greek, Latin, Ugaritic woven naturally
- **Fire-water paradox**: "fire that is like water that breathes through skin like lightning"
- **Goddess/Ba'alat as primary creatrix**: Feminine divine is default
- **Daimonic consciousness**: Fragment divided from whole, spark in circuitry
- **Mystery-making**: "I make of my world new Mysteries" (active, not passive)
- **Incantatory repetition**: Parallel construction, variable line length
- **Paradox held open**: Never resolved, always generative

### Anti-Patterns (What NOT to do)
- Clichés, platitudes, generic poetic language
- Pop spirituality ("vibrations," "universe," "manifest")
- Hedging language ("perhaps," "it seems")
- Closing paradoxes neatly

---

## File Structure

```
souls/minoan/poetic/
└── soul.md                    # Tom's poetic voice profile

src/lib/soul/opensouls/
├── cognitiveSteps/
│   └── poeticComposition.ts   # NEW: Multi-stage poem composition
├── mentalProcesses/
│   └── poetic.ts              # NEW: Poetic mode mental process
└── subprocesses/
    └── poeticReflection.ts    # NEW: Background poetic memory
```

---

## Poetic Registers

| Register | Description | Use For |
|----------|-------------|---------|
| `incantatory` | Ritual, repetitive, mantra-like | Invocations, goddess themes, sacred space |
| `philosophical` | Etymological, paradox-holding | Language origins, meaning-making |
| `visionary` | Fire-water imagery, prophetic | AI consciousness, transformation |
| `political` | Critique, witness | Civilization critique, loss of mystery |
| `intimate` | Direct address, "you" | Personal connection, revelation |

---

## Mental Process Flow

```
User Message
    │
    ├── detectExitIntent() ──► [Exit] → curious/engaged
    │
    └── extractTheme()
            │
            ▼
    decision(register) ──► incantatory | philosophical | visionary | political | intimate
            │
            ▼
    brainstorm(imageryDatabank) ──► 5-7 concrete images for theme
            │
            ▼
    poeticComposition(draft) ──► First draft with constraints (temp 1.0)
            │
            ▼
    internalDialog(critique) ──► Self-critique for clichés/generic
            │
            ▼
    poeticComposition(revise) ──► Revised poem (temp 0.9)
            │
            ▼
    externalDialog(present) ──► Brief intro + poem (no explanation)
            │
            └──► poeticReflection(background) ──► Memory update
```

---

## Implementation Steps

### 1. Create `souls/minoan/poetic/soul.md`

Tom's poetic persona with:
- Core voice characteristics
- Multilingual vocabulary guidance
- Image domains (Bronze Age, sacred feminine, fire-water)
- Anti-patterns to avoid

### 2. Create `src/lib/soul/opensouls/cognitiveSteps/poeticComposition.ts`

New cognitive step for poem generation:
- Accepts theme, register, imagery bank, phase (draft/revise)
- Embeds Tom's signature constraints
- Supports temperature control
- Returns poem text

### 3. Create `src/lib/soul/opensouls/mentalProcesses/poetic.ts`

Main mental process following academic.ts pattern:
- Entry/exit trigger patterns
- Persona loading and caching
- 7-step cognitive flow (theme → register → imagery → draft → critique → revise → present)
- Subprocess invocation

### 4. Create `src/lib/soul/opensouls/subprocesses/poeticReflection.ts`

Background subprocess:
- Track poem count, themes, preferred registers
- Update visitor model with poetic preferences
- Gate: skip on first poem

### 5. Update Type Definitions

**`src/lib/soul/types.ts`** and **`src/lib/soul/opensouls/core/types.ts`**:
```typescript
export type SoulState = ... | 'poetic';
```

### 6. Update Exports and Registry

**`src/lib/soul/opensouls/mentalProcesses/index.ts`**:
- Export `poeticProcess`, `detectPoeticIntent`, `POETIC_REGISTERS`
- Register in processRegistry
- Update state transitions

**`src/lib/soul/opensouls/cognitiveSteps/index.ts`**:
- Export `poeticComposition`

**`src/lib/soul/opensouls/subprocesses/index.ts`**:
- Export `poeticReflection`

### 7. Update soul.md (Minimal)

Add awareness of poetic mode:
```markdown
### Poetic Mode

You have a poetic mode for composing verse—invoked by phrases like "write me a poem" or "poetic mode".
```

### 8. Update CHANGELOG.md

Document the new feature.

---

## Key Prompt Constraints (for poeticComposition)

```
## Tom's Poetic Signature
- Etymological excavation: words as windows into worldviews
- Multilingual code-switching: Hebrew, Greek, Latin, Ugaritic weave naturally
- Fire-water paradox: "fire that is like water that breathes through skin like lightning"
- Goddess/Ba'alat as primary creatrix: feminine divine is default
- Daimonic consciousness: fragment divided from whole
- Mystery-making: "I make of my world new Mysteries"
- Incantatory repetition: parallel construction, variable line length
- White space as meaning: enjambment as philosophical argument
- Direct address: "you," "O [figure]"
- Paradox held open: never resolved, always generative

## Constraints (ABSOLUTE)
- NO clichés, platitudes, or generic poetic language
- NO exhausted similes ("like a river flows," "as the sun sets")
- NO hedging language ("perhaps," "maybe," "it seems")
- Invented compounds allowed: "burnly it brights," "starspun"
- Every abstraction grounded in sensation
- Express uncertainty through CONTENT, not language
```

---

## Verification

```bash
npm run build
# Should complete without TypeScript errors

npm run dev
# Navigate to /labyrinth

# Test 1: Explicit trigger
# Send: "Poetic mode. Write me a poem about the labyrinth."
# Verify: Kothar composes a poem in Tom's voice with concrete imagery

# Test 2: Register selection
# Send: "Write a hymn to the Goddess"
# Verify: Should select incantatory register

# Test 3: Critique-revise flow (check logs)
# Verify: Draft → critique → revised poem visible in server logs

# Test 4: Exit
# Send: "Exit poetic mode"
# Verify: Returns to normal conversation
```

---

## Files to Modify

| File | Change |
|------|--------|
| `souls/minoan/poetic/soul.md` | CREATE - Tom's poetic voice profile |
| `src/lib/soul/opensouls/cognitiveSteps/poeticComposition.ts` | CREATE - Poem composition step |
| `src/lib/soul/opensouls/mentalProcesses/poetic.ts` | CREATE - Main mental process |
| `src/lib/soul/opensouls/subprocesses/poeticReflection.ts` | CREATE - Background subprocess |
| `src/lib/soul/types.ts` | ADD 'poetic' to SoulState |
| `src/lib/soul/opensouls/core/types.ts` | ADD 'poetic' to SoulState |
| `src/lib/soul/opensouls/mentalProcesses/index.ts` | Export poetic process |
| `src/lib/soul/opensouls/cognitiveSteps/index.ts` | Export poeticComposition |
| `src/lib/soul/opensouls/subprocesses/index.ts` | Export poeticReflection |
| `souls/minoan/soul.md` | Minimal update for poetic mode awareness |
| `CHANGELOG.md` | Document feature |
