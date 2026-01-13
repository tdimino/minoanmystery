/**
 * mentalQuery - Cognitive step for boolean evaluation
 *
 * Evaluates a yes/no question about the current context.
 * The result is recorded in memory as "{soulName} evaluated: {query} is {true/false}".
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import type { Memory } from '../core/types';
import { indentNicely } from '../core/utils';

export const mentalQuery = createCognitiveStep<string, boolean>((query) => ({
  command: (memory) => ({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      You are ${memory.soulName}, evaluating a question.

      ## Question to Evaluate
      ${query}

      ## Instructions
      Based on the conversation context and your knowledge, answer this question.
      Respond with ONLY "yes" or "no", nothing else.
    `,
    name: memory.soulName,
  }),
  postProcess: async (memory, response): Promise<[Memory, boolean]> => {
    const cleaned = response.trim().toLowerCase();
    const result = cleaned === 'yes' || cleaned === 'true' || cleaned.startsWith('yes');

    return [
      {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.soulName} evaluated: ${query} is ${result}`,
        name: memory.soulName,
        metadata: { query: true, evaluation: result },
      },
      result,
    ];
  },
}));

export default mentalQuery;
