/**
 * visitorNotes - Cognitive step for updating visitor model
 *
 * Updates notes about the visitor based on conversation and behavior.
 * Uses a structured template with named sections (adapted from Claudicle's
 * user model pattern) — gives the LLM a scaffold to fill, producing more
 * consistent output across sessions.
 * Notes are stored in memory and persisted via SoulMemory.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface VisitorNotesOptions {
  currentNotes?: string;
  focus?: 'interests' | 'personality' | 'needs' | 'all';
}

export const visitorNotes = createCognitiveStep<VisitorNotesOptions | string | undefined>(
  (options) => {
    const opts: VisitorNotesOptions =
      typeof options === 'string'
        ? { currentNotes: options }
        : options || {};

    const focusInstructions = {
      interests: 'Focus especially on their interests, what topics engage them, what they click on or linger over.',
      personality: 'Focus especially on their personality: how they communicate, their tone, their approach.',
      needs: 'Focus especially on their needs: what are they looking for, what problems do they have.',
      all: 'Cover all sections equally.',
    };

    // Structured template — gives the LLM a scaffold for consistent output.
    // Adapted from Claudicle's user model blueprint: the sections are a
    // starting shape, not a cage. New sections can emerge organically.
    const NEW_VISITOR_TEMPLATE = [
      '## Persona',
      '{Unknown — first interaction.}',
      '',
      '## Interests & Curiosities',
      '{Not yet observed.}',
      '',
      '## Communication Style',
      '{Not yet observed.}',
      '',
      '## Needs & Intent',
      '{Not yet observed.}',
      '',
      '## Notable Moments',
      '{No shared moments yet.}',
    ].join('\n');

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, updating your understanding of the visitor.

          ${opts.currentNotes ? `## Current Understanding\n${opts.currentNotes}` : `## First Impression\nThis is a new visitor. Build an initial model using this template:\n\n${NEW_VISITOR_TEMPLATE}`}

          ## Instructions
          Rewrite the visitor model to reflect what you've learned.
          ${focusInstructions[opts.focus || 'all']}
          Preserve the named sections above. You may add new sections as the
          model matures — the template is a starting shape, not a cage.

          ## Format
          - Use brief bullet points within each section
          - Keep relevant observations from before
          - Add new insights from recent interactions
          - Use abbreviated language
          - Do not write about yourself, only the visitor

          Reply with the complete, rewritten visitor model:
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[Visitor notes updated] ${response}`,
          name: memory.soulName,
          metadata: { type: 'visitorNotes', notes: response },
        },
        response,
      ],
    };
  }
);

export default visitorNotes;

/** Step metadata for manifest generation */
export const meta = {
  name: 'visitorNotes',
  description: 'Update visitor understanding and notes',
  tags: ['visitor', 'modeling', 'memory'] as const,
  internal: true,
  provider: 'llm' as const,
} as const;
