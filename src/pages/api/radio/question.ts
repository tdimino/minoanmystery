/**
 * Radio Question Submission API Endpoint
 *
 * Handles listener question submissions for the Daimonic Radio.
 * Integrates with the active session's QuestionManager.
 */

import type { APIRoute } from 'astro';
import type { ListenerQuestion } from '../../../lib/radio/types';
import { getActiveSession, getSession } from './start';

// Mark as server-rendered
export const prerender = false;

// Rate limiting (per IP)
const submitCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // questions per hour per IP
const RATE_WINDOW = 3600000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = submitCounts.get(ip);

  if (!record || now > record.resetTime) {
    submitCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '3600',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { question, submittedBy, sessionId } = body;

    // Get session (use provided ID or active session)
    const session = sessionId ? getSession(sessionId) : getActiveSession();

    if (!session) {
      return new Response(
        JSON.stringify({
          error: 'No active radio session',
          hint: 'Start a session with POST /api/radio/start',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate question
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuestion = question.trim();

    // Use QuestionManager's moderation
    const moderation = session.questionManager.moderateQuestion(trimmedQuestion);
    if (!moderation.allowed) {
      return new Response(
        JSON.stringify({
          error: moderation.reason || 'Question not allowed',
          moderation,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate submitter name (optional)
    let cleanName: string | undefined;
    if (submittedBy && typeof submittedBy === 'string') {
      cleanName = submittedBy.trim().slice(0, 50) || undefined;
    }

    // Add question via QuestionManager
    const newQuestion = session.questionManager.addQuestion(trimmedQuestion, cleanName);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        question: {
          id: newQuestion.id,
          question: newQuestion.question,
          submittedBy: newQuestion.submittedBy,
          upvotes: newQuestion.upvotes,
          status: newQuestion.status,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Radio] Question submission error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit question' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET: List pending questions
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  // Get session
  const session = sessionId ? getSession(sessionId) : getActiveSession();

  if (!session) {
    return new Response(
      JSON.stringify({
        error: 'No active radio session',
        questions: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const pending = session.questionManager.getPendingQuestions();
  const recentlyAnswered = session.questionManager.getRecentlyAnswered(5);
  const queueState = session.questionManager.getState();

  return new Response(
    JSON.stringify({
      sessionId: session.id,
      pending: pending.map(q => ({
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
      recentlyAnswered: recentlyAnswered.map(q => ({
        id: q.id,
        question: q.question,
        submittedBy: q.submittedBy,
        addressedBySoul: q.addressedBySoul,
      })),
      canSubmitQuestion: session.questionManager.canAskQuestion(),
      queueLength: pending.length,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

// Legacy export for backwards compatibility (deprecated)
export function getQuestions(): ListenerQuestion[] {
  const session = getActiveSession();
  return session ? session.questionManager.getPendingQuestions() : [];
}
