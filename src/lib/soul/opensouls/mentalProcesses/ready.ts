/**
 * Ready Mental Process
 *
 * Handles visitors showing contact intent signals.
 * Uses full cognitive toolkit: brainstorm for CTAs, decision for strategy, mentalQuery for transitions
 * Transitions to: curious (de-escalation), engaged (back to reading)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, internalMonologue, mentalQuery, decision, brainstorm } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function readyProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track ready state interactions
  const readyInteractions = useProcessMemory<number>(sessionId, 'ready', 'interactions', 0);
  const ctaPersonalized = useProcessMemory<boolean>(sessionId, 'ready', 'ctaPersonalized', false);

  // Personalize CTA using brainstorm + decision instead of hardcoded options
  if (!ctaPersonalized.current) {
    ctaPersonalized.current = true;

    // Step 1: Assess readiness quality
    const [assessMemory, readinessAssessment] = await internalMonologue(
      workingMemory,
      indentNicely`
        A visitor has reached the "ready" state. Let me assess their readiness:
        - Journey: ${userModel.pagesViewed.join(' → ')}
        - Time invested: ${Math.floor(userModel.timeOnSite / 60000)} minutes
        - Interests: ${userModel.inferredInterests.join(', ') || 'general'}
        - Readiness signals: ${userModel.readinessSignals.join(', ')}

        How ready are they really? What type of readiness is this?
      `
    );

    actions.log('Readiness assessment:', readinessAssessment);

    // Step 2: Brainstorm personalized CTAs
    const [ctaMemory, ctaOptions] = await brainstorm(
      assessMemory,
      {
        prompt: indentNicely`
          Generate personalized CTAs for someone interested in: ${userModel.inferredInterests.join(', ') || 'Tom\'s work'}.
          Their journey: viewed ${userModel.pagesViewed.length} pages, spent ${Math.floor(userModel.timeOnSite / 60000)} minutes.
          Last project: ${userModel.lastProject || 'none'}.

          Make CTAs:
          - Inviting, not salesy
          - Connected to their apparent interests
          - Brief (under 8 words each)
          - With the labyrinth metaphor subtly present
        `,
        count: 3,
      }
    );

    // Step 3: Decision to pick best CTA
    const [pickMemory, bestCTA] = await decision(
      ctaMemory,
      {
        choices: ctaOptions.length > 0 ? ctaOptions : ['Ready to discuss your project?'],
        reason: indentNicely`
          Pick the CTA that best matches this visitor's journey and apparent interests.
          They seem interested in: ${userModel.inferredInterests.join(', ') || 'general work'}.
        `,
      }
    );

    actions.log('Chosen CTA:', bestCTA);

    actions.dispatch({
      type: 'updateCTA',
      payload: { message: bestCTA },
    });
  }

  // Handle user messages - they're ready to engage
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;
    readyInteractions.current++;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Step 1: Reflective synthesis of their journey
    const [reflectMemory, journeySynthesis] = await internalMonologue(
      memory,
      indentNicely`
        This ready visitor has sent a message: "${userMessage}"

        Synthesize their journey:
        - Path through labyrinth: ${userModel.pagesViewed.join(' → ')}
        - Time invested: ${Math.floor(userModel.timeOnSite / 60000)} minutes
        - Interests revealed: ${userModel.inferredInterests.join(', ') || 'emerging'}
        - What story does their journey tell? What are they truly seeking?
      `
    );

    actions.log('Journey synthesis:', journeySynthesis);

    // Step 2: Decision on response approach
    const [decisionMemory, approach] = await decision(
      reflectMemory,
      {
        choices: ['warm_guidance', 'answer_directly', 'gentle_invitation', 'affirm_readiness'],
        reason: indentNicely`
          How should I respond to this ready visitor?
          - warm_guidance: Help them take the next step warmly
          - answer_directly: Address their specific question
          - gentle_invitation: Subtly invite them to reach out
          - affirm_readiness: Acknowledge they seem ready and offer help
        `,
      }
    );

    actions.log('Response approach:', approach);

    // Build context about their journey
    const journeyContext = indentNicely`
      This visitor is ready to make contact. Their journey:
      - Pages explored: ${userModel.pagesViewed.join(', ')}
      - Time invested: ${Math.floor(userModel.timeOnSite / 60000)} minutes
      - Interests: ${userModel.inferredInterests.join(', ') || 'general'}
      - Last project viewed: ${userModel.lastProject || 'none'}
      - Response approach: ${approach}
    `;

    const contextMemory = decisionMemory.withRegion('journey-context', {
      role: ChatMessageRoleEnum.System,
      content: journeyContext,
    });

    const approachInstructions = {
      warm_guidance: 'Help them take the next step with warmth and clarity',
      answer_directly: 'Address their question directly and helpfully',
      gentle_invitation: 'Subtly invite them toward contact without pressure',
      affirm_readiness: 'Acknowledge their engagement and offer assistance',
    };

    const [responseMemory, response] = await externalDialog(
      contextMemory,
      indentNicely`
        Respond with the "${approach}" approach.

        ${approachInstructions[approach as keyof typeof approachInstructions] || approachInstructions.warm_guidance}

        Instructions:
        - Reference their specific interests if relevant
        - The contact form is at /contact - mention naturally if appropriate
        - Don't hard-sell; the labyrinth invites, it does not advertise
        - Keep responses helpful and concise (2-3 sentences)
      `,
      { stream: false }
    );

    actions.speak(response);
    return responseMemory;
  }

  // Handle navigation - including de-escalation
  if (perception?.type === 'navigation') {
    const page = perception.content;

    // Contact page reached
    if (page.includes('/contact')) {
      actions.log('Visitor reached contact page');

      // Generate contextual welcome using internalMonologue
      if (readyInteractions.current === 0) {
        const [thoughtMemory, thought] = await internalMonologue(
          workingMemory,
          indentNicely`
            The visitor has reached the contact page. Their journey:
            ${userModel.pagesViewed.join(' → ')}

            What brief, poetic acknowledgment would feel natural here?
            They've found the center of the labyrinth.
          `
        );

        actions.dispatch({
          type: 'toast',
          payload: {
            message: "You've found the center. Tom welcomes thoughtful inquiries.",
            duration: 4000,
          },
        });
        readyInteractions.current++;

        return thoughtMemory;
      }
    }

    // De-escalation check - if they navigate away from contact/about
    if (!page.includes('/contact') && !page.includes('/about')) {
      const [queryMemory, deEscalating] = await mentalQuery(
        workingMemory,
        indentNicely`
          The ready visitor navigated to "${page}" (away from contact).
          Are they de-escalating from contact intent, or exploring related content before reaching out?
          Previous signals: ${userModel.readinessSignals.join(', ')}
        `
      );

      if (deEscalating) {
        actions.log('De-escalation detected, transitioning to curious');
        return [queryMemory, 'curious', { reason: 'navigation_away_from_contact' }];
      }

      // They might be checking one more thing before deciding
      return queryMemory;
    }

    return workingMemory;
  }

  // Handle form focus - they're starting to fill out contact form
  if (perception?.type === 'hover' || perception?.type === 'click') {
    const target = perception.content;

    if (target.includes('form') || target.includes('input') || target.includes('textarea')) {
      // Use internalMonologue to note the significance
      const [thoughtMemory] = await internalMonologue(
        workingMemory,
        indentNicely`
          The visitor is interacting with the contact form.
          This is a significant moment - they're taking action.
          I should remain silent and let them focus.
        `
      );

      actions.log('Contact form interaction - staying silent');
      return thoughtMemory;
    }

    return workingMemory;
  }

  // Default: stay ready, be available but not intrusive
  return workingMemory;
}

export default readyProcess;
