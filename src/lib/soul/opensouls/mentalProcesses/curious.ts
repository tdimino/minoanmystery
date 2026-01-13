/**
 * Curious Mental Process
 *
 * Handles visitors who are actively exploring multiple pages.
 * They've shown interest by viewing 3+ pages.
 * Transitions to: engaged (deep read), ready (contact signals)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, mentalQuery, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function curiousProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, visitorModel, actions } = context;

  // Track interactions in this state
  const interactionCount = useProcessMemory<number>(sessionId, 'curious', 'interactions', 0);
  const suggestedProjects = useProcessMemory<string[]>(sessionId, 'curious', 'suggested', []);

  // Check for deep reading transition
  if (visitorModel.scrollDepth > 0.7 && visitorModel.timeOnCurrentPage > 120000) {
    actions.log('Deep reading detected, transitioning to engaged');
    return [workingMemory, 'engaged', { reason: 'deep_reading' }];
  }

  // Check for readiness signals
  if (visitorModel.readinessSignals.length > 0) {
    actions.log('Readiness signals detected', { signals: visitorModel.readinessSignals });
    return [workingMemory, 'ready', { reason: 'readiness_signals' }];
  }

  // Handle user messages
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Build context about their exploration
    const explorationContext = indentNicely`
      This visitor is actively exploring. They've viewed:
      ${visitorModel.pagesViewed.map(p => `- ${p}`).join('\n')}

      ${visitorModel.inferredInterests.length > 0
        ? `Their interests seem to be: ${visitorModel.inferredInterests.join(', ')}`
        : ''}

      Current page: ${visitorModel.currentPage}
      Time exploring: ${Math.floor(visitorModel.timeOnSite / 60000)} minutes
    `;

    memory = memory.withRegion('exploration-context', {
      role: ChatMessageRoleEnum.System,
      content: explorationContext,
    });

    const [newMemory, response] = await externalDialog(
      memory,
      indentNicely`
        The visitor is curious and exploring. Respond to their message.

        Instructions:
        - Acknowledge their exploration pattern subtly
        - Guide them based on their apparent interests
        - If they seem interested in a specific project, elaborate
        - Suggest related content if appropriate
        - Stay brief (2-3 sentences)
      `,
      { stream: false }
    );

    actions.speak(response);
    interactionCount.current++;

    return newMemory;
  }

  // Handle navigation - note patterns
  if (perception?.type === 'navigation') {
    const page = perception.content;
    interactionCount.current++;

    // If they're visiting portfolio pages, we might suggest related content
    if (page.includes('/portfolio/') && interactionCount.current > 2) {
      const projectName = page.split('/portfolio/')[1]?.replace('/', '') ?? 'this project';

      // Don't suggest the same project twice
      if (!suggestedProjects.current.includes(projectName)) {
        suggestedProjects.current = [...suggestedProjects.current, projectName];

        // Occasionally offer a contextual hint
        if (Math.random() > 0.7) {
          const hints: Record<string, string> = {
            acs: 'The ACS work reveals how Tom approaches massive content architectures.',
            czi: 'The CZI project shows his work with scientific communities.',
            dolby: 'At Dolby, he distilled complexity into twelve reusable templates.',
          };

          const hint = hints[projectName];
          if (hint) {
            actions.dispatch({
              type: 'toast',
              payload: { message: hint, duration: 5000 },
            });
          }
        }
      }
    }

    return workingMemory;
  }

  // Handle scroll events - check for deep reading
  if (perception?.type === 'scroll') {
    const depth = parseFloat(perception.content) || 0;

    if (depth > 0.7 && visitorModel.timeOnCurrentPage > 60000) {
      actions.log('Approaching deep reading threshold');
      // Don't transition yet, but note the pattern
    }

    return workingMemory;
  }

  // Default: stay in curious state
  return workingMemory;
}

export default curiousProcess;
