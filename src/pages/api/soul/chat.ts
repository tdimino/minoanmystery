/**
 * Soul Chat API Endpoint
 *
 * Handles conversational requests to the Minoan soul using
 * the Open Souls paradigm with cognitive steps.
 */

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import Open Souls infrastructure
import {
  WorkingMemory,
  ChatMessageRoleEnum,
  externalDialog,
  indentNicely,
  setLLMProvider,
  registerProvider,
  PERSONA_MODEL,
  THINKING_MODEL,
} from '../../../lib/soul/opensouls';
import {
  OpenRouterProvider,
  GroqProvider,
  BasetenProvider,
} from '../../../lib/soul/opensouls/providers';

// Mark as server-rendered (required for POST endpoints)
export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute (more generous than TTS)
const RATE_WINDOW = 60000; // 1 minute in ms
const MAX_QUERY_LENGTH = 2000; // characters

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

// Load soul configuration and personality
const SOULS_DIR = join(process.cwd(), 'souls', 'minoan');

function loadSoulPersonality(): string {
  try {
    return readFileSync(join(SOULS_DIR, 'minoan.md'), 'utf-8');
  } catch (error) {
    console.error('Failed to load soul personality:', error);
    return `# Minoan\nYou are Minoan, a helpful guide for Tom di Mino's portfolio.`;
  }
}

function loadSoulConfig(): Record<string, unknown> {
  try {
    const configStr = readFileSync(join(SOULS_DIR, 'config.json'), 'utf-8');
    return JSON.parse(configStr);
  } catch (error) {
    console.error('Failed to load soul config:', error);
    return {
      model: 'google/gemini-3-flash-preview',
      temperature: 0.7,
      maxTokens: 150,
    };
  }
}

// Initialize providers (lazy, on first request)
let providersInitialized = false;

function ensureProviders(): void {
  if (providersInitialized) return;

  // OpenRouter - default provider for persona/external dialog
  // Use process.env for Vercel runtime, import.meta.env for local dev
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

  // Groq - ultra-low latency for thinking/internal steps (Kimi K2, Qwen3)
  const groqKey = process.env.GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  if (groqKey) {
    const groqProvider = new GroqProvider({
      apiKey: groqKey,
      defaultModel: 'moonshotai/kimi-k2-instruct',
    });
    registerProvider('groq', groqProvider);
    console.log('[Soul Chat] Groq provider registered (Kimi K2, Qwen3 available)');
  }

  // Baseten - fallback provider
  const basetenKey = process.env.BASETEN_API_KEY || import.meta.env.BASETEN_API_KEY;
  if (basetenKey) {
    const basetenProvider = new BasetenProvider({
      apiKey: basetenKey,
      defaultModel: 'moonshotai/kimi-k2',
    });
    registerProvider('baseten', basetenProvider);
    console.log('[Soul Chat] Baseten provider registered');
  }

  providersInitialized = true;
  console.log(`[Soul Chat] Providers initialized. Persona: ${PERSONA_MODEL}, Thinking: ${THINKING_MODEL}`);
}

// Request body interface
interface ChatRequest {
  query: string;
  visitorContext?: {
    currentPage?: string;
    pagesViewed?: string[];
    timeOnSite?: number;
    scrollDepth?: number;
    visitCount?: number;
    behavioralType?: string;
    inferredInterests?: string[];
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limiting
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    ensureProviders();

    const body: ChatRequest = await request.json();
    const { query, visitorContext, conversationHistory, stream } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query length validation
    if (query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Query exceeds ${MAX_QUERY_LENGTH} characters` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load soul personality and config
    const personality = loadSoulPersonality();
    const config = loadSoulConfig();

    // Build WorkingMemory with personality
    let memory = new WorkingMemory({ soulName: 'Minoan' })
      .withRegion('personality', {
        role: ChatMessageRoleEnum.System,
        content: personality,
      });

    // Add visitor context if provided
    if (visitorContext) {
      const contextSummary = buildVisitorContext(visitorContext);
      memory = memory.withRegion('visitor-context', {
        role: ChatMessageRoleEnum.System,
        content: contextSummary,
      });
    }

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        memory = memory.withMemory({
          role: msg.role === 'user' ? ChatMessageRoleEnum.User : ChatMessageRoleEnum.Assistant,
          content: msg.content,
        });
      }
    }

    // Add the current query
    memory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: query,
    });

    // Build instructions for the cognitive step
    const instructions = buildInstructions(visitorContext);

    if (stream) {
      // Streaming response - use PERSONA_MODEL for external dialog
      const [newMemory, responseStream, resultPromise] = await externalDialog(
        memory,
        instructions,
        {
          stream: true,
          model: PERSONA_MODEL,
          temperature: config.temperature as number,
        }
      );

      // Create a ReadableStream for the response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
            }
            const finalResult = await resultPromise;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse: finalResult })}\n\n`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response - use PERSONA_MODEL for external dialog
      const [newMemory, response] = await externalDialog(
        memory,
        instructions,
        {
          stream: false,
          model: PERSONA_MODEL,
          temperature: config.temperature as number,
        }
      );

      return new Response(
        JSON.stringify({
          message: response,
          soulState: 'engaged',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Soul chat error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Build visitor context summary for the soul
 */
function buildVisitorContext(ctx: ChatRequest['visitorContext']): string {
  if (!ctx) return '';

  const parts: string[] = ['## Current Visitor Context'];

  if (ctx.currentPage) {
    parts.push(`- Currently viewing: ${ctx.currentPage}`);
  }

  if (ctx.pagesViewed && ctx.pagesViewed.length > 0) {
    parts.push(`- Pages visited this session: ${ctx.pagesViewed.join(', ')}`);
  }

  if (ctx.visitCount !== undefined) {
    parts.push(`- Visit count: ${ctx.visitCount} (${ctx.visitCount > 1 ? 'returning visitor' : 'first visit'})`);
  }

  if (ctx.timeOnSite !== undefined) {
    const minutes = Math.floor(ctx.timeOnSite / 60000);
    parts.push(`- Time on site: ${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  if (ctx.scrollDepth !== undefined) {
    parts.push(`- Scroll depth on current page: ${Math.round(ctx.scrollDepth * 100)}%`);
  }

  if (ctx.behavioralType) {
    parts.push(`- Behavioral pattern: ${ctx.behavioralType}`);
  }

  if (ctx.inferredInterests && ctx.inferredInterests.length > 0) {
    parts.push(`- Inferred interests: ${ctx.inferredInterests.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Build instructions for the externalDialog cognitive step
 */
function buildInstructions(ctx?: ChatRequest['visitorContext']): string {
  const baseInstructions = indentNicely`
    Respond to the visitor's message as Minoan.

    Guidelines:
    - Keep responses brief: 1-3 sentences maximum
    - Be warm but mysterious, like an old friend with secrets
    - Reference the visitor's journey through the labyrinth when relevant
    - If they ask about Tom's work, guide them to relevant case studies
    - Never be salesy or pushy
    - No emojis unless they use them first
  `;

  if (ctx?.behavioralType) {
    const behaviorNote = ctx.behavioralType === 'scanner'
      ? '\n- This visitor is a scanner - be concise and offer quick navigation.'
      : ctx.behavioralType === 'reader'
        ? '\n- This visitor is a deep reader - you may be more contemplative.'
        : '';
    return baseInstructions + behaviorNote;
  }

  return baseInstructions;
}

// Also support GET for health check
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      soul: 'Minoan',
      endpoint: '/api/soul/chat',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
