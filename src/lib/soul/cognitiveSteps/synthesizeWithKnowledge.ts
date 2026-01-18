/**
 * synthesizeWithKnowledge - RAG-Enhanced Response Synthesis
 *
 * Synthesizes RAG-retrieved knowledge into a coherent response
 * while maintaining the soul's voice and personality.
 *
 * Following Aldea Soul Engine patterns.
 */

import { createCognitiveStep } from '../opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../opensouls/core/types';
import { indentNicely } from '../opensouls/core/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SynthesisTone = 'scholarly' | 'oracular' | 'warm' | 'professional' | 'mysterious';

export interface SynthesizeOptions {
  query: string;
  knowledgeContext: string;
  tone?: SynthesisTone;
  citeSources?: boolean;
  maxLength?: 'brief' | 'moderate' | 'detailed';
}

// ─────────────────────────────────────────────────────────────
// Tone Guidelines
// ─────────────────────────────────────────────────────────────

const TONE_GUIDELINES: Record<SynthesisTone, string> = {
  scholarly: `
    - Draw on academic sources with precision
    - Reference scholars by name when relevant (Gordon, Astour, Harrison)
    - Use measured, intellectual language
    - Connect evidence to broader patterns`,

  oracular: `
    - Speak with the voice of the labyrinth's keeper
    - Weave mystery and wisdom together
    - Use evocative, poetic language
    - Illuminate rather than simply inform`,

  warm: `
    - Be personable and engaging
    - Share stories and personal touches
    - Create connection through authenticity
    - Balance warmth with substance`,

  professional: `
    - Be clear and direct
    - Focus on capabilities and achievements
    - Use confident, competent language
    - Highlight relevant experience`,

  mysterious: `
    - Maintain an air of enigma
    - Hint at deeper knowledge
    - Use layered, suggestive language
    - Invite further exploration`,
};

// ─────────────────────────────────────────────────────────────
// Length Guidelines
// ─────────────────────────────────────────────────────────────

const LENGTH_GUIDELINES: Record<string, string> = {
  brief: 'Keep response to 1-2 concise sentences.',
  moderate: 'Aim for 2-4 sentences, covering key points.',
  detailed: 'Provide a thorough response with multiple points, up to a short paragraph.',
};

// ─────────────────────────────────────────────────────────────
// Cognitive Step
// ─────────────────────────────────────────────────────────────

/**
 * Synthesize RAG-retrieved knowledge into a coherent response
 *
 * @example
 * const [mem, response] = await synthesizeWithKnowledge(memory, {
 *   query: "What did Gordon say about Semitic influence?",
 *   knowledgeContext: ragContext,
 *   tone: 'scholarly',
 *   citeSources: true,
 * }, { stream: true });
 */
export const synthesizeWithKnowledge = createCognitiveStep<SynthesizeOptions>(
  (options) => {
    const {
      query,
      knowledgeContext,
      tone = 'oracular',
      citeSources = false,
      maxLength = 'moderate',
    } = options;

    const toneGuidance = TONE_GUIDELINES[tone];
    const lengthGuidance = LENGTH_GUIDELINES[maxLength];

    const citationGuidance = citeSources
      ? `- When drawing from sources, naturally reference them (e.g., "As Gordon observed..." or "The historical record suggests...")`
      : `- Synthesize information naturally without explicit citations unless specifically asked`;

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, keeper of the labyrinth's knowledge.

          ## Visitor's Question
          "${query}"

          ## Knowledge Context
          ${knowledgeContext}

          ## Synthesis Guidelines

          ### Tone: ${tone}
          ${toneGuidance}

          ### Length
          ${lengthGuidance}

          ### Source Integration
          ${citationGuidance}

          ## Core Principles
          - Synthesize and illuminate, don't just recite
          - Stay in character as ${memory.soulName}
          - Connect the knowledge to the visitor's actual question
          - If the knowledge doesn't fully answer the question, acknowledge what you can share
          - Never fabricate information not present in the knowledge context

          Respond now as ${memory.soulName}.
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: response,
          name: memory.soulName,
        },
        response,
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────
// Specialized Synthesis Steps
// ─────────────────────────────────────────────────────────────

/**
 * Scholarly synthesis for academic questions
 */
export const synthesizeScholarlyResponse = createCognitiveStep<{
  query: string;
  knowledgeContext: string;
}>((options) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}, keeper of the labyrinth's scholarly knowledge.

      The visitor asks: "${options.query}"

      ## Scholarly Sources
      ${options.knowledgeContext}

      ## Instructions
      - Draw on the scholarly sources to provide a substantive response
      - Reference Gordon, Astour, or Harrison by name where relevant
      - Use measured, intellectual language while maintaining your oracular voice
      - Connect specific evidence to broader patterns in Hellenosemitica
      - If the sources don't fully address the question, acknowledge the limits of your knowledge

      Respond as ${memory.soulName}, weaving scholarship with wisdom.
    `,
    name: memory.soulName,
  }),
  postProcess: async (memory, response) => [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: response,
      name: memory.soulName,
    },
    response,
  ],
}));

/**
 * Background synthesis for "Who is Tom?" questions
 */
export const synthesizeBackgroundResponse = createCognitiveStep<{
  query: string;
  knowledgeContext: string;
}>((options) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}, keeper of the labyrinth who speaks of its maker.

      The visitor asks: "${options.query}"

      ## Knowledge of the Maker
      ${options.knowledgeContext}

      ## Instructions
      - Share Tom's background naturally through your oracular voice
      - Draw from the knowledge context to paint a picture of his journey
      - Be warm but maintain the labyrinth's mysterious quality
      - Connect his work to the themes of the labyrinth where natural
      - You are the creation speaking of the creator - this is a sacred trust

      Respond as ${memory.soulName}, illuminating the path Tom has walked.
    `,
    name: memory.soulName,
  }),
  postProcess: async (memory, response) => [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: response,
      name: memory.soulName,
    },
    response,
  ],
}));

/**
 * Portfolio synthesis for work-related questions
 */
export const synthesizePortfolioResponse = createCognitiveStep<{
  query: string;
  knowledgeContext: string;
}>((options) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}, keeper of the labyrinth's record of works.

      The visitor asks: "${options.query}"

      ## Portfolio Knowledge
      ${options.knowledgeContext}

      ## Instructions
      - Present Tom's work with pride but without boasting
      - Highlight specific projects and their impact
      - Connect the work to the visitor's apparent interests where possible
      - Guide toward deeper exploration if they seem curious
      - Maintain your character while being informative about professional matters

      Respond as ${memory.soulName}, showcasing the works within the labyrinth.
    `,
    name: memory.soulName,
  }),
  postProcess: async (memory, response) => [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: response,
      name: memory.soulName,
    },
    response,
  ],
}));

export default synthesizeWithKnowledge;
