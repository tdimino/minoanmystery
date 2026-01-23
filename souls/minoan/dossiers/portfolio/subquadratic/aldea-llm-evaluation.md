---
title: "Subquadratic / Aldea AI - LLM-as-a-Judge Evaluation Framework"
tags:
  concepts: [llm-evaluation, llm-as-a-judge, multi-dimensional-assessment, persona-assessment, statistical-analysis, prompt-engineering, rubric-design]
  clients: [aldea, subquadratic]
  roles: [founding-engineer, principal-ai-ml-engineer]
  periods: [contemporary]
---

# Subquadratic / Aldea AI - LLM-as-a-Judge Evaluation Framework

## Source
- Type: Portfolio
- Primary Sources: Internal project summaries, LinkedIn profile
- Verification: Current employment
- Last Updated: 2026-01-16
- **Research Status**: Verified from portfolio content (ongoing project)

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Organization** | Subquadratic (dba Aldea AI) |
| **Industry** | AI/ML, Evaluation Infrastructure |
| **Duration** | July 2025 - Present |
| **Tom's Role** | Founding Engineer / Principal AI/ML Engineer |
| **Focus** | LLM evaluation methodology, automated assessment pipelines |

---

## The Challenge

Fine-tuning LLMs for specific personas is only half the battle. The harder problem: **how do you systematically evaluate whether a fine-tuned model actually sounds like the expert it's meant to embody?**

Traditional benchmarks measure factual accuracy, but they miss:
- Does it sound authentic to the expert's voice?
- Is the therapeutic or coaching value actually present?
- Does it maintain appropriate professional boundaries?
- Can it push back against sycophancy?

The goal: replace subjective "vibe checks" with quantifiable, reproducible metrics.

---

## Tom's Approach

### LLM-as-a-Judge Architecture

Implemented a multi-dimensional evaluation framework where frontier models assess fine-tuned persona responses:

```
User Prompts → Multi-Model Generation → Judge Evaluation → Statistical Analysis
     ↓                    ↓                    ↓                    ↓
 50-100 prompts    Multiple LLM        5-dimension scoring    Win rates,
 per category      endpoints           per response pair      confidence intervals
```

### Evaluation Dimensions

| Dimension | Weight | Assessment Criteria |
|-----------|--------|---------------------|
| **Psychological Authenticity** | 25% | Voice, terminology, conceptual framework alignment |
| **Therapeutic Value** | 20% | Actionable insights, reframing techniques, growth orientation |
| **Conversational Quality** | 20% | Flow, engagement, appropriate boundaries |
| **Emotional Intelligence** | 20% | Empathy, validation, tone calibration |
| **Content Accuracy** | 15% | Factual consistency with persona's methodology |

### Scoring Rubric (1-10 scale)

```
9-10: Exceptional - Indistinguishable from authentic persona
7-8:  Strong - Clear persona alignment with minor gaps
5-6:  Moderate - Recognizable but inconsistent persona voice
3-4:  Weak - Generic responses with occasional persona elements
1-2:  Poor - No meaningful persona representation
```

---

## Key Technical Achievements

### 1. Multi-Model Conversation Generation
- Parallel prompt processing across multiple LLM endpoints
- Standardized response collection with metadata capture
- Support for OpenAI, Anthropic, and custom fine-tuned models
- Configurable temperature, max tokens, and system prompts

### 2. Judge Model Integration
- GPT-4o as primary judge with structured output parsing
- Cross-validation with additional models (Kimi K2, Claude)
- Prompt engineering for consistent multi-dimensional scoring
- Calibration techniques to reduce judge model bias

### 3. Parallel Evaluation Infrastructure
- Worker-based distributed evaluation execution
- Job queue management for large-scale comparisons
- Progress tracking and checkpoint/resume capability
- Resource-efficient batch processing

### 4. Statistical Analysis Pipeline
- Win/loss/tie computation with 95% confidence intervals
- Per-dimension score aggregation and visualization
- Model ranking across evaluation categories
- Comparative analysis across judge models

### 5. Evaluation Framework Generation System
The most sophisticated component—automated generation of persona-specific judge prompts:

```
Domain Description → Research API → LLM Synthesis
        ↓                 ↓                ↓
   Practitioner      Client base      3 Judge Prompts
   methodology       characteristics   (Crisis/Empathy/Competence)
        ↓                 ↓                ↓
                JSON Framework Output
          (detailed rubrics with examples)
```

Each generated judge prompt includes:
- **Evaluation dimensions** (3-5 per judge type)
- **Likert scale scoring** (1-5 with specific criteria per level)
- **Example evaluations** with sample inputs/outputs
- **Integration notes** for authentic voice markers
- **Professional boundary guidelines**

### 6. Multi-Persona Scenario Generation
- Stage-based prompt organization (opening, middle, closing phases)
- Dual prompt types: client scenarios and practitioner guidance
- Supporting prompts for training, constitution, and rewriting
- Generated frameworks stored as JSON with full metadata

---

## Prompt Categories for Evaluation

| Category | Purpose | Examples |
|----------|---------|----------|
| **Relationship Dynamics** | Romantic, family, friendship | Conflict resolution, attachment issues |
| **Personal Growth** | Self-improvement, identity | Life transitions, values clarification |
| **Emotional Processing** | Grief, anxiety, regulation | Window of tolerance, nervous system |
| **Therapeutic Techniques** | Methodology application | Specific framework usage |

---

## Challenges Solved

1. **Judge Model Bias**: Implemented prompt calibration and multi-judge cross-validation to reduce systematic biases

2. **Scale Efficiency**: Built parallel worker infrastructure to evaluate 1000+ response pairs in reasonable time

3. **Evaluation Consistency**: Developed structured rubrics and few-shot examples to improve judge reliability

4. **Multi-Model Coordination**: Created unified interface for different LLM APIs with consistent response formatting

5. **Persona-Specific Evaluation**: Designed framework generation system that captures unique voice markers, methodology, and professional boundaries per advisor type

6. **Research-to-Rubric Pipeline**: Automated the synthesis of practitioner research into actionable evaluation criteria with concrete examples

---

## Results Framework

### Metrics Captured
- **Overall Win Rate**: Head-to-head preference percentage
- **Dimension Scores**: Per-dimension average and variance
- **Consistency Index**: Score stability across prompt categories
- **Judge Agreement**: Cross-judge model correlation

### Output Artifacts
- JSON evaluation results with full scoring breakdown
- CSV summary tables for spreadsheet analysis
- Visualization plots (radar charts, bar comparisons)
- Markdown reports with statistical summaries

---

## Skills Demonstrated

- **LLM Evaluation Methodology**: Multi-dimensional assessment design
- **Prompt Engineering**: Judge prompts, calibration, few-shot examples
- **Multi-Model API Integration**: OpenAI, Anthropic, custom endpoints
- **Statistical Analysis**: Confidence intervals, correlation, variance
- **Parallel Processing**: Distributed job management, asyncio
- **Jupyter Notebook Development**: Reproducible research workflows
- **Data Pipeline Design**: ML evaluation workflows
- **Automated Framework Generation**: LLM-synthesized evaluation rubrics
- **Domain-Specific Rubric Design**: Therapeutic AI persona assessment

---

## Impact

- **Systematic Model Assessment**: Replaced subjective "vibe checks" with quantifiable metrics
- **Fine-tuning Feedback Loop**: Evaluation results informed iterative model improvements
- **Quality Assurance**: Established baseline metrics for persona authenticity
- **Scalable Infrastructure**: Framework supports ongoing evaluation as models evolve
- **Reusable Framework Generation**: Automated system enables rapid evaluation setup for new AI personas

---

## Why This Matters for Kothar

Kothar's responses aren't randomly generated—they're evaluated against the same multi-dimensional framework used at Aldea. When Kothar speaks with authentic voice and maintains appropriate boundaries, it's because the same evaluation methodology ensures quality.

When visitors ask about AI evaluation or how to measure persona authenticity, Kothar draws from direct experience building production-grade assessment systems.

---

## Cross-References
- **Portfolio**: aldea-soul-engine.md (overall architecture)
- **Portfolio**: aldea-model-deployment.md (infrastructure)
- **Portfolio**: jpmc-meeting-assist.md (enterprise AI precedent)
- **Biography**: ai-ml-chapter.md (career context)

## RAG Tags
Subquadratic, Aldea, Aldea AI, Founding Engineer, Principal AI/ML Engineer, LLM evaluation, LLM-as-a-Judge, evaluation framework, multi-dimensional assessment, psychological authenticity, therapeutic value, emotional intelligence, conversational quality, content accuracy, judge model, GPT-4o, Kimi K2, Claude, parallel evaluation, statistical analysis, confidence intervals, win rate, persona assessment, prompt engineering, calibration, rubric design, framework generation, automated evaluation, fine-tuning feedback, quality assurance, Tom di Mino, 2025, AI evaluation
