/**
 * SoulLogger - Comprehensive logging for Soul Engine observability
 *
 * Non-invasive logging system following the Open Souls functional paradigm.
 * Tracks cognitive steps, memory mutations, LLM calls, and state transitions.
 *
 * Enable via environment variables:
 * - SOUL_DEBUG=true                    # Enable logging
 * - SOUL_LOG_LEVEL=verbose             # minimal | standard | verbose | debug (default: verbose)
 *
 * Log Levels:
 * - minimal: Basic step completion only
 * - standard: + provider info, tokens, duration
 * - verbose: + truncated prompt (200 chars) and response (500 chars)
 * - debug: + FULL response content, WorkingMemory dump, internalMonologue contents
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type LogLevel = 'minimal' | 'standard' | 'verbose' | 'debug';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CognitiveStepLog {
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  memoryBefore: number;
  memoryAfter?: number;
  model?: string;
  provider?: string;
  tokens?: TokenUsage;
  prompt?: string;
  response?: string;
  streaming?: boolean;
}

export interface MemoryMutationLog {
  operation: string;
  before: number;
  after: number;
  region?: string;
  timestamp: number;
}

export interface StateTransitionLog {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
}

interface SessionStats {
  cognitiveSteps: Map<string, number>;
  totalLLMCalls: number;
  totalTokens: TokenUsage;
  totalDurationMs: number;
  memoryGrowth: { start: number; end: number };
  stateTransitions: StateTransitionLog[];
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

interface SoulLoggerConfig {
  enabled: boolean;
  logLevel: LogLevel;
}

function getConfig(): SoulLoggerConfig {
  // Check environment variables using import.meta.env (Astro/Vite)
  // Falls back to process.env for Node.js scripts
  let envDebug: string | undefined;
  let envLevel: string | undefined;

  // @ts-ignore - import.meta.env exists in Vite/Astro runtime
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    envDebug = import.meta.env.SOUL_DEBUG;
    // @ts-ignore
    envLevel = import.meta.env.SOUL_LOG_LEVEL;
  } else if (typeof process !== 'undefined' && process.env) {
    envDebug = process.env.SOUL_DEBUG;
    envLevel = process.env.SOUL_LOG_LEVEL;
  }

  return {
    enabled: envDebug === 'true',
    logLevel: (envLevel as LogLevel) || 'verbose',
  };
}

// ─────────────────────────────────────────────────────────────
// Console Formatting (ANSI colors for terminal)
// ─────────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const ICONS = {
  brain: '🧠',
  speech: '💬',
  thought: '💭',
  decision: '⚖️',
  query: '❓',
  memory: '📝',
  state: '🔄',
  summary: '📊',
  token: '🎟️',
};

function getStepIcon(stepName: string): string {
  if (stepName.includes('external') || stepName.includes('dialog')) return ICONS.speech;
  if (stepName.includes('internal') || stepName.includes('monologue')) return ICONS.thought;
  if (stepName.includes('decision')) return ICONS.decision;
  if (stepName.includes('query')) return ICONS.query;
  return ICONS.brain;
}

// ─────────────────────────────────────────────────────────────
// SoulLogger Class
// ─────────────────────────────────────────────────────────────

class SoulLogger {
  private config: SoulLoggerConfig;
  private activeStep: CognitiveStepLog | null = null;
  private sessionStats: SessionStats;

  constructor() {
    this.config = getConfig();
    this.sessionStats = this.createEmptyStats();
  }

  private createEmptyStats(): SessionStats {
    return {
      cognitiveSteps: new Map(),
      totalLLMCalls: 0,
      totalTokens: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      totalDurationMs: 0,
      memoryGrowth: { start: 0, end: 0 },
      stateTransitions: [],
    };
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get logLevel(): LogLevel {
    return this.config.logLevel;
  }

  // ─── Cognitive Step Lifecycle ───────────────────────────────

  cognitiveStepStart(
    stepName: string,
    memorySize: number,
    args?: unknown
  ): void {
    if (!this.enabled) return;

    this.activeStep = {
      name: stepName,
      startTime: Date.now(),
      memoryBefore: memorySize,
    };

    if (this.logLevel === 'verbose' && args) {
      const argsPreview = typeof args === 'string'
        ? args.slice(0, 200) + (args.length > 200 ? '...' : '')
        : JSON.stringify(args).slice(0, 200);
      this.activeStep.prompt = argsPreview;
    }

    // Track step count
    const count = this.sessionStats.cognitiveSteps.get(stepName) || 0;
    this.sessionStats.cognitiveSteps.set(stepName, count + 1);
  }

  cognitiveStepEnd(
    stepName: string,
    response: string,
    memoryAfter: number,
    options: {
      model?: string;
      provider?: string;
      tokens?: TokenUsage;
      streaming?: boolean;
    } = {}
  ): void {
    if (!this.enabled || !this.activeStep) return;

    const endTime = Date.now();
    const durationMs = endTime - this.activeStep.startTime;

    this.activeStep = {
      ...this.activeStep,
      endTime,
      durationMs,
      memoryAfter,
      response: this.logLevel === 'verbose' ? response.slice(0, 500) : undefined,
      ...options,
    };

    // Update session stats
    this.sessionStats.totalDurationMs += durationMs;
    this.sessionStats.memoryGrowth.end = memoryAfter;
    if (this.sessionStats.memoryGrowth.start === 0) {
      this.sessionStats.memoryGrowth.start = this.activeStep.memoryBefore;
    }

    if (options.tokens) {
      this.sessionStats.totalTokens.prompt_tokens += options.tokens.prompt_tokens;
      this.sessionStats.totalTokens.completion_tokens += options.tokens.completion_tokens;
      this.sessionStats.totalTokens.total_tokens += options.tokens.total_tokens;
    }

    // Print the step box
    this.printStepBox(this.activeStep);

    // In debug mode, also log full response
    if (this.logLevel === 'debug' && response) {
      this.logFullResponse(stepName, response);
    }

    this.activeStep = null;
  }

  // ─── Provider Calls ─────────────────────────────────────────

  providerCall(provider: string, model: string, messageCount: number): void {
    if (!this.enabled) return;

    this.sessionStats.totalLLMCalls++;

    if (this.activeStep) {
      this.activeStep.provider = provider;
      this.activeStep.model = model;
    }

    if (this.logLevel !== 'minimal') {
      console.log(
        `${COLORS.gray}  │ ${ICONS.token} Provider: ${provider}/${model} (${messageCount} messages)${COLORS.reset}`
      );
    }
  }

  providerResponse(
    provider: string,
    tokens: TokenUsage,
    durationMs: number
  ): void {
    if (!this.enabled) return;

    if (this.activeStep) {
      this.activeStep.tokens = tokens;
    }

    if (this.logLevel !== 'minimal') {
      const tokenStr = `${tokens.prompt_tokens} prompt + ${tokens.completion_tokens} completion = ${tokens.total_tokens} total`;
      console.log(
        `${COLORS.gray}  │ ${ICONS.token} Tokens: ${tokenStr} (${durationMs}ms)${COLORS.reset}`
      );
    }
  }

  // ─── Memory Mutations ───────────────────────────────────────

  memoryMutation(
    operation: string,
    before: number,
    after: number,
    region?: string
  ): void {
    if (!this.enabled) return;
    if (this.logLevel === 'minimal') return;

    const delta = after - before;
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
    const regionStr = region ? ` [${region}]` : '';

    console.log(
      `${COLORS.dim}  ${ICONS.memory} Memory${regionStr}: ${before} → ${after} (${deltaStr})${COLORS.reset}`
    );
  }

  // ─── State Transitions ──────────────────────────────────────

  stateTransition(from: string, to: string, reason: string): void {
    if (!this.enabled) return;

    this.sessionStats.stateTransitions.push({
      from,
      to,
      reason,
      timestamp: Date.now(),
    });

    if (this.logLevel !== 'minimal') {
      console.log(
        `\n${COLORS.magenta}${ICONS.state} State: ${from} → ${to}${COLORS.reset} ${COLORS.dim}(${reason})${COLORS.reset}\n`
      );
    }
  }

  // ─── Compression Events ─────────────────────────────────────

  compressionTriggered(before: number, after: number, reason: string): void {
    if (!this.enabled) return;

    console.log(
      `\n${COLORS.yellow}${ICONS.memory} Memory Compression: ${before} → ${after} memories${COLORS.reset} ${COLORS.dim}(${reason})${COLORS.reset}\n`
    );
  }

  // ─── Debug Logging (Full Content) ──────────────────────────

  /**
   * Log the full response from a cognitive step (no truncation)
   * Only outputs in 'debug' log level
   */
  logFullResponse(stepName: string, response: string): void {
    if (!this.enabled || this.logLevel !== 'debug') return;

    const icon = getStepIcon(stepName);
    console.log(`
${COLORS.blue}┌─ ${icon} ${stepName} [FULL RESPONSE] ${'─'.repeat(Math.max(0, 40 - stepName.length))}┐${COLORS.reset}
${COLORS.gray}${response}${COLORS.reset}
${COLORS.blue}└${'─'.repeat(65)}┘${COLORS.reset}
`);
  }

  /**
   * Log all messages in WorkingMemory
   * Only outputs in 'debug' log level
   */
  logWorkingMemory(
    memories: Array<{ role: string; content: string; name?: string }>,
    label?: string
  ): void {
    if (!this.enabled || this.logLevel !== 'debug') return;

    const headerLabel = label ? ` [${label}]` : '';
    console.log(`
${COLORS.magenta}┌─ ${ICONS.memory} WorkingMemory${headerLabel} (${memories.length} messages) ${'─'.repeat(30)}┐${COLORS.reset}`);

    memories.forEach((msg, i) => {
      const roleColor = msg.role === 'user' ? COLORS.green :
                        msg.role === 'assistant' ? COLORS.cyan :
                        COLORS.yellow;
      const nameStr = msg.name ? ` (${msg.name})` : '';
      const contentPreview = msg.content.length > 300
        ? msg.content.slice(0, 300) + '...[truncated]'
        : msg.content;

      console.log(`${COLORS.gray}│${COLORS.reset}`);
      console.log(`${roleColor}│  [${i}] ${msg.role.toUpperCase()}${nameStr}${COLORS.reset}`);
      console.log(`${COLORS.gray}│  ${contentPreview.replace(/\n/g, '\n│  ')}${COLORS.reset}`);
    });

    console.log(`${COLORS.magenta}└${'─'.repeat(65)}┘${COLORS.reset}
`);
  }

  /**
   * Log a single internalMonologue result (full content)
   * Only outputs in 'debug' log level
   */
  logInternalMonologue(thought: string, context?: string): void {
    if (!this.enabled || this.logLevel !== 'debug') return;

    const contextStr = context ? ` (${context})` : '';
    console.log(`
${COLORS.yellow}┌─ ${ICONS.thought} internalMonologue${contextStr} ${'─'.repeat(40)}┐${COLORS.reset}
${COLORS.gray}${thought}${COLORS.reset}
${COLORS.yellow}└${'─'.repeat(65)}┘${COLORS.reset}
`);
  }

  // ─── Session Summary ────────────────────────────────────────

  printSummary(): void {
    if (!this.enabled) return;

    const stats = this.sessionStats;
    const steps = Array.from(stats.cognitiveSteps.entries())
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');

    const tokens = stats.totalTokens;
    const growth = stats.memoryGrowth;
    const stateFlow = stats.stateTransitions.length > 0
      ? stats.stateTransitions.map(t => t.to).join(' → ')
      : 'none';

    console.log(`
${COLORS.bold}${ICONS.summary} Session Summary${COLORS.reset}
├── Cognitive Steps: ${stats.cognitiveSteps.size} types (${steps})
├── Total LLM Calls: ${stats.totalLLMCalls}
├── Total Tokens: ${tokens.total_tokens.toLocaleString()} (prompt: ${tokens.prompt_tokens.toLocaleString()} + completion: ${tokens.completion_tokens.toLocaleString()})
├── Total Duration: ${stats.totalDurationMs.toLocaleString()}ms
├── Memory Growth: ${growth.start} → ${growth.end} messages
└── State Flow: ${stateFlow}
`);
  }

  resetSession(): void {
    this.sessionStats = this.createEmptyStats();
    this.activeStep = null;
  }

  // ─── Private Helpers ────────────────────────────────────────

  private printStepBox(step: CognitiveStepLog): void {
    const icon = getStepIcon(step.name);
    const memDelta = (step.memoryAfter || step.memoryBefore) - step.memoryBefore;
    const memDeltaStr = memDelta >= 0 ? `+${memDelta}` : `${memDelta}`;
    const streamStr = step.streaming ? ' (streaming)' : '';

    console.log(`
${COLORS.cyan}┌─ ${icon} ${step.name} ${'─'.repeat(Math.max(0, 55 - step.name.length))}┐${COLORS.reset}`);

    // Memory line
    console.log(
      `${COLORS.gray}│  Memory: ${step.memoryBefore} → ${step.memoryAfter || '?'} messages (${memDeltaStr})${COLORS.reset}`
    );

    // Model line (standard+)
    if (this.logLevel !== 'minimal' && step.model) {
      console.log(`${COLORS.gray}│  Model: ${step.provider || ''}/${step.model}${COLORS.reset}`);
    }

    // Tokens line (standard+)
    if (this.logLevel !== 'minimal' && step.tokens) {
      const t = step.tokens;
      console.log(
        `${COLORS.gray}│  Tokens: ${t.prompt_tokens.toLocaleString()} prompt + ${t.completion_tokens.toLocaleString()} completion = ${t.total_tokens.toLocaleString()} total${COLORS.reset}`
      );
    }

    // Duration line
    console.log(`${COLORS.gray}│  Duration: ${step.durationMs?.toLocaleString() || '?'}ms${streamStr}${COLORS.reset}`);

    // Prompt line (verbose only)
    if (this.logLevel === 'verbose' && step.prompt) {
      console.log(`${COLORS.gray}│${COLORS.reset}`);
      console.log(`${COLORS.gray}│  [Prompt] "${step.prompt}"${COLORS.reset}`);
    }

    // Response line (verbose only)
    if (this.logLevel === 'verbose' && step.response) {
      const truncated = step.response.length >= 500 ? '...' : '';
      console.log(`${COLORS.gray}│  [Response] "${step.response}${truncated}"${COLORS.reset}`);
    }

    console.log(`${COLORS.cyan}└${'─'.repeat(65)}┘${COLORS.reset}
`);
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let loggerInstance: SoulLogger | null = null;

export function getSoulLogger(): SoulLogger {
  if (!loggerInstance) {
    loggerInstance = new SoulLogger();
  }
  return loggerInstance;
}

export function resetSoulLogger(): void {
  if (loggerInstance) {
    loggerInstance.resetSession();
  }
  loggerInstance = null;
}

// Convenience export for direct access
export const soulLogger = {
  get instance() {
    return getSoulLogger();
  },
  get enabled() {
    return getSoulLogger().enabled;
  },
};

export default SoulLogger;
