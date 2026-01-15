/**
 * Groq LLM Provider
 *
 * Ultra-low latency inference using Groq's LPU architecture.
 * Supports Kimi K2, Qwen3, and Llama models for different cognitive tasks.
 *
 * Model selection:
 * - Kimi K2: Best for emotional intelligence and nuanced understanding
 * - Qwen3-32B: Excellent for structured output and reasoning
 * - Llama 3.3 70B: Strong general-purpose model
 */

import type { LLMProvider } from '../core/CognitiveStep';

export interface GroqConfig {
  apiKey: string;
  defaultModel?: string;
}

/**
 * Normalize model names for Groq
 * Maps common aliases to official Groq model IDs
 */
function normalizeGroqModel(model: string): string {
  // Remove provider prefix if present
  if (model.startsWith('groq/')) {
    return model.replace('groq/', '');
  }

  // Common aliases - map to Groq's actual model IDs
  const modelMap: Record<string, string> = {
    // Kimi K2 - Preview model (262k context, 200 T/s)
    'kimi-k2': 'moonshotai/kimi-k2-instruct',
    'kimi': 'moonshotai/kimi-k2-instruct',
    'moonshotai/kimi-k2': 'moonshotai/kimi-k2-instruct',

    // Llama 3.3 70B - Production model (280 T/s, 131k context)
    'llama-70b': 'llama-3.3-70b-versatile',
    'llama-3.3-70b': 'llama-3.3-70b-versatile',

    // Llama 3.1 8B - Production model (560 T/s, fastest)
    'llama-8b': 'llama-3.1-8b-instant',
    'llama-3.1-8b': 'llama-3.1-8b-instant',

    // Qwen3 32B - Preview model (400 T/s, excellent structured output)
    'qwen3-32b': 'qwen/qwen3-32b',
    'qwen-32b': 'qwen/qwen3-32b',
    'qwen': 'qwen/qwen3-32b',
  };

  return modelMap[model] || model;
}

/**
 * Check if a model is a reasoning/thinking model that outputs <think> blocks
 */
function isReasoningModel(model: string): boolean {
  const normalizedModel = model.toLowerCase();
  // Qwen3 models use <think>...</think> blocks
  return normalizedModel.includes('qwen3') || normalizedModel.includes('qwen/qwen3');
}

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  private apiKey: string;
  private defaultModel: string;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'moonshotai/kimi-k2-instruct';
  }

  async generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      thinkingEffort?: 'none' | 'low' | 'medium' | 'high';
      onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
    } = {}
  ): Promise<string | AsyncIterable<string>> {
    const model = normalizeGroqModel(options.model ?? this.defaultModel);
    const stream = options.stream ?? false;

    // Build request body
    const requestBody: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
      stream,
    };

    // Add reasoning_effort for Qwen3 models (default to 'none' for speed)
    if (isReasoningModel(model)) {
      requestBody.reasoning_effort = options.thinkingEffort ?? 'none';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    if (stream) {
      return this.streamResponse(response, options.onUsage);
    } else {
      const data = await response.json();
      // Report token usage if callback provided
      if (options.onUsage && data.usage) {
        options.onUsage({
          prompt_tokens: data.usage.prompt_tokens ?? 0,
          completion_tokens: data.usage.completion_tokens ?? 0,
          total_tokens: data.usage.total_tokens ?? 0,
        });
      }
      return data.choices[0]?.message?.content ?? '';
    }
  }

  private async *streamResponse(
    response: Response,
    onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  ): AsyncIterable<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
              // Capture usage from final chunk if available
              if (parsed.usage && onUsage) {
                onUsage({
                  prompt_tokens: parsed.usage.prompt_tokens ?? 0,
                  completion_tokens: parsed.usage.completion_tokens ?? 0,
                  total_tokens: parsed.usage.total_tokens ?? 0,
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Create Groq provider from environment
 */
export function createGroqProvider(apiKey?: string): GroqProvider {
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.GROQ_API_KEY : undefined);
  if (!key) {
    throw new Error('GROQ_API_KEY is required');
  }
  return new GroqProvider({ apiKey: key });
}

export default GroqProvider;
