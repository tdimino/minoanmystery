/**
 * backchannelResponse - Cognitive step for generating brief acknowledgments
 *
 * Generates natural backchannel responses like "mm-hmm", "interesting", "yes"
 * that show engagement without interrupting the speaker's flow.
 *
 * These are mixed at lower volume during playback.
 */

import { createCognitiveStep } from '../../soul/opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../../soul/opensouls/core/types';
import { indentNicely } from '../../soul/opensouls/core/utils';
import type { BackchannelOptions } from '../types';

export const backchannelResponse = createCognitiveStep<BackchannelOptions, string>(
  (options) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${options.soulName} listening to ${options.otherSoul} speak.

        ## What you just heard:
        "${options.justHeard}"

        ${options.topic ? `## Current topic: ${options.topic}` : ''}

        ## Task
        Generate a brief backchannel response (1-3 words) that shows you're engaged.
        This should feel natural, not performative.

        Draw from your core personality as ${options.soulName}:
        - Let your character's essence shape how you acknowledge
        - Stay true to your voice and manner of engagement
        - Sometimes silence is appropriate (respond with just "...")

        Guidelines:
        - Keep it VERY brief (1-3 words maximum)
        - Don't form complete sentences
        - Vary your responses naturally

        Respond with ONLY the backchannel (no explanation, no quotes):
      `,
      name: options.soulName,
    }),

    postProcess: async (memory, response) => {
      // Clean up the response - remove quotes, trim
      const cleaned = response.replace(/^["']|["']$/g, '').trim();

      // If it's too long, it's not a proper backchannel
      const backchannel = cleaned.length > 20 ? '...' : cleaned;

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[backchannel] ${backchannel}`,
          name: memory.soulName,
          metadata: { type: 'backchannel' },
        },
        backchannel,
      ];
    },
  })
);

export default backchannelResponse;

/** Step metadata for manifest generation */
export const meta = {
  name: 'backchannelResponse',
  description: 'Brief acknowledgment responses during partner speech',
  tags: ['radio', 'backchannel', 'engagement'] as const,
  stream: false,
  provider: 'llm' as const,
} as const;
