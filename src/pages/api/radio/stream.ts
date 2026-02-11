/**
 * Radio Stream API Endpoint
 *
 * Server-Sent Events (SSE) endpoint for streaming radio content.
 * Streams audio chunks, speech events, and state updates.
 *
 * Client connects with: new EventSource('/api/radio/stream?sessionId=...')
 */

import type { APIRoute } from 'astro';
import { getSession, getActiveSession, type RadioSession } from './start';
import type { AudioChunk, RadioSoulName } from '../../../lib/radio/types';

// Mark as server-rendered
export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Event Types for SSE
// ─────────────────────────────────────────────────────────────

interface StreamEvent {
  type: 'audio' | 'speech' | 'state' | 'question' | 'error' | 'heartbeat';
  data: unknown;
  timestamp: number;
}

function createEvent(type: StreamEvent['type'], data: unknown): string {
  const event: StreamEvent = {
    type,
    data,
    timestamp: Date.now(),
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ─────────────────────────────────────────────────────────────
// Audio Chunk Serialization
// ─────────────────────────────────────────────────────────────

interface SerializedAudioChunk {
  id: string;
  text: string;
  // Audio as base64-encoded Float32Array bytes
  audioBase64: string | null;
  duration: number;
  chunkIndex: number;
  totalChunks: number;
  canBeInterrupted: boolean;
}

function serializeAudioChunk(chunk: AudioChunk): SerializedAudioChunk {
  let audioBase64: string | null = null;

  if (chunk.audioBuffer) {
    // Convert Float32Array to base64
    const bytes = new Uint8Array(chunk.audioBuffer.buffer);
    // Node.js Buffer for base64 encoding
    audioBase64 = Buffer.from(bytes).toString('base64');
  }

  return {
    id: chunk.id,
    text: chunk.text,
    audioBase64,
    duration: chunk.duration,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.totalChunks,
    canBeInterrupted: chunk.canBeInterrupted,
  };
}

// ─────────────────────────────────────────────────────────────
// SSE Stream Handler
// ─────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  // Get session (use provided ID or active session)
  let session: RadioSession | null = null;

  if (sessionId) {
    session = getSession(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    session = getActiveSession();
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'No active session. Start one with POST /api/radio/start' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Capture session reference for stream
  const activeSession = session;

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(encoder.encode(createEvent('state', {
        connected: true,
        sessionId: activeSession.id,
        topic: activeSession.topic,
        status: activeSession.state,
      })));

      // Track what we've sent
      let lastAudioIndex = 0;
      let lastSpeechIndex = 0;
      let lastQuestionIndex = 0;
      let isRunning = true;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

      // Start the dialogue loop if not already running
      if (activeSession.state === 'initialized') {
        activeSession.state = 'running';

        // Run dialogue in background (non-blocking)
        (async () => {
          try {
            await activeSession.orchestrator.runDialogue();
            activeSession.state = 'stopped';
          } catch (error) {
            console.error('[Radio] Dialogue error:', error);
            activeSession.state = 'stopped';
          }
        })();
      }

      // Heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (!isRunning) return;
        try {
          controller.enqueue(encoder.encode(createEvent('heartbeat', {
            time: Date.now(),
            queueSize: activeSession.audioQueue.length - lastAudioIndex,
          })));
        } catch {
          // Controller closed
          isRunning = false;
        }
      }, 15000); // Every 15 seconds

      // Poll for new events
      const pollInterval = setInterval(async () => {
        if (!isRunning) {
          clearInterval(pollInterval);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        try {
          // Send new audio chunks
          while (lastAudioIndex < activeSession.audioQueue.length) {
            const chunk = activeSession.audioQueue[lastAudioIndex];
            const serialized = serializeAudioChunk(chunk);
            controller.enqueue(encoder.encode(createEvent('audio', serialized)));
            lastAudioIndex++;
          }

          // Send new speech events
          while (lastSpeechIndex < activeSession.speechEvents.length) {
            const event = activeSession.speechEvents[lastSpeechIndex];
            controller.enqueue(encoder.encode(createEvent('speech', event)));
            lastSpeechIndex++;
          }

          // Send question addressed events
          while (lastQuestionIndex < activeSession.questionsAddressed.length) {
            const event = activeSession.questionsAddressed[lastQuestionIndex];
            controller.enqueue(encoder.encode(createEvent('question', {
              type: 'addressed',
              question: event.question,
              firstResponder: event.firstResponder,
            })));
            lastQuestionIndex++;
          }

          // Send state updates periodically
          const state = activeSession.orchestrator.getState();
          controller.enqueue(encoder.encode(createEvent('state', {
            sessionId: activeSession.id,
            topic: activeSession.topic,
            currentSpeaker: state.currentSpeaker,
            status: activeSession.state,
            totalTurns: state.totalTurns,
            topicDepth: state.topicDepth,
          })));

          // Check if session ended
          if (activeSession.state === 'stopped') {
            controller.enqueue(encoder.encode(createEvent('state', {
              sessionId: activeSession.id,
              status: 'stopped',
              message: 'Radio session ended',
            })));
            isRunning = false;
            clearInterval(pollInterval);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            controller.close();
          }
        } catch (error) {
          // Connection likely closed
          console.error('[Radio] Stream error:', error);
          isRunning = false;
          clearInterval(pollInterval);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 100); // Poll every 100ms for low latency

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isRunning = false;
        clearInterval(pollInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
};

// POST: Control the stream (pause/resume/stop)
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, action } = body;

    if (!sessionId || !action) {
      return new Response(
        JSON.stringify({ error: 'sessionId and action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'pause':
        if (session.state === 'running') {
          session.state = 'paused';
        }
        break;

      case 'resume':
        if (session.state === 'paused') {
          session.state = 'running';
          // Re-trigger dialogue loop
          (async () => {
            try {
              await session.orchestrator.runDialogue();
              session.state = 'stopped';
            } catch (error) {
              console.error('[Radio] Resume dialogue error:', error);
              session.state = 'stopped';
            }
          })();
        }
        break;

      case 'stop':
        session.orchestrator.stop();
        session.state = 'stopped';
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: pause, resume, stop` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        action,
        status: session.state,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Radio] Stream control error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to control stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
