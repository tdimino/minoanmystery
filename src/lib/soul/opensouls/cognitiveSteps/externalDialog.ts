/**
 * externalDialog - Cognitive step for user-facing responses
 *
 * Generates responses intended for the user, with streaming support.
 * The response is added to memory as an assistant message.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export const externalDialog = createCognitiveStep<string>((instructions) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}.

      ## Instructions
      ${instructions}

      ## Guidelines
      - Respond in character as ${memory.soulName}
      - Be concise and natural
      - Match the tone and style defined in your personality
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

export default externalDialog;

/** Step metadata for manifest generation */
export const meta = {
  name: 'externalDialog',
  description: 'User-facing response generation with streaming support',
  tags: ['dialog', 'streaming', 'user-facing'] as const,
  stream: true,
  provider: 'llm' as const,
} as const;
