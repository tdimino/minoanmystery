# Plan: Kothar Image Vision (Full Clean Architecture)

## Overview

Enable Kothar to "see" images pasted into the chat, respond with visual understanding, and retain image summaries (not raw data) during memory compression.

**Architecture Philosophy**: Full Open Souls compliance with proper abstractions, testability, and extensibility.

**Estimated Time**: 2-3 hours

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KOTHAR IMAGE VISION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CLIENT-SIDE                                                              │
│     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
│     │ Paste/Upload │────►│ Validate &   │────►│ Preview UI   │             │
│     │ Handler      │     │ Encode Base64│     │ (thumbnail)  │             │
│     └──────────────┘     └──────────────┘     └──────────────┘             │
│            │                                         │                       │
│            └─────────────────┬───────────────────────┘                       │
│                              ▼                                               │
│     ┌──────────────────────────────────────────────────────┐                │
│     │ POST /api/soul/chat                                  │                │
│     │ { query, imageAttachment: { dataUrl, size, mime } }  │                │
│     └──────────────────────────────────────────────────────┘                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  2. SERVER-SIDE                                                              │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │ chat.ts                                                            │  │
│     │                                                                    │  │
│     │  ┌─────────────────┐     ┌─────────────────────────────────────┐  │  │
│     │  │ Validate Image  │────►│ imageCaption Cognitive Step         │  │  │
│     │  │ (size, format)  │     │                                     │  │  │
│     │  └─────────────────┘     │  ┌─────────────────────────────┐   │  │  │
│     │                          │  │ GeminiVisionProvider        │   │  │  │
│     │                          │  │ generateWithVision()        │   │  │  │
│     │                          │  └─────────────────────────────┘   │  │  │
│     │                          │              │                      │  │  │
│     │                          │              ▼                      │  │  │
│     │                          │  ┌─────────────────────────────┐   │  │  │
│     │                          │  │ ImageCaptionResult          │   │  │  │
│     │                          │  │ { type, caption, context }  │   │  │  │
│     │                          │  └─────────────────────────────┘   │  │  │
│     │                          └─────────────────────────────────────┘  │  │
│     │                                         │                          │  │
│     │                                         ▼                          │  │
│     │  ┌─────────────────────────────────────────────────────────────┐  │  │
│     │  │ WorkingMemory                                               │  │  │
│     │  │                                                             │  │  │
│     │  │  Region: 'user-images'                                      │  │  │
│     │  │  ┌─────────────────────────────────────────────────────┐   │  │  │
│     │  │  │ Memory {                                            │   │  │  │
│     │  │  │   content: "[Image: artifact | Bull-leaping...]",   │   │  │  │
│     │  │  │   metadata: { imageCaption, imageDataUrl }          │   │  │  │
│     │  │  │ }                                                   │   │  │  │
│     │  │  └─────────────────────────────────────────────────────┘   │  │  │
│     │  └─────────────────────────────────────────────────────────────┘  │  │
│     │                                         │                          │  │
│     │                                         ▼                          │  │
│     │  ┌─────────────────────────────────────────────────────────────┐  │  │
│     │  │ externalDialog (normal chat response)                       │  │  │
│     │  │ → SSE streaming → client                                    │  │  │
│     │  └─────────────────────────────────────────────────────────────┘  │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  3. MEMORY COMPRESSION                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ MemoryCompressor                                                    │ │
│     │                                                                     │ │
│     │ Before: Memory { imageDataUrl: "data:image/png;base64,..." }       │ │
│     │                                                                     │ │
│     │ After:  Memory { content: "[Image: artifact | Bull-leaping...]" }  │ │
│     │         (imageDataUrl stripped, caption preserved)                  │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. GeminiVisionProvider
**Path**: `src/lib/soul/opensouls/providers/gemini-vision.ts`

Vision-capable LLM provider for image analysis:

```typescript
/**
 * Gemini Vision Provider
 *
 * Handles vision analysis using Gemini Pro Vision API.
 * Separate from gemini-image.ts (generation) for clean separation.
 */

export interface GeminiVisionConfig {
  apiKey: string;
  model?: string;  // Default: gemini-2.0-flash-exp
}

export interface GeminiVisionResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    model: string;
    analysisTimeMs: number;
  };
}

export class GeminiVisionProvider implements LLMProvider {
  name = 'gemini-vision';
  supportsVision = true;
  private apiKey: string;
  private model: string;

  constructor(config: GeminiVisionConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gemini-2.0-flash-exp';
  }

  /**
   * Generate response with vision input
   * Accepts multi-part messages with text and image_url parts
   */
  async generateWithVision(
    messages: Array<{
      role: string;
      content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: string }>;
      name?: string;
    }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      onUsage?: (usage: TokenUsage) => void;
    }
  ): Promise<string> {
    const startTime = Date.now();

    // Convert messages to Gemini format with inline images
    const contents = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { parts: [{ text: msg.content }] };
      }

      // Multi-part content (text + image)
      const parts = msg.content.map(part => {
        if (part.type === 'image_url' && part.image_url) {
          const base64Match = part.image_url.match(/^data:image\/([a-z]+);base64,(.+)$/i);
          if (base64Match) {
            return {
              inlineData: {
                mimeType: `image/${base64Match[1]}`,
                data: base64Match[2],
              },
            };
          }
        }
        return { text: part.text || '' };
      });

      return { parts };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model || this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text response from Gemini Vision');
    }

    // Report usage if callback provided
    if (options.onUsage) {
      options.onUsage({
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      });
    }

    return text;
  }

  /**
   * Standard text generation (delegates to vision API)
   */
  async generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: { model?: string; temperature?: number; maxTokens?: number; stream?: boolean; onUsage?: (usage: TokenUsage) => void }
  ): Promise<string | AsyncIterable<string>> {
    // Convert to vision format and call generateWithVision
    return this.generateWithVision(messages, options);
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}

/**
 * Create Gemini vision provider from environment
 */
export function createGeminiVisionProvider(apiKey?: string): GeminiVisionProvider | null {
  const key = apiKey ?? process.env.GEMINI_API_KEY ?? import.meta.env?.GEMINI_API_KEY;
  if (!key) {
    console.warn('[GeminiVision] GEMINI_API_KEY not configured');
    return null;
  }
  return new GeminiVisionProvider({ apiKey: key });
}

export default GeminiVisionProvider;
```

---

### 2. imageCaption Cognitive Step
**Path**: `src/lib/soul/opensouls/cognitiveSteps/imageCaption.ts`

Pure LLM transformation for image analysis:

```typescript
/**
 * imageCaption - Cognitive step for analyzing images
 *
 * Takes an image and returns structured analysis following Kothar's persona.
 * Pattern from Open Souls: pure LLM transformation that returns
 * [WorkingMemory, extractedValue] where extractedValue is the analysis result.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface ImageCaptionContext {
  /** Base64 data URL of the image */
  imageDataUrl: string;
  /** Optional user message providing context */
  userMessage?: string;
  /** Analysis detail level */
  analysisMode?: 'detailed' | 'concise';
}

export interface ImageCaptionResult {
  /** Classification of image content */
  type: 'artifact' | 'document' | 'photo' | 'screenshot' | 'art' | 'diagram' | 'other';
  /** Rich description of the image */
  caption: string;
  /** Contextual interpretation related to user's question */
  context?: string;
  /** Confidence in the analysis */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze an image and return structured caption
 *
 * Uses Gemini Vision API to understand image content,
 * then formats response for memory storage.
 */
export const imageCaption = createCognitiveStep<ImageCaptionContext, ImageCaptionResult>(
  (ctx) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${memory.soulName}, the divine craftsman, examining an image the visitor has shared.

        ${ctx.userMessage ? `## Visitor's Message\n"${ctx.userMessage}"` : ''}

        ## Your Task
        Analyze this image and provide a structured response.

        ## Response Guidelines

        **For artifacts, ancient art, or archaeological items:**
        Speak as Kothar, weaving mythological connections. Reference Minoan, Mycenaean,
        or ancient Mediterranean imagery when relevant. Be evocative but accurate.

        **For general photos, screenshots, or modern content:**
        Be direct and factual. Describe what you see clearly and helpfully.

        ## Response Format (JSON only, no markdown)
        {
          "type": "artifact|document|photo|screenshot|art|diagram|other",
          "caption": "A rich 2-3 sentence description capturing key visual details",
          "context": "How this relates to the visitor's question (if they asked one)",
          "confidence": "high|medium|low"
        }

        ${ctx.analysisMode === 'detailed' ? 'Provide extensive detail in the caption.' : 'Be concise.'}

        Respond with only the JSON object:
      `,
      name: memory.soulName,
    }),

    postProcess: async (memory, response) => {
      // Parse JSON response, handling potential markdown wrapping
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      let result: ImageCaptionResult;
      try {
        result = JSON.parse(jsonStr);
      } catch (e) {
        // Fallback if JSON parsing fails
        result = {
          type: 'other',
          caption: response.slice(0, 200),
          confidence: 'low',
        };
      }

      // Format rich memory content
      const memoryContent = [
        `[Image: ${result.type}`,
        result.caption,
        result.context,
      ].filter(Boolean).join(' | ') + ']';

      return [
        {
          role: ChatMessageRoleEnum.User,
          content: memoryContent,
          metadata: {
            type: 'image',
            imageDataUrl: ctx.imageDataUrl,
            imageCaption: result,
          },
        },
        result,
      ];
    },
  })
);

export default imageCaption;
```

---

### 3. Vision API Endpoint (Optional, for direct vision requests)
**Path**: `src/pages/api/soul/vision-analyze.ts`

Dedicated endpoint for image analysis (can be used independently of chat):

```typescript
/**
 * Vision Analysis API Endpoint
 *
 * Analyzes images using Gemini Vision and returns structured captions.
 * Can be used standalone or as part of the chat flow.
 */

import type { APIRoute } from 'astro';
import { imageCaption } from '../../../lib/soul/opensouls/cognitiveSteps';
import { WorkingMemory, ChatMessageRoleEnum, registerProvider } from '../../../lib/soul/opensouls';
import { createGeminiVisionProvider } from '../../../lib/soul/opensouls/providers';

export const prerender = false;

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // images per minute
const RATE_WINDOW = 60000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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

interface VisionRequest {
  imageDataUrl: string;
  userMessage?: string;
  analysisMode?: 'detailed' | 'concise';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: VisionRequest = await request.json();
    const { imageDataUrl, userMessage, analysisMode } = body;

    // Validate image
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Estimate size from base64
    const base64Data = imageDataUrl.split(',')[1];
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4);

    if (sizeBytes > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image exceeds 5MB limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize vision provider
    const visionProvider = createGeminiVisionProvider();
    if (!visionProvider) {
      return new Response(
        JSON.stringify({ error: 'Vision provider not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    registerProvider('gemini-vision', visionProvider);

    // Create minimal WorkingMemory
    const memory = new WorkingMemory({ soulName: 'Kothar' });

    // Run cognitive step
    const [newMemory, result] = await imageCaption(
      memory,
      { imageDataUrl, userMessage, analysisMode: analysisMode || 'detailed' },
      { model: 'gemini-vision/gemini-2.0-flash-exp' }
    );

    return new Response(
      JSON.stringify({
        success: true,
        caption: result,
        memoryContent: newMemory.at(-1)?.content,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Vision Analyze] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        fallbackCaption: {
          type: 'other',
          caption: 'The mists obscure my vision at this moment.',
          confidence: 'low',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## Files to Modify

### 1. `src/lib/soul/opensouls/core/types.ts`

Extend Memory interface with image metadata:

```typescript
// Add to existing Memory interface
export interface Memory {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
  region?: string;
  timestamp?: string;
  metadata?: {
    type?: 'text' | 'image' | 'visionPrompt';
    // Image-specific metadata
    imageDataUrl?: string;
    imageCaption?: {
      type: 'artifact' | 'document' | 'photo' | 'screenshot' | 'art' | 'diagram' | 'other';
      caption: string;
      context?: string;
      confidence: 'high' | 'medium' | 'low';
    };
    imageSizeBytes?: number;
    [key: string]: unknown;
  };
}
```

### 2. `src/lib/soul/opensouls/core/CognitiveStep.ts`

Extend LLMProvider interface for vision support:

```typescript
export interface LLMProvider {
  name: string;
  generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      thinkingEffort?: 'none' | 'low' | 'medium' | 'high';
      onUsage?: (usage: TokenUsage) => void;
    }
  ): Promise<string | AsyncIterable<string>>;

  // NEW: Vision capability
  supportsVision?: boolean;
  generateWithVision?: (
    messages: Array<{
      role: string;
      content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: string }>;
      name?: string;
    }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      onUsage?: (usage: TokenUsage) => void;
    }
  ) => Promise<string>;
}
```

### 3. `src/lib/soul/opensouls/providers/index.ts`

Export new vision provider:

```typescript
// Add export
export { GeminiVisionProvider, createGeminiVisionProvider } from './gemini-vision';
```

### 4. `src/lib/soul/opensouls/cognitiveSteps/index.ts`

Export imageCaption step:

```typescript
// Add export
export { imageCaption, type ImageCaptionContext, type ImageCaptionResult } from './imageCaption';
```

### 5. `src/pages/api/soul/chat.ts`

Integrate image analysis into chat flow:

```typescript
// Extend ChatRequest interface (around line 145)
interface ChatRequest {
  query: string;
  visitorContext?: { /* existing */ };
  conversationHistory?: Array<{ /* existing */ }>;
  stream?: boolean;
  // NEW
  imageAttachment?: {
    dataUrl: string;
    sizeBytes: number;
    mimeType: string;
  };
}

// Add image processing before RAG (around line 240)
// ─── Image Analysis (if attached) ───────────────────────────────
if (body.imageAttachment) {
  const { dataUrl, sizeBytes, mimeType } = body.imageAttachment;

  // Validation
  if (sizeBytes > 5 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Image exceeds 5MB limit' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
    return new Response(
      JSON.stringify({ error: 'Unsupported image format. Use PNG, JPEG, or WebP.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Emit analyzing event for UI
    if (stream) {
      controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'analyzing' })}\n\n`));
    }

    const visionProvider = createGeminiVisionProvider();
    if (!visionProvider) {
      throw new Error('Vision provider not configured');
    }

    registerProvider('gemini-vision', visionProvider);

    const [memoryWithImage, captionResult] = await imageCaption(
      memory,
      {
        imageDataUrl: dataUrl,
        userMessage: query,
        analysisMode: 'detailed',
      },
      { model: 'gemini-vision/gemini-2.0-flash-exp' }
    );

    // Add to user-images region for clean context organization
    memory = memoryWithImage.withRegion('user-images', {
      role: ChatMessageRoleEnum.User,
      content: `[Image: ${captionResult.type} | ${captionResult.caption}${captionResult.context ? ` | ${captionResult.context}` : ''}]`,
      metadata: {
        type: 'image',
        imageCaption: captionResult,
      },
    });

    console.log(`[Soul Chat] Image analyzed: ${captionResult.type} - "${captionResult.caption.slice(0, 50)}..."`);

    if (stream) {
      controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'complete', caption: captionResult })}\n\n`));
    }

  } catch (visionError) {
    console.warn('[Soul Chat] Vision analysis failed:', visionError);

    // Graceful degradation
    memory = memory.withRegion('user-images', {
      role: ChatMessageRoleEnum.User,
      content: '[Image: attachment | The visitor has shared an image, but the mists obscure my vision at this moment.]',
      metadata: { type: 'image' },
    });

    if (stream) {
      controller.enqueue(encoder.encode(`event: imageAnalysis\ndata: ${JSON.stringify({ status: 'failed' })}\n\n`));
    }
  }
}
```

### 6. `src/lib/soul/opensouls/core/MemoryCompressor.ts`

Handle image memory compression:

```typescript
// In compress() method, add image handling logic

// Strip imageDataUrl from old messages to save memory
// Keep caption text for context
private compressImageMemories(memories: Memory[]): Memory[] {
  return memories.map(mem => {
    if (mem.metadata?.type === 'image' && mem.metadata?.imageDataUrl) {
      // Keep caption, discard raw image data
      return {
        ...mem,
        metadata: {
          ...mem.metadata,
          imageDataUrl: undefined, // Remove base64 data
          compressed: true,
        },
      };
    }
    return mem;
  });
}
```

### 7. `src/pages/labyrinth.astro`

Full UI implementation:

#### HTML (add to form, around line 60):
```html
<!-- Hidden file input -->
<input
  type="file"
  id="labyrinth-file-input"
  class="labyrinth-file-input visually-hidden"
  accept="image/png,image/jpeg,image/webp"
/>

<!-- Attachment preview bar (above input) -->
<div id="attachment-preview" class="attachment-preview">
  <div class="attachment-content">
    <img class="attachment-thumbnail" alt="Attached image preview" />
    <div class="attachment-info">
      <span class="attachment-name"></span>
      <span class="attachment-size"></span>
    </div>
  </div>
  <button type="button" class="attachment-remove" aria-label="Remove attachment">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
</div>

<!-- In form-input-wrapper, add attach button before submit -->
<button
  type="button"
  class="labyrinth-attach-btn"
  aria-label="Attach image"
  title="Attach image (PNG, JPEG, WebP - max 5MB)"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
  </svg>
</button>
```

#### CSS (add to style block):
```css
/* Visually hidden but accessible */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Attachment button */
.labyrinth-attach-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.labyrinth-attach-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.05);
}

.labyrinth-attach-btn:active {
  transform: scale(0.95);
}

/* Attachment preview */
.attachment-preview {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--color-background-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  animation: attachment-reveal 0.2s ease;
}

.attachment-preview.active {
  display: flex;
}

@keyframes attachment-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.attachment-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.attachment-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--color-border);
}

.attachment-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 11px;
  color: var(--color-text-muted);
}

.attachment-remove {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.attachment-remove:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

/* Message with image */
:global(.message-image) {
  margin-bottom: 8px;
}

:global(.message-image img) {
  max-width: 100%;
  max-height: 300px;
  border-radius: 12px;
  object-fit: contain;
  border: 1px solid var(--color-border);
}

:global(.message-image-caption) {
  margin-top: 6px;
  padding: 8px 12px;
  background: rgba(150, 106, 133, 0.08);
  border-radius: 8px;
  font-size: 12px;
}

:global(.caption-type) {
  display: inline-block;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  font-size: 10px;
  margin-right: 8px;
}

:global(.caption-text) {
  color: var(--color-text-muted);
  font-style: italic;
}

/* Image analyzing indicator */
:global(.image-analyzing) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(150, 106, 133, 0.08);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}

:global(.image-analyzing-spinner) {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dark mode */
:global([data-theme='dark']) .attachment-preview {
  background: rgba(255, 255, 255, 0.03);
}

:global([data-theme='dark']) .labyrinth-attach-btn {
  background: rgba(255, 255, 255, 0.03);
}
```

#### Script (add to LabyrinthChat class):
```typescript
// Add properties
private attachmentFile: File | null = null;
private attachmentDataUrl: string | null = null;
private attachBtn: HTMLButtonElement;
private fileInput: HTMLInputElement;
private attachmentPreview: HTMLElement;

// In constructor, after existing element queries:
this.attachBtn = this.form.querySelector('.labyrinth-attach-btn')!;
this.fileInput = document.getElementById('labyrinth-file-input') as HTMLInputElement;
this.attachmentPreview = document.getElementById('attachment-preview')!;

// In init(), add event listeners:
// Attachment button opens file picker
this.attachBtn.addEventListener('click', () => this.fileInput.click());

// File selection handler
this.fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) this.handleFileAttachment(file);
});

// Paste handler for clipboard images
this.input.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) this.handleFileAttachment(file);
      break;
    }
  }
});

// Remove attachment button
this.attachmentPreview.querySelector('.attachment-remove')!
  .addEventListener('click', () => this.clearAttachment());

// Add methods:
private handleFileAttachment(file: File) {
  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    this.showToast('Image exceeds 5MB limit');
    return;
  }

  // Validate type
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    this.showToast('Please use PNG, JPEG, or WebP images');
    return;
  }

  this.attachmentFile = file;

  // Generate preview
  const reader = new FileReader();
  reader.onload = (e) => {
    this.attachmentDataUrl = e.target?.result as string;

    const thumbnail = this.attachmentPreview.querySelector('.attachment-thumbnail') as HTMLImageElement;
    const nameEl = this.attachmentPreview.querySelector('.attachment-name') as HTMLElement;
    const sizeEl = this.attachmentPreview.querySelector('.attachment-size') as HTMLElement;

    thumbnail.src = this.attachmentDataUrl;
    nameEl.textContent = file.name;
    sizeEl.textContent = this.formatBytes(file.size);

    this.attachmentPreview.classList.add('active');
  };
  reader.readAsDataURL(file);
}

private clearAttachment() {
  this.attachmentFile = null;
  this.attachmentDataUrl = null;
  this.fileInput.value = '';
  this.attachmentPreview.classList.remove('active');
}

private formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Modify sendMessage() to include image:
private async sendMessage() {
  const query = this.input.value.trim();
  if (!query && !this.attachmentFile) return; // Allow image-only messages
  if (this.isLoading) return;

  // ... existing setup code ...

  // Build request with image attachment
  const requestBody: any = {
    query: query || 'What do you see in this image?', // Default query for image-only
    visitorContext: this.getVisitorContext(),
    conversationHistory: this.getConversationHistory(),
    stream: true,
  };

  if (this.attachmentFile && this.attachmentDataUrl) {
    requestBody.imageAttachment = {
      dataUrl: this.attachmentDataUrl,
      sizeBytes: this.attachmentFile.size,
      mimeType: this.attachmentFile.type,
    };

    // Include image in user message for display
    userMsg.metadata = {
      imageDataUrl: this.attachmentDataUrl,
    };

    this.clearAttachment();
  }

  // ... rest of sendMessage using requestBody ...
}

// Modify renderMessage() to display images:
private renderMessage(msg: ChatMessage, isLoading = false) {
  // ... existing code ...

  const hasImage = msg.metadata?.imageDataUrl;
  const imageCaption = msg.metadata?.imageCaption;

  let imageHtml = '';
  if (hasImage) {
    imageHtml = `
      <div class="message-image">
        <img src="${msg.metadata.imageDataUrl}" alt="Shared image" />
        ${imageCaption ? `
          <div class="message-image-caption">
            <span class="caption-type">${imageCaption.type}</span>
            <span class="caption-text">${imageCaption.caption}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  const contentHtml = isLoading
    ? loadingDotsHtml
    : imageHtml + this.formatContent(msg.content);

  // ... rest of renderMessage ...
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (45 min)
1. [ ] Create `gemini-vision.ts` provider
2. [ ] Create `imageCaption.ts` cognitive step
3. [ ] Export from index files
4. [ ] Update `types.ts` with image metadata

### Phase 2: API Integration (30 min)
1. [ ] Extend `ChatRequest` interface
2. [ ] Add validation logic in `chat.ts`
3. [ ] Integrate `imageCaption` step
4. [ ] Add `user-images` memory region
5. [ ] Add SSE events for analysis status

### Phase 3: Memory Handling (15 min)
1. [ ] Update `MemoryCompressor` for images
2. [ ] Test compression preserves captions
3. [ ] Test compression strips base64 data

### Phase 4: Client UI (45 min)
1. [ ] Add file input and attach button
2. [ ] Implement attachment preview
3. [ ] Add paste handler for clipboard images
4. [ ] Modify `sendMessage` for image attachment
5. [ ] Update `renderMessage` for image display

### Phase 5: Polish & Testing (30 min)
1. [ ] Add loading state during analysis
2. [ ] Implement graceful error handling
3. [ ] Test with various image types
4. [ ] Test memory compression
5. [ ] Mobile responsiveness testing

### Phase 6: Documentation (15 min)
1. [ ] Update `soul-engine-reference.md`
2. [ ] Add vision provider configuration docs
3. [ ] Document imageCaption cognitive step

---

## Testing Checklist

### Functional Tests
- [ ] Upload PNG → Analysis succeeds
- [ ] Upload JPEG → Analysis succeeds
- [ ] Upload WebP → Analysis succeeds
- [ ] Upload >5MB → Error shown
- [ ] Upload PDF → Error shown
- [ ] Paste image from clipboard → Preview appears
- [ ] Remove attachment → Preview hidden
- [ ] Send image + query → Both displayed
- [ ] Send image only → Default query used
- [ ] Image + RAG query → Both work together

### Response Tone Tests
- [ ] Minoan artifact image → Mystical response
- [ ] Screenshot → Direct response
- [ ] Photo of person → Direct response
- [ ] Ancient art → Mystical response

### Memory Tests
- [ ] Image caption persists in conversation
- [ ] Reload page → Image visible in history
- [ ] Memory compression → Caption kept, base64 removed
- [ ] Long conversation → Old images compressed

### Error Handling Tests
- [ ] Gemini API down → Graceful fallback message
- [ ] Rate limit exceeded → Error shown
- [ ] Invalid image data → Error shown
- [ ] Network timeout → Error shown

### Mobile Tests
- [ ] File picker opens on iOS
- [ ] File picker opens on Android
- [ ] Preview looks correct
- [ ] Touch interactions work

---

## Security Considerations

1. **Input Validation**: Strict MIME type and size checks
2. **No URL fetching**: Only accept base64 data URLs (no external URLs)
3. **Rate limiting**: 10 images/minute per IP
4. **Memory cleanup**: Auto-strip base64 after compression
5. **EXIF stripping**: Consider for future (privacy)

---

## Cost Estimates

| Usage | Cost |
|-------|------|
| Gemini Vision per image | ~$0.002-0.005 |
| 100 images/day | ~$0.20-0.50/day |
| 1000 images/day | ~$2-5/day |

---

## Environment Variables

```bash
# Already exists - reused for vision
GEMINI_API_KEY=your-key-here
```

No additional configuration needed.

---

## Related Files

- `src/lib/soul/opensouls/providers/gemini-image.ts` - Image generation (reference)
- `src/lib/soul/opensouls/cognitiveSteps/visionPrompt.ts` - Vision prompts (reference)
- `src/lib/soul/opensouls/subprocesses/embodiesTheVision.ts` - Vision subprocess (reference)
- `agent_docs/soul-engine-reference.md` - Soul engine documentation
