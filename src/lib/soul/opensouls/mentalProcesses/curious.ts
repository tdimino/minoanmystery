/**
 * Curious Mental Process
 *
 * Handles visitors who are actively exploring multiple pages.
 * Uses full cognitive toolkit: internalMonologue → mentalQuery → decision → externalDialog
 * Transitions to: engaged (deep read), ready (contact signals)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, internalMonologue, mentalQuery, decision, brainstorm } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function curiousProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track interactions in this state
  const interactionCount = useProcessMemory<number>(sessionId, 'curious', 'interactions', 0);
  const suggestedProjects = useProcessMemory<string[]>(sessionId, 'curious', 'suggested', []);

  // Use mentalQuery for deep reading transition instead of hardcoded thresholds
  if (userModel.scrollDepth > 0.5 && userModel.timeOnCurrentPage > 60000) {
    const [queryMemory, isDeepReading] = await mentalQuery(
      workingMemory,
      indentNicely`
        Is this visitor genuinely deep reading, showing signs of focused engagement?
        Scroll depth: ${Math.round(userModel.scrollDepth * 100)}%
        Time on page: ${Math.floor(userModel.timeOnCurrentPage / 1000)}s
        Behavioral type: ${userModel.behavioralType}
        A "reader" might need less time; a "scanner" might need more evidence.
      `
    );

    if (isDeepReading) {
      actions.log('Deep reading confirmed via mentalQuery, transitioning to engaged');
      return [queryMemory, 'engaged', { reason: 'deep_reading' }];
    }
  }

  // Check for readiness signals with internal reasoning
  if (userModel.readinessSignals.length > 0) {
    const [thoughtMemory, insight] = await internalMonologue(
      workingMemory,
      indentNicely`
        The visitor is showing readiness signals: ${userModel.readinessSignals.join(', ')}
        What does this tell me about their intent? Are they ready for contact, or just curious about the CTA?
      `
    );

    actions.log('Readiness insight:', insight);

    const [queryMemory, isReady] = await mentalQuery(
      thoughtMemory,
      'Based on these signals, is the visitor genuinely ready to make contact, or just exploring?'
    );

    if (isReady) {
      return [queryMemory, 'ready', { reason: 'readiness_confirmed' }];
    }
  }

  // Handle user messages with full cognitive chain
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Step 1: Internal reasoning about the visitor
    const [thoughtMemory, assessment] = await internalMonologue(
      memory,
      indentNicely`
        This curious visitor has sent a message: "${userMessage}"

        Reflect on:
        - Their exploration journey: ${userModel.pagesViewed.join(' → ')}
        - Time exploring: ${Math.floor(userModel.timeOnSite / 60000)} minutes
        - Behavioral type: ${userModel.behavioralType}
        - Current interests: ${userModel.inferredInterests.join(', ') || 'not yet clear'}

        What does this message reveal about what they're seeking?
      `
    );

    actions.log('Curious assessment:', assessment);

    // Step 2: Decision on response style based on their behavioral type
    const styleGuides: Record<string, string> = {
      scanner: 'Be very brief - they skim quickly',
      reader: 'You may be more contemplative and detailed',
      explorer: 'Suggest related paths and connections',
      focused: 'Stay on topic, minimal tangents',
    };

    const [decisionMemory, responseApproach] = await decision(
      thoughtMemory,
      {
        choices: ['guide_exploration', 'answer_directly', 'suggest_project', 'ask_clarifying'],
        reason: indentNicely`
          Based on their message and behavioral type (${userModel.behavioralType}):
          - guide_exploration: Help them discover more of the labyrinth
          - answer_directly: Give a concise, direct answer
          - suggest_project: Point them to a relevant case study
          - ask_clarifying: Ask a thoughtful question to understand their needs
        `,
      }
    );

    actions.log('Response approach:', responseApproach);

    // Build context about their exploration
    const explorationContext = indentNicely`
      This visitor is actively exploring. They've viewed:
      ${userModel.pagesViewed.map(p => `- ${p}`).join('\n')}

      ${userModel.inferredInterests.length > 0
        ? `Their interests seem to be: ${userModel.inferredInterests.join(', ')}`
        : ''}

      Current page: ${userModel.currentPage}
      Response approach: ${responseApproach}
      Style note: ${styleGuides[userModel.behavioralType] || 'Be helpful and engaging'}
    `;

    const contextMemory = decisionMemory.withRegion('exploration-context', {
      role: ChatMessageRoleEnum.System,
      content: explorationContext,
    });

    // Step 3: Generate response
    const [responseMemory, response] = await externalDialog(
      contextMemory,
      indentNicely`
        Respond to the curious visitor using the "${responseApproach}" approach.

        Instructions:
        - Acknowledge their exploration pattern subtly
        - ${responseApproach === 'guide_exploration' ? 'Suggest what else they might discover' : ''}
        - ${responseApproach === 'answer_directly' ? 'Give a clear, concise answer' : ''}
        - ${responseApproach === 'suggest_project' ? 'Point them to a relevant case study' : ''}
        - ${responseApproach === 'ask_clarifying' ? 'Ask a thoughtful question' : ''}
        - Stay brief (2-3 sentences for scanners, can be longer for readers)
      `,
      { stream: false }
    );

    actions.speak(response);
    interactionCount.current++;

    return responseMemory;
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

        // Use mentalQuery to decide if a hint would be welcome (replaces Math.random())
        const [queryMemory, shouldHint] = await mentalQuery(
          workingMemory,
          indentNicely`
            Would this visitor appreciate a subtle hint about "${projectName}"?
            Consider:
            - Their behavioral type: ${userModel.behavioralType}
            - Time on site: ${Math.floor(userModel.timeOnSite / 60000)} minutes
            - Interaction count: ${interactionCount.current}
            A "scanner" might find hints intrusive; a "reader" might appreciate context.
          `
        );

        if (shouldHint) {
          // Use brainstorm to generate a contextual hint
          const [hintMemory, hints] = await brainstorm(
            queryMemory,
            {
              prompt: indentNicely`
                Generate contextual hints about the "${projectName}" project for a curious visitor.
                Make them intriguing but not too revealing.
                Keep the labyrinth/mystery metaphor subtle.
              `,
              count: 3,
            }
          );

          // Use decision to pick the best hint
          const [pickMemory, bestHint] = await decision(
            hintMemory,
            {
              choices: hints.slice(0, 3), // Use top 3 brainstormed hints
              reason: `Pick the hint that best matches this visitor's behavioral type: ${userModel.behavioralType}`,
            }
          );

          actions.log('Showing hint:', bestHint);

          actions.dispatch({
            type: 'toast',
            payload: { message: bestHint, duration: 5000 },
          });

          return pickMemory;
        }

        return queryMemory;
      }
    }

    return workingMemory;
  }

  // Handle scroll events - prepare for potential engagement
  if (perception?.type === 'scroll') {
    const depth = parseFloat(perception.content) || 0;

    if (depth > 0.6 && userModel.timeOnCurrentPage > 45000) {
      // Use internalMonologue to reflect on their reading pattern
      const [thoughtMemory, thought] = await internalMonologue(
        workingMemory,
        indentNicely`
          The visitor is showing signs of deep reading:
          - Scroll depth: ${Math.round(depth * 100)}%
          - Time on page: ${Math.floor(userModel.timeOnCurrentPage / 1000)}s
          - Page: ${userModel.currentPage}

          What does this pattern suggest about their engagement level?
        `
      );

      actions.log('Scroll reflection:', thought);
      return thoughtMemory;
    }

    return workingMemory;
  }

  // Default: stay in curious state
  return workingMemory;
}

export default curiousProcess;
