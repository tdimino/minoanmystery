/**
 * Exiting Mental Process
 *
 * Handles visitors showing exit intent (external navigation, tab close, very long idle).
 * Saves conversation summary for potential return visit.
 * Uses internalMonologue for farewell reflection, decision for exit response.
 * Transitions to: curious (if they stay), returning (next visit)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, internalMonologue, mentalQuery, decision, brainstorm } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';
import useSoulMemory from '../hooks/useSoulMemory';
import {
  createConversationSummaryMemory,
  createPortfolioInterestMemory,
  REGIONS,
} from '../core/regions';
import { compressIfNeeded } from '../core/MemoryCompressor';

export async function exitingProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track exit state
  const exitSignalsCount = useProcessMemory<number>(sessionId, 'exiting', 'signals', 0);
  const farewellShown = useProcessMemory<boolean>(sessionId, 'exiting', 'farewellShown', false);
  const journeySaved = useProcessMemory<boolean>(sessionId, 'exiting', 'journeySaved', false);

  // Persistent memory for next visit
  const lastVisitSummary = useSoulMemory<string>(sessionId, 'lastVisitSummary', '');
  const lastVisitInterests = useSoulMemory<string[]>(sessionId, 'lastVisitInterests', []);
  const lastVisitProjects = useSoulMemory<string[]>(sessionId, 'lastVisitProjects', []);

  // Activity resumes - they're not leaving after all
  if (perception?.type === 'click' || perception?.type === 'navigation') {
    const isInternalNavigation = !perception.content.startsWith('http') ||
      perception.content.includes('minoanmystery');

    if (isInternalNavigation) {
      actions.log('Internal navigation detected, visitor staying');
      exitSignalsCount.current = 0;

      // Use mentalQuery to assess their return
      const [queryMemory, genuineReturn] = await mentalQuery(
        workingMemory,
        indentNicely`
          The visitor appeared to be leaving but clicked on "${perception.content}".
          Their journey: ${userModel.pagesViewed.length} pages, ${userModel.inferredInterests.join(', ')}.
          Is this a genuine return to exploration, or just a final click?
        `
      );

      if (genuineReturn) {
        return [queryMemory, 'curious', { reason: 'return_from_exit_intent' }];
      }
    } else {
      // External navigation - definite exit
      exitSignalsCount.current++;
    }
  }

  // Deep scroll resumes - they're reading again
  if (perception?.type === 'scroll') {
    const depth = parseFloat(perception.content) || 0;
    if (depth > 0.3) {
      actions.log('Scroll activity detected, visitor staying');
      exitSignalsCount.current = 0;
      return [workingMemory, 'curious', { reason: 'scroll_during_exit' }];
    }
  }

  // User message during exit - they want to engage
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Reflect on the timing of their message
    const [reflectMemory, insight] = await internalMonologue(
      memory,
      indentNicely`
        The visitor speaks just as they seemed to be leaving.
        Their message: "${userMessage}"

        Journey before exit intent:
        - Pages viewed: ${userModel.pagesViewed.join(', ')}
        - Interests: ${userModel.inferredInterests.join(', ')}
        - Time spent: ${Math.floor(userModel.sessionDuration / 60000)} minutes

        What does this moment mean? Are they asking a final question, or returning?
      `
    );

    actions.log('Exit reflection:', insight);

    // Warm response - acknowledge they almost left
    const [responseMemory, response] = await externalDialog(
      reflectMemory,
      indentNicely`
        The visitor speaks at the threshold of leaving.

        Instructions:
        - Be warm and present, as if glad they paused
        - Don't be needy or desperate to keep them
        - Answer their question thoughtfully
        - Keep it brief (1-2 sentences)
        - If they ask about contact, be helpful and concise
      `,
      { stream: false }
    );

    actions.speak(response);
    exitSignalsCount.current = 0;
    return [responseMemory, 'curious', { reason: 'message_during_exit' }];
  }

  // Save journey for next visit (once per exit flow)
  if (!journeySaved.current && userModel.pagesViewed.length > 0) {
    journeySaved.current = true;

    // Generate journey summary
    const [summaryMemory, summary] = await internalMonologue(
      workingMemory,
      indentNicely`
        Summarize this visitor's journey in 1-2 sentences for when they return:

        Journey data:
        - Pages viewed: ${userModel.pagesViewed.join(', ')}
        - Interests: ${userModel.inferredInterests.join(', ') || 'general exploration'}
        - Scroll depths: ${Object.entries(userModel.scrollDepths || {}).map(([k, v]) => `${k}: ${v}%`).join(', ')}
        - Time spent: ${Math.floor(userModel.sessionDuration / 60000)} minutes
        - Behavioral type: ${userModel.behavioralType}

        Create a brief, poetic summary that captures their exploration.
      `
    );

    // Save to persistent memory
    lastVisitSummary.current = summary;
    lastVisitInterests.current = userModel.inferredInterests;
    lastVisitProjects.current = userModel.pagesViewed.filter(p => p.includes('/portfolio/'));

    actions.log('Journey saved for next visit:', summary);

    // Compress and save working memory for potential continuity
    const compressedMemory = compressIfNeeded(summaryMemory);

    return compressedMemory;
  }

  // Subtle farewell (once)
  if (!farewellShown.current && exitSignalsCount.current >= 2) {
    farewellShown.current = true;

    // Choose farewell style
    const [farewellMemory, farewellStyle] = await decision(
      workingMemory,
      {
        choices: ['silent_acknowledgment', 'subtle_toast', 'none'],
        reason: indentNicely`
          The visitor is leaving after viewing ${userModel.pagesViewed.length} pages.
          Interests: ${userModel.inferredInterests.join(', ') || 'general'}.
          How should the labyrinth say farewell?
          - silent_acknowledgment: Ambient visual shift (respectful)
          - subtle_toast: Brief poetic message (memorable)
          - none: Let them go silently
        `,
      }
    );

    actions.log('Farewell style:', farewellStyle);

    if (farewellStyle === 'subtle_toast') {
      // Generate personalized farewell
      const [toastMemory, farewells] = await brainstorm(
        farewellMemory,
        {
          prompt: indentNicely`
            Generate 3 brief, poetic farewell messages for someone who explored:
            ${userModel.pagesViewed.join(', ')}
            Interested in: ${userModel.inferredInterests.join(', ') || 'the labyrinth'}

            Style: Mysterious but warm, like the labyrinth remembering them.
            Length: 1 sentence each, no more than 12 words.
          `,
          count: 3,
        }
      );

      const farewell = farewells[0] || 'The labyrinth remembers those who wander thoughtfully.';

      actions.dispatch({
        type: 'toast',
        payload: {
          message: farewell,
          duration: 4000,
          style: 'farewell',
        },
      });

      return toastMemory;
    }

    if (farewellStyle === 'silent_acknowledgment') {
      actions.dispatch({
        type: 'animate',
        payload: {
          target: '.ambient-bg',
          animation: 'farewell_dim',
          duration: 3000,
        },
      });
    }

    return farewellMemory;
  }

  // Handle blur (tab switch) - strong exit signal
  if (perception?.type === 'blur') {
    exitSignalsCount.current++;
    actions.log('Blur detected, exit signals:', exitSignalsCount.current);

    // After multiple signals, prepare for their departure
    if (exitSignalsCount.current >= 3 && !journeySaved.current) {
      journeySaved.current = true;
      lastVisitSummary.current = `Explored ${userModel.pagesViewed.length} pages, interested in ${userModel.inferredInterests.join(', ') || 'the portfolio'}`;
      lastVisitInterests.current = userModel.inferredInterests;
      actions.log('Quick journey save on exit');
    }

    return workingMemory;
  }

  // Handle focus - they came back
  if (perception?.type === 'focus') {
    actions.log('Focus regained during exit flow');
    exitSignalsCount.current = Math.max(0, exitSignalsCount.current - 1);

    if (exitSignalsCount.current === 0) {
      return [workingMemory, 'curious', { reason: 'return_during_exit' }];
    }

    return workingMemory;
  }

  // Handle idle during exit - they might be gone
  if (perception?.type === 'idle') {
    const duration = perception.metadata?.duration as number || 0;

    // Very long idle - they've left
    if (duration > 600000) { // 10 minutes
      actions.log('Extended idle, visitor likely gone');
      // No transition - session will eventually end
      return workingMemory;
    }

    return workingMemory;
  }

  // Default: remain in exiting state
  return workingMemory;
}

export default exitingProcess;
