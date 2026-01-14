/**
 * memoryIntegrate - Pure Function for Perception Integration
 *
 * Following Open Souls paradigm: pure function with NO side effects.
 * Input: perception, memory, context
 * Output: updated memory
 */

import { WorkingMemory } from '../core/WorkingMemory';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely, safeName } from '../core/utils';
import type { Perception, HydratedUserModel } from '../mentalProcesses/types';
import { getSoulMemory } from '../../memory';

/**
 * Format visitor context for working memory
 */
function formatVisitorContext(visitor: HydratedUserModel): string {
  const soulMemory = getSoulMemory();
  const userName = soulMemory.getUserName() || 'visitor';
  const visitorModel = soulMemory.getVisitorModel();
  const visitorWhispers = soulMemory.getVisitorWhispers();
  const lastTopics = soulMemory.getLastTopics();

  let context = indentNicely`
    Current visitor context:
    - Name: ${userName}
    - Session: ${visitor.sessionId.slice(0, 8)}...
    - Visit count: ${visitor.visitCount}
    - Pages viewed: ${visitor.pagesViewed.join(', ') || 'none yet'}
    - Current page: ${visitor.currentPage}
    - Time on site: ${Math.floor(visitor.timeOnSite / 60000)} minutes
    - Behavioral type: ${visitor.behavioralType}
    ${visitor.isReturning ? '- This is a returning visitor!' : ''}
  `;

  // Add stored understanding if available
  if (visitorModel) {
    context += `\n\n## What You Know About ${userName}\n${visitorModel}`;
  }

  if (visitorWhispers) {
    context += `\n\n## Their Inner Voice Whispers\n${visitorWhispers}`;
  }

  if (lastTopics.length > 0) {
    context += `\n\n## Recent Topics\n${lastTopics.join(', ')}`;
  }

  return context;
}

/**
 * Format perception for working memory
 */
function formatPerception(perception: Perception): string {
  const type = perception.type;
  const content = perception.content || '';

  switch (type) {
    case 'message':
      return content;
    case 'command':
      return `[Command: ${content}]`;
    case 'navigation':
      return `[Navigated to: ${content}]`;
    case 'click':
      return `[Clicked: ${content}]`;
    case 'idle':
      return `[Idle for ${content}ms]`;
    default:
      return `[${type}: ${content}]`;
  }
}

/**
 * Pure function that integrates perception into working memory.
 * NO side effects, NO state, NO dispatch.
 */
export function memoryIntegrate(
  perception: Perception,
  workingMemory: WorkingMemory,
  visitorContext: HydratedUserModel,
  soulPersonality: string
): WorkingMemory {
  let memory = workingMemory;

  // Add personality on first call (check if region exists)
  const hasPersonality = memory.memories.some(
    m => m.metadata?.region === 'soul-personality'
  );
  if (!hasPersonality) {
    memory = memory.withRegion('soul-personality', {
      role: ChatMessageRoleEnum.System,
      content: soulPersonality,
    });
  }

  // Update visitor context (always refresh)
  memory = memory.withRegion('visitor-context', {
    role: ChatMessageRoleEnum.System,
    content: formatVisitorContext(visitorContext),
  });

  // Add perception as user message
  memory = memory.withMemory({
    role: ChatMessageRoleEnum.User,
    content: formatPerception(perception),
    name: safeName(perception.name ?? 'visitor'),
  });

  return memory;
}
