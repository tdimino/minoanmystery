/**
 * summarizeSession - Session Summary Generator
 *
 * Generates a structured session summary for returning visitor context.
 * Inspired by Claudius precompact-handoff.py — LLM-summarized handoffs.
 *
 * Uses THINKING_MODEL (Qwen3-30B, ~$0.0001 per summary) for cheap,
 * fast structured output.
 *
 * Triggered on session end (beforeunload or idle timeout).
 */

import type { SessionSummary } from '../../types';
import type { SoulMemoryInterface } from '../../memory';
import { internalMonologue } from '../cognitiveSteps/internalMonologue';
import { WorkingMemory } from '../core/WorkingMemory';
import { ChatMessageRoleEnum } from '../core/types';
import { localLogger } from '../../localLogger';

interface SummarizeSessionInput {
  sessionId: string;
  soulMemory: SoulMemoryInterface;
  conversationHistory: Array<{ role: string; content: string }>;
  pagesViewed: string[];
  timeOnSite: number;
  userName?: string;
}

export async function summarizeSession(input: SummarizeSessionInput): Promise<SessionSummary | null> {
  const { sessionId, soulMemory, conversationHistory, pagesViewed, timeOnSite, userName } = input;

  // Skip if no meaningful conversation
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  if (userMessages.length < 2) {
    localLogger.info('SESSION:SUMMARY', 'Skipping - too few messages', { count: userMessages.length });
    return null;
  }

  // Determine engagement level
  const engagement: SessionSummary['engagement'] =
    userMessages.length >= 6 || timeOnSite > 300000 ? 'deep' :
    userMessages.length >= 3 || timeOnSite > 120000 ? 'moderate' :
    'brief';

  // Build a compact WorkingMemory with just the conversation
  const roleMap: Record<string, ChatMessageRoleEnum> = {
    user: ChatMessageRoleEnum.User,
    assistant: ChatMessageRoleEnum.Assistant,
    system: ChatMessageRoleEnum.System,
  };

  const memories = conversationHistory.map(m => ({
    role: roleMap[m.role] || ChatMessageRoleEnum.User,
    content: m.content,
  }));

  const memory = new WorkingMemory({
    soulName: 'Kothar',
    memories: memories.slice(-10), // Last 10 messages for context (keeps prompt small)
  });

  try {
    // Single LLM call — temperature 0.3 for consistent structured output
    const [, summary] = await internalMonologue(
      memory,
      `Summarize this conversation in 1-2 sentences for future reference. Focus on: what ${userName || 'the visitor'} was interested in, what topics were discussed, and what would be useful context if they return. Be concise and factual.`,
      { temperature: 0.3 }
    );

    // Extract topics from visitor model if available
    const visitorModel = soulMemory.getVisitorModel() || '';
    const topicMatches = visitorModel.match(/interest[s]?:\s*([^\n]+)/i);
    const topics = topicMatches
      ? topicMatches[1].split(/[,;]/).map(t => t.trim()).filter(t => t.length > 2).slice(0, 5)
      : [];

    const sessionSummary: SessionSummary = {
      sid: sessionId,
      ts: new Date().toISOString(),
      messages: userMessages.length,
      topics,
      engagement,
      context: summary.slice(0, 300), // Cap at 300 chars
    };

    // Persist to session history
    soulMemory.addSessionSummary(sessionSummary);

    localLogger.info('SESSION:SUMMARY', 'Generated', {
      sid: sessionId.slice(0, 8),
      engagement,
      topics: topics.slice(0, 3),
      contextLength: summary.length,
    });

    return sessionSummary;
  } catch (err) {
    const errorDetail = err instanceof Error
      ? { message: err.message, stack: err.stack?.split('\n').slice(0, 3).join('\n') }
      : { error: String(err) };
    localLogger.error('SESSION:SUMMARY', 'Failed to generate', {
      ...errorDetail,
      sid: sessionId.slice(0, 8),
      messageCount: userMessages.length,
    });
    return null;
  }
}
