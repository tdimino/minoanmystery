/**
 * Radio Question Upvote API Endpoint
 *
 * Handles upvoting listener questions for the Daimonic Radio.
 */

import type { APIRoute } from 'astro';
import { getQuestions } from './question';

// Mark as server-rendered
export const prerender = false;

// Track upvotes per IP to prevent duplicate voting
const upvoteRecords = new Map<string, Set<string>>();

function hasUpvoted(ip: string, questionId: string): boolean {
  const record = upvoteRecords.get(ip);
  return record ? record.has(questionId) : false;
}

function recordUpvote(ip: string, questionId: string): void {
  let record = upvoteRecords.get(ip);
  if (!record) {
    record = new Set();
    upvoteRecords.set(ip, record);
  }
  record.add(questionId);
}

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  try {
    const body = await request.json();
    const { questionId } = body;

    if (!questionId || typeof questionId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already upvoted
    if (hasUpvoted(ip, questionId)) {
      return new Response(
        JSON.stringify({ error: 'Already upvoted this question' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find and upvote the question
    const questions = getQuestions();
    const question = questions.find(q => q.id === questionId);

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    question.upvotes++;
    recordUpvote(ip, questionId);

    return new Response(
      JSON.stringify({
        success: true,
        upvotes: question.upvotes,
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
