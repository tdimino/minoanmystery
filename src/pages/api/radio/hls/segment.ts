/**
 * HLS Segment Serving Endpoint
 *
 * Serves audio segments for HLS playback.
 * In development, segments are served from in-memory storage.
 * In production with Vercel Blob, segments are served directly from CDN.
 *
 * GET /api/radio/hls/segment?sessionId=xxx&segmentId=segment_0
 */

import type { APIRoute } from 'astro';
import { getSession, getActiveSession } from '../start';
import { InMemorySegmentStore } from '../../../../lib/radio/streaming/SegmentStore';

export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────

/** Valid session ID format: radio_TIMESTAMP_RANDOMCHARS */
const SESSION_ID_PATTERN = /^radio_\d+_[a-z0-9]+$/;

/** Valid segment ID format: segment_NUMBER */
const SEGMENT_ID_PATTERN = /^segment_\d+$/;

function isValidSessionId(id: string | null): id is string {
  return id !== null && SESSION_ID_PATTERN.test(id);
}

function isValidSegmentId(id: string | null): id is string {
  return id !== null && SEGMENT_ID_PATTERN.test(id);
}

// ─────────────────────────────────────────────────────────────
// CORS Headers (restrict to same origin in production)
// ─────────────────────────────────────────────────────────────

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, only allow same-origin requests
  // In development, allow any origin for easier testing
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
  const segmentId = url.searchParams.get('segmentId');
  const corsHeaders = getCorsHeaders(request);

  // Validate segmentId format (prevent path traversal)
  if (!isValidSegmentId(segmentId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid segment ID format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Validate sessionId format if provided (prevent path traversal)
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
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Check if session has segment store
  if (!session.segmentStore) {
    return new Response(
      JSON.stringify({ error: 'HLS not enabled for this session' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  const store = session.segmentStore;

  // For in-memory store, serve segment data directly
  if (store instanceof InMemorySegmentStore) {
    // Use the new getSegmentBySimpleId method for consistent lookup
    const segment = store.getSegmentBySimpleId(segmentId);

    if (!segment) {
      return new Response(
        JSON.stringify({ error: 'Segment not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Determine content type from segment data or store config
    // ADTS AAC starts with 0xFFF (sync word), WAV starts with "RIFF"
    const firstBytes = new Uint8Array(segment.data.slice(0, 4));
    const isAAC = (firstBytes[0] === 0xFF && (firstBytes[1] & 0xF0) === 0xF0);
    const contentType = isAAC ? 'audio/aac' : 'audio/wav';

    // Serve the audio data
    return new Response(segment.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': segment.data.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000', // Segments are immutable
        ...corsHeaders,
      },
    });
  }

  // For Vercel Blob or other stores, look up and redirect to CDN URL
  // Construct storage path to match how HLSSegmenter stores it
  const storagePath = `radio/${session.id}/${segmentId}.wav`;
  const segment = await store.get(storagePath);

  if (!segment) {
    return new Response(
      JSON.stringify({ error: 'Segment not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Redirect to the CDN URL
  return Response.redirect(segment.url, 302);
};
