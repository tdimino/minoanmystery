/**
 * Baseten LLM Provider
 *
 * OpenAI-compatible inference platform with flexible GPU tiers.
 * Secondary provider for voice mode (fallback when Groq unavailable).
 * Supports Kimi K2, DeepSeek, and other models.
 */

import type { LLMProvider } from '../core/CognitiveStep';

export interface BasetenConfig {
  apiKey: string;
  defaultModel?: string;
}

/**
 * Normalize model names for Baseten
 * Maps common aliases to official Baseten model IDs
 */
function normalizeBasetenModel(model: string): string {
  // Remove provider prefix if present
  if (model.startsWith('baseten/')) {
    return model.replace('baseten/', '');
  }

  // Common aliases
  const modelMap: Record<string, string> = {
    'kimi-k2': 'moonshotai/kimi-k2',
    'kimi': 'moonshotai/kimi-k2',
    'deepseek-v3': 'deepseek-ai/DeepSeek-V3-0324',
    'deepseek': 'deepseek-ai/DeepSeek-V3-0324',
  };

  return modelMap[model] || model;
}

export class BasetenProvider implements LLMProvider {
  readonly name = 'baseten';
  private apiKey: string;
  private defaultModel: string;

  constructor(config: BasetenConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'moonshotai/kimi-k2';
  }

  async generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
    } = {}
  ): Promise<string | AsyncIterable<string>> {
    const model = normalizeBasetenModel(options.model ?? this.defaultModel);
    const stream = options.stream ?? false;

    const requestBody = {
      model,
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
      stream,
    };

    const response = await fetch('https://inference.baseten.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Baseten API error: ${response.status} - ${error}`);
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
 * Create Baseten provider from environment or config
 */
export function createBasetenProvider(config?: string | BasetenConfig): BasetenProvider {
  if (typeof config === 'object') {
    return new BasetenProvider(config);
  }
  const key = config ?? (typeof process !== 'undefined' ? process.env.BASETEN_API_KEY : undefined);
  if (!key) {
    throw new Error('BASETEN_API_KEY is required');
  }
  return new BasetenProvider({ apiKey: key });
}

export default BasetenProvider;
