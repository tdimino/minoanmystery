/**
 * Model Configuration
 *
 * Defines which models to use for different cognitive tasks.
 * Following the Open Souls paradigm of separating:
 * - External dialog (persona/voice)
 * - Internal thinking (reasoning/decisions)
 *
 * Provider prefixes:
 * - 'groq/' - Use Groq provider (ultra-low latency)
 * - 'openrouter/' or no prefix - Use OpenRouter provider
 */

// ============================================================================
// PERSONA MODEL - User-facing dialog with consistent voice/style
// ============================================================================
// Used by: externalDialog
// Requirements: Natural language generation, streaming support, personality consistency

// Kimi K2 on Groq - Ultra-low latency, excellent personality and emotional intelligence
export const PERSONA_MODEL = 'groq/kimi-k2';

// Alternative options:
// export const PERSONA_MODEL = 'google/gemini-3-flash-preview';  // Gemini Flash via OpenRouter
// export const PERSONA_MODEL = 'groq/llama-3.3-70b-versatile';  // Llama 3.3 70B on Groq
// export const PERSONA_MODEL = 'anthropic/claude-3.5-sonnet';  // Claude for nuanced responses

// ============================================================================
// THINKING MODEL - Internal reasoning and decision-making
// ============================================================================
// Used by: internalMonologue, decision, mentalQuery, brainstorm
// Requirements: Fast inference, good reasoning, structured output (JSON)

// Gemini 3 Flash - Fast, excellent structured output
export const THINKING_MODEL = 'google/gemini-3-flash-preview';

// Alternative options:
// export const THINKING_MODEL = 'groq/qwen3-32b';  // Qwen3 32B - excellent structured output
// export const THINKING_MODEL = 'groq/llama-3.1-8b-instant';  // Fastest option
// export const THINKING_MODEL = 'google/gemini-3-flash-preview';  // Same as persona

// ============================================================================
// Model Utilities
// ============================================================================

export type ModelRole = 'persona' | 'thinking';

/**
 * Get the model for a specific role
 */
export function getModelForRole(role: ModelRole): string {
  switch (role) {
    case 'persona':
      return PERSONA_MODEL;
    case 'thinking':
      return THINKING_MODEL;
  }
}

/**
 * Get provider from model string
 * Returns 'groq' if model starts with 'groq/', otherwise 'openrouter'
 */
export function getProviderFromModel(model: string): 'groq' | 'openrouter' {
  return model.startsWith('groq/') ? 'groq' : 'openrouter';
}

/**
 * Strip provider prefix from model string
 */
export function stripProviderPrefix(model: string): string {
  if (model.startsWith('groq/')) {
    return model.replace('groq/', '');
  }
  if (model.startsWith('openrouter/')) {
    return model.replace('openrouter/', '');
  }
  return model;
}
