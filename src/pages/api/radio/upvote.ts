/**
 * Radio Question Upvote API Endpoint
 *
 * Handles upvoting listener questions for the Daimonic Radio.
 * Integrates with the active session's QuestionManager.
 */

import type { APIRoute } from 'astro';
import { getActiveSession, getSession } from './start';

// Mark as server-rendered
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Use IP as visitor ID (could be replaced with actual visitor tracking)
  const visitorId = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    `anon_${Date.now()}`;

  try {
    const body = await request.json();
    const { questionId, sessionId } = body;

    if (!questionId || typeof questionId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get session
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

    // Check if already upvoted
    if (session.questionManager.hasUpvoted(questionId, visitorId)) {
      return new Response(
        JSON.stringify({
          error: 'Already upvoted this question',
          upvotes: session.questionManager.getQuestion(questionId)?.upvotes ?? 0,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if question exists
    const question = session.questionManager.getQuestion(questionId);
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Only allow upvoting pending questions
    if (question.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: 'Cannot upvote a question that is being addressed or already answered',
          status: question.status,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upvote via QuestionManager
    const newCount = session.questionManager.upvote(questionId, visitorId);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        questionId,
        upvotes: newCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Radio] Upvote error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upvote question' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
