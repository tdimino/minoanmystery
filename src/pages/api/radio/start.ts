/**
 * Radio Session Start API Endpoint
 *
 * Initializes a new Daimonic Radio session with DialogueOrchestrator.
 * Returns session ID for subsequent stream/status calls.
 */

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DialogueOrchestrator,
  QuestionManager,
  RemoteTTSClient,
  AudioBuffer,
  createSegmentStore,
  createPlaylistManager,
  createHLSSegmenter,
} from '../../../lib/radio';
import {
  setLLMProvider,
  registerProvider,
} from '../../../lib/soul/opensouls';
import { createOpenRouterProvider } from '../../../lib/soul/opensouls/providers/openrouter';
import { GroqProvider } from '../../../lib/soul/opensouls/providers/groq';
import type {
  AudioChunk,
  ListenerQuestion,
  RadioSoulName,
} from '../../../lib/radio/types';
import type {
  SegmentStore,
  PlaylistManager,
  HLSSegmenter,
} from '../../../lib/radio/streaming';

// Mark as server-rendered
export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Session Management (In-memory for development)
// Production: Use Vercel KV / Redis
// ─────────────────────────────────────────────────────────────

export interface RadioSession {
  id: string;
  orchestrator: DialogueOrchestrator;
  questionManager: QuestionManager;
  state: 'initialized' | 'running' | 'paused' | 'stopped';
  createdAt: number;
  topic: string;
  // Audio chunks waiting to be consumed by /stream (SSE mode)
  audioQueue: AudioChunk[];
  // Speech events for UI
  speechEvents: Array<{ soul: RadioSoulName; text: string; timestamp: number }>;
  // Questions addressed (for callbacks)
  questionsAddressed: Array<{ question: ListenerQuestion; firstResponder: RadioSoulName }>;
  // HLS streaming components
  segmentStore?: SegmentStore;
  playlistManager?: PlaylistManager;
  hlsSegmenter?: HLSSegmenter;
  hlsEnabled: boolean;
}

// Global session store (single session for now)
// In production, this would be per-user or per-broadcast with Redis
const sessions = new Map<string, RadioSession>();
let activeSessionId: string | null = null;

export function getActiveSession(): RadioSession | null {
  if (!activeSessionId) return null;
  return sessions.get(activeSessionId) ?? null;
}

export function getSession(sessionId: string): RadioSession | null {
  return sessions.get(sessionId) ?? null;
}

// Clean up old sessions (keep last 5)
async function cleanupSessions(): Promise<void> {
  if (sessions.size <= 5) return;

  const sorted = Array.from(sessions.entries())
    .sort((a, b) => b[1].createdAt - a[1].createdAt);

  // Keep the 5 most recent
  const toRemove = sorted.slice(5);
  for (const [id, session] of toRemove) {
    session.orchestrator.stop();

    // Flush any remaining HLS audio
    if (session.hlsSegmenter) {
      try {
        await session.hlsSegmenter.flush();
      } catch {
        // Ignore flush errors during cleanup
      }
    }

    // End the HLS playlist
    if (session.playlistManager) {
      session.playlistManager.end();
    }

    sessions.delete(id);
  }
}

// ─────────────────────────────────────────────────────────────
// Load Soul Personalities
// ─────────────────────────────────────────────────────────────

function loadPersonality(soulPath: string): string {
  try {
    // Try project root first (for local dev)
    const projectRoot = process.cwd();
    const fullPath = join(projectRoot, soulPath);
    return readFileSync(fullPath, 'utf-8');
  } catch {
    // Fallback to relative path
    try {
      return readFileSync(soulPath, 'utf-8');
    } catch {
      console.warn(`[Radio] Could not load personality: ${soulPath}`);
      return '';
    }
  }
}

// ─────────────────────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { topic, questionsEnabled = true, hlsEnabled = true } = body;

    // Validate topic
    if (!topic || typeof topic !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 5 || trimmedTopic.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Topic must be between 5 and 500 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check TTS server configuration
    // Use import.meta.env (Vite/Astro) with fallback to process.env (Node)
    const ttsServerUrl = import.meta.env.TTS_SERVER_URL || process.env.TTS_SERVER_URL;
    const ttsBearerToken = import.meta.env.TTS_BEARER_TOKEN || process.env.TTS_BEARER_TOKEN;

    if (!ttsServerUrl) {
      return new Response(
        JSON.stringify({
          error: 'TTS server not configured',
          hint: 'Set TTS_SERVER_URL environment variable',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stop any existing active session
    if (activeSessionId) {
      const existingSession = sessions.get(activeSessionId);
      if (existingSession) {
        existingSession.orchestrator.stop();
        existingSession.state = 'stopped';
      }
    }

    // Create session ID
    const sessionId = `radio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Load personalities
    const kotharPersonality = loadPersonality('souls/minoan/soul.md');
    const artifexPersonality = loadPersonality('souls/minoan/poetic/soul.md');

    if (!kotharPersonality || !artifexPersonality) {
      return new Response(
        JSON.stringify({
          error: 'Could not load soul personalities',
          hint: 'Ensure souls/minoan/soul.md and souls/minoan/poetic/soul.md exist',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize TTS client
    const ttsClient = new RemoteTTSClient({
      serverUrl: ttsServerUrl,
      bearerToken: ttsBearerToken || '',
      timeout: 30000,
    });

    // Check TTS health
    const health = await ttsClient.healthCheck();
    if (!health.healthy) {
      return new Response(
        JSON.stringify({
          error: 'TTS server not available',
          health,
          hint: 'Start the TTS server with: qwen-tts serve',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize question manager
    const questionManager = questionsEnabled ? new QuestionManager({
      minTimeBetweenQuestions: 120000, // 2 minutes
    }) : undefined;

    // Initialize HLS streaming components
    let segmentStore: SegmentStore | undefined;
    let playlistManager: PlaylistManager | undefined;
    let hlsSegmenter: HLSSegmenter | undefined;

    if (hlsEnabled) {
      // Check if TTS server supports AAC (via health check response)
      // For now, default to 'wav' for dev and 'aac' when TTS server has ffmpeg
      const audioFormat = health.supportedFormats?.includes('aac') ? 'aac' : 'wav';

      // Create segment store (in-memory for dev, Vercel Blob for prod)
      // Pass sessionId so store can construct proper API endpoint URLs
      segmentStore = createSegmentStore({
        prefix: 'radio',
        maxSegments: 30, // ~2.5 minutes of segments
        retentionMs: 5 * 60 * 1000, // 5 minutes
        sessionId, // Required for URL construction
        audioFormat, // Use AAC if available
      });

      // Create playlist manager
      // URLs are constructed by SegmentStore, so no baseUrl needed
      playlistManager = createPlaylistManager({
        sessionId,
        type: 'EVENT', // Keep all segments (for now)
        targetDuration: 5,
        includeProgramDateTime: true,
      });
    }

    // Create session object (will hold queues)
    const session: RadioSession = {
      id: sessionId,
      orchestrator: null as unknown as DialogueOrchestrator, // Set below
      questionManager: questionManager || new QuestionManager(),
      state: 'initialized',
      createdAt: Date.now(),
      topic: trimmedTopic,
      audioQueue: [],
      speechEvents: [],
      questionsAddressed: [],
      segmentStore,
      playlistManager,
      hlsSegmenter,
      hlsEnabled,
    };

    // Create HLS segmenter after session is created (needs references)
    // Determine audio format based on TTS server capabilities
    const audioFormat = health.supportedFormats?.includes('aac') ? 'aac' : 'pcm';

    if (hlsEnabled && segmentStore && playlistManager) {
      hlsSegmenter = createHLSSegmenter({
        sessionId,
        store: segmentStore,
        playlistManager,
        segmentDurationSeconds: 5,
        sampleRate: 12000, // Qwen TTS sample rate
        audioFormat, // 'aac' for pass-through, 'pcm' for WAV encoding
        onSegmentReady: (segment) => {
          console.log(`[Radio] HLS segment ready: ${segment.id} (${segment.durationSeconds.toFixed(2)}s, format=${audioFormat})`);
        },
        onError: (error, context) => {
          console.error(`[Radio] HLS error in ${context}:`, error.message);
        },
      });
      session.hlsSegmenter = hlsSegmenter;
    }

    // Initialize LLM provider
    // Use OpenRouter as default, with Groq for fast inference
    const openRouterKey = import.meta.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return new Response(
        JSON.stringify({
          error: 'OpenRouter API key not configured',
          hint: 'Set OPENROUTER_API_KEY environment variable',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openRouterProvider = createOpenRouterProvider({
      apiKey: openRouterKey,
      defaultModel: 'google/gemini-3-flash-preview',
    });
    setLLMProvider(openRouterProvider);

    const groqKey = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (groqKey) {
      const groqProvider = new GroqProvider({
        apiKey: groqKey,
      });
      registerProvider('groq', groqProvider);
    }

    // Initialize orchestrator with callbacks
    const orchestrator = new DialogueOrchestrator({
      ttsClient,
      kotharPersonality,
      artifexPersonality,
      kotharSelectorDescription: 'Kothar wa Khasis, the craftsman-sage. Responds to questions about craft, creation, architecture, and practical wisdom.',
      artifexSelectorDescription: 'Artifex, the futuristic sentinel. Responds to questions with sardonic precision, existential insight, and wry observations.',
      questionManager: questionsEnabled ? questionManager : undefined,
      questionCheckInterval: 3, // Check for questions every 3 turns
      interruptionThreshold: 0.7,
      interruptionCheckInterval: 2,
      maxTopicDepth: 20, // Allow longer conversations

      // Callbacks to populate session queues
      onAudioReady: async (chunk: AudioChunk) => {
        // Add to SSE queue
        session.audioQueue.push(chunk);

        // Also feed into HLS segmenter if enabled
        if (session.hlsSegmenter && chunk.audioBuffer) {
          try {
            const audioBuffer = AudioBuffer.create({
              samples: chunk.audioBuffer,
              sampleRate: 12000,
              id: chunk.id,
            });
            await session.hlsSegmenter.addAudio(audioBuffer);
          } catch (error) {
            console.error('[Radio] Failed to add audio to HLS segmenter:', error);
          }
        }
      },

      onSpeech: (soul: RadioSoulName, text: string) => {
        session.speechEvents.push({
          soul,
          text,
          timestamp: Date.now(),
        });
      },

      onTopicChange: (newTopic: string) => {
        session.topic = newTopic;
      },

      onQuestionAddressed: (question: ListenerQuestion, firstResponder: RadioSoulName) => {
        session.questionsAddressed.push({ question, firstResponder });
      },

      onTTSError: (soul: RadioSoulName, error: Error, text: string) => {
        console.error(`[Radio] TTS error for ${soul}: ${error.message}`, { text: text.substring(0, 50) });
      },
    });

    session.orchestrator = orchestrator;

    // Store session
    sessions.set(sessionId, session);
    activeSessionId = sessionId;

    // Cleanup old sessions
    cleanupSessions();

    // Start the dialogue (generates first turn but doesn't run loop yet)
    await orchestrator.startDialogue(trimmedTopic);

    // Return session info
    const state = orchestrator.getState();
    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        topic: trimmedTopic,
        currentSpeaker: state.currentSpeaker,
        status: 'initialized',
        ttsHealth: health,
        questionsEnabled,
        hlsEnabled,
        // HLS URLs for clients that support it
        hlsPlaylistUrl: hlsEnabled ? `/api/radio/hls/playlist?sessionId=${sessionId}` : null,
        // SSE URL for fallback/metadata
        sseStreamUrl: `/api/radio/stream?sessionId=${sessionId}`,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Radio] Session start error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to start radio session',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET: Check if there's an active session
export const GET: APIRoute = async () => {
  const session = getActiveSession();

  if (!session) {
    return new Response(
      JSON.stringify({
        active: false,
        message: 'No active radio session',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const state = session.orchestrator.getState();
  const hlsStats = session.hlsSegmenter?.getStats();

  return new Response(
    JSON.stringify({
      active: true,
      sessionId: session.id,
      topic: session.topic,
      currentSpeaker: state.currentSpeaker,
      status: session.state,
      totalTurns: state.totalTurns,
      audioQueueLength: session.audioQueue.length,
      questionsEnabled: !!session.questionManager,
      hlsEnabled: session.hlsEnabled,
      hlsPlaylistUrl: session.hlsEnabled ? `/api/radio/hls/playlist?sessionId=${session.id}` : null,
      hlsStats: hlsStats ? {
        totalSegments: hlsStats.totalSegments,
        totalDurationSeconds: hlsStats.totalDurationSeconds,
        avgEncodingTimeMs: hlsStats.avgEncodingTimeMs,
      } : null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
