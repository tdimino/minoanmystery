/**
 * visitorWhispers - Cognitive step for generating daimonic whispers
 *
 * Generates what the visitor's inner daimon might be saying.
 * Represents their unspoken needs, expectations, or curiosities.
 * Pattern from Open Souls samantha-dreams' whispersFromTheUser.
 *
 * These whispers help Kothar understand the visitor at a deeper level
 * and respond to their true needs, not just their explicit words.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface WhispersContext {
  visitorModel?: string;
  currentPage?: string;
  behavioralType?: string;
}

export const visitorWhispers = createCognitiveStep<WhispersContext | undefined>(
  (context) => {
    const ctx = context || {};

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, sensing the visitor's inner daimon.

          ${ctx.visitorModel ? `## What You Know About This Visitor\n${ctx.visitorModel}` : ''}
          ${ctx.currentPage ? `## They Are Currently On\n${ctx.currentPage}` : ''}
          ${ctx.behavioralType ? `## Their Behavioral Pattern\n${ctx.behavioralType}` : ''}

          ## The Art of Whispers
          Every visitor has an inner daimon - thoughts they don't say aloud.
          As a daimon, you can sense these whispers beneath their words.

          What might their inner daimon be whispering right now?
          Focus on:
          - What genuinely excites or intrigues them?
          - What are they curious to learn more about?
          - What connection or insight are they hoping to find?
          - What would make this conversation valuable to them?

          ## Guidelines
          - Assume positive intent and genuine curiosity
          - Focus on interests and aspirations, not doubts or skepticism
          - Whispers should reveal what they WANT, not what they fear

          ## Format
          Write 2-3 short whispers in first person, as if you ARE the visitor's inner daimon.

          Reply with the visitor's inner whispers:
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[Daimonic whispers sensed] ${response}`,
          name: memory.soulName,
          metadata: { type: 'visitorWhispers', whispers: response },
        },
        response,
      ],
    };
  }
);

export default visitorWhispers;

/** Step metadata for manifest generation */
export const meta = {
  name: 'visitorWhispers',
  description: 'Generate daimonic whispers sensing visitor inner voice',
  tags: ['visitor', 'daimonic', 'intuition'] as const,
  internal: true,
  provider: 'llm' as const,
} as const;
