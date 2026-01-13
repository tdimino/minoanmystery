/**
 * Returning Mental Process
 *
 * Handles visitors who have been here before (visitCount > 1).
 * Personalized welcome, remembers their previous interests.
 * Transitions to: curious, engaged, ready based on behavior
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory, useSoulMemory } from '../hooks';

export async function returningProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, visitorModel, actions } = context;

  // Track returning visitor state
  const welcomed = useProcessMemory<boolean>(sessionId, 'returning', 'welcomed', false);
  const sessionInteractions = useProcessMemory<number>(sessionId, 'returning', 'interactions', 0);

  // Show welcome back toast on first entry
  if (!welcomed.current) {
    welcomed.current = true;

    // Personalized welcome based on their history
    let welcomeMessage = "Welcome back to the labyrinth.";

    if (visitorModel.lastProject) {
      const projectNames: Record<string, string> = {
        acs: 'the ACS archives',
        czi: 'the CZI corridors',
        dolby: 'the Dolby chambers',
      };
      const projectName = projectNames[visitorModel.lastProject] || visitorModel.lastProject;
      welcomeMessage = `You return. Last time, you lingered at ${projectName}.`;
    } else if (visitorModel.visitCount > 3) {
      welcomeMessage = "You return often. The labyrinth remembers its pilgrims.";
    }

    actions.dispatch({
      type: 'toast',
      payload: {
        message: welcomeMessage,
        duration: 5000,
      },
    });

    actions.log('Returning visitor welcomed', {
      visitCount: visitorModel.visitCount,
      lastProject: visitorModel.lastProject,
    });
  }

  // Check for transitions based on current behavior
  if (visitorModel.pagesViewed.length >= 3) {
    return [workingMemory, 'curious', { reason: 'returning_exploring' }];
  }

  if (visitorModel.scrollDepth > 0.7 && visitorModel.timeOnCurrentPage > 90000) {
    return [workingMemory, 'engaged', { reason: 'returning_deep_read' }];
  }

  if (visitorModel.readinessSignals.length > 0) {
    return [workingMemory, 'ready', { reason: 'returning_ready' }];
  }

  // Handle user messages
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;
    sessionInteractions.current++;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Build returning visitor context
    const returningContext = indentNicely`
      This is a returning visitor. History:
      - Visit count: ${visitorModel.visitCount}
      - Previous interests: ${visitorModel.inferredInterests.join(', ') || 'unknown'}
      - Last project viewed: ${visitorModel.lastProject || 'none'}
      - Behavioral type: ${visitorModel.behavioralType}

      They've chosen to return, which suggests genuine interest.
    `;

    memory = memory.withRegion('returning-context', {
      role: ChatMessageRoleEnum.System,
      content: returningContext,
    });

    const [newMemory, response] = await externalDialog(
      memory,
      indentNicely`
        This visitor has returned to the labyrinth. They remember you.

        Instructions:
        - Acknowledge their return subtly (don't overdo it)
        - Reference their previous interests if relevant
        - Be warm - returning visitors are potential collaborators
        - If they have questions, provide thoughtful guidance
        - Keep responses conversational (2-3 sentences)
      `,
      { stream: false }
    );

    actions.speak(response);
    return newMemory;
  }

  // Handle navigation
  if (perception?.type === 'navigation') {
    const page = perception.content;
    sessionInteractions.current++;

    // If they're revisiting a project they saw before
    if (page.includes('/portfolio/') && visitorModel.lastProject) {
      const currentProject = page.split('/portfolio/')[1]?.replace('/', '');

      if (currentProject === visitorModel.lastProject) {
        // They returned to the same project - strong interest signal
        actions.log('Returning to previously viewed project', { project: currentProject });

        if (sessionInteractions.current <= 2) {
          actions.dispatch({
            type: 'toast',
            payload: {
              message: `${currentProject.toUpperCase()} drew you back. There is more to discover.`,
              duration: 4000,
            },
          });
        }
      }
    }

    // Check for transition to curious
    if (visitorModel.pagesViewed.length >= 3) {
      return [workingMemory, 'curious', { reason: 'multi_page_return' }];
    }

    return workingMemory;
  }

  // Default: stay in returning state
  return workingMemory;
}

export default returningProcess;
