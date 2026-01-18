/**
 * generateBackgroundQuestions - Question-Based RAG Cognitive Step
 *
 * Generates semantic questions for multi-dimensional retrieval (Raggy pattern).
 * Used when visitors ask open-ended questions like "Who is Tom?" or "Tell me about yourself".
 *
 * Following Aldea Soul Engine patterns (Emily Maxson's generateRapportQuestions).
 */

import { createCognitiveStep } from '../opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../opensouls/core/types';
import { indentNicely } from '../opensouls/core/utils';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Fallback Questions
// ─────────────────────────────────────────────────────────────

/**
 * Fallback questions when LLM generation fails
 */
export const FALLBACK_BACKGROUND_QUESTIONS = [
  "What is Tom di Mino's professional background and expertise in AI and design?",
  "What is Tom's journey from poetry and classical studies to AI engineering?",
  "What notable projects has Tom worked on at Aldea and other companies?",
] as const;

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────

const questionsSchema = z.object({
  questions: z.array(z.string()).min(1).max(5),
});

type QuestionsOutput = z.infer<typeof questionsSchema>;

// ─────────────────────────────────────────────────────────────
// Cognitive Step
// ─────────────────────────────────────────────────────────────

export interface BackgroundQuestionsOptions {
  userQuery: string;
  focus?: 'professional' | 'personal' | 'portfolio' | 'general';
  questionCount?: number;
}

/**
 * Generate semantic questions for multi-dimensional RAG retrieval
 *
 * @example
 * const [mem, questions] = await generateBackgroundQuestions(memory, {
 *   userQuery: "Who is Tom?",
 *   focus: 'general',
 *   questionCount: 3,
 * });
 */
export const generateBackgroundQuestions = createCognitiveStep<BackgroundQuestionsOptions, string[]>(
  (options) => {
    const { userQuery, focus = 'general', questionCount = 3 } = options;

    const focusGuidance: Record<string, string> = {
      professional: `
        1. Technical skills and expertise areas
        2. Career trajectory and notable roles
        3. Industry impact and thought leadership`,
      personal: `
        1. Personal journey and background story
        2. Philosophy and worldview
        3. Interests, poetry, and creative pursuits`,
      portfolio: `
        1. Specific projects and case studies
        2. Design and AI work examples
        3. Client collaborations and outcomes`,
      general: `
        1. Professional background and expertise
        2. Personal journey and philosophy
        3. Notable work and achievements`,
    };

    return {
      command: () => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          Generate exactly ${questionCount} questions to search a knowledge base about Tom di Mino.

          ## User's Original Query
          "${userQuery}"

          ## Focus Areas
          Questions should probe:
          ${focusGuidance[focus]}

          ## Guidelines
          - Questions should be specific enough to retrieve relevant information
          - Questions should cover different aspects to enable multi-dimensional retrieval
          - Frame questions as search queries (no yes/no questions)
          - Keep questions concise but descriptive

          ## Output Format
          Return ONLY valid JSON in this exact format:
          {"questions": ["question 1", "question 2", "question 3"]}

          No markdown, no code blocks, no explanation - just the JSON object.
        `,
      }),
      postProcess: async (memory, response) => {
        try {
          // Clean the response in case of markdown code blocks
          let cleanResponse = response.trim();
          if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          }

          const parsed = JSON.parse(cleanResponse);
          const validated = questionsSchema.parse(parsed);

          return [
            {
              role: ChatMessageRoleEnum.Assistant,
              content: `Generated ${validated.questions.length} search questions for: "${userQuery}"`,
            },
            validated.questions,
          ];
        } catch (error) {
          // Return fallback questions on parse failure
          console.warn('[generateBackgroundQuestions] Parse failed, using fallback questions:', error);
          return [
            {
              role: ChatMessageRoleEnum.Assistant,
              content: `Using fallback questions for: "${userQuery}"`,
            },
            [...FALLBACK_BACKGROUND_QUESTIONS],
          ];
        }
      },
    };
  }
);

// ─────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────

/**
 * Quick helper to generate questions without full cognitive step context
 */
export function getFallbackQuestions(focus: 'professional' | 'personal' | 'portfolio' | 'general' = 'general'): string[] {
  const fallbacks: Record<string, string[]> = {
    professional: [
      "What is Tom di Mino's technical expertise in AI and machine learning?",
      "What roles has Tom held at companies like Aldea, CZI, and Dolby?",
      "What is Tom's approach to AI safety and ethical evaluation?",
    ],
    personal: [
      "What is Tom di Mino's background in poetry and classical studies?",
      "How did Tom's interest in Minoan civilization influence his work?",
      "What philosophical perspectives shape Tom's approach to AI?",
    ],
    portfolio: [
      "What AI projects has Tom worked on at Aldea?",
      "What design work did Tom do for CZI and American Cancer Society?",
      "What are examples of Tom's full-stack AI applications?",
    ],
    general: [...FALLBACK_BACKGROUND_QUESTIONS],
  };

  return fallbacks[focus] || [...FALLBACK_BACKGROUND_QUESTIONS];
}

export default generateBackgroundQuestions;
