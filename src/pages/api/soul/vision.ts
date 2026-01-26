/**
 * Soul Vision API Endpoint
 *
 * Direct endpoint for generating visions on demand.
 * Alternative to the automatic vision generation in chat.
 * Useful for explicit "show me" requests.
 */

import type { APIRoute } from 'astro';
import {
  WorkingMemory,
  ChatMessageRoleEnum,
} from '../../../lib/soul/opensouls';
import { visionPrompt } from '../../../lib/soul/opensouls/cognitiveSteps/visionPrompt';
import {
  createGeminiImageProvider,
  type GeminiImageResult,
} from '../../../lib/soul/opensouls/providers/gemini-image';
import {
  OpenRouterProvider,
} from '../../../lib/soul/opensouls/providers';
import { setLLMProvider } from '../../../lib/soul/opensouls/core/CognitiveStep';

// Mark as server-rendered
export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Rate Limiting (stricter than chat)
// ─────────────────────────────────────────────────────────────

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // visions per minute
const RATE_WINDOW = 60000; // 1 minute in ms
let requestCounter = 0; // For periodic cleanup

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  // Periodic cleanup of expired entries to prevent Map growth
  // Use 20 (not 100) due to lower rate limit (5 req/min)
  if (++requestCounter % 20 === 0) {
    try {
      for (const [key, rec] of requestCounts) {
        if (now > rec.resetTime) requestCounts.delete(key);
      }
    } catch (cleanupError) {
      console.error('[RateLimit] Cleanup failed:', cleanupError);
    }
  }

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

// Initialize provider (lazy)
let providerInitialized = false;

function ensureProvider(): void {
  if (providerInitialized) return;

  const openrouterKey = process.env.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const openRouterProvider = new OpenRouterProvider({
    apiKey: openrouterKey,
    defaultModel: 'google/gemini-3-flash-preview',
    siteUrl: 'https://minoanmystery.org',
    siteName: 'Minoan Mystery',
  });
  setLLMProvider(openRouterProvider);

  providerInitialized = true;
}

interface VisionRequest {
  /** What the visitor wants to see */
  request: string;
  /** Optional conversation context */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Optional style preference */
  style?: 'ethereal' | 'mythological' | 'labyrinthine' | 'divine' | 'ancient';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const correlationId = `vision_${crypto.randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  // Rate limiting
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    console.log(JSON.stringify({
      event: 'error',
      correlationId,
      endpoint: '/api/soul/vision',
      error: 'rate_limit_exceeded',
      ip: ip.slice(0, 10) + '...',
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({ error: 'Vision rate limit exceeded. Try again in a moment.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check Gemini API key
    const geminiKey = process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'Vision generation not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    ensureProvider();

    const body: VisionRequest = await request.json();
    const { request: visitorRequest, conversationHistory, style } = body;

    if (!visitorRequest || typeof visitorRequest !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Vision request is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(JSON.stringify({
      event: 'request_start',
      correlationId,
      endpoint: '/api/soul/vision',
      requestLength: visitorRequest.length,
      style,
      timestamp: new Date().toISOString(),
    }));

    // Build WorkingMemory with conversation context
    let memory = new WorkingMemory({ soulName: 'Kothar' });

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-6)) { // Last 6 messages
        memory = memory.withMemory({
          role: msg.role === 'user' ? ChatMessageRoleEnum.User : ChatMessageRoleEnum.Assistant,
          content: msg.content,
        });
      }
    }

    // Add the vision request
    memory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: visitorRequest,
    });

    // Generate vision prompt using LLM
    const [, prompt] = await visionPrompt(memory, {
      explicitRequest: visitorRequest,
      style: style || 'mythological',
    });

    // Generate image with Gemini
    const geminiProvider = createGeminiImageProvider(geminiKey);
    if (!geminiProvider) {
      throw new Error('Failed to initialize Gemini provider');
    }

    const result = await geminiProvider.generate({
      prompt,
      style: style || 'mythological',
    });

    if (!result.success || !result.imageDataUrl) {
      console.log(JSON.stringify({
        event: 'error',
        correlationId,
        endpoint: '/api/soul/vision',
        error: result.error || 'Image generation failed',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }));

      return new Response(
        JSON.stringify({
          error: 'Vision could not be manifested',
          details: result.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(JSON.stringify({
      event: 'response_complete',
      correlationId,
      endpoint: '/api/soul/vision',
      latencyMs: Date.now() - startTime,
      promptLength: prompt.length,
      imageSize: result.imageDataUrl.length,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        dataUrl: result.imageDataUrl,
        prompt,
        displayMode: 'background',
        duration: 30000,
        metadata: result.metadata,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Vision API] Error:', error);
    console.log(JSON.stringify({
      event: 'error',
      correlationId,
      endpoint: '/api/soul/vision',
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({
        error: 'Failed to generate vision',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Health check
export const GET: APIRoute = async () => {
  const geminiKey = process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

  return new Response(
    JSON.stringify({
      status: geminiKey ? 'ok' : 'unconfigured',
      soul: 'Kothar',
      endpoint: '/api/soul/vision',
      configured: !!geminiKey,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
