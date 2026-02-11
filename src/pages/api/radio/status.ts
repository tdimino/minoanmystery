/**
 * Radio Status API Endpoint
 *
 * Returns the current state of the Daimonic Radio broadcast,
 * including speaker status, topic, listener count, and question queue.
 */

import type { APIRoute } from 'astro';
import { getActiveSession, getSession } from './start';

// Mark as server-rendered
export const prerender = false;

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export const GET: APIRoute = async ({ request }) => {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  // Get session
  const session = sessionId ? getSession(sessionId) : getActiveSession();

  if (!session) {
    return new Response(
      JSON.stringify({
        isLive: false,
        currentSpeaker: null,
        currentTopic: 'The station is preparing...',
        listenerCount: 0,
        questions: [],
        totalTurns: 0,
        message: 'No active radio session',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  // Get orchestrator state
  const dialogueState = session.orchestrator.getState();

  // Get questions from QuestionManager
  const pendingQuestions = session.questionManager.getPendingQuestions();
  const queueState = session.questionManager.getState();

  // Calculate runtime
  const runtimeMs = Date.now() - session.createdAt;
  const runtimeMinutes = Math.floor(runtimeMs / 60000);
  const runtimeSeconds = Math.floor((runtimeMs % 60000) / 1000);

  return new Response(
    JSON.stringify({
      // Session info
      sessionId: session.id,
      isLive: session.state === 'running',
      status: session.state,

      // Dialogue state
      currentSpeaker: dialogueState.currentSpeaker,
      currentTopic: session.topic,
      topicDepth: dialogueState.topicDepth,
      totalTurns: dialogueState.totalTurns,

      // Runtime
      runtime: `${runtimeMinutes}:${runtimeSeconds.toString().padStart(2, '0')}`,
      runtimeMs,
      startedAt: session.createdAt,

      // Audio queue info
      audioQueueLength: session.audioQueue.length,
      speechEventsCount: session.speechEvents.length,

      // Questions
      questions: pendingQuestions.map(q => ({
        id: q.id,
        question: q.question,
        submittedBy: q.submittedBy,
        upvotes: q.upvotes,
        status: q.status,
      })),
      currentQuestion: queueState.currentQuestion ? {
        id: queueState.currentQuestion.id,
        question: queueState.currentQuestion.question,
        submittedBy: queueState.currentQuestion.submittedBy,
      } : null,
      questionsAddressed: session.questionsAddressed.length,
      canSubmitQuestion: session.questionManager.canAskQuestion(),

      // Last speech (for preview)
      lastSpeech: session.speechEvents.length > 0
        ? session.speechEvents[session.speechEvents.length - 1]
        : null,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
};
