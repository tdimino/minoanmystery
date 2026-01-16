# Tom's AI/ML Chapter (2024-Present)

## Source
- Type: Biography
- Primary Sources: LinkedIn profile, JPMC deck, aldea-content.md
- Verification: Cross-referenced across portfolio and published work
- Last Updated: 2026-01-16
- **Research Status**: Verified from portfolio content

---

## Timeline

| Year | Organization | Role | Key Achievement |
|------|--------------|------|-----------------|
| 2022-2024 | Minoan Mystery | Cognitive Designer | Discord bots with souls, SocialAGI experiments |
| May 2024 - Jul 2025 | JP Morgan Chase | AI Content Engineer | $800k/day savings via Meeting Assist |
| Jul 2025 - Present | Aldea AI | Principal AI/ML Engineer | Daimonic Souls Engine, 9-dim evaluation |

---

## Key Details

| Aspect | Details |
|--------|---------|
| **Current Role** | Principal AI/ML Engineer at Aldea AI |
| **Previous Role** | AI Content Engineer at JP Morgan Chase |
| **Duration** | 2+ years in dedicated AI/ML work |
| **Location** | Remote (Hudson Valley, NY) |
| **Focus Areas** | LLM training, evaluation, cognitive design, voice AI |

---

## The Pivot to AI

### Background Context
Tom's content design work at Google and CZI (2021-2023) coincided with the GPT-3 and ChatGPT releases. With a decade of writing experience and growing technical skills, he recognized an opportunity to apply content expertise to AI development.

### The Cognitive Design Bridge
Starting in 2022, Tom began experimenting with cognitive design—using TypeScript to build AI characters with persistent personalities, memories, and emotional states. These experiments with the Open Souls framework became his proving ground for AI architecture.

### Enterprise Validation
The JPMC role (2024-2025) validated that cognitive design principles could work at enterprise scale. Building Meeting Assist demonstrated that Tom's approach—content engineering + agentic architecture + rigorous evaluation—produced measurable business outcomes.

---

## JP Morgan Chase (2024-2025)

### Role: AI Content Engineer

> "As a Content Engineer, I'm the guy who's closest to the prompts behind our AI tool called 'Meeting Assist.'"
> — From JPMC presentation

### Responsibilities
- Iterating on product design of AI tools for wealth management advisors
- Mediating between design, research, ML, data, and dev teams
- Designing agentic architecture evaluated at scale
- Building user-researched prototypes in Figma
- Reducing hallucinations by rewriting prompts
- Developing on LangGraph, LlamaIndex, DeepEval frameworks

### Impact
| Metric | Value |
|--------|-------|
| Daily Savings | $800,000 |
| Adoption Rate | 72% of 5,000+ advisors |
| Build Time | 5 months |
| Compliance | 90% within JPMC policies |

### Key Learning
Enterprise AI requires more than good prompts—it requires architecture (5 agents, modular design), evaluation (quantitative and qualitative), and cross-functional collaboration (design, data, ML, product).

---

## Aldea AI (2025-Present)

### Role: Founding Engineer / Principal AI/ML Engineer

> "Aldea pioneers cutting-edge STT/TTS and post-Transformer LLMs, while training and serving AI advisors that internalize the spirit, wisdom, and methodologies of world-renowned experts."
> — LinkedIn description

As a founding engineer at Aldea (also known as Subquadratic), Tom builds core infrastructure from the ground up—from model deployment to evaluation pipelines to voice-first AI systems.

### Responsibilities
- Architecting production SMS/mobile AI platform
- Designing cognitive flows for AI advisors with layered memory
- Building data enrichment pipelines for fine-tuning
- Developing 9-dimensional LLM-as-a-Judge evaluation framework
- Implementing voice-first pipeline with sub-second latency

### Technical Stack
| Component | Technology |
|-----------|------------|
| Models | HuggingFace, Lambda GPU servers |
| Fine-tuning | LoRA adapters |
| Evaluation | Gemini Flash, Qwen 3, Kimi K2 |
| Voice | STT/TTS with barge-in detection |
| Platforms | SMS, web, mobile |

### Philosophy
At Aldea, Tom applies the "soul engineering" principles developed through years of cognitive design experiments. The goal: AI advisors that remember, reflect, and emotionally attune—not just respond.

---

## Key Collaborators

| Name | Role | Relationship |
|------|------|--------------|
| **Alex Whedon** | CTO, Subquadratic/Aldea AI | Co-founder, technical leadership |
| **Saul Ramirez** | Head of ML Research, Subquadratic/Aldea AI | ML architecture, mentorship |
| **Thiago Duarte** | Formerly Open Souls | Soul engine patterns, cognitive design, introduced Next.js/React |

These collaborators represent the technical leadership and mentorship that enabled Tom's rapid growth as an AI/ML engineer.

---

## TensorRT-LLM Production Deployment

### Overview
Deployed multiple fine-tuned Llama-3.3-70B models to production using NVIDIA TensorRT-LLM and Triton Inference Server on Lambda Labs H100 infrastructure.

### Technical Achievements
- **Multi-GPU Tensor Parallelism (TP=2)**: Split 70B model across 2× H100 80GB GPUs
- **Custom Triton Image**: Built TensorRT-LLM from source targeting H100 arch (`sm90-real`)
- **Multi-GB LoRA Switching**: Implemented shared memory (`/dev/shm`) pipeline for 2.5GB+ LoRA uploads
- **BF16 Dtype Solution**: Solved NumPy's lack of BF16 support via uint16 bit-pattern encoding
- **Weight Streaming**: Enabled with `--gemm_plugin disable` for reduced VRAM footprint

### Architecture
Two concurrent Triton instances on 4×H100:
- **Fused Shefali** (GPUs 0-1, port 18000): Maximum throughput persona
- **Base + LoRA** (GPUs 2-3, port 28000): Dynamic persona switching via `lora_task_id`

### Challenges Solved
1. TensorRT version mismatch (build vs runtime container alignment)
2. MPI worker spawn failures in containers → orchestrator mode
3. LoRA cache OOM → shared memory seeding
4. Weight streaming ineffective → disable GEMM plugin
5. BF16 LoRA dtype mismatch → uint16 bit-pattern conversion

This infrastructure work enables Aldea's AI advisors to run at production scale with sub-second latency and dynamic persona switching.

---

## Cognitive Design Philosophy

### Core Principles
1. **Beyond Prompts**: Work at the API level with programming languages, not just prompt text
2. **Mental Processes**: State machines for AI behavior, not static instructions
3. **Cognitive Steps**: Pure transformations that can be composed and evaluated
4. **Memory Layers**: Session, conversation, and long-term persistence
5. **Reflection**: AI that thinks before responding

### Distinguishing Features
| Traditional Prompting | Cognitive Design |
|-----------------------|------------------|
| Static system prompts | Variable, evolving prompts |
| No state management | Mental process state machines |
| Prompt-and-response | Multi-step cognitive flows |
| Character through prompt | Character through architecture |
| Manual evaluation | Automated evaluation pipelines |

---

## Skills Developed

### Technical
- **Python**: Data pipelines, evaluation frameworks, model deployment
- **TypeScript**: Cognitive flows, API-level LLM control
- **LangGraph**: Agentic architecture
- **DeepEval**: Quality evaluation at scale
- **LoRA**: Fine-tuning for persona adaptation
- **Voice AI**: STT/TTS pipeline engineering

### Methodological
- **Evaluation Design**: Quantitative and qualitative metrics
- **Cross-Functional Collaboration**: Design + Data + ML + Product
- **User Research**: Translating advisor feedback into AI improvements
- **Compliance**: Building within regulatory constraints (LRCC)

---

## Formative Impact

### 1. From Content to Code
This phase completed Tom's transition from content strategy to AI engineering. The same skills—audience analysis, information architecture, clarity of communication—now apply to prompt design and evaluation.

### 2. Proof of Concept → Production
The cognitive design experiments (Discord bots, Samantha) proved the concept. JPMC proved it at enterprise scale. Aldea brings it to consumer-facing AI advisors.

### 3. Philosophy as Method
The interest in consciousness, daimons, and soul became a practical methodology—not just aesthetic but architectural guidance for building AI that feels present.

---

## Notable Quotes

> "I programmatically-instruct LLMs in TypeScript to accomplish tasks (and subconsciously ponder) within 'cognitive flows' that are easy for users and developers to follow, and adaptable in-production."
> — LinkedIn summary

> "With the open-source repos to prove it, I can imbue a 'soul' into any A.I. product or paradigm you're building, audit what you're running in-production, and increase your user retention quickly and dramatically."
> — LinkedIn summary

> "Ready to rethink what A.I. means at the zenith of the Information Age?"
> — LinkedIn summary

---

## Why This Matters for Kothar

When visitors ask about Tom's current work or AI capabilities, Kothar draws from this chapter to speak authentically about:
- What Tom does day-to-day
- How cognitive design differs from prompting
- Why metrics like $800k/day and 72% adoption matter
- What makes Aldea's approach distinctive

This chapter represents Tom's professional culmination—the integration of writing, philosophy, and technical skills into a coherent practice of soul engineering.

---

## Cross-References
- **Portfolio**: jpmc-meeting-assist.md (enterprise AI details)
- **Portfolio**: subquadratic/aldea-soul-engine.md (current work details)
- **Portfolio**: subquadratic/INDEX.md (Subquadratic/Aldea overview)
- **Portfolio**: cognitive-design-mvps.md (foundational experiments)
- **Oracle-Concepts**: daimonic-wisdom.md (philosophical framework)
- **Biography**: INDEX.md (full career context)
- **Biography**: big-tech-era.md (preceding phase)

## RAG Tags
Tom di Mino, AI, ML, AI/ML, JPMC, JP Morgan Chase, Aldea, Subquadratic, Principal AI/ML Engineer, Founding Engineer, AI Content Engineer, cognitive design, LLM, GPT-4o, LangGraph, DeepEval, fine-tuning, LoRA, voice AI, STT, TTS, evaluation, Meeting Assist, soul engineering, 2024, 2025, current work, career, TensorRT-LLM, Triton, H100, Lambda Labs, tensor parallelism, weight streaming, Alex Whedon, Saul Ramirez, Thiago Duarte, collaborators
