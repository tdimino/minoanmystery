/**
 * Gemini Vision Provider
 *
 * Handles vision analysis using Gemini 3 Pro API.
 * Separate from gemini-image.ts (generation) for clean separation.
 *
 * @pattern LLMProvider - Compatible with cognitive step system
 */

export interface GeminiVisionConfig {
  apiKey: string;
  model?: string; // Default: gemini-3-pro-preview
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Multi-part content for vision messages
 */
export type VisionContent =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: string }>;

export interface VisionMessage {
  role: 'user' | 'assistant' | 'system';
  content: VisionContent;
  name?: string;
}

export interface VisionGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Timeout in milliseconds (default: 55000) */
  timeoutMs?: number;
  onUsage?: (usage: TokenUsage) => void;
}

/**
 * Gemini Vision Provider
 *
 * Supports vision analysis with inline base64 images.
 */
export class GeminiVisionProvider {
  name = 'gemini-vision';
  supportsVision = true;
  private apiKey: string;
  private model: string;

  constructor(config: GeminiVisionConfig) {
    this.apiKey = config.apiKey;
    // Gemini 3 Pro for best vision analysis
    this.model = config.model ?? 'gemini-3-pro-preview';
  }

  /**
   * Generate response with vision input
   * Accepts multi-part messages with text and image_url parts
   */
  async generateWithVision(
    messages: VisionMessage[],
    options: VisionGenerateOptions = {}
  ): Promise<string> {
    // Set up timeout (default 55s to complete before Vercel 60s limit)
    const timeoutMs = options.timeoutMs ?? 55000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Convert messages to Gemini format with inline images
      const contents = messages.map((msg) => {
        if (typeof msg.content === 'string') {
          return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          };
        }

        // Multi-part content (text + image)
        const parts = msg.content.map((part) => {
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
            // Non-base64 image URL - log warning and skip
            console.warn('[GeminiVision] Non-base64 image URL ignored');
          }
          // Text part or fallback
          if (part.type === 'text') {
            return { text: part.text };
          }
          return { text: '' };
        });

        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        };
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
          signal: controller.signal,
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}

/**
 * Create Gemini vision provider from environment
 */
export function createGeminiVisionProvider(apiKey?: string): GeminiVisionProvider | null {
  // Try various ways to get the API key
  let key = apiKey;

  if (!key && typeof process !== 'undefined' && process.env) {
    key = process.env.GEMINI_API_KEY;
  }

  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.GEMINI_API_KEY;
  }

  if (!key) {
    console.warn('[GeminiVision] GEMINI_API_KEY not configured');
    return null;
  }

  return new GeminiVisionProvider({ apiKey: key });
}

export default GeminiVisionProvider;
