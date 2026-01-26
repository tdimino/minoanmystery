/**
 * Engaged Mental Process
 *
 * Handles visitors who are deeply reading content.
 * Uses full cognitive toolkit: internalMonologue for reflection, decision for dispatch strategy
 * Transitions to: ready (contact signals), curious (if de-escalating)
 */

import type { ProcessContext, ProcessReturn } from './types';
import type { MentalProcessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: MentalProcessMeta = {
  name: 'engaged',
  description: 'Deep reading state with contextual responses to focused visitors',
  transitions: ['ready', 'curious', 'academic', 'poetic'] as const,
  entryConditions: ['deep scroll depth', 'extended time on page'],
} as const;
import { externalDialog, internalMonologue, mentalQuery, decision } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function engagedProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Track deep engagement
  const deepReadPages = useProcessMemory<string[]>(sessionId, 'engaged', 'deepReadPages', []);
  const ctaHighlighted = useProcessMemory<boolean>(sessionId, 'engaged', 'ctaHighlighted', false);

  // Use mentalQuery to evaluate readiness signals instead of simple length check
  if (userModel.readinessSignals.length > 0) {
    const [queryMemory, isReady] = await mentalQuery(
      workingMemory,
      indentNicely`
        The engaged visitor shows readiness signals: ${userModel.readinessSignals.join(', ')}
        They've deeply read ${deepReadPages.current.length} pages.
        Are these genuine readiness signals, or just casual exploration of contact info?
      `
    );

    if (isReady) {
      actions.log('Genuine readiness confirmed, transitioning to ready');
      return [queryMemory, 'ready', { reason: 'readiness_from_engagement' }];
    }
  }

  // Handle user messages - they're engaged, so be more thoughtful
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Step 1: Reflective internalMonologue - contemplate their engagement
    const [reflectMemory, insight] = await internalMonologue(
      memory,
      indentNicely`
        This visitor has deeply engaged with the content. Let me reflect:

        Their journey:
        - Pages deeply read: ${deepReadPages.current.join(', ') || userModel.currentPage}
        - Time on current page: ${Math.floor(userModel.timeOnCurrentPage / 60000)} minutes
        - Scroll depth: ${Math.round(userModel.scrollDepth * 100)}%
        - Behavioral type: ${userModel.behavioralType}
        - Interests: ${userModel.inferredInterests.join(', ') || 'emerging'}

        Their message: "${userMessage}"

        What does their choice of content reveal about their interests?
        What might they be looking for that I could help with?
      `
    );

    actions.log('Engagement reflection:', insight);

    // Step 2: Decision - how to respond to this engaged reader
    const [decisionMemory, responseStyle] = await decision(
      reflectMemory,
      {
        choices: ['contemplative_depth', 'practical_guidance', 'connection_building', 'silent_respect'],
        reason: indentNicely`
          How should I respond to this deeply engaged visitor?
          - contemplative_depth: Match their intellectual engagement with substantive response
          - practical_guidance: Help them find what they're seeking
          - connection_building: Build rapport based on shared interests
          - silent_respect: Minimal response to not interrupt their flow
        `,
      }
    );

    actions.log('Response style:', responseStyle);

    // Build rich context for engaged visitors
    const engagementContext = indentNicely`
      This visitor is deeply engaged. Evidence:
      - Time on current page: ${Math.floor(userModel.timeOnCurrentPage / 60000)} minutes
      - Scroll depth: ${Math.round(userModel.scrollDepth * 100)}%
      - Pages deeply read: ${deepReadPages.current.join(', ') || userModel.currentPage}
      - Behavioral type: ${userModel.behavioralType}
      - Response style: ${responseStyle}

      ${userModel.inferredInterests.length > 0
        ? `Strong interests in: ${userModel.inferredInterests.join(', ')}`
        : ''}
    `;

    const contextMemory = decisionMemory.withRegion('engagement-context', {
      role: ChatMessageRoleEnum.System,
      content: engagementContext,
    });

    // Step 3: Tailored external dialog
    const styleInstructions = {
      contemplative_depth: 'Be substantive and thoughtful, matching their intellectual depth',
      practical_guidance: 'Be helpful and direct, guide them to what they seek',
      connection_building: 'Build rapport, reference their interests warmly',
      silent_respect: 'Be very brief, honor their focused reading',
    };

    const [responseMemory, response] = await externalDialog(
      contextMemory,
      indentNicely`
        Respond to this deeply engaged visitor with "${responseStyle}" style.

        ${styleInstructions[responseStyle as keyof typeof styleInstructions] || styleInstructions.contemplative_depth}

        Instructions:
        - Reference specific aspects of what they're reading if relevant
        - If they ask detailed questions, provide detailed answers
        - Length: ${responseStyle === 'silent_respect' ? '1 sentence max' : '2-3 sentences'}
        - Don't interrupt their reading flow unnecessarily
      `,
      { stream: false }
    );

    actions.speak(response);
    return responseMemory;
  }

  // Handle navigation - track deep read pages with reflection
  if (perception?.type === 'navigation') {
    const previousPage = userModel.currentPage;

    // If they deeply read the previous page, track it with reflection
    if (userModel.scrollDepth > 0.7 && userModel.timeOnCurrentPage > 90000) {
      if (!deepReadPages.current.includes(previousPage)) {
        deepReadPages.current = [...deepReadPages.current, previousPage];

        // Reflect on what their reading pattern reveals
        const [reflectMemory, insight] = await internalMonologue(
          workingMemory,
          indentNicely`
            The visitor has now deeply read ${deepReadPages.current.length} pages:
            ${deepReadPages.current.join(', ')}

            What does this pattern reveal about their interests and intent?
            What thread connects these pages?
          `
        );

        actions.log('Deep read reflection:', insight);
        return reflectMemory;
      }
    }

    // Check if they're de-escalating (quick navigation away)
    if (userModel.scrollDepth < 0.3 && userModel.timeOnCurrentPage < 30000) {
      const [queryMemory, deEscalating] = await mentalQuery(
        workingMemory,
        indentNicely`
          The visitor navigated away quickly (scroll: ${Math.round(userModel.scrollDepth * 100)}%, time: ${Math.floor(userModel.timeOnCurrentPage / 1000)}s).
          Are they de-escalating from deep engagement, or just moving to related content?
        `
      );

      if (deEscalating) {
        actions.log('De-escalation detected, transitioning to curious');
        return [queryMemory, 'curious', { reason: 'engagement_de_escalation' }];
      }
    }

    return workingMemory;
  }

  // Handle deep scroll completion - thoughtful CTA strategy
  if (perception?.type === 'scroll') {
    const depth = parseFloat(perception.content) || 0;

    // If they've read to the bottom and haven't seen the CTA highlight
    if (depth > 0.9 && !ctaHighlighted.current && userModel.timeOnCurrentPage > 60000) {
      ctaHighlighted.current = true;

      // Use decision to choose how to acknowledge their deep reading
      const [decisionMemory, acknowledgmentStyle] = await decision(
        workingMemory,
        {
          choices: ['subtle_highlight', 'toast_acknowledgment', 'ambient_shift', 'silent'],
          reason: indentNicely`
            The visitor has read deeply (${Math.round(depth * 100)}% scroll).
            How should I acknowledge this without interrupting?
            - subtle_highlight: Gentle CTA pulse
            - toast_acknowledgment: Scholar-like appreciation message
            - ambient_shift: Change background animation feel
            - silent: Let them be, they're focused
          `,
        }
      );

      actions.log('Acknowledgment style:', acknowledgmentStyle);

      if (acknowledgmentStyle === 'subtle_highlight' || acknowledgmentStyle === 'toast_acknowledgment') {
        actions.dispatch({
          type: 'highlight',
          payload: {
            selector: '.link-highlight, [href="/contact"]',
            style: 'subtle-pulse',
            duration: 3000,
          },
        });
      }

      if (acknowledgmentStyle === 'toast_acknowledgment' && deepReadPages.current.length >= 2) {
        // Generate dynamic scholar message
        const [toastMemory] = await internalMonologue(
          decisionMemory,
          indentNicely`
            This visitor has deeply read ${deepReadPages.current.length} pages.
            Craft a brief, poetic acknowledgment that feels like the labyrinth noticed.
          `
        );

        actions.dispatch({
          type: 'toast',
          payload: {
            message: 'You read with the patience of a scholar. Tom would appreciate such attention.',
            duration: 5000,
          },
        });

        return toastMemory;
      }

      if (acknowledgmentStyle === 'ambient_shift') {
        actions.dispatch({
          type: 'animate',
          payload: { target: '.ambient-bg', animation: 'calm', duration: 5000 },
        });
      }

      return decisionMemory;
    }

    return workingMemory;
  }

  // Handle hover on contact elements with mentalQuery
  if (perception?.type === 'hover') {
    const target = perception.content;

    if (target.includes('contact') || target.includes('cta')) {
      // Use mentalQuery to assess if this is genuine interest
      const [queryMemory, genuineInterest] = await mentalQuery(
        workingMemory,
        indentNicely`
          The deeply engaged visitor hovered on "${target}".
          Given their engagement pattern (${deepReadPages.current.length} deep reads),
          is this genuine interest in contact, or just cursor passing?
        `
      );

      if (genuineInterest) {
        actions.log('Genuine contact interest detected in engaged state');
        return [queryMemory, 'ready', { reason: 'contact_interest_from_engagement' }];
      }
    }

    return workingMemory;
  }

  // Default: stay engaged, respect their reading
  return workingMemory;
}

export default engagedProcess;
