/**
 * Engaged Mental Process
 *
 * Handles visitors who are deeply reading content.
 * High scroll depth + extended time indicates genuine interest.
 * Transitions to: ready (contact signals)
 */

import type { ProcessContext, ProcessReturn } from './types';
import { externalDialog, mentalQuery } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';

export async function engagedProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, visitorModel, actions } = context;

  // Track deep engagement
  const deepReadPages = useProcessMemory<string[]>(sessionId, 'engaged', 'deepReadPages', []);
  const ctaHighlighted = useProcessMemory<boolean>(sessionId, 'engaged', 'ctaHighlighted', false);

  // Check for readiness signals - transition to ready
  if (visitorModel.readinessSignals.length > 0) {
    actions.log('Contact-bound signals detected in engaged state');
    return [workingMemory, 'ready', { reason: 'readiness_from_engagement' }];
  }

  // Handle user messages - they're engaged, so be more thoughtful
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // Build rich context for engaged visitors
    const engagementContext = indentNicely`
      This visitor is deeply engaged. Evidence:
      - Time on current page: ${Math.floor(visitorModel.timeOnCurrentPage / 60000)} minutes
      - Scroll depth: ${Math.round(visitorModel.scrollDepth * 100)}%
      - Pages deeply read: ${deepReadPages.current.join(', ') || visitorModel.currentPage}
      - Behavioral type: ${visitorModel.behavioralType}

      ${visitorModel.inferredInterests.length > 0
        ? `Strong interests in: ${visitorModel.inferredInterests.join(', ')}`
        : ''}
    `;

    memory = memory.withRegion('engagement-context', {
      role: ChatMessageRoleEnum.System,
      content: engagementContext,
    });

    const [newMemory, response] = await externalDialog(
      memory,
      indentNicely`
        This visitor is deeply engaged with the content. They're a thoughtful reader.

        Instructions:
        - Match their depth of engagement with more substantive responses
        - You may be slightly more contemplative than with casual visitors
        - Reference specific aspects of what they're reading if relevant
        - If they ask detailed questions, provide detailed answers
        - Still keep responses focused (2-3 sentences)
        - Don't interrupt their reading flow unnecessarily
      `,
      { stream: false }
    );

    actions.speak(response);
    return newMemory;
  }

  // Handle navigation - track deep read pages
  if (perception?.type === 'navigation') {
    const previousPage = visitorModel.currentPage;

    // If they deeply read the previous page, track it
    if (visitorModel.scrollDepth > 0.7 && visitorModel.timeOnCurrentPage > 90000) {
      if (!deepReadPages.current.includes(previousPage)) {
        deepReadPages.current = [...deepReadPages.current, previousPage];
        actions.log('Page deeply read', { page: previousPage });
      }
    }

    return workingMemory;
  }

  // Handle deep scroll completion - subtle CTA highlight
  if (perception?.type === 'scroll') {
    const depth = parseFloat(perception.content) || 0;

    // If they've read to the bottom and haven't seen the CTA highlight
    if (depth > 0.9 && !ctaHighlighted.current && visitorModel.timeOnCurrentPage > 60000) {
      ctaHighlighted.current = true;

      // Subtle CTA enhancement
      actions.dispatch({
        type: 'highlight',
        payload: {
          selector: '.link-highlight, [href="/contact"]',
          style: 'subtle-pulse',
          duration: 3000,
        },
      });

      // Optional: gentle nudge after deep read
      if (deepReadPages.current.length >= 2) {
        actions.dispatch({
          type: 'toast',
          payload: {
            message: 'You read with the patience of a scholar. Tom would appreciate such attention.',
            duration: 5000,
          },
        });
      }
    }

    return workingMemory;
  }

  // Handle hover on contact elements
  if (perception?.type === 'hover') {
    const target = perception.content;

    if (target.includes('contact') || target.includes('cta')) {
      // They're showing interest in contact - note the signal
      if (!visitorModel.readinessSignals.includes('contact_hover')) {
        actions.log('Contact hover detected in engaged state');
        // The runner will pick this up and transition to ready
      }
    }

    return workingMemory;
  }

  // Default: stay engaged, respect their reading
  return workingMemory;
}

export default engagedProcess;
