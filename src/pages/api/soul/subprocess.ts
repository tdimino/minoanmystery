/**
 * Soul Subprocess API Endpoint
 *
 * Runs visitor modeling subprocess after chat responses.
 * Called asynchronously by the client after receiving a chat response.
 *
 * This follows the Open Souls "fire-and-forget" pattern where subprocesses
 * run in the background without blocking the main response.
 */

import type { APIRoute } from 'astro';
import {
  WorkingMemory,
  ChatMessageRoleEnum,
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
import { modelsTheVisitor } from '../../../lib/soul/opensouls/subprocesses';
import type { HydratedUserModel, SoulActions } from '../../../lib/soul/opensouls/mentalProcesses/types';
import type { SoulMemoryInterface } from '../../../lib/soul/memory';

export const prerender = false;

// Rate limiting with periodic cleanup
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // More restrictive than chat (subprocess is expensive)
const RATE_WINDOW = 60000;
let requestCounter = 0;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup of expired entries to prevent Map growth
  if (++requestCounter % 100 === 0) {
    for (const [key, record] of requestCounts) {
      if (now > record.resetTime) requestCounts.delete(key);
    }
  }

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

// Initialize providers (lazy)
let providersInitialized = false;

function ensureProviders(): void {
  if (providersInitialized) return;

  const openrouterKey = import.meta.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const openRouterProvider = new OpenRouterProvider({
    apiKey: openrouterKey,
    defaultModel: 'google/gemini-3-flash-preview',
  });
  setLLMProvider(openRouterProvider);

  const groqKey = import.meta.env.GROQ_API_KEY;
  if (groqKey) {
    const groqProvider = new GroqProvider({
      apiKey: groqKey,
      defaultModel: 'moonshotai/kimi-k2-instruct',
    });
    registerProvider('groq', groqProvider);
  }

  const basetenKey = import.meta.env.BASETEN_API_KEY;
  if (basetenKey) {
    const basetenProvider = new BasetenProvider({
      apiKey: basetenKey,
    });
    registerProvider('baseten', basetenProvider);
  }

  providersInitialized = true;
  console.log(`[Subprocess API] Providers initialized`);
}

// Request body interface
interface SubprocessRequest {
  sessionId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userModel: {
    visitCount: number;
    pagesViewed: string[];
    currentPage: string;
    timeOnSite: number;
    scrollDepth: number;
    behavioralType: string;
    isReturning: boolean;
  };
  visitorModel?: string;
  visitorWhispers?: string;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    ensureProviders();

    const body: SubprocessRequest = await request.json();
    const { sessionId, conversationHistory, userModel, visitorModel, visitorWhispers } = body;

    // Validate required fields
    if (!sessionId || !conversationHistory || conversationHistory.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Insufficient conversation history for modeling' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Input validation to prevent abuse
    const MAX_HISTORY_LENGTH = 50;
    const MAX_MESSAGE_LENGTH = 10000;

    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Conversation history too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (conversationHistory.some(m => m.content.length > MAX_MESSAGE_LENGTH)) {
      return new Response(
        JSON.stringify({ error: 'Message content too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build WorkingMemory from conversation history
    let memory = new WorkingMemory({ soulName: 'Minoan' });

    for (const msg of conversationHistory) {
      memory = memory.withMemory({
        role: msg.role === 'user' ? ChatMessageRoleEnum.User : ChatMessageRoleEnum.Assistant,
        content: msg.content,
      });
    }

    // Build HydratedUserModel for subprocess
    const hydratedModel: HydratedUserModel = {
      sessionId,
      visitCount: userModel.visitCount || 1,
      pagesViewed: userModel.pagesViewed || [],
      currentPage: userModel.currentPage || '/',
      entryPage: userModel.currentPage || '/',
      timePerPage: {},
      scrollDepths: {},
      clickedElements: [],
      inferredInterests: [],
      behavioralType: (userModel.behavioralType || 'explorer') as 'scanner' | 'reader' | 'explorer' | 'focused',
      currentState: 'engaged',
      firstVisit: Date.now() - (userModel.timeOnSite || 0),
      lastVisit: Date.now(),
      lastInteraction: Date.now(),
      idleTime: 0,
      paletteUses: 0,
      recentCommands: [],
      readinessSignals: [],
      // Computed values (HydratedUserModel)
      timeOnSite: userModel.timeOnSite || 0,
      timeOnCurrentPage: 0,
      sessionDuration: userModel.timeOnSite || 0,
      scrollDepth: userModel.scrollDepth || 0,
      isReturning: userModel.isReturning || false,
    };

    // Create minimal actions for logging
    const actions: SoulActions = {
      speak: () => {},
      log: (msg: string, data?: unknown) => console.log(`[Subprocess] ${msg}`, data || ''),
      dispatch: () => {},
      scheduleEvent: () => {},
    };

    // Create a simple storage interface (results will be returned in response)
    let updatedVisitorModel = visitorModel || '';
    let updatedVisitorWhispers = visitorWhispers || '';

    // Override soulMemory methods to capture results
    const originalGetVisitorModel = () => visitorModel || '';
    const originalSetVisitorModel = (model: string) => { updatedVisitorModel = model; };
    const originalGetVisitorWhispers = () => visitorWhispers || '';
    const originalSetVisitorWhispers = (whispers: string) => { updatedVisitorWhispers = whispers; };
    const originalGetUserName = () => 'visitor';
    const originalAddTopic = () => {};

    // Server-side memory adapter (injected via context, no module patching)
    const serverMemory: SoulMemoryInterface = {
      getVisitorModel: originalGetVisitorModel,
      setVisitorModel: originalSetVisitorModel,
      getVisitorWhispers: originalGetVisitorWhispers,
      setVisitorWhispers: originalSetVisitorWhispers,
      getUserName: originalGetUserName,
      addTopic: originalAddTopic,
    };

    // Run the subprocess with injected memory
    console.log(`[Subprocess API] Running modelsTheVisitor for session ${sessionId.slice(0, 8)}...`);
    const startTime = Date.now();

    await modelsTheVisitor(
      {
        sessionId,
        workingMemory: memory,
        userModel: hydratedModel,
        actions,
        soulMemory: serverMemory, // DI pattern: explicit dependency
      },
      {
        generateWhispers: true,
        minInteractionsBeforeUpdate: 2,
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[Subprocess API] Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        visitorModel: updatedVisitorModel,
        visitorWhispers: updatedVisitorWhispers,
        duration,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Subprocess API] Error:', error);
    // Sanitize error response - don't expose internal details
    return new Response(
      JSON.stringify({ error: 'Subprocess failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
