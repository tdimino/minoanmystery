/**
 * Radio Question Submission API Endpoint
 *
 * Handles listener question submissions for the Daimonic Radio.
 */

import type { APIRoute } from 'astro';
import type { ListenerQuestion } from '../../../lib/radio/types';

// Mark as server-rendered
export const prerender = false;

// In-memory question storage (would be Redis/DB in production)
const questions: ListenerQuestion[] = [];

// Rate limiting
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

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const { question, submittedBy } = body;

    // Validate question
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Question must be at least 10 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedQuestion.length > 280) {
      return new Response(
        JSON.stringify({ error: 'Question must not exceed 280 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate submitter name (optional)
    let cleanName: string | undefined;
    if (submittedBy && typeof submittedBy === 'string') {
      cleanName = submittedBy.trim().slice(0, 50) || undefined;
    }

    // Create question
    const newQuestion: ListenerQuestion = {
      id: generateId(),
      question: trimmedQuestion,
      submittedAt: Date.now(),
      submittedBy: cleanName,
      upvotes: 0,
      status: 'pending',
    };

    questions.push(newQuestion);

    // Keep only the last 50 questions in memory
    if (questions.length > 50) {
      questions.shift();
    }

    return new Response(
      JSON.stringify({
        success: true,
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

// Export for use by status endpoint
export function getQuestions(): ListenerQuestion[] {
  return questions;
}
