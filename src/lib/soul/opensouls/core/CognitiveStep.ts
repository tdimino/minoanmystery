/**
 * CognitiveStep - Factory for creating cognitive transformation functions
 *
 * Cognitive steps are pure functions that transform WorkingMemory using an LLM.
 * They follow the Open Souls pattern: (memory, args, opts) => [newMemory, result]
 */

import { WorkingMemory } from './WorkingMemory';
import { ChatMessageRoleEnum } from './types';
import type {
  Memory,
  CognitiveStep,
  CognitiveStepConfig,
  CognitiveStepFactory,
} from './types';
import { createDeferredPromise } from './utils';
import { getSoulLogger, type TokenUsage } from './SoulLogger';

/**
 * LLM Provider interface - will be implemented by provider modules
 */
export interface LLMProvider {
  name: string;  // Provider name for logging (e.g., 'groq', 'openrouter')
  generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      thinkingEffort?: 'none' | 'low' | 'medium' | 'high';
      onUsage?: (usage: TokenUsage) => void;  // Callback for token tracking
    }
  ): Promise<string | AsyncIterable<string>>;
}

// Provider registry for multi-provider support
const providerRegistry: Map<string, LLMProvider> = new Map();

// Default provider (for models without prefix)
let defaultProvider: LLMProvider | null = null;

/**
 * Register an LLM provider with a prefix (e.g., 'groq', 'openrouter')
 */
export function registerProvider(prefix: string, provider: LLMProvider): void {
  providerRegistry.set(prefix, provider);
}

/**
 * Set the default provider (for models without a prefix)
 */
export function setLLMProvider(provider: LLMProvider): void {
  defaultProvider = provider;
  // Also register as 'openrouter' for explicit prefix usage
  registerProvider('openrouter', provider);
}

/**
 * Get the appropriate provider for a model
 * Models with 'groq/' prefix use Groq, others use default
 */
export function getLLMProvider(model?: string): LLMProvider {
  if (model) {
    // Check for provider prefix
    const prefixMatch = model.match(/^([a-z]+)\//);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const provider = providerRegistry.get(prefix);
      if (provider) {
        return provider;
      }
      // If prefix not found, warn and fall through to default
      console.warn(`[LLMProvider] Unknown prefix '${prefix}', using default provider`);
    }
  }

  if (!defaultProvider) {
    throw new Error(
      'LLM provider not initialized. Call setLLMProvider() before using cognitive steps.'
    );
  }
  return defaultProvider;
}

/**
 * Strip provider prefix from model string for API calls
 */
export function stripModelPrefix(model: string): string {
  return model.replace(/^[a-z]+\//, '');
}

/**
 * createCognitiveStep - Factory for creating typed cognitive steps
 *
 * @template UserArgType - The type of user arguments passed to the step
 * @template PostProcessReturnType - The type returned by postProcess (default: string)
 *
 * @example
 * const externalDialog = createCognitiveStep<string>((instructions) => ({
 *   command: ({ soulName }) => ({
 *     role: ChatMessageRoleEnum.System,
 *     name: soulName,
 *     content: `You are ${soulName}. ${instructions}`
 *   }),
 *   postProcess: async (memory, response) => [
 *     { role: ChatMessageRoleEnum.Assistant, content: response, name: memory.soulName },
 *     response
 *   ]
 * }));
 */
export function createCognitiveStep<UserArgType, PostProcessReturnType = string>(
  factory: CognitiveStepFactory<UserArgType, PostProcessReturnType>
): CognitiveStep<UserArgType, PostProcessReturnType> {
  // The actual cognitive step function with overloads
  async function cognitiveStep(
    memory: WorkingMemory,
    userArgs: UserArgType,
    opts?: { stream?: boolean; model?: string; temperature?: number }
  ): Promise<
    | [WorkingMemory, PostProcessReturnType]
    | [WorkingMemory, AsyncIterable<string>, Promise<PostProcessReturnType>]
  > {
    // Get provider based on model prefix (e.g., 'groq/kimi-k2' uses Groq provider)
    const provider = getLLMProvider(opts?.model);
    const config = factory(userArgs);
    const stream = opts?.stream ?? false;

    // Strip provider prefix from model for API call
    const modelForApi = opts?.model ? stripModelPrefix(opts.model) : undefined;

    // Build the command message
    const commandMemory = config.command(memory);

    // Add command to memory for context
    const withCommand = memory.withMemory(commandMemory);

    // Convert to messages for LLM
    const messages = withCommand.toMessages();

    if (stream) {
      // Streaming mode
      const { promise: postProcessPromise, resolve: resolvePostProcess } =
        createDeferredPromise<PostProcessReturnType>();

      const logger = getSoulLogger();
      const startTime = Date.now();
      let tokenUsage: TokenUsage | undefined;

      // Log cognitive step start
      logger.cognitiveStepStart('cognitiveStep', memory.length, userArgs);
      logger.providerCall(provider.name, modelForApi || 'default', messages.length);

      const responseStream = (await provider.generate(messages, {
        model: modelForApi,
        temperature: opts?.temperature,
        stream: true,
        onUsage: (usage) => {
          tokenUsage = usage;
          logger.providerResponse(provider.name, usage, Date.now() - startTime);
        },
      })) as AsyncIterable<string>;

      // Create a tee'd stream - one for the caller, one for post-processing
      let fullResponse = '';

      const outputStream = (async function* () {
        for await (const chunk of responseStream) {
          fullResponse += chunk;
          yield chunk;
        }

        // After stream completes, run post-processing
        try {
          const [memoryUpdate, result] = config.postProcess
            ? await config.postProcess(memory, fullResponse)
            : [
                {
                  role: ChatMessageRoleEnum.Assistant,
                  content: fullResponse,
                  name: memory.soulName,
                },
                fullResponse as unknown as PostProcessReturnType,
              ];

          // Log cognitive step completion
          logger.cognitiveStepEnd(
            'cognitiveStep',
            fullResponse,
            memory.length + 1,
            {
              model: modelForApi,
              provider: provider.name,
              tokens: tokenUsage,
              streaming: true,
            }
          );

          resolvePostProcess(result);
        } catch (error) {
          // If post-process fails, still resolve with raw response
          resolvePostProcess(fullResponse as unknown as PostProcessReturnType);
        }
      })();

      // Create finished memory with pending promise (Open Souls streaming pattern)
      // The finished promise resolves when streaming completes, allowing:
      // `await memory.finished` after `actions.speak(stream)`
      const finishedMemory = memory.withPendingFinished().withMemory({
        role: ChatMessageRoleEnum.Assistant,
        content: '', // Will be filled by consumer
        name: memory.soulName,
      });

      // Wrap the output stream to resolve finished when done
      const wrappedStream = (async function* () {
        try {
          for await (const chunk of outputStream) {
            yield chunk;
          }
        } finally {
          // Resolve the finished promise after stream completes
          finishedMemory.resolveFinished();
        }
      })();

      return [finishedMemory, wrappedStream, postProcessPromise];
    } else {
      // Non-streaming mode
      const logger = getSoulLogger();
      const startTime = Date.now();
      let tokenUsage: TokenUsage | undefined;

      // Log cognitive step start
      logger.cognitiveStepStart('cognitiveStep', memory.length, userArgs);
      logger.providerCall(provider.name, modelForApi || 'default', messages.length);

      const response = (await provider.generate(messages, {
        model: modelForApi,
        temperature: opts?.temperature,
        stream: false,
        onUsage: (usage) => {
          tokenUsage = usage;
          logger.providerResponse(provider.name, usage, Date.now() - startTime);
        },
      })) as string;

      // Run post-processing
      const [memoryUpdate, result] = config.postProcess
        ? await config.postProcess(memory, response)
        : [
            {
              role: ChatMessageRoleEnum.Assistant,
              content: response,
              name: memory.soulName,
            },
            response as unknown as PostProcessReturnType,
          ];

      // Add response to memory
      const finalMemory = memoryUpdate
        ? memory.withMemory(memoryUpdate)
        : memory.withMemory({
            role: ChatMessageRoleEnum.Assistant,
            content: response,
            name: memory.soulName,
          });

      // Log cognitive step completion
      logger.cognitiveStepEnd(
        'cognitiveStep',
        response,
        finalMemory.length,
        {
          model: modelForApi,
          provider: provider.name,
          tokens: tokenUsage,
          streaming: false,
        }
      );

      return [finalMemory, result];
    }
  }

  return cognitiveStep as CognitiveStep<UserArgType, PostProcessReturnType>;
}

export default createCognitiveStep;
