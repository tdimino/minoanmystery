/**
 * HLS Playlist Endpoint
 *
 * Serves the m3u8 playlist for a radio session.
 *
 * GET /api/radio/hls/playlist?sessionId=xxx
 *   Returns the m3u8 playlist for the session
 */

import type { APIRoute } from 'astro';
import { getSession, getActiveSession } from '../start';

export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────

/** Valid session ID format: radio_TIMESTAMP_RANDOMCHARS */
const SESSION_ID_PATTERN = /^radio_\d+_[a-z0-9]+$/;

function isValidSessionId(id: string | null): id is string {
  return id !== null && SESSION_ID_PATTERN.test(id);
}

// ─────────────────────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────────────────────

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const isProduction = process.env.NODE_ENV === 'production';

  const allowedOrigin = isProduction
    ? (origin && new URL(request.url).origin === origin ? origin : '')
    : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
  };
}

// ─────────────────────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const corsHeaders = getCorsHeaders(request);

  // Validate sessionId format if provided
  if (sessionId !== null && !isValidSessionId(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid session ID format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Get session
  const session = sessionId ? getSession(sessionId) : getActiveSession();

  if (!session) {
    // Return empty but valid playlist for no session
    return new Response(
      '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ENDLIST',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders,
        },
      }
    );
  }

  // Check if session has HLS components
  if (!session.playlistManager) {
    return new Response(
      JSON.stringify({ error: 'HLS not enabled for this session' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Generate playlist
  const playlist = session.playlistManager.generate();

  return new Response(playlist, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...corsHeaders,
    },
  });
};
