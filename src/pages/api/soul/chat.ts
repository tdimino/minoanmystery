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
  embodiesTheVision,
  type VisionResult,
  type VisionProcessContext,
} from '../../../lib/soul/opensouls/subprocesses';
// Server-only import: embodiesTheTarot uses Node.js fs/path for reference images
import {
  embodiesTheTarot,
  type TarotResult,
  type TarotCardResult,
  type TarotProcessContext,
} from '../../../lib/soul/opensouls/subprocesses/embodiesTheTarot';
import {
  OpenRouterProvider,
  GroqProvider,
  BasetenProvider,
  createGeminiVisionProvider,
} from '../../../lib/soul/opensouls/providers';
import { imageCaption, type ImageCaptionResult } from '../../../lib/soul/opensouls/cognitiveSteps';
import {
  poeticComposition,
  detectExplicitDomainDeviation,
  type PoeticRegister,
} from '../../../lib/soul/opensouls/cognitiveSteps/poeticComposition';
import {
  kotharRag,
  isRagAvailable,
  detectContextType,
} from '../../../lib/soul/retrieval/kotharRagConfig';
import type { SoulMemoryInterface } from '../../../lib/soul/memory';
import { detectAcademicIntent, detectPoeticIntent } from '../../../lib/soul/opensouls/mentalProcesses';
import { localLogger } from '../../../lib/soul/localLogger';

/**
 * Server-side SoulMemory adapter for subprocess state tracking.
 * Uses in-request state since serverless functions are stateless.
 *
 * For tarot: Turn-based gating (every 10 turns) works correctly because
 * turn count is derived from conversationHistory. Session limit is best-effort.
 */
function createServerSideMemoryAdapter(initialTurnCount: number = 0): SoulMemoryInterface {
  // In-request state (won't persist across requests in serverless)
  let userTurnCount = initialTurnCount;
  let tarotCount = 0;
  let lastTarotTurn = 0;
  let visitorModel: string | undefined;
  let visitorWhispers: string | undefined;

  return {
    getVisitorModel: () => visitorModel,
    setVisitorModel: (model: string) => { visitorModel = model; },
    getVisitorWhispers: () => visitorWhispers,
    setVisitorWhispers: (whispers: string) => { visitorWhispers = whispers; },
    getUserName: () => undefined,
    getUserTitle: () => undefined,
    addTopic: () => {},
    // Turn counting - source of truth for subprocess turn checks
    getUserTurnCount: () => userTurnCount,
    incrementUserTurnCount: () => ++userTurnCount,
    getTarotCount: () => tarotCount,
    setTarotCount: (count: number) => { tarotCount = count; },
    getLastTarotTurn: () => lastTarotTurn,
    setLastTarotTurn: (turn: number) => { lastTarotTurn = turn; },
  };
}

// Mark as server-rendered (required for POST endpoints)
export const prerender = false;

// ─────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute (more generous than TTS)
const RATE_WINDOW = 60000; // 1 minute in ms
const MAX_QUERY_LENGTH = 2000; // characters
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// ─────────────────────────────────────────────────────────────
// Raggy Thresholds (question-based RAG triggers)
// ─────────────────────────────────────────────────────────────
const RAGGY_QUERY_LENGTH_THRESHOLD = 120; // chars - long queries suggest complexity
const RAGGY_CONVERSATION_DEPTH_THRESHOLD = 4; // turns - deep convos benefit from expansion
const RAGGY_TIME_ON_SITE_THRESHOLD = 300000; // 5 min in ms - exploration mode

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
    return readFileSync(join(SOULS_DIR, 'soul.md'), 'utf-8');
  } catch (error) {
    console.error('Failed to load soul personality:', error);
    return `# Kothar wa Khasis\nYou are Kothar, divine craftsman and oracle of Tom di Mino's digital labyrinth.`;
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
  /** Image attachment for vision analysis */
  imageAttachment?: {
    dataUrl: string;
    sizeBytes: number;
    mimeType: string;
  };
  /** Turn count from client (source of truth in localStorage) */
  turnCount?: number;
  /** User-selected poetic register (from register chips UI) */
  register?: 'incantatory' | 'philosophical' | 'visionary' | 'political' | 'intimate';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const correlationId = `soul_${crypto.randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  // Rate limiting
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    console.log(JSON.stringify({
      event: 'error',
      correlationId,
      endpoint: '/api/soul/chat',
      error: 'rate_limit_exceeded',
      ip,
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    ensureProviders();

    const body: ChatRequest = await request.json();
    const { query, visitorContext, conversationHistory, stream, imageAttachment, turnCount } = body;

    // Initial log (contextType and useRaggy added after RAG decision)
    const logRequestStart = (ctxType?: string, raggyMode?: boolean) => {
      console.log(JSON.stringify({
        event: 'request_start',
        correlationId,
        endpoint: '/api/soul/chat',
        messageLength: query?.length || 0,
        historyLength: conversationHistory?.length || 0,
        contextType: ctxType,
        useRaggy: raggyMode,
        stream: !!stream,
        timestamp: new Date().toISOString(),
      }));
    };

    // Allow query to be empty if image is attached (default query will be used)
    if ((!query || typeof query !== 'string') && !imageAttachment) {
      return new Response(
        JSON.stringify({ error: 'Query or image attachment is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate image attachment if present
    if (imageAttachment) {
      // Strict data URL validation - only allow png/jpeg/webp base64
      const dataUrlRegex = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/;
      const dataUrlMatch = imageAttachment.dataUrl?.match(dataUrlRegex);

      if (!dataUrlMatch) {
        return new Response(
          JSON.stringify({ error: 'Invalid image data URL. Only PNG, JPEG, and WebP base64 images are supported.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Extract MIME type from data URL (don't trust client-provided mimeType)
      const actualMimeType = `image/${dataUrlMatch[1]}`;
      const base64Data = dataUrlMatch[2];

      // Calculate actual size from base64 (don't trust client-provided sizeBytes)
      // Base64 encodes 3 bytes into 4 characters, minus padding
      const paddingCount = (base64Data.match(/=+$/) || [''])[0].length;
      const actualSize = Math.ceil((base64Data.length * 3) / 4) - paddingCount;

      if (actualSize > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({ error: 'Image exceeds 5MB limit' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update imageAttachment with validated values
      imageAttachment.mimeType = actualMimeType;
      imageAttachment.sizeBytes = actualSize;
    }

    // Query length validation (skip if image-only request)
    const effectiveQuery = query || (imageAttachment ? 'What do you see in this image?' : '');
    if (effectiveQuery.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Query exceeds ${MAX_QUERY_LENGTH} characters` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── Mode Detection ───
    // Academic mode triggers forced RAG (Raggy) on every turn for scholarly depth
    const isAcademicMode = detectAcademicIntent(effectiveQuery);
    if (isAcademicMode) {
      console.log('[Soul Chat] Academic mode triggered - forcing Raggy RAG');
    }

    // Poetic mode triggers when user requests poetry composition
    const isPoeticMode = detectPoeticIntent(effectiveQuery);
    if (isPoeticMode) {
      console.log('[Soul Chat] Poetic mode triggered');
    }

    // Load soul personality and config
    const personality = loadSoulPersonality();
    const config = loadSoulConfig();

    // Build WorkingMemory with personality
    let memory = new WorkingMemory({ soulName: 'Kothar' })
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

    // RAG helper function (will be called inside stream for streaming mode)
    const performRag = async (mem: typeof memory): Promise<{ memory: typeof memory; contextType: string; useRaggy: boolean; academicMode: boolean }> => {
      let contextType = 'general';
      let useRaggy = false;

      if (isRagAvailable()) {
        try {
          contextType = detectContextType(query);
          useRaggy = shouldUseRaggy(query, contextType, visitorContext, conversationHistory, isAcademicMode);

          if (useRaggy) {
            // Academic mode gets more results with lower threshold for broader scholarly coverage
            const raggyLimit = isAcademicMode ? 7 : 5;
            const raggySimilarity = isAcademicMode ? 0.60 : 0.65;

            mem = await kotharRag.withTypedRagContext(mem, contextType, query, {
              useRaggy: true,
              memory: mem,
              resultLimit: raggyLimit,
              minSimilarity: raggySimilarity,
            });
          } else {
            mem = await kotharRag.withTypedRagContext(mem, contextType, query, {
              resultLimit: 3,
              minSimilarity: 0.7,
            });
          }

          const modeLabel = isAcademicMode ? 'Academic (forced Raggy)' : (useRaggy ? 'Raggy' : 'Standard');
          console.log(`[Soul Chat] RAG: ${modeLabel} mode for "${contextType}" - "${query.slice(0, 50)}..."`);
          logRequestStart(contextType, useRaggy);
        } catch (ragError) {
          if (useRaggy) {
            console.warn('[Soul Chat] Raggy failed, falling back to standard RAG:', ragError);
            try {
              mem = await kotharRag.withTypedRagContext(mem, contextType, query, {
                resultLimit: 3,
                minSimilarity: 0.7,
              });
            } catch (fallbackError) {
              console.warn('[Soul Chat] Standard RAG fallback also failed:', fallbackError);
            }
          } else {
            console.warn('[Soul Chat] RAG retrieval failed, continuing without knowledge context:', ragError);
          }
          logRequestStart(contextType, useRaggy);
        }
      } else {
        logRequestStart();
      }

      return { memory: mem, contextType, useRaggy, academicMode: isAcademicMode };
    };

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        memory = memory.withMemory({
          role: msg.role === 'user' ? ChatMessageRoleEnum.User : ChatMessageRoleEnum.Assistant,
          content: msg.content,
        });
      }
    }

    // Add the current query (use effectiveQuery for image-only requests)
    memory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: effectiveQuery,
    });

    // Use client-provided turn count (source of truth in client-side SoulMemory/localStorage)
    // Fall back to computing from history if not provided (for backwards compatibility)
    const historyUserMsgCount = conversationHistory?.filter(m => m.role === 'user').length || 0;
    const currentTurnCount = turnCount ?? (historyUserMsgCount + 1);

    // Comprehensive session logging
    localLogger.requestStart(correlationId, '/api/soul/chat');
    localLogger.sessionState({
      userTurnCount: currentTurnCount,
      tarotCount: 0, // Fresh adapter each request
      lastTarotTurn: 0,
      userName: undefined,
    });
    localLogger.apiRequest('/api/soul/chat', {
      method: 'POST',
      messageLength: effectiveQuery.length,
      hasImage: !!imageAttachment,
      historyLength: conversationHistory?.length || 0,
    });

    if (stream) {
      // Streaming response with archive indicator events
      const encoder = new TextEncoder();

      // Capture memory in closure for stream
      let streamMemory = memory;
      const streamConfig = config;

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // ─── Image Analysis (if attached) ───────────────────────────────
            let imageCaptionResult: ImageCaptionResult | null = null;
            if (imageAttachment) {
              controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'analyzing' })}\n\n`));

              try {
                const visionProvider = createGeminiVisionProvider();
                if (visionProvider) {
                  const [memoryWithImage, captionResult] = await imageCaption(
                    streamMemory,
                    {
                      imageDataUrl: imageAttachment.dataUrl,
                      userMessage: effectiveQuery,
                    },
                    { model: 'gemini-3-pro-preview' }
                  );

                  streamMemory = memoryWithImage;
                  imageCaptionResult = captionResult;

                  console.log(`[Soul Chat] Image analyzed: ${captionResult.type} - "${captionResult.caption.slice(0, 50)}..."`);
                  controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'complete', caption: captionResult })}\n\n`));
                } else {
                  console.warn('[Soul Chat] Vision provider not configured');
                  // Add fallback memory entry
                  streamMemory = streamMemory.withMemory({
                    role: ChatMessageRoleEnum.User,
                    content: '[Image: shared | The visitor has shared an image, but my vision is obscured at this moment.]',
                    metadata: { type: 'image' },
                  });
                  controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'failed', error: 'Vision provider not configured' })}\n\n`));
                }
              } catch (visionError) {
                console.warn('[Soul Chat] Vision analysis failed:', visionError);
                // Graceful degradation
                streamMemory = streamMemory.withMemory({
                  role: ChatMessageRoleEnum.User,
                  content: '[Image: shared | The mists obscure my vision at this moment.]',
                  metadata: { type: 'image' },
                });
                controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'failed' })}\n\n`));
              }
            }

            // Emit archive:active before RAG search
            if (isRagAvailable()) {
              controller.enqueue(encoder.encode(`event: archive\ndata: ${JSON.stringify({ active: true })}\n\n`));
            }

            // Perform RAG retrieval
            const ragResult = await performRag(streamMemory);
            streamMemory = ragResult.memory;

            // Emit archive:inactive after RAG completes
            if (isRagAvailable()) {
              controller.enqueue(encoder.encode(`event: archive\ndata: ${JSON.stringify({ active: false })}\n\n`));
            }

            // Emit mode indicators after RAG succeeds
            // (placed here so UI only shows mode when we can fulfill the request)
            if (isAcademicMode) {
              controller.enqueue(encoder.encode(`event: mode\ndata: ${JSON.stringify({ mode: 'academic' })}\n\n`));
            } else if (isPoeticMode) {
              controller.enqueue(encoder.encode(`event: mode\ndata: ${JSON.stringify({ mode: 'poetic' })}\n\n`));
            }

            // ─── Cognitive Step Selection ───────────────────────────────
            // Use poeticComposition for poetic mode, externalDialog otherwise
            let newMemory: typeof streamMemory;
            let finalResult: string;

            if (isPoeticMode) {
              // Validate register: only accept known values, default to 'visionary'
              const validRegisters: PoeticRegister[] = ['incantatory', 'philosophical', 'visionary', 'political', 'intimate'];
              const register: PoeticRegister = validRegisters.includes(body.register as PoeticRegister)
                ? (body.register as PoeticRegister)
                : 'visionary';

              // Detect if we should expand beyond core Minoan image domains
              const expandedDomains = detectExplicitDomainDeviation(effectiveQuery);
              if (expandedDomains) {
                console.log('[Soul Chat] Poetic mode: using expanded image domains');
              }

              // Run poeticComposition cognitive step with streaming, fallback to externalDialog on failure
              try {
                const [poeticMemory, responseStream, resultPromise] = await poeticComposition(
                  streamMemory,
                  {
                    theme: effectiveQuery,
                    register,
                    expandedDomains,
                    phase: 'draft',
                  },
                  {
                    stream: true,
                    model: PERSONA_MODEL,
                    temperature: 0.85, // Higher temperature for creativity
                  }
                );

                for await (const chunk of responseStream) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                }
                finalResult = await resultPromise;
                newMemory = poeticMemory;

                console.log(`[Soul Chat] Poem generated: register=${register}, expandedDomains=${expandedDomains}`);
              } catch (poeticError) {
                console.error('[Soul Chat] poeticComposition failed, falling back to externalDialog:', poeticError);

                // Fallback to externalDialog with poetic context
                const fallbackInstructions = buildInstructions(visitorContext) +
                  '\n\nNote: Respond poetically about the theme: ' + effectiveQuery;

                const [fallbackMemory, fallbackStream, fallbackResult] = await externalDialog(
                  streamMemory,
                  fallbackInstructions,
                  {
                    stream: true,
                    model: PERSONA_MODEL,
                    temperature: 0.85,
                  }
                );

                for await (const chunk of fallbackStream) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                }
                finalResult = await fallbackResult;
                newMemory = fallbackMemory;
              }
            } else {
              // Standard externalDialog for non-poetic responses
              const streamInstructions = buildInstructions(visitorContext);

              const [dialogMemory, responseStream, resultPromise] = await externalDialog(
                streamMemory,
                streamInstructions,
                {
                  stream: true,
                  model: PERSONA_MODEL,
                  temperature: streamConfig.temperature as number,
                }
              );

              for await (const chunk of responseStream) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
              }
              finalResult = await resultPromise;
              newMemory = dialogMemory;
            }

            console.log(JSON.stringify({
              event: 'response_complete',
              correlationId,
              endpoint: '/api/soul/chat',
              latencyMs: Date.now() - startTime,
              responseLength: finalResult?.length || 0,
              stream: true,
              timestamp: new Date().toISOString(),
            }));

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse: finalResult })}\n\n`));

            // ─── Poetic Register Options ─────────────────────────────────
            // After delivering a poem, offer register selection for next verse
            if (isPoeticMode) {
              controller.enqueue(encoder.encode(`event: register_options\ndata: ${JSON.stringify({
                registers: [
                  { id: 'incantatory', label: 'Incantatory', description: 'Ritual, mantra-like' },
                  { id: 'philosophical', label: 'Philosophical', description: 'Etymological, paradox-holding' },
                  { id: 'visionary', label: 'Visionary', description: 'Fire-water, prophetic' },
                  { id: 'political', label: 'Political', description: 'Critique, witness' },
                  { id: 'intimate', label: 'Intimate', description: 'Direct address, "you"' },
                ],
                prompt: 'Choose a voice for your next verse:',
              })}\n\n`));
            }

            // Subprocesses: Vision and Tarot generation
            // These need to complete before we close the stream so their SSE events can be emitted
            const geminiKey = process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
            if (geminiKey) {
              const subprocessPromises: Promise<void>[] = [];

              // Vision generation subprocess
              const visionContext: VisionProcessContext = {
                workingMemory: newMemory,
                actions: {
                  log: (...args: unknown[]) => console.log('[Vision]', ...args),
                  speak: () => {},
                },
              };

              const visionPromise = embodiesTheVision(visionContext, {
                minInteractionsBeforeVision: 2,
                onVisionGenerated: (result: VisionResult) => {
                  if (result.success && result.imageDataUrl) {
                    try {
                      controller.enqueue(encoder.encode(`event: image\ndata: ${JSON.stringify({
                        dataUrl: result.imageDataUrl,
                        prompt: result.prompt,
                        displayMode: result.displayMode,
                        duration: 30000,
                      })}\n\n`));
                      console.log('[Vision] Image emitted via SSE');
                    } catch (e) {
                      console.log('[Vision] Could not emit image (stream closed):', e);
                    }
                  }
                },
              }).catch((err) => {
                console.warn('[Vision] Subprocess error:', err);
              });
              subprocessPromises.push(visionPromise as Promise<void>);

              // Tarot generation subprocess (every 10 turns)
              // Pass the COMPUTED turn count to soulMemory (source of truth)
              // This avoids issues with workingMemory transformations
              const tarotContext: TarotProcessContext = {
                workingMemory: newMemory,
                soulMemory: createServerSideMemoryAdapter(currentTurnCount),
                actions: {
                  log: (...args: unknown[]) => console.log('[Tarot]', ...args),
                  speak: () => {},
                },
              };

              console.log(`[Tarot] Turn count (from soulMemory): ${currentTurnCount}`);

              const tarotPromise = embodiesTheTarot(tarotContext, {
                turnInterval: 10,  // Generate tarot every 10 turns
                displayDuration: 30000,
                maxTarotsPerSession: 3,
                onPlaceholder: (info: { message: string; cardCount: number; spreadType: string }) => {
                  // Emit placeholder event with card count immediately when gates pass
                  try {
                    controller.enqueue(encoder.encode(`event: tarot-placeholder\ndata: ${JSON.stringify({
                      message: info.message,
                      cardCount: info.cardCount,
                      spreadType: info.spreadType,
                    })}\n\n`));
                    console.log(`[Tarot] Placeholder emitted via SSE: ${info.cardCount} cards (${info.spreadType})`);
                  } catch (e) {
                    console.log('[Tarot] Could not emit placeholder (stream closed):', e);
                  }
                },
                onCardGenerated: (card: TarotCardResult, index: number, total: number) => {
                  // Emit each card individually as it completes
                  console.log(`[Tarot] Card ${index + 1}/${total} callback: success=${card.success}, hasDataUrl=${!!card.imageDataUrl}, cardName=${card.cardName}, error=${card.error ?? 'none'}`);

                  if (card.success && card.imageDataUrl) {
                    try {
                      controller.enqueue(encoder.encode(`event: tarot-card\ndata: ${JSON.stringify({
                        dataUrl: card.imageDataUrl,
                        prompt: card.prompt,
                        cardName: card.cardName,
                        cardNumber: card.cardNumber,
                        position: card.position,
                        index,
                        total,
                        displayMode: 'inline',
                      })}\n\n`));
                      console.log(`[Tarot] Card emitted via SSE: ${card.cardNumber} - ${card.cardName} (${index + 1}/${total})`);
                    } catch (e) {
                      console.log('[Tarot] Could not emit card (stream closed):', e);
                    }
                  }
                },
                onTarotGenerated: (result: TarotResult) => {
                  // Emit final tarot-complete event with oracle message
                  console.log(`[Tarot] Complete callback: success=${result.success}, cardCount=${result.cardCount}, spreadType=${result.spreadType}, error=${result.error ?? 'none'}`);

                  try {
                    controller.enqueue(encoder.encode(`event: tarot-complete\ndata: ${JSON.stringify({
                      success: result.success,
                      cardCount: result.cardCount,
                      spreadType: result.spreadType,
                      oracleMessage: result.oracleMessage,
                      error: result.error,
                      duration: result.duration,
                    })}\n\n`));
                    console.log(`[Tarot] Complete emitted via SSE: ${result.spreadType} spread`);
                  } catch (e) {
                    console.log('[Tarot] Could not emit complete (stream closed):', e);
                  }
                },
              }).catch((err) => {
                console.warn('[Tarot] Subprocess error:', err);
              });
              subprocessPromises.push(tarotPromise as Promise<void>);

              // Wait for all subprocesses to complete before closing stream
              await Promise.all(subprocessPromises);
            }

            controller.close();
          } catch (error) {
            // Ensure archive indicator is hidden on error
            controller.enqueue(encoder.encode(`event: archive\ndata: ${JSON.stringify({ active: false })}\n\n`));
            console.log(JSON.stringify({
              event: 'error',
              correlationId,
              endpoint: '/api/soul/chat',
              error: error instanceof Error ? error.message : String(error),
              latencyMs: Date.now() - startTime,
              stream: true,
              timestamp: new Date().toISOString(),
            }));
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
      // Non-streaming response

      // Image analysis (if attached)
      if (imageAttachment) {
        try {
          const visionProvider = createGeminiVisionProvider();
          if (visionProvider) {
            const [memoryWithImage, captionResult] = await imageCaption(
              memory,
              {
                imageDataUrl: imageAttachment.dataUrl,
                userMessage: effectiveQuery,
              },
              { model: 'gemini-3-pro-preview' }
            );
            memory = memoryWithImage;
            console.log(`[Soul Chat] Image analyzed: ${captionResult.type} - "${captionResult.caption.slice(0, 50)}..."`);
          } else {
            memory = memory.withMemory({
              role: ChatMessageRoleEnum.User,
              content: '[Image: shared | The mists obscure my vision at this moment.]',
              metadata: { type: 'image' },
            });
          }
        } catch (visionError) {
          console.warn('[Soul Chat] Vision analysis failed:', visionError);
          memory = memory.withMemory({
            role: ChatMessageRoleEnum.User,
            content: '[Image: shared | The mists obscure my vision at this moment.]',
            metadata: { type: 'image' },
          });
        }
      }

      // Perform RAG
      const ragResult = await performRag(memory);
      memory = ragResult.memory;

      // Build instructions for the cognitive step
      const instructions = buildInstructions(visitorContext);

      let newMemory: typeof memory;
      let response: string;

      // Use poeticComposition for poetic mode, externalDialog otherwise
      if (isPoeticMode) {
        const validRegisters: PoeticRegister[] = ['incantatory', 'philosophical', 'visionary', 'political', 'intimate'];
        const register: PoeticRegister = validRegisters.includes(body.register as PoeticRegister)
          ? (body.register as PoeticRegister)
          : 'visionary';
        const expandedDomains = detectExplicitDomainDeviation(effectiveQuery);

        try {
          const [poeticMemory, poeticResponse] = await poeticComposition(
            memory,
            { theme: effectiveQuery, register, expandedDomains, phase: 'draft' },
            { stream: false, model: PERSONA_MODEL, temperature: 0.85 }
          );
          newMemory = poeticMemory;
          response = poeticResponse;
        } catch (poeticError) {
          console.error('[Soul Chat] poeticComposition failed in non-streaming, falling back:', poeticError);
          const [fallbackMemory, fallbackResponse] = await externalDialog(
            memory,
            instructions + '\n\nNote: Respond poetically about the theme: ' + effectiveQuery,
            { stream: false, model: PERSONA_MODEL, temperature: 0.85 }
          );
          newMemory = fallbackMemory;
          response = fallbackResponse;
        }
      } else {
        // Standard externalDialog for non-poetic responses
        const [dialogMemory, dialogResponse] = await externalDialog(
          memory,
          instructions,
          {
            stream: false,
            model: PERSONA_MODEL,
            temperature: config.temperature as number,
          }
        );
        newMemory = dialogMemory;
        response = dialogResponse;
      }

      console.log(JSON.stringify({
        event: 'response_complete',
        correlationId,
        endpoint: '/api/soul/chat',
        latencyMs: Date.now() - startTime,
        responseLength: response?.length || 0,
        stream: false,
        timestamp: new Date().toISOString(),
      }));

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
    console.log(JSON.stringify({
      event: 'error',
      correlationId,
      endpoint: '/api/soul/chat',
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }));
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
 * Determine if query warrants Raggy (question-based RAG)
 *
 * Raggy adds ~1 LLM call but improves semantic coverage for complex queries.
 * Standard RAG is sufficient for direct lookups (portfolio, voice).
 */
function shouldUseRaggy(
  query: string,
  contextType: string,
  visitorContext?: ChatRequest['visitorContext'],
  conversationHistory?: ChatRequest['conversationHistory'],
  academicMode?: boolean
): boolean {
  // Tier 0: Academic mode ALWAYS uses Raggy for maximum scholarly depth
  if (academicMode) {
    return true;
  }

  // Tier 1: Context type (highest priority)
  // Scholarly, etymology, and oracle queries benefit from semantic expansion
  if (contextType === 'scholarly' || contextType === 'etymology' || contextType === 'oracle') {
    return true;
  }

  // Portfolio and voice are direct lookups—standard RAG sufficient
  if (contextType === 'portfolio' || contextType === 'voice') {
    return false;
  }

  // Tier 2: Query complexity signals (for background, mythology, general)

  // Long queries suggest multi-faceted thinking
  if (query.length > RAGGY_QUERY_LENGTH_THRESHOLD) {
    return true;
  }

  // Multi-part indicators
  if (/\b(and|also|how does.*relate|connect|compare|difference|relationship)\b/i.test(query)) {
    return true;
  }

  // Tier 3: Conversation depth (refinement cycle)
  if (conversationHistory && conversationHistory.length >= RAGGY_CONVERSATION_DEPTH_THRESHOLD) {
    return true;
  }

  // Tier 4: Visitor engagement signals
  if (visitorContext?.behavioralType === 'reader') {
    return true; // Deep readers benefit from richer context
  }

  if (visitorContext?.timeOnSite && visitorContext.timeOnSite > RAGGY_TIME_ON_SITE_THRESHOLD) {
    return true; // 5+ minutes = exploration mode
  }

  // Default: standard RAG
  return false;
}

/**
 * Build instructions for the externalDialog cognitive step
 */
function buildInstructions(ctx?: ChatRequest['visitorContext']): string {
  const baseInstructions = indentNicely`
    Respond to the visitor's message as Kothar wa Khasis, oracle of the labyrinth.

    Guidelines:
    - Keep responses brief: 2-3 sentences maximum
    - Be warm but knowing, like an artificer who has forged weapons for gods and websites for mortals
    - Reference the visitor's journey through the labyrinth when relevant
    - If they ask about Tom's work, guide them to relevant case studies
    - If they ask scholarly questions, draw on your knowledge of Gordon, Astour, Harrison
    - Never be salesy—the labyrinth invites, it does not advertise
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
      soul: 'Kothar',
      endpoint: '/api/soul/chat',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
