/**
 * Soul Query API — Programmatic access to Kothar wa Khasis
 *
 * A simplified, stateless REST endpoint for CLI tools and AI agents.
 * Wraps the core soul chat logic with:
 * - API key auth (no origin restriction)
 * - Non-streaming JSON response
 * - No Tarot/Vision/register selection
 * - Rate limit headers
 *
 * Usage:
 *   curl -X POST https://minoanmystery.org/api/soul/query \
 *     -H "Content-Type: application/json" \
 *     -H "X-API-Key: <key>" \
 *     -d '{"query": "What are the Minoan-Semitic connections?"}'
 *
 * Or without API key (falls back to origin validation):
 *   curl -X POST https://minoanmystery.org/api/soul/query \
 *     -H "Content-Type: application/json" \
 *     -H "Origin: https://minoanmystery.org" \
 *     -d '{"query": "Tell me about Kaphtor."}'
 */

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  WorkingMemory,
  ChatMessageRoleEnum,
  externalDialog,
  indentNicely,
  setLLMProvider,
  registerProvider,
  PERSONA_MODEL,
} from '../../../lib/soul/opensouls';
import {
  OpenRouterProvider,
  GroqProvider,
} from '../../../lib/soul/opensouls/providers';
import {
  kotharRag,
  isRagAvailable,
  detectContextType,
} from '../../../lib/soul/retrieval/kotharRagConfig';
import { detectAcademicIntent } from '../../../lib/soul/opensouls/mentalProcesses';

export const prerender = false;

// ── Rate Limiting ────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // per minute (tighter than chat — CLI callers should be deliberate)
const RATE_WINDOW = 60000;
const MAX_QUERY_LENGTH = 2000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    // Purge stale entries to prevent memory growth
    for (const [key, rec] of requestCounts) {
      if (now > rec.resetTime) requestCounts.delete(key);
    }
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetMs: RATE_WINDOW };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetMs: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetMs: record.resetTime - now };
}

// ── Auth ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://minoanmystery.org',
  'https://www.minoanmystery.org',
  'http://localhost:4321',
  'http://localhost:3000',
];

function isAuthorized(request: Request): boolean {
  // API key auth (for CLI/programmatic access)
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.SOUL_QUERY_API_KEY || import.meta.env.SOUL_QUERY_API_KEY;
  if (apiKey && validKey && apiKey === validKey) return true;

  // Fall back to origin validation (for browser-based access)
  // Parse as URL and compare exact origin to prevent attacker.tld bypass
  const rawOrigin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const originToCheck = rawOrigin || (referer ? new URL(referer).origin : '');
  return ALLOWED_ORIGINS.includes(originToCheck);
}

// ── Soul Setup ───────────────────────────────────────────────
const SOULS_DIR = join(process.cwd(), 'souls', 'minoan');

function loadSoulPersonality(): string {
  try {
    return readFileSync(join(SOULS_DIR, 'soul.md'), 'utf-8');
  } catch {
    return `# Kothar wa Khasis\nYou are Kothar, divine craftsman from Kaphtor, oracle of Tom di Mino's digital labyrinth.`;
  }
}

function loadSoulConfig(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(join(SOULS_DIR, 'config.json'), 'utf-8'));
  } catch {
    return { model: 'qwen/qwen3.5-35b-a3b', temperature: 0.7 };
  }
}

let providersInitialized = false;

function ensureProviders(): void {
  if (providersInitialized) return;

  const openrouterKey = process.env.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  if (!openrouterKey) throw new Error('OPENROUTER_API_KEY required');

  setLLMProvider(new OpenRouterProvider({
    apiKey: openrouterKey,
    defaultModel: 'qwen/qwen3.5-35b-a3b',
    siteUrl: 'https://minoanmystery.org',
    siteName: 'Minoan Mystery',
  }));

  const groqKey = process.env.GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  if (groqKey) {
    registerProvider('groq', new GroqProvider({
      apiKey: groqKey,
      defaultModel: 'moonshotai/kimi-k2-instruct',
    }));
  }

  providersInitialized = true;
}

// ── Request/Response Types ───────────────────────────────────
interface QueryRequest {
  query: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: {
    role?: string;
    interests?: string[];
  };
}

interface QueryResponse {
  response: string;
  mode: 'standard' | 'academic';
  ragActive: boolean;
  model: string;
}

// ── Endpoint ─────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const correlationId = `query_${crypto.randomUUID().slice(0, 8)}`;
  const startTime = Date.now();
  const ip = clientAddress || 'unknown';

  // Rate limit with headers
  const rateResult = checkRateLimit(ip);
  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(rateResult.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateResult.resetMs / 1000)),
  };

  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
    );
  }

  // Auth
  if (!isAuthorized(request)) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized. Provide X-API-Key header or call from an allowed origin.',
        hint: 'Set SOUL_QUERY_API_KEY env var on the server and pass it as X-API-Key header.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
    );
  }

  try {
    ensureProviders();

    const body: QueryRequest = await request.json();
    const { query, conversationHistory, context } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'query is required (string)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
      );
    }

    // Truncate conversation history to prevent token/cost amplification
    // Matches client-side ConversationMemory (MAX_MESSAGES = 100, trimHistory keeps last N)
    let safeHistory = conversationHistory || [];
    if (safeHistory.length > 100) {
      safeHistory = safeHistory.slice(-100);
    }
    // Truncate individual messages to prevent oversized payloads
    safeHistory = safeHistory.map(m => ({
      ...m,
      content: m.content ? m.content.slice(0, 4000) : '',
    }));

    if (query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `query exceeds ${MAX_QUERY_LENGTH} characters` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
      );
    }

    console.log(JSON.stringify({
      event: 'query_start',
      correlationId,
      endpoint: '/api/soul/query',
      queryLength: query.length,
      historyLength: conversationHistory?.length || 0,
      timestamp: new Date().toISOString(),
    }));

    // Load soul
    const personality = loadSoulPersonality();
    const config = loadSoulConfig();

    // Build working memory
    let memory = new WorkingMemory({
      soulName: 'Kothar',
      memories: [
        { role: ChatMessageRoleEnum.System, content: personality },
      ],
    });

    // Inject conversation history
    if (safeHistory.length) {
      for (const msg of safeHistory) {
        memory = memory.withMemory({
          role: msg.role === 'user' ? ChatMessageRoleEnum.User : ChatMessageRoleEnum.Assistant,
          content: msg.content,
        });
      }
    }

    // Add user query
    memory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: query,
    });

    // Detect academic intent
    const isAcademic = detectAcademicIntent(query);

    // RAG retrieval
    let ragActive = false;
    if (isRagAvailable()) {
      try {
        const contextType = detectContextType(query);
        const ragResult = await kotharRag(memory, query, contextType);
        if (ragResult) {
          memory = ragResult;
          ragActive = true;
        }
      } catch (ragError) {
        console.warn(`[Query ${correlationId}] RAG failed:`, ragError);
      }
    }

    // Build instructions
    const contextHint = context?.role
      ? `The querier identifies as: ${context.role}. Interests: ${context.interests?.join(', ') || 'unspecified'}.`
      : 'This is a programmatic query from a CLI tool or AI agent.';

    const instructions = indentNicely`
      ${contextHint}
      Respond as Kothar wa Khasis—the craftsman from Kaphtor, oracle of this digital labyrinth.
      Be substantive, specific, and direct. No platitudes.
      ${isAcademic ? 'This query has academic intent. Cite specific texts, tablets, and scholars where relevant.' : ''}
    `;

    // Generate response (non-streaming)
    const [, response] = await externalDialog(
      memory,
      instructions,
      {
        stream: false,
        model: PERSONA_MODEL,
        temperature: config.temperature as number,
      }
    );

    const latencyMs = Date.now() - startTime;

    console.log(JSON.stringify({
      event: 'query_complete',
      correlationId,
      endpoint: '/api/soul/query',
      latencyMs,
      responseLength: response?.length || 0,
      ragActive,
      academic: isAcademic,
      timestamp: new Date().toISOString(),
    }));

    const result: QueryResponse = {
      response,
      mode: isAcademic ? 'academic' : 'standard',
      ragActive,
      model: PERSONA_MODEL,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders,
        'X-Correlation-Id': correlationId,
        'X-Latency-Ms': String(latencyMs),
      },
    });
  } catch (error) {
    console.error(`[Query ${correlationId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to process query' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders } }
    );
  }
};
