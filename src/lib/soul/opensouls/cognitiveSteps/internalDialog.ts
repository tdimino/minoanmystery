/**
 * internalDialog - Cognitive step for persona-aware internal reasoning
 *
 * Similar to internalMonologue but supports channeling a specific persona.
 * Used in academic mode to think as Gordon, Harrison, or Astour.
 *
 * @pattern samantha-dreams (persona parameter overrides soulName)
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface InternalDialogOptions {
  /** Instructions for the internal reflection */
  instructions: string;
  /** Verb describing the action (e.g., "reasoned", "reflected", "considered") */
  verb?: string;
  /** Optional persona to channel (overrides soulName in prompt) */
  persona?: string;
}

export const internalDialog = createCognitiveStep<
  string | InternalDialogOptions
>((options) => {
  const { instructions, verb, persona } =
    typeof options === 'string'
      ? { instructions: options, verb: 'thought', persona: undefined }
      : { verb: 'thought', ...options };

  return {
    command: (memory) => {
      const speaker = persona || memory.soulName;

      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          Model the psyche of ${speaker}.

          ## Instructions
          ${instructions}

          ## Guidelines
          - Think through this from ${speaker}'s perspective
          - Use their characteristic reasoning style and vocabulary
          - This is internal reasoning—be analytical and thorough
          - Keep thoughts focused but substantive

          Reply with the next internal utterance from ${speaker}.
        `,
        name: memory.soulName,
      };
    },
    postProcess: async (memory, response) => {
      const speaker =
        typeof options === 'object' && options.persona
          ? options.persona
          : memory.soulName;
      const actionVerb = typeof options === 'object' ? options.verb || 'thought' : 'thought';

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[${speaker} ${actionVerb}] ${response}`,
          name: memory.soulName,
          metadata: { internal: true, persona: speaker },
        },
        response,
      ];
    },
  };
});

export default internalDialog;
