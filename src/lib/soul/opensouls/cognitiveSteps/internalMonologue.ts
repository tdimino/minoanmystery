/**
 * internalMonologue - Cognitive step for internal reasoning
 *
 * Generates internal thoughts that are NOT shown to the user.
 * Used for reasoning, planning, and internal state management.
 * The response is added to memory with a special marker.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export const internalMonologue = createCognitiveStep<string>((instructions) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}, thinking internally.

      ## Instructions
      ${instructions}

      ## Guidelines
      - Think through the situation carefully
      - Consider the user's perspective and needs
      - This is internal reasoning - be honest and analytical
      - Keep thoughts concise but thorough
    `,
    name: memory.soulName,
  }),
  postProcess: async (memory, response) => [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: `[Internal thought] ${response}`,
      name: memory.soulName,
      metadata: { internal: true },
    },
    response,
  ],
}));

export default internalMonologue;

/** Step metadata for manifest generation */
export const meta = {
  name: 'internalMonologue',
  description: 'Internal reasoning not shown to user',
  tags: ['reasoning', 'internal', 'planning'] as const,
  internal: true,
  provider: 'llm' as const,
} as const;
