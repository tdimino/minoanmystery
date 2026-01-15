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

/**
 * Visitor context data for pure function injection
 * Separates data retrieval from integration logic
 */
export interface VisitorContextData {
  userName: string;
  visitorModel?: string;
  visitorWhispers?: string;
  lastTopics: string[];
}

/**
 * Format visitor context for working memory
 * Pure function: no side effects, takes all data as parameters
 */
function formatVisitorContext(visitor: HydratedUserModel, contextData: VisitorContextData): string {
  const { userName, visitorModel, visitorWhispers, lastTopics } = contextData;

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
 *
 * All data needed from soul memory is passed via visitorData parameter,
 * making this function truly pure (no getSoulMemory() calls).
 */
export function memoryIntegrate(
  perception: Perception,
  workingMemory: WorkingMemory,
  visitorContext: HydratedUserModel,
  soulPersonality: string,
  visitorData: VisitorContextData
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
    content: formatVisitorContext(visitorContext, visitorData),
  });

  // Add perception as user message
  memory = memory.withMemory({
    role: ChatMessageRoleEnum.User,
    content: formatPerception(perception),
    name: safeName(perception.name ?? 'visitor'),
  });

  return memory;
}
