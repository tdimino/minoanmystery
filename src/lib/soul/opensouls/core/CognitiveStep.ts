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

/**
 * LLM Provider interface - will be implemented by provider modules
 */
export interface LLMProvider {
  generate(
    messages: Array<{ role: string; content: string; name?: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string | AsyncIterable<string>>;
}

// Global provider instance (set by initialization)
let globalProvider: LLMProvider | null = null;

export function setLLMProvider(provider: LLMProvider): void {
  globalProvider = provider;
}

export function getLLMProvider(): LLMProvider {
  if (!globalProvider) {
    throw new Error(
      'LLM provider not initialized. Call setLLMProvider() before using cognitive steps.'
    );
  }
  return globalProvider;
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
    const provider = getLLMProvider();
    const config = factory(userArgs);
    const stream = opts?.stream ?? false;

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

      const responseStream = (await provider.generate(messages, {
        model: opts?.model,
        temperature: opts?.temperature,
        stream: true,
      })) as AsyncIterable<string>;

      // Create a tee'd stream - one for the caller, one for post-processing
      let fullResponse = '';
      const outputChunks: string[] = [];

      const outputStream = (async function* () {
        for await (const chunk of responseStream) {
          fullResponse += chunk;
          outputChunks.push(chunk);
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

          resolvePostProcess(result);
        } catch (error) {
          // If post-process fails, still resolve with raw response
          resolvePostProcess(fullResponse as unknown as PostProcessReturnType);
        }
      })();

      // Create finished memory (updated after stream completes)
      const finishedMemory = memory.withMemory({
        role: ChatMessageRoleEnum.Assistant,
        content: '', // Will be filled by consumer
        name: memory.soulName,
      });

      return [finishedMemory, outputStream, postProcessPromise];
    } else {
      // Non-streaming mode
      const response = (await provider.generate(messages, {
        model: opts?.model,
        temperature: opts?.temperature,
        stream: false,
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

      return [finalMemory, result];
    }
  }

  return cognitiveStep as CognitiveStep<UserArgType, PostProcessReturnType>;
}

export default createCognitiveStep;
