/**
 * Cartesia Text-to-Speech API Endpoint
 *
 * Converts text to speech using Cartesia's Sonic TTS.
 * This endpoint proxies requests to Cartesia, hiding the API key from the client.
 */

import type { APIRoute } from 'astro';
import { CartesiaClient } from '@cartesia/cartesia-js';

// Disable prerendering for this API endpoint
export const prerender = false;

// Rate limiting state (simple in-memory, resets on cold start)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute
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

// Voice configuration - Cartesia voices
// See: https://docs.cartesia.ai/getting-started/available-voices
const voiceConfig = {
  // Classy British Man - sardonic, intellectual tone for Kothar/Artifex Maximus
  voiceId: '95856005-0332-41b0-935f-352e296aa0df',
  // Alternative voices:
  // '63ff761f-c1e8-414b-b969-d1833d1c870c' - Confident British Man
  // 'a0e99841-438c-4a64-b679-ae501e7d6091' - Barbershop Man
  // '79a125e8-cd45-4c13-8a67-188112f4dd22' - British Lady
  modelId: 'sonic-3',
  outputFormat: {
    container: 'wav' as const,
    sampleRate: 24000,
    encoding: 'pcm_s16le' as const,
  },
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const cartesiaApiKey = import.meta.env.CARTESIA_API_KEY;

  if (!cartesiaApiKey) {
    return new Response(
      JSON.stringify({ error: 'Cartesia API key not configured' }),
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
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Limit text length to prevent abuse
    const maxLength = 1000;
    const truncatedText = text.slice(0, maxLength);

    // Initialize Cartesia client
    const cartesia = new CartesiaClient({
      apiKey: cartesiaApiKey,
    });

    // Request speech synthesis
    const audioData = await cartesia.tts.bytes({
      modelId: voiceConfig.modelId,
      transcript: truncatedText,
      voice: {
        mode: 'id',
        id: voiceId || voiceConfig.voiceId,
      },
      outputFormat: voiceConfig.outputFormat,
    });

    // Handle different return types from Cartesia SDK
    // It can return a Uint8Array, Buffer, or Readable stream
    let buffer: Uint8Array;

    if (audioData instanceof Uint8Array) {
      buffer = audioData;
    } else if (Buffer.isBuffer(audioData)) {
      buffer = new Uint8Array(audioData);
    } else if (typeof (audioData as NodeJS.ReadableStream).pipe === 'function') {
      // It's a Readable stream - collect chunks
      const chunks: Uint8Array[] = [];
      const readable = audioData as NodeJS.ReadableStream;

      await new Promise<void>((resolve, reject) => {
        readable.on('data', (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));
        readable.on('end', () => resolve());
        readable.on('error', reject);
      });

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      // Fallback: try to convert as unknown
      buffer = new Uint8Array(audioData as unknown as ArrayBuffer);
    }

    // Convert to Buffer for proper Response body type
    const responseBuffer = Buffer.from(buffer);

    return new Response(responseBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': responseBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[TTS API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Text-to-speech failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
