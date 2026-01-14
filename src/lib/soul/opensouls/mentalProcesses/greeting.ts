/**
 * Greeting Mental Process
 *
 * Handles first-time and returning visitor welcomes.
 * Uses full cognitive toolkit: internalMonologue → decision → externalDialog
 * Transitions to: curious (exploration), engaged (deep read), returning (if returning)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, internalMonologue, mentalQuery, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function greetingProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track greeting attempts in process memory
  const greetingCount = useProcessMemory<number>(sessionId, 'greeting', 'count', 0);

  // If this is a returning visitor, transition immediately
  if (userModel.isReturning) {
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

    // Step 1: Internal reasoning - assess the visitor's state
    const [thoughtMemory, assessment] = await internalMonologue(
      memory,
      indentNicely`
        A visitor has just arrived and sent their first message: "${userMessage}"

        Consider:
        - What do I sense about this visitor? Are they curious, hurried, skeptical, or seeking something specific?
        - What does their message reveal about their intent?
        - Current page: ${userModel.currentPage}
        - Behavioral type: ${userModel.behavioralType}

        Briefly assess their apparent state and needs.
      `
    );

    actions.log('Internal assessment:', assessment);

    // Step 2: Decision - choose greeting strategy based on assessment
    const [decisionMemory, greetingStyle] = await decision(
      thoughtMemory,
      {
        choices: ['warm_welcome', 'mysterious_invite', 'helpful_guide', 'curious_observer'],
        reason: indentNicely`
          Based on the visitor's message and apparent state, choose how to greet them:
          - warm_welcome: Friendly, open, inviting tone
          - mysterious_invite: Intriguing, labyrinth-themed, evocative
          - helpful_guide: Direct, offering assistance and navigation
          - curious_observer: Acknowledging, asking thoughtful questions
        `,
      }
    );

    actions.log('Greeting strategy:', greetingStyle);

    // Step 3: External dialog - generate response based on strategy
    const styleInstructions = {
      warm_welcome: 'Welcome them warmly and openly to the labyrinth. Be friendly and inviting.',
      mysterious_invite: 'Use evocative, labyrinth-themed language. Hint at mysteries to explore.',
      helpful_guide: 'Be direct and helpful. Offer to guide them to what they seek.',
      curious_observer: 'Acknowledge their presence thoughtfully. Ask what draws them here.',
    };

    const [responseMemory, response] = await externalDialog(
      decisionMemory,
      indentNicely`
        Respond to the visitor using the "${greetingStyle}" style.

        ${styleInstructions[greetingStyle as keyof typeof styleInstructions] || styleInstructions.warm_welcome}

        Context:
        - Current page: ${userModel.currentPage}
        - This is their ${greetingCount.current === 0 ? 'first' : 'continued'} interaction
        - Their message: "${userMessage}"

        Instructions:
        - Be brief (1-2 sentences)
        - If they ask about something specific, guide them
        - Reference the current page if relevant
      `,
      { stream: false }
    );

    actions.speak(response);
    greetingCount.current++;

    // Step 4: mentalQuery - should we transition based on their engagement?
    const [queryMemory, isExploring] = await mentalQuery(
      responseMemory,
      indentNicely`
        Is this visitor showing signs of genuine exploration beyond casual browsing?
        Consider: They have viewed ${userModel.pagesViewed.length} pages and their behavioral type is "${userModel.behavioralType}".
      `
    );

    if (isExploring || userModel.pagesViewed.length >= 3) {
      return [queryMemory, 'curious', { reason: 'exploration_detected' }];
    }

    return queryMemory;
  }

  // Handle navigation events
  if (perception?.type === 'navigation') {
    const page = perception.content;
    actions.log('Navigation detected in greeting state', { page });

    // Use mentalQuery to assess if they're exploring
    const [queryMemory, isExploring] = await mentalQuery(
      workingMemory,
      indentNicely`
        Is this visitor genuinely exploring, or just casually clicking around?
        They have navigated to "${page}" and viewed ${userModel.pagesViewed.length} pages total.
        Behavioral type: ${userModel.behavioralType}
      `
    );

    if (isExploring || userModel.pagesViewed.length >= 3) {
      // Use internalMonologue to craft a contextual message
      const [thoughtMemory, thought] = await internalMonologue(
        queryMemory,
        indentNicely`
          The visitor is showing exploration patterns. What subtle acknowledgment would
          feel natural without being intrusive? Consider the labyrinth metaphor.
        `
      );

      actions.log('Exploration thought:', thought);

      actions.dispatch({
        type: 'toast',
        payload: {
          message: 'You seem drawn to explore these halls...',
          duration: 4000,
        },
      });

      return [thoughtMemory, 'curious', { reason: 'exploration_pattern' }];
    }

    // Otherwise, stay in greeting but note the navigation
    return queryMemory;
  }

  // Handle idle events - maybe show a welcome toast
  if (perception?.type === 'idle' && greetingCount.current === 0) {
    // Only show welcome toast once
    greetingCount.current++;

    // Use internalMonologue to generate contextual welcome
    const [thoughtMemory, welcomeThought] = await internalMonologue(
      workingMemory,
      indentNicely`
        A visitor has arrived but is idle. They are on "${userModel.currentPage}".
        What would be an appropriate first welcome? Keep the labyrinth metaphor subtle.
      `
    );

    actions.log('Welcome thought:', welcomeThought);

    actions.dispatch({
      type: 'toast',
      payload: {
        message: 'Welcome to the labyrinth. I am here if you need guidance.',
        duration: 5000,
      },
    });

    return thoughtMemory;
  }

  // Default: stay in greeting state
  return workingMemory;
}

export default greetingProcess;
