/**
 * Gemini Image Provider
 *
 * TypeScript wrapper for Google's Gemini 3 Pro Image API.
 * Generates images from text prompts with Minoan aesthetic optimizations.
 *
 * Model: gemini-2.0-flash-preview-image-generation (or later versions)
 * Supports text-to-image with responseModalities: ["TEXT", "IMAGE"]
 */

export interface GeminiImageConfig {
  apiKey: string;
  model?: string;
}

export interface GeminiImageOptions {
  /** Image prompt (2-4 sentences recommended) */
  prompt: string;
  /** Style modifier for Minoan aesthetic */
  style?: 'ethereal' | 'mythological' | 'labyrinthine' | 'divine' | 'ancient';
  /** Aspect ratio */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  /** Optional negative prompt */
  negativePrompt?: string;
}

export interface GeminiImageResult {
  success: boolean;
  /** Base64 data URL (image/png or image/jpeg) */
  imageDataUrl?: string;
  /** Text response from Gemini (if any) */
  textResponse?: string;
  /** Error message if failed */
  error?: string;
  /** Generation metadata */
  metadata?: {
    model: string;
    promptLength: number;
    generationTimeMs: number;
  };
}

/**
 * Style modifiers for Minoan aesthetic
 * These are prepended to the user's prompt
 */
const STYLE_PREFIXES: Record<string, string> = {
  ethereal: 'Ethereal, dreamlike, translucent, soft luminous glow, ancient mystery, ',
  mythological: 'Ancient mythological scene, classical Greek art style, Minoan fresco aesthetic, ',
  labyrinthine: 'Labyrinth motifs, spiral patterns, Knossos palace architecture, Minoan civilization, ',
  divine: 'Divine feminine presence, goddess imagery, sacred symbols, ritual atmosphere, ',
  ancient: 'Ancient Mediterranean, Bronze Age aesthetic, weathered textures, archaeological beauty, ',
};

/**
 * Default Minoan style suffix
 */
const MINOAN_SUFFIX = ' Minoan aesthetic, Mediterranean palette, warm ochres and deep blues, no text or watermarks.';

export class GeminiImageProvider {
  private apiKey: string;
  private model: string;

  constructor(config: GeminiImageConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gemini-2.0-flash-preview-image-generation';
  }

  /**
   * Generate an image from a text prompt
   */
  async generate(options: GeminiImageOptions): Promise<GeminiImageResult> {
    const startTime = Date.now();

    try {
      // Build the full prompt with style modifiers
      let fullPrompt = options.prompt;

      // Prepend style prefix if specified
      if (options.style && STYLE_PREFIXES[options.style]) {
        fullPrompt = STYLE_PREFIXES[options.style] + fullPrompt;
      }

      // Add Minoan aesthetic suffix
      fullPrompt += MINOAN_SUFFIX;

      // Add negative prompt if provided
      if (options.negativePrompt) {
        fullPrompt += ` Avoid: ${options.negativePrompt}`;
      }

      // Build request body for Gemini API
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          // Note: Gemini may not support aspectRatio directly in all versions
          // This is a placeholder for future API updates
        },
      };

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Extract image and text from response
      const candidates = data.candidates || [];
      const firstCandidate = candidates[0];

      if (!firstCandidate || !firstCandidate.content) {
        throw new Error('No content in Gemini response');
      }

      const parts = firstCandidate.content.parts || [];
      let imageDataUrl: string | undefined;
      let textResponse: string | undefined;

      for (const part of parts) {
        if (part.inlineData) {
          // Image data
          const mimeType = part.inlineData.mimeType || 'image/png';
          const base64Data = part.inlineData.data;
          imageDataUrl = `data:${mimeType};base64,${base64Data}`;
        } else if (part.text) {
          // Text response
          textResponse = part.text;
        }
      }

      if (!imageDataUrl) {
        // Check if there's a text-only response (model may explain why it couldn't generate)
        if (textResponse) {
          return {
            success: false,
            error: `Gemini returned text instead of image: ${textResponse.slice(0, 200)}`,
            textResponse,
            metadata: {
              model: this.model,
              promptLength: fullPrompt.length,
              generationTimeMs: Date.now() - startTime,
            },
          };
        }
        throw new Error('No image data in Gemini response');
      }

      return {
        success: true,
        imageDataUrl,
        textResponse,
        metadata: {
          model: this.model,
          promptLength: fullPrompt.length,
          generationTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GeminiImage] Generation failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          model: this.model,
          promptLength: options.prompt.length,
          generationTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}

/**
 * Create Gemini image provider from environment
 */
export function createGeminiImageProvider(apiKey?: string): GeminiImageProvider | null {
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  if (!key) {
    console.warn('[GeminiImage] GEMINI_API_KEY not configured');
    return null;
  }
  return new GeminiImageProvider({ apiKey: key });
}

export default GeminiImageProvider;
