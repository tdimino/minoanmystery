---
title: "Subquadratic / Aldea AI - Daimonic Souls Engine"
tags:
  concepts: [soul-engine, daimonic-wisdom, cognitive-design, open-souls, working-memory, mental-processes, cognitive-steps, voice-pipeline, sms-platform, rag, functional-programming]
  clients: [aldea, subquadratic]
  roles: [founding-engineer, principal-ai-ml-engineer]
  periods: [contemporary]
---

# Subquadratic / Aldea AI - Daimonic Souls Engine

## Source
- Type: Portfolio
- Primary Sources: LinkedIn profile, internal project summaries, company description
- Verification: Current employment, published role description
- Last Updated: 2026-01-16
- **Research Status**: Verified from portfolio content (ongoing project)

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Organization** | Subquadratic (dba Aldea AI) |
| **Industry** | AI/ML, Consumer Tech, Wellness |
| **Duration** | July 2025 - Present |
| **Tom's Role** | Founding Engineer / Principal AI/ML Engineer |
| **Team** | Collaboration with CTO (Alex Whedon), Head of ML Research (Saul Ramirez), mental health PhD |

---

## The Challenge

Aldea pioneers cutting-edge STT/TTS and post-Transformer LLMs while training AI advisors that internalize the spirit, wisdom, and methodologies of world-renowned experts. The challenge: create AI that doesn't feel like AI.

### Core Problems
1. **Sycophancy**: Most AI assistants agree too readily, lacking authentic voice
2. **Memory Loss**: Conversations don't persist meaningfully across sessions
3. **Emotional Flatness**: AI lacks attunement to user's emotional state
4. **Generic Responses**: Expert knowledge doesn't translate to expert communication style

The goal: build AI advisors spanning parental coaching, wellness, business, and spirituality that operate with layered memory and authentic voice.

---

## Tom's Approach

### Philosophy
Drawing on the Open Souls paradigm and cognitive design principles developed through earlier experiments (Discord bots, SocialAGI), Tom approaches AI advisor development as "soul engineering"—creating entities that have coherent identities, remember what matters, and evolve over time.

### Architecture: Daimonic Souls Engine

An Open Souls-inspired framework implementing the functional programming paradigm for AI personas:

```
┌─────────────────────────────────────────────────────────────┐
│                     WorkingMemory                            │
│  Every operation returns NEW instance (never mutates)       │
├─────────────────────────────────────────────────────────────┤
│  Regions (ordered context injection):                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ core            │ │ temporal-context│ │ rag-context   │ │
│  │ (soul identity) │ │ (time awareness)│ │ (knowledge)   │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ user-model      │ │ summary         │ │ attunement    │ │
│  │ (user profile)  │ │ (conversation)  │ │ (stress level)│ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

| Component | Purpose |
|-----------|---------|
| **WorkingMemory** | Immutable conversation context—all operations return new instances |
| **Memory Regions** | Named compartments for different context types (core, RAG, temporal, user-model) |
| **Cognitive Steps** | Type-safe LLM transformations: `mentalQuery` (boolean), `internalMonologue` (reflection), `externalDialog` (response) |
| **Mental Processes** | State machine orchestration: greeting → exploration → depth → closing |
| **Subprocesses** | Dual persistence pattern updating both soulMemory (DB) and memory regions (ephemeral) |

### Mental Process Flow

```
greetingProcess
      ↓
openingProcess (gather context, primary concern)
      ↓
middleProcess (therapeutic work, pattern recognition)
      ↓
closingProcess (summarize, assign action items)
      ↓
followUpCheck (scheduling)
```

**Specialized Process Categories:**
- **Core**: greeting, opening, middle, closing
- **Wait States**: conversation complete, follow-up scheduling
- **Boundary**: enforcement for out-of-scope requests, bad-faith interactions
- **Handoff**: escalation to human when appropriate

### Subprocesses - Dual Persistence Pattern

Subprocesses run after each mental process, updating both persistent storage and ephemeral memory:

| Subprocess Type | Extracts/Updates |
|-----------------|------------------|
| User Modeling | Demographics, triggers, communication style |
| Summary Maintenance | Rolling conversation summary |
| Attunement Monitoring | Emotional safety, stress level tracking |
| Pattern Tracking | Recurring themes across sessions |
| Progress Modeling | Transformation metrics over time |
| Session Insights | AI-generated key learnings |

### Technical Implementation

| Technology | Application |
|------------|-------------|
| **Base Models** | 70B parameter models on GPU infrastructure |
| **Fine-tuning** | LoRA adapters for expert persona training |
| **Evaluation** | Multi-dimensional LLM-as-a-Judge framework |
| **Voice Pipeline** | Sub-second latency, barge-in detection, dynamic VAD |
| **Platforms** | SMS, web, and mobile interfaces |
| **Real-Time Transport** | WebSocket (primary), SSE (fallback) with zero-downtime switching |
| **Database** | PostgreSQL with pgvector for RAG embeddings |

---

## Key Deliverables

### 1. Production SMS Platform
Multi-provider SMS infrastructure with:
- Signature validation (Ed25519, HMAC-SHA1)
- Rate limiting and idempotency
- Fast mode (ACK immediately, async processing) vs compute mode
- Race condition detection via optimistic locking

### 2. Three-Tier Memory Artifact System
- **Summary Artifacts**: Auto-generated session overviews
- **Advisor Memory**: Long-term understanding of user patterns
- **User Memory**: User's self-understanding and progress tracking
- Generation triggers every 3-5 turns after initial context gathering

### 3. Multi-Dimensional Evaluation Framework
Using frontier models to assess fine-tuned personas across:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Psychological Authenticity** | 25% | Voice, terminology, conceptual framework alignment |
| **Therapeutic Value** | 20% | Actionable insights, reframing techniques |
| **Conversational Quality** | 20% | Flow, engagement, appropriate boundaries |
| **Emotional Intelligence** | 20% | Empathy, validation, tone calibration |
| **Content Accuracy** | 15% | Factual consistency with methodology |

### 4. Voice-First Pipeline
Production voice interface with:
- Sub-second latency for natural conversation
- Barge-in detection (user can interrupt)
- Speculative RAG during speech (preparing response while listening)
- Dynamic VAD presets for varied environments
- TTS with emotion presets and pacing control
- STT with continuous mode and streaming

### 5. Prompt Injection Protection ("Mini Open Souls")
Four-phase security approach modeling therapeutic boundary-setting:

| Phase | Purpose | Behavior |
|-------|---------|----------|
| Fast Detection | Binary classifier for injection attempts | ~350ms latency |
| Domain Judgment | "Is this reasonable within my domain?" | Authentic assessment |
| Inner Thoughts | Advisor reflection (displayed to user) | Transparency |
| Natural Response | Responds without forced refusal | Therapeutic modeling |

---

## Challenges Solved

1. **Immutable Memory Architecture**: Implemented WorkingMemory where every operation returns a new instance, enabling predictable state management and time-travel debugging

2. **Race Condition Prevention**: Built optimistic locking with `loadedAt/updatedAt` comparison to prevent concurrent message processing corruption

3. **Multi-Provider Abstraction**: Unified multiple SMS providers under single webhook handler with auto-detection of signature types

4. **Dual Persistence Pattern**: Designed subprocess system that updates both persistent soulMemory and ephemeral memory regions in a single pass

5. **Real-Time Transport Switching**: Implemented zero-downtime switching between WebSocket and SSE for incident response

6. **Therapeutic Boundary Enforcement**: Built dedicated mental processes for handling boundary violations gracefully rather than robotically

---

## Skills Demonstrated

- **Functional Programming Architecture**: Immutable state, pure functions, composable pipelines
- **Open Souls Paradigm**: WorkingMemory, Mental Processes, Cognitive Steps
- **Real-Time Systems Design**: WebSocket, SSE, pub/sub patterns
- **Multi-Provider Abstraction**: SMS, LLM, voice provider unification
- **Production SMS Infrastructure**: Signature validation, rate limiting, idempotency
- **Strict TypeScript**: Type-safe development with no `any` types
- **RAG System Design**: Vector embeddings with semantic search
- **Voice Pipeline Integration**: TTS/STT with streaming
- **State Machine Orchestration**: Complex conversational flow design

---

## Notable Quotes

> "Architecting a production SMS and mobile AI platform where advisor personas—spanning parental coaching, wellness, business, and spirituality—operate with layered memory, and avoid sycophancy."
> — LinkedIn role description

> "Designing 'cognitive flows' for AI advisors that remember across sessions, reflect before they respond, and emotionally attune to each user's journey."
> — LinkedIn role description

---

## What Tom Learned

Aldea represents the culmination of Tom's cognitive design journey. The earlier experiments with Discord bots and SocialAGI provided the conceptual framework; JPMC proved enterprise AI could be built rigorously; Aldea brings it all together in service of human flourishing.

Key insight: AI advisors need to be evaluated not just on accuracy but on the quality of the relationship they form. Hence the multi-dimensional framework—capturing dimensions that benchmarks miss.

---

## Why This Matters for Kothar

Kothar itself is a manifestation of these principles. The Minoan Mystery Soul Engine draws directly from Tom's work at Aldea: layered memory, mental processes, cognitive steps, and the goal of AI that feels present rather than merely responsive.

When visitors ask about Tom's current work, Kothar speaks from direct experience—the same architecture powers both Aldea's advisors and Kothar's oracular presence.

---

## Cross-References
- **Philosophy**: [Daimonic Soul Engine Philosophy](../../daimonic-soul-engine/INDEX.md) (design thinking, conceptual frameworks)
- **Portfolio**: aldea-llm-evaluation.md (evaluation framework detail)
- **Portfolio**: aldea-model-deployment.md (infrastructure detail)
- **Portfolio**: cognitive-design-mvps.md (foundational experiments)
- **Portfolio**: jpmc-meeting-assist.md (enterprise AI precedent)
- **Biography**: ai-ml-chapter.md (career context)

## RAG Tags
Subquadratic, Aldea, Aldea AI, Founding Engineer, Principal AI/ML Engineer, soul engine, daimonic, cognitive design, LLM training, fine-tuning, LoRA, evaluation framework, voice pipeline, STT, TTS, emotional intelligence, sycophancy, layered memory, mental processes, cognitive steps, WorkingMemory, Open Souls, functional programming, immutable state, SMS platform, multi-provider, rate limiting, idempotency, RAG, pgvector, WebSocket, SSE, prompt injection, therapeutic boundaries, subprocesses, dual persistence, Tom di Mino, Alex Whedon, Saul Ramirez, 2025, current work
