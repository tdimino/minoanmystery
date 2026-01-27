/**
 * chunkedExternalDialog - Cognitive step for radio dialogue
 *
 * Generates responses with natural pause points marked by `|` characters,
 * enabling the other soul to interrupt at natural breaks.
 *
 * Example output: "The labyrinth was not a maze | but a ritual dance floor | where initiates traced the goddess's path."
 */

import { createCognitiveStep } from '../../soul/opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../../soul/opensouls/core/types';
import { indentNicely } from '../../soul/opensouls/core/utils';
import type { ChunkedDialogOptions, ChunkedDialogResult } from '../types';

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

export const chunkedExternalDialog = createCognitiveStep<ChunkedDialogOptions, ChunkedDialogResult>(
  (options) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${options.soulName} in a radio dialogue with ${options.otherSoul}.

        ## Your Role
        You are ${options.soulName}. Speak from your core identity and let your natural voice guide the conversation.

        ## Current Topic
        ${options.topic}

        ## What ${options.otherSoul} just said
        "${options.lastUtterance}"

        ${options.wasInterrupted ? `
        ## You were interrupted
        You were saying: "${options.interruptedThought}"
        You may gracefully return to this point or let it go based on the flow.
        ` : ''}

        ## Response Format
        Structure your response with natural pause points using the | character.
        Place | where you could naturally be interrupted (after complete thoughts, not mid-phrase).

        Guidelines:
        - 2-4 chunks per response (8-15 words per chunk, ~3-5 seconds of speech each)
        - Each chunk should be a complete thought or natural phrase
        - Don't place | in the middle of a phrase or sentence fragment
        - Your response should flow naturally when read without the | markers

        Example: "The labyrinth was not a maze | but a ritual dance floor | where initiates traced the goddess's path."

        ${options.personalityContext || ''}

        Respond now as ${options.soulName}, with | markers at natural pause points:
      `,
      name: options.soulName,
    }),

    postProcess: async (memory, response) => {
      const chunks = parseChunks(response);
      const cleanedResponse = cleanResponse(response);

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: cleanedResponse,
          name: memory.soulName,
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

export default chunkedExternalDialog;

/** Step metadata for manifest generation */
export const meta = {
  name: 'chunkedExternalDialog',
  description: 'Radio dialogue generation with interruptible chunks',
  tags: ['radio', 'dialog', 'chunked', 'streaming'] as const,
  stream: true,
  provider: 'llm' as const,
} as const;
