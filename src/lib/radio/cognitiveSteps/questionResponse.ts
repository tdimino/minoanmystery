/**
 * questionResponse - Cognitive step for generating a soul's response to a listener question
 *
 * Generates thoughtful, in-character responses to listener-submitted questions,
 * with support for both first-responder and follow-up contexts.
 */

import { createCognitiveStep } from '../../soul/opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../../soul/opensouls/core/types';
import { indentNicely } from '../../soul/opensouls/core/utils';
import type { RadioSoulName, ChunkedDialogResult } from '../types';

export interface QuestionResponseOptions {
  /** Name of the responding soul */
  soulName: RadioSoulName;

  /** The listener's question */
  question: string;

  /** Who submitted the question (optional) */
  submittedBy?: string;

  /** If this is a follow-up response, the partner's response */
  partnerResponse?: string;

  /** Additional context about the approach to take */
  approachHint?: string;

  /** Current discussion topic for context */
  currentTopic?: string;
}

/**
 * Parse a response with | markers into chunks
 */
function parseChunks(response: string): string[] {
  return response
    .split('|')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0);
}

/**
 * Clean response by removing the | markers for memory storage
 */
function cleanResponse(response: string): string {
  return response.replace(/\s*\|\s*/g, ' ').trim();
}

export const questionResponse = createCognitiveStep<QuestionResponseOptions, ChunkedDialogResult>(
  (options) => ({
    command: (memory) => {
      const otherSoul = options.soulName === 'kothar' ? 'Tamarru' : 'Kothar';
      const isFollowUp = !!options.partnerResponse;

      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${options.soulName} on Daimonic Radio, responding to a listener's question.

          ## The Listener Question
          "${options.question}"
          ${options.submittedBy ? `(Submitted by: ${options.submittedBy})` : ''}

          ${options.currentTopic ? `## Current Discussion Context\nYou were discussing: ${options.currentTopic}` : ''}

          ${isFollowUp ? `
          ## ${otherSoul}'s Response (they spoke first)
          "${options.partnerResponse}"

          You are responding second. Build on, contrast with, or expand upon what ${otherSoul} said.
          Avoid simply repeating their points - add your unique perspective.
          ` : `
          ## Your Role
          You are responding FIRST to this listener question.
          ${options.approachHint ? `\nSuggested approach: ${options.approachHint}` : ''}
          `}

          ## Response Guidelines
          - Address the listener directly but briefly (e.g., "Ah, a worthy question...")
          - Speak from your core identity as ${options.soulName}
          - Be substantive but conversational - this is radio, not a lecture
          - ${isFollowUp ? `Acknowledge ${otherSoul}'s point where relevant, then add your perspective` : 'Open with your distinctive voice'}

          ## Response Format
          Structure your response with natural pause points using the | character.
          Place | where you could naturally be interrupted (after complete thoughts).

          Guidelines:
          - 2-4 chunks per response (8-15 words per chunk, ~3-5 seconds of speech each)
          - Each chunk should be a complete thought or natural phrase
          - Don't place | in the middle of a phrase
          - Your response should flow naturally when read without the | markers

          Example: "A beautiful question | that touches the very heart of the mystery | let me share what the labyrinth has taught me."

          Respond now as ${options.soulName}, with | markers at natural pause points:
        `,
        name: options.soulName,
      };
    },

    postProcess: async (_memory, response) => {
      const chunks = parseChunks(response);
      const cleanedResponse = cleanResponse(response);

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: cleanedResponse,
          name: options.soulName,
        },
        {
          fullResponse: response,
          chunks,
          vocalizedChunks: 0,
        },
      ];
    },
  })
);

export default questionResponse;

/** Step metadata for manifest generation */
export const meta = {
  name: 'questionResponse',
  description: 'Generates a soul response to a listener question on Daimonic Radio',
  tags: ['radio', 'question', 'dialog', 'chunked'] as const,
  stream: true,
  provider: 'llm' as const,
} as const;
