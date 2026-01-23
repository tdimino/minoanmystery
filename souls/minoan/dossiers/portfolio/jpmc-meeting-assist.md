---
title: "JP Morgan Chase - Meeting Assist AI"
tags:
  concepts: [agentic-architecture, llm-prompting, evaluation-design, langgraph, deepeval, rag, hallucination-detection, compliance]
  clients: [jpmc]
  roles: [ai-content-engineer]
  periods: [contemporary]
---

# JP Morgan Chase - Meeting Assist AI

## Source
- Type: Portfolio
- Primary Sources: "Content Engineering at JPMC" presentation deck, LinkedIn
- Verification: Published presentation, professional experience
- Last Updated: 2026-01-16
- **Research Status**: Verified from portfolio content

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Client** | JP Morgan Chase |
| **Industry** | Wealth Management / Financial Services |
| **Duration** | May 2024 - July 2025 (14 months) |
| **Tom's Role** | AI Content Engineer |
| **Team** | Cross-functional: UX research, design, data, ML, dev, product |

---

## The Challenge

JP Morgan Chase employs over 5,000 wealth advisors overseeing $1 trillion in assets from primarily high-net-worth clients. Each advisor meets with 1-2 clients daily, and between 300-400 clients annually.

In the lead-up to meetings, advisors had practically no time to find all their client notes, absorb them, and come prepared with salient summaries and insightful talking points. The existing process was manual, time-consuming, and inconsistent.

Wealth advisors wanted a "virtual assistant that they can trust"—one that understands their goals: deepening relationships and converting prospects.

### The Constraint
JPMC wanted its "Meeting Assist" built and piloted within 5 months.

---

## Tom's Approach

### Discovery
- Conducted user research with wealth advisors to understand their meeting preparation workflow
- Analyzed existing client data sources: advisor notes, banking information, servicing records
- Mapped the information architecture needed to support meeting preparation

### Strategy
- Designed a taxonomy of 3 sections and 10 subsections that became the official structure for Meeting Assist
- Proposed an agentic architecture using GPT-4o with LangGraph
- Defined evaluation dimensions for judging AI outputs both qualitatively and quantitatively

### Execution
- Wrote and iterated on 10+ prompts across 5 AI agents
- Built Chain-of-Thought reasoning into the architecture
- Implemented hallucination detection and LRCC compliance checks
- Developed a "Dynamic Agent" with home-grown RAG for conversational follow-up
- Pushed PRs into LangGraph-based repos on BitBucket

---

## Technical Architecture

### Agentic System
| Component | Description |
|-----------|-------------|
| **5 Agents** | Specialized processors for different data types |
| **10+ Prompts** | Carefully designed instructions for each agent |
| **Final Aggregator** | De-duplicates summaries and insights |
| **Dynamic Agent** | Conversational feature with RAG-based citation |

### Key Technologies
- **LLM**: GPT-4o
- **Framework**: LangGraph
- **Evaluation**: DeepEval framework adaptation
- **Compliance**: LRCC policy checks
- **Data**: JSON ingestion from 600+ line wealth plans

### Evaluation Framework

| Dimension | Purpose |
|-----------|---------|
| **Accuracy** | Factual correctness of summaries |
| **Compliance** | Adherence to LRCC policies |
| **Relevance** | Meeting preparation value |
| **Completeness** | Coverage of key client information |
| **Hallucination Detection** | False positive/negative prevention |

---

## Key Deliverables

- **Taxonomy**: 3 sections, 10 subsections guiding UI and prompt development
- **Prompt Library**: 10+ production prompts with Chain-of-Thought reasoning
- **Agentic Architecture**: 5 specialized agents with modular design
- **Evaluation Pipeline**: Automated quality scoring at scale
- **Dynamic Agent**: Conversational AI with factual grounding
- **Wealth Plan Processor**: 600-line JSON ingestion for goals tracking

---

## Outcomes & Impact

| Metric | Result |
|--------|--------|
| **Daily Savings** | $800,000 |
| **Adoption Rate** | 72% of 5,000+ advisors |
| **Build Time** | 5 months to pilot |
| **Compliance Rate** | 90% of outputs within JPMC policies |
| **Citations** | 6 fact-checked citations per response |

### Qualitative Outcomes
- Advisors can prepare for meetings in minutes instead of hours
- Consistent quality of meeting preparation across the organization
- Trust in AI outputs due to citation and compliance features
- Modular architecture enables adding new data sources

---

## Skills Demonstrated

- **LLM Prompting**: Designed prompts that produce reliable, compliant outputs
- **Agentic Architecture**: Multi-agent system with clear responsibilities
- **Evaluation Design**: Quantitative and qualitative measurement at scale
- **Cross-Functional Collaboration**: Bridge between design, data, ML, and product
- **UX Research**: User-centered design for wealth advisor workflow
- **Technical Writing**: Taxonomy and documentation for complex systems

---

## Notable Quotes

> "Meeting Assist consisted of 5 'agents' and over 10 prompts that ingested advisor, banking, and servicing notes, and a final aggregator that de-duplicated summaries and insights."
> — From presentation deck

> "We built our UI, 'agentic' architecture, and prompts to be modular by design, permitting others to easily add more data sources and subsections into Meeting Assist."
> — From presentation deck

> "Through our hallucination checks and evaluation metrics, we ensured 90% of our outputs abided by JPMC's policies, and prevented the appearance of false positives/negatives."
> — From presentation deck

---

## What Tom Learned

The JPMC project demonstrated how content engineering skills translate directly to AI development. The same instincts that guide content strategy—audience analysis, information architecture, clarity of communication—apply to prompt design and evaluation.

The project also revealed the importance of modularity in AI systems. By designing agents with clear boundaries and responsibilities, the system could evolve without requiring complete rewrites.

---

## Why This Matters for Kothar

This project represents Tom's transition from traditional content work to AI engineering. When visitors ask about Tom's AI capabilities, Kothar can speak to concrete metrics ($800k/day, 72% adoption) and technical depth (LangGraph, Chain-of-Thought, DeepEval).

The JPMC work also demonstrates Tom's approach to AI: not just prompting, but architecting systems that are trustworthy, measurable, and human-centered.

---

## Cross-References
- **Portfolio**: aldea-soul-engine.md (continuation of AI work)
- **Portfolio**: cognitive-design-mvps.md (philosophical foundation)
- **Biography**: ai-ml-chapter.md (career context)

## RAG Tags
JPMC, JP Morgan Chase, Meeting Assist, AI, LLM, GPT-4o, LangGraph, DeepEval, agentic, wealth management, content engineer, prompts, evaluation, hallucination, RAG, compliance, $800k, 72% adoption, 5 agents, Chain-of-Thought, Tom di Mino, portfolio, case study, financial services, 2024, 2025
