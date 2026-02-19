/**
 * Session End API
 *
 * Called on beforeunload or idle timeout to generate a session summary
 * for returning visitor context. Best-effort — if it fails, no impact.
 *
 * POST body: { sessionId, conversationHistory, pagesViewed, timeOnSite, userName?, visitorModel? }
 */

import type { APIRoute } from 'astro';
import type { SoulMemoryInterface } from '../../../lib/soul/memory';
import type { SessionCosts, SessionSummary } from '../../../lib/soul/types';
import { setLLMProvider, registerProvider } from '../../../lib/soul/opensouls/core/CognitiveStep';
import { OpenRouterProvider } from '../../../lib/soul/opensouls/providers/openrouter';
import { GroqProvider } from '../../../lib/soul/opensouls/providers/groq';
import { summarizeSession } from '../../../lib/soul/opensouls/subprocesses/summarizeSession';
import { localLogger } from '../../../lib/soul/localLogger';

export const prerender = false;

// ─── Rate Limiting (shared pattern with chat.ts) ────────────────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // Lower than chat — session-end is once per session
const RATE_WINDOW = 60000;
let requestCounter = 0;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (++requestCounter % 50 === 0) {
    for (const [key, rec] of requestCounts) {
      if (now > rec.resetTime) requestCounts.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// ─── Origin Validation ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://minoanmystery.org', 'https://www.minoanmystery.org', 'http://localhost:4321', 'http://localhost:3000'];

function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o));
}

// ─── Input Validation ───────────────────────────────────────────────────
const MAX_PAYLOAD_SIZE = 50_000; // 50KB
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 5000;
const VALID_ROLES = ['user', 'assistant', 'system'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Initialize providers (lazy)
let providersInitialized = false;

function ensureProviders(): void {
  if (providersInitialized) return;

  const openrouterKey = process.env.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const openRouterProvider = new OpenRouterProvider({
    apiKey: openrouterKey,
    defaultModel: 'qwen/qwen3-30b-a3b-instruct-2507',
  });
  setLLMProvider(openRouterProvider);

  const groqKey = process.env.GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  if (groqKey) {
    const groqProvider = new GroqProvider({
      apiKey: groqKey,
      defaultModel: 'moonshotai/kimi-k2-instruct',
    });
    registerProvider('groq', groqProvider);
  }

  providersInitialized = true;
}

interface SessionEndRequest {
  sessionId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  pagesViewed: string[];
  timeOnSite: number;
  userName?: string;
  visitorModel?: string;
}

export const POST: APIRoute = async ({ request }) => {
  // Origin validation
  if (!isValidOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Payload size check
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > MAX_PAYLOAD_SIZE) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Provider configuration — separate from transient errors
  try {
    ensureProviders();
  } catch (configErr) {
    localLogger.error('SESSION:END', 'Provider configuration error', { error: String(configErr) });
    return new Response(JSON.stringify({ error: 'configuration error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SessionEndRequest = await request.json();
    let { sessionId, conversationHistory, pagesViewed, timeOnSite, userName, visitorModel } = body;

    // Validate sessionId format
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return new Response(JSON.stringify({ error: 'Invalid sessionId format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate conversationHistory
    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return new Response(JSON.stringify({ error: 'conversationHistory required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Truncate and validate messages
    conversationHistory = conversationHistory.slice(0, MAX_MESSAGES);
    for (const msg of conversationHistory) {
      if (typeof msg.content !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid message content' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (!VALID_ROLES.includes(msg.role)) {
        msg.role = 'user'; // Coerce invalid roles
      }
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        msg.content = msg.content.slice(0, MAX_MESSAGE_LENGTH);
      }
    }

    // Cap string field lengths
    if (userName && userName.length > 100) userName = userName.slice(0, 100);
    if (visitorModel && visitorModel.length > 2000) visitorModel = visitorModel.slice(0, 2000);

    // Server-side memory adapter — captures the summary
    let capturedSummary: SessionSummary | null = null;

    const serverMemory: SoulMemoryInterface = {
      getVisitorModel: () => visitorModel,
      setVisitorModel: () => {},
      getVisitorWhispers: () => undefined,
      setVisitorWhispers: () => {},
      getUserName: () => userName,
      getUserTitle: () => undefined,
      addTopic: () => {},
      getUserTurnCount: () => conversationHistory.filter(m => m.role === 'user').length,
      incrementUserTurnCount: () => 0,
      getTarotCount: () => 0,
      setTarotCount: () => {},
      getLastTarotTurn: () => 0,
      setLastTarotTurn: () => {},
      getSessionCosts: () => ({ prompt: 0, completion: 0, calls: 0, byModel: {} }),
      addTokenUsage: () => {},
      getSessionHistory: () => [],
      addSessionSummary: (summary: SessionSummary) => { capturedSummary = summary; },
    };

    const summary = await summarizeSession({
      sessionId,
      soulMemory: serverMemory,
      conversationHistory,
      pagesViewed: (pagesViewed || []).slice(0, 50),
      timeOnSite: typeof timeOnSite === 'number' ? timeOnSite : 0,
      userName,
    });

    localLogger.sessionDeregister(sessionId, {
      duration: timeOnSite,
      totalTokens: 0,
      messages: conversationHistory.filter(m => m.role === 'user').length,
    });

    return new Response(JSON.stringify({
      summary: capturedSummary || summary,
      sessionId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    localLogger.error('SESSION:END', 'Summary generation failed', { error: String(err) });
    // Best-effort — return 200 on transient failure to not block page unload
    return new Response(JSON.stringify({ error: 'summary generation failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
