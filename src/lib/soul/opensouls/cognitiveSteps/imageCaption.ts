/**
 * imageCaption - Cognitive step for analyzing images
 *
 * Takes an image and returns structured analysis following Kothar's persona.
 * Pattern from Open Souls: pure LLM transformation that returns
 * [WorkingMemory, extractedValue] where extractedValue is the analysis result.
 *
 * IMPORTANT: Does NOT store imageDataUrl in memory - only stores the caption.
 * This prevents memory bloat and localStorage quota issues.
 *
 * @pattern CognitiveStep - Pure LLM transformation
 * @llmCalls 1 (Gemini Vision)
 */

import { createGeminiVisionProvider } from '../providers/gemini-vision';
import { WorkingMemory } from '../core/WorkingMemory';
import { ChatMessageRoleEnum } from '../core/types';
import { getSoulLogger } from '../core/SoulLogger';

export interface ImageCaptionContext {
  /** Base64 data URL of the image */
  imageDataUrl: string;
  /** Optional user message providing context */
  userMessage?: string;
}

export interface ImageCaptionResult {
  /** Classification of image content */
  type: 'artifact' | 'document' | 'photo' | 'screenshot' | 'art' | 'diagram' | 'other';
  /** Rich description of the image */
  caption: string;
  /** Contextual interpretation related to user's question */
  context?: string;
}

/**
 * Analyze an image and return structured caption
 *
 * Uses Gemini Vision API to understand image content,
 * then formats response for memory storage.
 *
 * @param memory - Current WorkingMemory state
 * @param ctx - Image context including dataUrl and optional user message
 * @param opts - Options including model selection
 * @returns [WorkingMemory, ImageCaptionResult] tuple
 */
export async function imageCaption(
  memory: WorkingMemory,
  ctx: ImageCaptionContext,
  opts: { model?: string; temperature?: number } = {}
): Promise<[WorkingMemory, ImageCaptionResult]> {
  const logger = getSoulLogger();
  const startTime = Date.now();

  // Create vision provider
  const provider = createGeminiVisionProvider();
  if (!provider) {
    // Return fallback result if provider not configured
    const fallbackResult: ImageCaptionResult = {
      type: 'other',
      caption: 'The mists obscure my vision at this moment.',
    };

    const newMemory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: `[Image: shared | ${fallbackResult.caption}]`,
      metadata: {
        type: 'image',
        imageCaption: fallbackResult,
        error: 'Vision provider not configured',
      },
    });

    return [newMemory, fallbackResult];
  }

  // Build the analysis prompt
  const systemPrompt = `You are Kothar, the divine craftsman, examining an image the visitor has shared.

${ctx.userMessage ? `## Visitor's Message\n"${ctx.userMessage}"\n` : ''}

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
  "context": "How this relates to the visitor's question (if they asked one)"
}

Provide detailed analysis in the caption. Respond with only the JSON object:`;

  try {
    // Call Gemini Vision with image
    const response = await provider.generateWithVision(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: ctx.imageDataUrl },
          ],
        },
      ],
      {
        model: opts.model?.replace('gemini-vision/', '') || 'gemini-3-pro-preview',
        temperature: opts.temperature ?? 0.7,
        maxTokens: 1024,
        onUsage: (usage) => {
          // Convert camelCase to snake_case for SoulLogger compatibility
          logger.providerResponse?.('gemini-vision', {
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            total_tokens: usage.totalTokens,
          }, Date.now() - startTime);
        },
      }
    );

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
    } catch {
      // Fallback if JSON parsing fails - use raw response as caption
      result = {
        type: 'other',
        caption: response.slice(0, 200),
      };
    }

    // Format rich memory content
    const memoryContent = [
      `[Image: ${result.type}`,
      result.caption,
      result.context,
    ]
      .filter(Boolean)
      .join(' | ') + ']';

    // Add to working memory WITHOUT imageDataUrl (prevents memory bloat)
    const newMemory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: memoryContent,
      metadata: {
        type: 'image',
        imageCaption: result,
        // NOTE: imageDataUrl intentionally NOT stored - caption is sufficient
      },
    });

    logger.cognitiveStepEnd?.(
      'imageCaption',
      result.caption,
      newMemory.memories.length,
      { provider: 'gemini-vision' }
    );

    return [newMemory, result];
  } catch (error) {
    // Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[imageCaption] Vision analysis failed:', errorMessage);

    const fallbackResult: ImageCaptionResult = {
      type: 'other',
      caption: 'The mists obscure my vision at this moment.',
    };

    const newMemory = memory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: `[Image: shared | ${fallbackResult.caption}]`,
      metadata: {
        type: 'image',
        imageCaption: fallbackResult,
        error: errorMessage,
      },
    });

    return [newMemory, fallbackResult];
  }
}

export default imageCaption;
