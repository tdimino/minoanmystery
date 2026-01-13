/**
 * OpenRouter LLM Provider
 *
 * Provides LLM inference via OpenRouter API with streaming support.
 * Uses the OpenAI-compatible API format.
 */

import type { LLMProvider } from '../core/CognitiveStep';

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  siteUrl?: string;
  siteName?: string;
}

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private defaultModel: string;
  private siteUrl: string;
  private siteName: string;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'google/gemini-3-flash-preview';
    this.siteUrl = config.siteUrl ?? 'https://minoanmystery.org';
    this.siteName = config.siteName ?? 'Minoan Mystery';
  }

  async generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<string | AsyncIterable<string>> {
    const model = options.model ?? this.defaultModel;
    const stream = options.stream ?? false;

    const requestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 150,
      stream,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.siteUrl,
        'X-Title': this.siteName,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    if (stream) {
      return this.streamResponse(response);
    } else {
      const data = await response.json();
      return data.choices[0]?.message?.content ?? '';
    }
  }

  private async *streamResponse(response: Response): AsyncIterable<string> {
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
 * Create OpenRouter provider from environment
 */
export function createOpenRouterProvider(apiKey?: string): OpenRouterProvider {
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : undefined);
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is required');
  }
  return new OpenRouterProvider({ apiKey: key });
}

export default OpenRouterProvider;
