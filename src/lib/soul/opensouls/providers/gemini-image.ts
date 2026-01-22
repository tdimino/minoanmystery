/**
 * Gemini Image Provider
 *
 * TypeScript wrapper for Google's Gemini 3 Pro Image API.
 * Generates images with Minoan aesthetic using forensic prompts.
 *
 * Model: gemini-3-pro-image-preview
 * Supports text-to-image with responseModalities: ["TEXT", "IMAGE"]
 *
 * Based on gemini-claude-resonance skill's minoan_tarot.py
 */

export interface GeminiImageConfig {
  apiKey: string;
  model?: string;
  /** Temperature for style matching (default: 0.5) */
  temperature?: number;
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
  /** Reference images for style matching (base64 data URLs) */
  referenceImages?: string[];
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
 * Minoan Color Palette - forensically extracted from reference cards
 * From gemini-claude-resonance skill's minoan_tarot.py
 */
export const MINOAN_COLORS = {
  terracotta_red: '#C84C3C',      // Backgrounds, clothing, decorative bands
  ochre_yellow: '#D4A542',         // Clothing, bulls, decorative elements
  slate_blue: '#4A5D7A',           // Sky backgrounds, clothing
  teal_turquoise: '#3D9CA8',       // Sea backgrounds, spirals, accents
  cream: '#F5E6D0',                // Backgrounds, female skin
  periwinkle_border: '#6B7DB3',    // Card borders (thick outer frame)
  male_skin: '#8B4513',            // Reddish-brown male skin
  female_skin: '#FFF8F0',          // White/pale female skin
  deep_indigo: '#2C3E5C',          // Night backgrounds
  violet_purple: '#6B4C8C',        // Ritual/mystical backgrounds
  lime_green: '#7CB342',           // Nature backgrounds
  black: '#000000',                // Bold outlines
} as const;

/**
 * Minoan Tarot System Prompt - comprehensive style instructions
 * From gemini-claude-resonance skill's minoan_tarot.py
 */
export const MINOAN_SYSTEM_PROMPT = `The artistic style mimics ancient Minoan frescoes from Knossos and Akrotiri. It features flat two-dimensional perspective, profile faces with frontal eyes, bold outlines, and a specific color palette:

COLOR PALETTE (use these exact hex values):
- Terracotta Red (${MINOAN_COLORS.terracotta_red}) - Backgrounds, clothing, decorative bands
- Ochre Yellow (${MINOAN_COLORS.ochre_yellow}) - Clothing, bulls, decorative elements
- Slate Blue (${MINOAN_COLORS.slate_blue}) - Sky backgrounds, clothing
- Teal/Turquoise (${MINOAN_COLORS.teal_turquoise}) - Sea backgrounds, spirals, accents
- Cream (${MINOAN_COLORS.cream}) - Backgrounds, female skin
- Periwinkle Blue (${MINOAN_COLORS.periwinkle_border}) - Card borders (thick outer frame)
- Reddish-Brown (${MINOAN_COLORS.male_skin}) - Male skin
- White/Pale (${MINOAN_COLORS.female_skin}) - Female skin
- Deep Indigo (${MINOAN_COLORS.deep_indigo}) - Night/mystical backgrounds
- Black (${MINOAN_COLORS.black}) - All bold outlines

FIGURE CONVENTIONS:
- Figures have pinched waists and stylized elongated proportions
- Men typically have reddish-brown skin; women have white/pale skin
- Profile faces with frontal eyes (Egyptian-style poses)
- Bare-breasted women in tiered flounced skirts (common Minoan dress)
- Men in loincloths or kilts

CARD STRUCTURE:
- Thick periwinkle-blue border (${MINOAN_COLORS.periwinkle_border}) around entire card
- Decorative horizontal bands at top and bottom (rosettes, spirals, waves, wheat)
- Card title in white sans-serif font at the bottom of the border
- Main imagery against solid color background (slate blue, terracotta, cream, or themed)

MINOAN ICONOGRAPHY:
- Labrys (double-headed axe)
- Horns of Consecration
- Snake Goddess (frontal pose, arms holding serpents)
- Bull leaping / bull heads with curved horns
- Dolphins, octopi (Marine Style)
- Griffins (lion body, eagle head/wings)
- Swallows in spiral flight
- Sacred lilies, papyrus, olive branches
- Spiral motifs (running spirals, tetraskelion)

ARTISTIC STYLE:
- Flat colors - NO gradients, NO shading, NO 3D effects, NO photorealism
- Colors are solid blocks like ancient frescoes or gouache on paper
- Bold black outlines around every figure, object, and shape
- Flat, even lighting with no cast shadows
- Two-dimensional composition typical of fresco art`;

/**
 * Style modifiers for different card moods
 */
const STYLE_PREFIXES: Record<string, string> = {
  ethereal: 'Ethereal, dreamlike atmosphere. ',
  mythological: 'Mythological, ceremonial atmosphere. ',
  labyrinthine: 'Labyrinthine, mysterious atmosphere with spiral motifs. ',
  divine: 'Divine, sacred ritual atmosphere. ',
  ancient: 'Ancient Mediterranean Bronze Age aesthetic. ',
};

export class GeminiImageProvider {
  private apiKey: string;
  private model: string;
  private temperature: number;

  constructor(config: GeminiImageConfig) {
    this.apiKey = config.apiKey;
    // Use Gemini 3 Pro for image generation (best for faithful style matching)
    this.model = config.model ?? 'gemini-3-pro-image-preview';
    // Lower temperature for more faithful style reproduction
    this.temperature = config.temperature ?? 0.5;
  }

  /**
   * Generate an image from a text prompt
   * Uses Gemini 3 Pro formula with forensic-style prompts
   */
  async generate(options: GeminiImageOptions): Promise<GeminiImageResult> {
    const startTime = Date.now();

    try {
      // Build the full prompt with Minoan system prompt and style modifiers
      let fullPrompt = MINOAN_SYSTEM_PROMPT + '\n\n';

      // Add style-specific atmosphere
      if (options.style && STYLE_PREFIXES[options.style]) {
        fullPrompt += STYLE_PREFIXES[options.style];
      }

      // Add the specific image prompt
      fullPrompt += '\nGENERATE:\n' + options.prompt;

      // Add negative prompt if provided
      if (options.negativePrompt) {
        fullPrompt += `\n\nAVOID: ${options.negativePrompt}`;
      }

      // Add critical instruction - stronger when reference images are provided
      if (options.referenceImages && options.referenceImages.length > 0) {
        fullPrompt += '\n\nCRITICAL: Match the reference images EXACTLY - same flat color treatment, same bold black outlines, same decorative patterns. This card must look like it belongs in the same deck.';
      } else {
        fullPrompt += '\n\nCRITICAL: Match the Minoan fresco style exactly - flat colors, bold outlines, no 3D effects.';
      }

      // Build parts array - reference images first (visual memory), then text prompt
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Add reference images as visual memory (before the prompt)
      if (options.referenceImages && options.referenceImages.length > 0) {
        for (const dataUrl of options.referenceImages) {
          // Parse data URL: "data:image/jpeg;base64,/9j/4AAQ..."
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
        console.log(`[GeminiImage] Added ${parts.length} reference images for style matching`);
      }

      // Add the text prompt last
      parts.push({ text: fullPrompt });

      // Build request body for Gemini API with proper imageConfig
      const requestBody = {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: this.temperature,
          maxOutputTokens: 8192,
          // imageConfig for aspect ratio (Gemini 3 Pro feature)
          imageConfig: {
            aspectRatio: options.aspectRatio ?? '3:4', // Tarot card proportions
          },
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

      const responseParts = firstCandidate.content.parts || [];
      let imageDataUrl: string | undefined;
      let textResponse: string | undefined;

      for (const part of responseParts) {
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
 * Supports both Node.js (process.env) and Astro/Vite (import.meta.env)
 */
export function createGeminiImageProvider(apiKey?: string): GeminiImageProvider | null {
  // Try multiple sources for the API key
  let key = apiKey;

  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.GEMINI_API_KEY;
  }

  if (!key && typeof process !== 'undefined' && process.env) {
    key = process.env.GEMINI_API_KEY;
  }

  if (!key) {
    console.warn('[GeminiImage] GEMINI_API_KEY not configured');
    return null;
  }
  return new GeminiImageProvider({ apiKey: key });
}

export default GeminiImageProvider;
