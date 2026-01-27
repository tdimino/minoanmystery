/**
 * Radio Status API Endpoint
 *
 * Returns the current state of the Daimonic Radio broadcast,
 * including speaker status, topic, listener count, and question queue.
 */

import type { APIRoute } from 'astro';
import type { RadioSoulName, ListenerQuestion } from '../../../lib/radio/types';
import { getQuestions } from './question';

// Mark as server-rendered
export const prerender = false;

// In-memory state (would be replaced with Redis/DB in production)
interface RadioBroadcastState {
  isLive: boolean;
  currentSpeaker: RadioSoulName | null;
  currentTopic: string;
  listenerCount: number;
  startedAt: number | null;
  totalTurns: number;
}

// Simulated broadcast state
// In production, this would be stored in Redis or similar
const broadcastState: RadioBroadcastState = {
  isLive: false,
  currentSpeaker: null,
  currentTopic: 'The station is preparing...',
  listenerCount: 0,
  startedAt: null,
  totalTurns: 0,
};

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

  // Get questions from shared store
  const questions = getQuestions();

  // Return current broadcast state
  return new Response(
    JSON.stringify({
      isLive: broadcastState.isLive,
      currentSpeaker: broadcastState.currentSpeaker,
      currentTopic: broadcastState.currentTopic,
      listenerCount: broadcastState.listenerCount,
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        submittedBy: q.submittedBy,
        upvotes: q.upvotes,
        status: q.status,
      })),
      totalTurns: broadcastState.totalTurns,
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

// For future: Methods to update broadcast state
// These would be called by the DialogueOrchestrator
export function updateBroadcastState(update: Partial<RadioBroadcastState>): void {
  Object.assign(broadcastState, update);
}

export function incrementListeners(): void {
  broadcastState.listenerCount++;
}

export function decrementListeners(): void {
  broadcastState.listenerCount = Math.max(0, broadcastState.listenerCount - 1);
}
