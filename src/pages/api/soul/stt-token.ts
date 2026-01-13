/**
 * Deepgram STT Token Endpoint
 *
 * Provides short-lived temporary tokens for browser-based speech recognition.
 * This keeps the main API key server-side while allowing WebSocket connections.
 *
 * Pattern: Client requests token → Uses token for STT → Token expires
 */

import type { APIRoute } from 'astro';
import { createClient } from '@deepgram/sdk';

// Disable prerendering for this API endpoint
export const prerender = false;

// Rate limiting state (simple in-memory, resets on cold start)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

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

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const deepgramApiKey = import.meta.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return new Response(
      JSON.stringify({ error: 'Deepgram API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Deepgram client
    const deepgram = createClient(deepgramApiKey);

    // Create a temporary key that expires in 60 seconds
    // This is enough time to establish a WebSocket connection
    const { result } = await deepgram.manage.createProjectKey(
      // Project ID is extracted from the API key automatically
      import.meta.env.DEEPGRAM_PROJECT_ID || '',
      {
        comment: 'Temporary browser STT key',
        scopes: ['usage:write'], // Minimal scope for STT
        time_to_live_in_seconds: 60,
      }
    );

    if (!result?.key) {
      throw new Error('Failed to create temporary key');
    }

    return new Response(
      JSON.stringify({
        token: result.key,
        expiresIn: 60,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[STT Token API] Error:', error);

    // Fallback: If temporary keys aren't available (free tier),
    // return a one-time use indicator that the client should
    // request a new token for each session
    return new Response(
      JSON.stringify({
        error: 'Token generation failed',
        details: 'Temporary key creation requires Deepgram Growth plan or higher',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
