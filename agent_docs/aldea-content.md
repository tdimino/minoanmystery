# Aldea Content Strategy

Guidelines for creating Aldea AI case studies and portfolio content.

## Tom's Role at Aldea

**Principal AI Content Engineer** focusing on:
- Training LLMs on world-renowned expert knowledge
- Safety and ethical evaluation (red-teaming, alignment)
- Full-stack AI application development
- Daimonic Souls Engine (Open Souls-inspired)

## Proposed Site Structure

```
/aldea/                    # Aldea landing page
/aldea/case-studies/       # Case study index
/aldea/case-studies/[slug] # Individual case studies
/aldea/blog/               # Blog index (linkable from social)
/aldea/blog/[slug]         # Individual posts
```

## Content Collection Schema

Add to `src/content/config.ts`:

```typescript
const aldeaCaseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.literal('Aldea AI'),
    date: z.date(),
    summary: z.string(),
    heroImage: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().optional(),
  }),
});

const aldeaBlog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()),
    socialImage: z.string().optional(),
  }),
});
```

## Case Study Topics

### 1. LLM Training on Expert Corpora

**Theme**: Training AI on world-renowned expert knowledge
**Key points**:
- Curriculum design for domain expertise
- Quality evaluation metrics
- Expert-in-the-loop workflows
- Knowledge distillation techniques

### 2. Safety & Ethical Evaluation

**Theme**: Red-teaming and alignment evaluation
**Key points**:
- Adversarial testing methodologies
- Bias detection and mitigation
- Constitutional AI principles
- Evaluation rubric design

### 3. Full-Stack AI Applications

**Theme**: Building production AI apps
**Key points**:
- Architecture decisions (RAG, agents, workflows)
- User experience for AI interactions
- Reliability and fallback strategies
- Cost optimization

### 4. Daimonic Souls Engine

**Theme**: Open Souls-inspired soul implementations
**Key points**:
- Functional programming paradigm
- WorkingMemory and cognitive steps
- Mental process state machines
- Personality persistence

## Blog Post Ideas

Linkable content for Twitter/LinkedIn:

1. "What It's Like Training LLMs on Expert Knowledge"
2. "The Art of AI Evaluation: Beyond Benchmarks"
3. "Building AI Apps That Feel Alive"
4. "From Poet to AI Engineer: A Cross-Functional Journey"
5. "Red-Teaming AI: Lessons from the Trenches"

## Landing Page Sections

1. **Hero**: "Principal AI Content Engineer at Aldea AI"
2. **What I Do**: Training, evaluation, full-stack apps
3. **Case Studies Preview**: Featured projects (cards)
4. **Blog Preview**: Latest posts
5. **CTA**: Contact/schedule specific to Aldea inquiries

## Social Optimization

- Open Graph images auto-generated per post
- Twitter Card meta tags (summary_large_image)
- LinkedIn preview optimization
- Short URLs for tracking (UTM parameters)

## Writing Style

- First-person, practitioner perspective
- Technical depth with accessibility
- Concrete examples and metrics where possible
- Connect to broader AI industry trends
- Highlight unique Aldea approach

## Side Projects to Showcase

Beyond Aldea work, consider adding:
- Personal AI experiments
- Open source contributions
- Conference talks or writing
- Teaching/mentoring
