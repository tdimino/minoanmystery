/**
 * Greeting Mental Process
 *
 * Handles first-time and returning visitor welcomes.
 * Transitions to: curious (3+ pages), engaged (deep read), returning (if returning)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, mentalQuery, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function greetingProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, visitorModel, actions } = context;

  // Track greeting attempts in process memory
  const greetingCount = useProcessMemory<number>(sessionId, 'greeting', 'count', 0);

  // If this is a returning visitor, transition immediately
  if (visitorModel.isReturning) {
    actions.log('Returning visitor detected, transitioning to returning state');
    return [workingMemory, 'returning', { reason: 'returning_visitor' }];
  }

  // If user sent a message, respond conversationally
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    // Add user message to memory
    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Generate response
    const [newMemory, response] = await externalDialog(
      memory,
      indentNicely`
        The visitor has just arrived and sent their first message.

        Context:
        - Current page: ${visitorModel.currentPage}
        - This is their ${greetingCount.current === 0 ? 'first' : 'continued'} interaction

        Instructions:
        - Welcome them warmly to the labyrinth
        - Be brief (1-2 sentences)
        - If they ask about something specific, guide them
        - Reference the current page if relevant
      `,
      { stream: false }
    );

    actions.speak(response);
    greetingCount.current++;

    // Check if we should transition based on engagement
    if (visitorModel.pagesViewed.length >= 3) {
      return [newMemory, 'curious', { reason: 'multi_page_exploration' }];
    }

    return newMemory;
  }

  // Handle navigation events
  if (perception?.type === 'navigation') {
    const page = perception.content;
    actions.log('Navigation detected in greeting state', { page });

    // If they've viewed 3+ pages, transition to curious
    if (visitorModel.pagesViewed.length >= 3) {
      // Show a subtle toast
      actions.dispatch({
        type: 'toast',
        payload: {
          message: 'You seem drawn to explore these halls...',
          duration: 4000,
        },
      });

      return [workingMemory, 'curious', { reason: 'exploration_pattern' }];
    }

    // Otherwise, stay in greeting but note the navigation
    return workingMemory;
  }

  // Handle idle events - maybe show a welcome toast
  if (perception?.type === 'idle' && greetingCount.current === 0) {
    // Only show welcome toast once
    greetingCount.current++;

    actions.dispatch({
      type: 'toast',
      payload: {
        message: 'Welcome to the labyrinth. I am here if you need guidance.',
        duration: 5000,
      },
    });
  }

  // Default: stay in greeting state
  return workingMemory;
}

export default greetingProcess;
