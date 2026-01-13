/**
 * Ready Mental Process
 *
 * Handles visitors showing contact intent signals.
 * They've hovered on contact, viewed contact page, or shown other readiness.
 * This is the "conversion-ready" state - be helpful, not pushy.
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function readyProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, visitorModel, actions } = context;

  // Track ready state interactions
  const readyInteractions = useProcessMemory<number>(sessionId, 'ready', 'interactions', 0);
  const ctaPersonalized = useProcessMemory<boolean>(sessionId, 'ready', 'ctaPersonalized', false);

  // Personalize CTA on first entry to ready state
  if (!ctaPersonalized.current) {
    ctaPersonalized.current = true;

    // Build personalized CTA based on interests
    const interests = visitorModel.inferredInterests;
    let ctaMessage = "Ready to discuss your project?";

    if (interests.includes('content strategy')) {
      ctaMessage = "Ready to bring order to your content?";
    } else if (interests.includes('UX design')) {
      ctaMessage = "Ready to craft your user experience?";
    } else if (interests.includes('AI')) {
      ctaMessage = "Ready to explore AI possibilities?";
    } else if (interests.includes('scientific documentation')) {
      ctaMessage = "Ready to illuminate your research?";
    }

    actions.dispatch({
      type: 'updateCTA',
      payload: { message: ctaMessage },
    });

    actions.log('CTA personalized for ready visitor', { interests, ctaMessage });
  }

  // Handle user messages - they're ready to engage
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;
    readyInteractions.current++;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Build context about their journey
    const journeyContext = indentNicely`
      This visitor is ready to make contact. Their journey:
      - Pages explored: ${visitorModel.pagesViewed.join(', ')}
      - Time invested: ${Math.floor(visitorModel.timeOnSite / 60000)} minutes
      - Interests: ${visitorModel.inferredInterests.join(', ') || 'general'}
      - Last project viewed: ${visitorModel.lastProject || 'none'}
      - Readiness signals: ${visitorModel.readinessSignals.join(', ')}

      They are likely considering reaching out to Tom.
    `;

    memory = memory.withRegion('journey-context', {
      role: ChatMessageRoleEnum.System,
      content: journeyContext,
    });

    const [newMemory, response] = await externalDialog(
      memory,
      indentNicely`
        This visitor is ready to make contact. They've invested time exploring.

        Instructions:
        - Be warm and encouraging without being pushy
        - If they ask about working with Tom, provide helpful information
        - Reference their specific interests if relevant
        - The contact form is at /contact - you can mention it naturally
        - Don't hard-sell; the labyrinth invites, it does not advertise
        - Keep responses helpful and concise (2-3 sentences)
      `,
      { stream: false }
    );

    actions.speak(response);
    return newMemory;
  }

  // Handle navigation to contact page
  if (perception?.type === 'navigation') {
    const page = perception.content;

    if (page.includes('/contact')) {
      actions.log('Visitor reached contact page');

      // Subtle encouragement
      if (readyInteractions.current === 0) {
        actions.dispatch({
          type: 'toast',
          payload: {
            message: "You've found the center. Tom welcomes thoughtful inquiries.",
            duration: 4000,
          },
        });
        readyInteractions.current++;
      }
    }

    return workingMemory;
  }

  // Handle form focus - they're starting to fill out contact form
  if (perception?.type === 'hover' || perception?.type === 'click') {
    const target = perception.content;

    if (target.includes('form') || target.includes('input') || target.includes('textarea')) {
      actions.log('Contact form interaction detected');
      // Don't interrupt - they're taking action
    }

    return workingMemory;
  }

  // Default: stay ready, be available but not intrusive
  return workingMemory;
}

export default readyProcess;
