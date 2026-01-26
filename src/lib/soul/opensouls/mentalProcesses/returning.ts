/**
 * Returning Mental Process
 *
 * Handles visitors who have been here before (visitCount > 1).
 * Uses full cognitive toolkit: decision for welcome strategy, internalMonologue for reflection
 * Transitions to: curious, engaged, ready based on behavior
 */

import type { ProcessContext, ProcessReturn } from './types';
import type { MentalProcessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: MentalProcessMeta = {
  name: 'returning',
  description: 'Personalized welcome for recognized returning visitors',
  transitions: ['curious', 'engaged'] as const,
  entryConditions: ['visitCount > 1', 'returning visitor detected'],
} as const;
import { externalDialog, internalMonologue, mentalQuery, decision, brainstorm } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory, useSoulMemory } from '../hooks';

export async function returningProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track returning visitor state
  const welcomed = useProcessMemory<boolean>(sessionId, 'returning', 'welcomed', false);
  const sessionInteractions = useProcessMemory<number>(sessionId, 'returning', 'interactions', 0);

  // Persistent cross-session memory for conversation continuity
  const previousTopics = useSoulMemory<string[]>(sessionId, 'topics_discussed', []);

  // Welcome with full cognitive toolkit on first entry
  if (!welcomed.current) {
    welcomed.current = true;

    // Step 1: Decision on welcome strategy based on visit count
    const [strategyMemory, welcomeStrategy] = await decision(
      workingMemory,
      {
        choices: ['acknowledge_return', 'continue_conversation', 'fresh_start', 'mysterious_recognition'],
        reason: indentNicely`
          A returning visitor has arrived (visit #${userModel.visitCount}).
          Last project: ${userModel.lastProject || 'none'}
          Previous topics: ${previousTopics.current.join(', ') || 'none recorded'}

          Choose welcome strategy:
          - acknowledge_return: Simple, warm recognition of their return
          - continue_conversation: Reference their previous interests
          - fresh_start: Treat as new exploration opportunity
          - mysterious_recognition: Labyrinth-themed acknowledgment of their pilgrim status
        `,
      }
    );

    actions.log('Welcome strategy:', welcomeStrategy);

    // Step 2: Brainstorm welcome messages based on strategy
    const [welcomeMemory, welcomeOptions] = await brainstorm(
      strategyMemory,
      {
        prompt: indentNicely`
          Generate welcome messages for a returning visitor using "${welcomeStrategy}" strategy.
          Context:
          - Visit count: ${userModel.visitCount}
          - Last project: ${userModel.lastProject || 'none'}
          - Behavioral type: ${userModel.behavioralType}

          Keep messages:
          - Under 15 words
          - With subtle labyrinth metaphor
          - Personalized to their history
        `,
        count: 3,
      }
    );

    // Step 3: Pick best welcome
    const [pickMemory, welcomeMessage] = await decision(
      welcomeMemory,
      {
        choices: welcomeOptions.length > 0 ? welcomeOptions : ['Welcome back to the labyrinth.'],
        reason: 'Pick the welcome that best matches their visit history and behavioral type.',
      }
    );

    // Special recognition for frequent visitors
    if (userModel.visitCount >= 5) {
      actions.log('Frequent visitor detected - enhanced recognition');
      actions.dispatch({
        type: 'animate',
        payload: { target: '.ambient-bg', animation: 'recognition-pulse', duration: 3000 },
      });
    }

    actions.dispatch({
      type: 'toast',
      payload: {
        message: welcomeMessage,
        duration: 5000,
      },
    });

    actions.log('Returning visitor welcomed', {
      visitCount: userModel.visitCount,
      lastProject: userModel.lastProject,
      strategy: welcomeStrategy,
    });
  }

  // Use mentalQuery for intelligent transitions instead of hardcoded checks
  if (userModel.pagesViewed.length >= 2) {
    const [queryMemory, isExploring] = await mentalQuery(
      workingMemory,
      indentNicely`
        This returning visitor has viewed ${userModel.pagesViewed.length} pages this session.
        Previous interests: ${userModel.inferredInterests.join(', ') || 'unknown'}
        Are they genuinely exploring, or just casually browsing?
      `
    );

    if (isExploring || userModel.pagesViewed.length >= 3) {
      return [queryMemory, 'curious', { reason: 'returning_exploring' }];
    }
  }

  if (userModel.scrollDepth > 0.6 && userModel.timeOnCurrentPage > 60000) {
    const [queryMemory, isEngaged] = await mentalQuery(
      workingMemory,
      indentNicely`
        The returning visitor is showing engagement signals:
        - Scroll depth: ${Math.round(userModel.scrollDepth * 100)}%
        - Time on page: ${Math.floor(userModel.timeOnCurrentPage / 1000)}s
        Is this genuine deep engagement, or casual scrolling?
      `
    );

    if (isEngaged) {
      return [queryMemory, 'engaged', { reason: 'returning_deep_read' }];
    }
  }

  if (userModel.readinessSignals.length > 0) {
    const [queryMemory, isReady] = await mentalQuery(
      workingMemory,
      indentNicely`
        The returning visitor shows readiness signals: ${userModel.readinessSignals.join(', ')}
        Given they've visited ${userModel.visitCount} times, is this genuine readiness to connect?
      `
    );

    if (isReady) {
      return [queryMemory, 'ready', { reason: 'returning_ready' }];
    }
  }

  // Handle user messages with full cognitive chain
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;
    sessionInteractions.current++;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Step 1: Reflect on this returning visitor and their message
    const [reflectMemory, insight] = await internalMonologue(
      memory,
      indentNicely`
        A returning visitor (visit #${userModel.visitCount}) sent: "${userMessage}"

        Reflect on:
        - Previous interests: ${userModel.inferredInterests.join(', ') || 'unknown'}
        - Last project: ${userModel.lastProject || 'none'}
        - Previous topics discussed: ${previousTopics.current.join(', ') || 'none recorded'}

        What does their return and this message reveal about their intent?
        What thread of connection can I draw from their history?
      `
    );

    actions.log('Returning visitor reflection:', insight);

    // Update topics discussed
    if (userMessage.length > 10) {
      const topicKeywords = userMessage.toLowerCase().match(/\b(ai|ux|content|design|strategy|portfolio|project)\b/g);
      if (topicKeywords) {
        previousTopics.current = [...new Set([...previousTopics.current, ...topicKeywords])].slice(-10);
      }
    }

    // Step 2: Decision on response approach
    const [decisionMemory, approach] = await decision(
      reflectMemory,
      {
        choices: ['continue_thread', 'acknowledge_return', 'fresh_guidance', 'deepen_connection'],
        reason: indentNicely`
          How should I respond to this returning visitor?
          - continue_thread: Build on previous conversations/interests
          - acknowledge_return: Recognize their loyalty subtly
          - fresh_guidance: Offer new directions based on their message
          - deepen_connection: Build rapport as a potential collaborator
        `,
      }
    );

    actions.log('Response approach:', approach);

    // Build returning visitor context
    const returningContext = indentNicely`
      Returning visitor history:
      - Visit count: ${userModel.visitCount}
      - Previous interests: ${userModel.inferredInterests.join(', ') || 'unknown'}
      - Last project viewed: ${userModel.lastProject || 'none'}
      - Topics previously discussed: ${previousTopics.current.join(', ') || 'none'}
      - Response approach: ${approach}
    `;

    const contextMemory = decisionMemory.withRegion('returning-context', {
      role: ChatMessageRoleEnum.System,
      content: returningContext,
    });

    const approachInstructions = {
      continue_thread: 'Reference their previous interests and build on that thread',
      acknowledge_return: 'Subtly acknowledge their return without overdoing it',
      fresh_guidance: 'Offer new directions based on what they asked',
      deepen_connection: 'Build rapport, treat them as a potential collaborator',
    };

    const [responseMemory, response] = await externalDialog(
      contextMemory,
      indentNicely`
        Respond with the "${approach}" approach.

        ${approachInstructions[approach as keyof typeof approachInstructions] || approachInstructions.acknowledge_return}

        Instructions:
        - Reference their previous interests if relevant
        - Be warm - returning visitors are special
        - If they have questions, provide thoughtful guidance
        - Keep responses conversational (2-3 sentences)
      `,
      { stream: false }
    );

    actions.speak(response);
    return responseMemory;
  }

  // Handle navigation with intelligent project return detection
  if (perception?.type === 'navigation') {
    const page = perception.content;
    sessionInteractions.current++;

    // If they're revisiting a project they saw before
    if (page.includes('/portfolio/') && userModel.lastProject) {
      const currentProject = page.split('/portfolio/')[1]?.replace('/', '');

      if (currentProject === userModel.lastProject) {
        // Use mentalQuery to assess the significance
        const [queryMemory, isStrongSignal] = await mentalQuery(
          workingMemory,
          indentNicely`
            The returning visitor (visit #${userModel.visitCount}) went directly back to "${currentProject}".
            Is this a strong interest signal worth acknowledging?
            Session interactions so far: ${sessionInteractions.current}
          `
        );

        if (isStrongSignal && sessionInteractions.current <= 2) {
          // Use internalMonologue to craft acknowledgment
          const [thoughtMemory, thought] = await internalMonologue(
            queryMemory,
            indentNicely`
              They returned specifically to ${currentProject}. This is meaningful.
              What subtle acknowledgment would feel natural? Keep the labyrinth metaphor.
            `
          );

          actions.log('Strong project return signal:', thought);

          actions.dispatch({
            type: 'toast',
            payload: {
              message: `${currentProject.toUpperCase()} drew you back. There is more to discover.`,
              duration: 4000,
            },
          });

          return thoughtMemory;
        }

        return queryMemory;
      }
    }

    // Check for transition to curious with mentalQuery
    if (userModel.pagesViewed.length >= 2) {
      const [queryMemory, shouldTransition] = await mentalQuery(
        workingMemory,
        indentNicely`
          The returning visitor has now viewed ${userModel.pagesViewed.length} pages this session.
          Should they transition from "returning" recognition to "curious" exploration mode?
        `
      );

      if (shouldTransition || userModel.pagesViewed.length >= 3) {
        return [queryMemory, 'curious', { reason: 'multi_page_return' }];
      }
    }

    return workingMemory;
  }

  // Default: stay in returning state
  return workingMemory;
}

export default returningProcess;
