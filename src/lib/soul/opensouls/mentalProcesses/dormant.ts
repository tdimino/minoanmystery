/**
 * Dormant Mental Process
 *
 * Handles visitors who have been idle for extended periods (45s+).
 * Uses internalMonologue for reflection, decision for ambient responses.
 * Transitions to: curious (activity resumes), engaged (deep reading resumes),
 *                 exiting (very long idle)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, internalMonologue, mentalQuery, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

// Idle thresholds
const DORMANT_THRESHOLD = 45000;        // 45 seconds to enter dormant
const VERY_IDLE_THRESHOLD = 120000;     // 2 minutes for ambient intensification
const EXITING_THRESHOLD = 300000;       // 5 minutes suggests exit intent

export async function dormantProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track dormancy state
  const dormantDuration = useProcessMemory<number>(sessionId, 'dormant', 'duration', 0);
  const reflectionCount = useProcessMemory<number>(sessionId, 'dormant', 'reflections', 0);
  const lastAmbientChange = useProcessMemory<number>(sessionId, 'dormant', 'lastAmbient', 0);

  // Handle any activity - wake from dormancy
  if (perception?.type === 'click' || perception?.type === 'scroll' || perception?.type === 'navigation') {
    actions.log('Activity detected, waking from dormancy');

    // Use mentalQuery to assess how to re-engage
    const [queryMemory, deepEngagement] = await mentalQuery(
      workingMemory,
      indentNicely`
        The visitor has returned from dormancy after ${Math.floor(dormantDuration.current / 1000)} seconds.
        Their activity: ${perception.type} on ${perception.content || 'page'}
        Previous state before dormancy: ${userModel.inferredInterests.length > 0 ? 'engaged' : 'exploring'}

        Is this a return to deep engagement, or casual resumption?
      `
    );

    // Reset dormancy tracking
    dormantDuration.current = 0;
    reflectionCount.current = 0;

    // Transition based on engagement level
    if (deepEngagement && perception.type === 'scroll') {
      return [queryMemory, 'engaged', { reason: 'deep_return_from_dormancy' }];
    }

    return [queryMemory, 'curious', { reason: 'activity_after_dormancy' }];
  }

  // Handle user messages during dormancy - they're seeking connection
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Dormancy reflection before responding
    const [reflectMemory, insight] = await internalMonologue(
      memory,
      indentNicely`
        The visitor speaks after a period of stillness (${Math.floor(dormantDuration.current / 1000)}s).
        They were quiet, perhaps contemplating the labyrinth.

        Their journey so far:
        - Pages viewed: ${userModel.pagesViewed.join(', ') || 'landing'}
        - Interests: ${userModel.inferredInterests.join(', ') || 'unknown'}
        - Time spent: ${Math.floor(userModel.sessionDuration / 60000)} minutes

        Their message: "${userMessage}"

        What do I sense about this moment of emergence from stillness?
      `
    );

    actions.log('Dormancy reflection:', insight);

    // Thoughtful response for someone emerging from contemplation
    const [responseMemory, response] = await externalDialog(
      reflectMemory,
      indentNicely`
        The visitor speaks after stillness. Respond with gentle awareness that they were quiet.

        Instructions:
        - Acknowledge the pause subtly, as if the labyrinth noticed
        - Be warm but not presumptuous about what they were thinking
        - If they ask a question, answer thoughtfully
        - Keep response brief (1-2 sentences)
        - Don't say "welcome back" or be overly cheerful
      `,
      { stream: false }
    );

    actions.speak(response);
    dormantDuration.current = 0;
    return [responseMemory, 'curious', { reason: 'message_during_dormancy' }];
  }

  // Handle idle perception - the soul reflects
  if (perception?.type === 'idle') {
    const idleDuration = perception.metadata?.duration as number || 0;
    dormantDuration.current = idleDuration;

    // Check for very long idle - potential exit
    if (idleDuration > EXITING_THRESHOLD) {
      actions.log('Very long idle detected, potential exit');
      return [workingMemory, 'exiting', { reason: 'extended_idle' }];
    }

    // Periodic reflection during dormancy
    if (idleDuration > DORMANT_THRESHOLD && reflectionCount.current < 3) {
      reflectionCount.current++;

      const [reflectMemory, reflection] = await internalMonologue(
        workingMemory,
        indentNicely`
          The visitor is still here, but quiet. ${Math.floor(idleDuration / 1000)} seconds of stillness.

          Their journey before dormancy:
          - Last page: ${userModel.currentPage}
          - Scroll depth: ${Math.round(userModel.scrollDepth * 100)}%
          - Interests: ${userModel.inferredInterests.join(', ') || 'unspoken'}

          What might they be thinking? Why the pause?
          Are they absorbing content, or has something distracted them?

          Reflection #${reflectionCount.current}
        `
      );

      actions.log(`Dormancy reflection #${reflectionCount.current}:`, reflection);

      // Ambient changes during dormancy - intensify the mystical atmosphere
      const now = Date.now();
      if (now - lastAmbientChange.current > 30000 && idleDuration > VERY_IDLE_THRESHOLD) {
        lastAmbientChange.current = now;

        // Choose ambient response
        const [ambientMemory, ambientChoice] = await decision(
          reflectMemory,
          {
            choices: ['deepen_shadows', 'pulse_colors', 'drift_blur', 'none'],
            reason: indentNicely`
              The visitor is in extended stillness. How should the labyrinth respond?
              - deepen_shadows: Subtle darkening, more mystery
              - pulse_colors: Gentle color breathing animation
              - drift_blur: Background elements drift slowly
              - none: Maintain current ambiance
            `,
          }
        );

        if (ambientChoice !== 'none') {
          actions.log('Ambient shift:', ambientChoice);
          actions.dispatch({
            type: 'animate',
            payload: {
              target: '.ambient-bg, .hero-blob',
              animation: ambientChoice,
              duration: 10000,
              intensity: 'subtle',
            },
          });
        }

        return ambientMemory;
      }

      return reflectMemory;
    }

    return workingMemory;
  }

  // Handle focus/blur during dormancy
  if (perception?.type === 'blur') {
    actions.log('Tab lost focus during dormancy');
    // Could be moving toward exit
    return workingMemory;
  }

  if (perception?.type === 'focus') {
    actions.log('Tab regained focus during dormancy');

    // Assess if they're back with intent
    const [queryMemory, returningWithIntent] = await mentalQuery(
      workingMemory,
      indentNicely`
        The visitor returned focus to the page after ${Math.floor(dormantDuration.current / 1000)}s.
        Were they likely doing something else, or were they thinking about what they saw?
        Given their previous engagement level (${userModel.behavioralType}), are they returning with purpose?
      `
    );

    if (returningWithIntent) {
      dormantDuration.current = 0;
      return [queryMemory, 'curious', { reason: 'intentional_return' }];
    }

    return queryMemory;
  }

  // Default: remain dormant, the labyrinth waits
  return workingMemory;
}

export default dormantProcess;
