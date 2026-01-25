/**
 * Local File Logger for Development
 *
 * Comprehensive logging for Soul Engine debugging.
 * Captures: WorkingMemory, subprocesses, tarot, vision, gates, API calls
 *
 * Usage:
 *   tail -f logs/soul.log
 *   tail -f logs/soul.log | grep TAROT
 *   tail -f logs/soul.log | grep GATE
 */

// Browser-safe: only import fs on server-side
const isServer = typeof window === 'undefined';
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;
let LOG_DIR = '';
let LOG_FILE = '';

if (isServer) {
  try {
    fs = require('fs');
    path = require('path');
    LOG_DIR = path.join(process.cwd(), 'logs');
    LOG_FILE = path.join(LOG_DIR, 'soul.log');
  } catch {
    // Ignore - running in browser or edge runtime
  }
}

// Ensure logs directory exists
function ensureLogDir() {
  if (!isServer || !fs) return;
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // Ignore errors
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, category, message, data } = entry;
  const levelIcon = {
    debug: '🔍',
    info: '📘',
    warn: '⚠️',
    error: '❌',
  }[level];

  let line = `[${timestamp}] ${levelIcon} [${category}] ${message}`;

  if (data !== undefined) {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      // Indent multi-line data
      if (dataStr.includes('\n')) {
        line += '\n' + dataStr.split('\n').map(l => '    ' + l).join('\n');
      } else {
        line += ' | ' + dataStr;
      }
    } catch {
      line += ' | [unserializable data]';
    }
  }

  return line;
}

class LocalLogger {
  private enabled: boolean;
  private buffer: string[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Only enable in development and server-side
    this.enabled = typeof process !== 'undefined' &&
                   process.env.NODE_ENV !== 'production' &&
                   typeof window === 'undefined';

    if (this.enabled) {
      ensureLogDir();
    }
  }

  private flush() {
    if (this.buffer.length === 0 || !this.enabled || !fs) return;

    try {
      const content = this.buffer.join('\n') + '\n';
      fs.appendFileSync(LOG_FILE, content, 'utf-8');
      this.buffer = [];
    } catch (e) {
      console.error('[LocalLogger] Failed to write log file:', e);
    }
  }

  private scheduleFlush() {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flush();
      this.flushTimeout = null;
    }, 50); // Batch writes every 50ms for near-realtime
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 23),
      level,
      category,
      message,
      data,
    };

    const formatted = formatLogEntry(entry);

    // Always console.log for immediate feedback
    console.log(formatted);

    // Also write to file if enabled
    if (this.enabled) {
      this.buffer.push(formatted);
      this.scheduleFlush();
    }
  }

  // ─── Generic Logging ────────────────────────────────────────────────

  debug(category: string, message: string, data?: unknown) {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown) {
    this.log('error', category, message, data);
  }

  // ─── API Endpoint Logging ───────────────────────────────────────────

  apiRequest(endpoint: string, data: {
    method: string;
    messageLength?: number;
    hasImage?: boolean;
    historyLength?: number;
  }) {
    this.log('info', 'API', `${data.method} ${endpoint}`, data);
  }

  apiResponse(endpoint: string, data: {
    status: number;
    duration?: number;
    error?: string;
  }) {
    const level = data.status >= 400 ? 'error' : 'info';
    this.log(level, 'API', `Response ${endpoint}`, data);
  }

  // ─── Working Memory Logging ─────────────────────────────────────────

  workingMemory(action: string, data: {
    messageCount: number;
    roles?: Record<string, number>;
    regions?: string[];
    lastMessage?: string;
  }) {
    this.log('debug', 'MEMORY', action, data);
  }

  memorySnapshot(memories: Array<{ role: string; content: string; name?: string }>) {
    const summary = memories.map((m, i) => {
      const content = typeof m.content === 'string' ? m.content.slice(0, 80) : '[non-string]';
      return `  [${i}] ${m.role}${m.name ? `(${m.name})` : ''}: ${content}${m.content.length > 80 ? '...' : ''}`;
    }).join('\n');

    this.log('debug', 'MEMORY:SNAPSHOT', `${memories.length} messages`, '\n' + summary);
  }

  // ─── Subprocess Logging ─────────────────────────────────────────────

  subprocess(name: string, event: 'start' | 'end' | 'skip', data?: unknown) {
    const icon = event === 'start' ? '▶️' : event === 'end' ? '✅' : '⏭️';
    this.log('info', `SUBPROCESS:${name}`, `${icon} ${event.toUpperCase()}`, data);
  }

  // ─── Gate Logging ───────────────────────────────────────────────────

  gate(subprocess: string, gateName: string, passed: boolean, data?: {
    threshold?: number;
    actual?: number;
    reason?: string;
  }) {
    const status = passed ? '✓ PASS' : '✗ BLOCK';
    const level = passed ? 'info' : 'debug';
    this.log(level, `GATE:${subprocess}`, `${gateName}: ${status}`, data);
  }

  // ─── Tarot Logging ──────────────────────────────────────────────────

  tarot(event: string, data?: {
    turnCount?: number;
    tarotCount?: number;
    lastTarotTurn?: number;
    interval?: number;
    cardName?: string;
    prompt?: string;
    error?: string;
  }) {
    this.log('info', 'TAROT', event, data);
  }

  tarotGateCheck(data: {
    userTurnCount: number;
    turnInterval: number;
    moduloResult: number;
    lastTarotTurn: number;
    tarotCount: number;
    maxTarots: number;
    shouldTrigger: boolean;
  }) {
    const { userTurnCount, turnInterval, moduloResult, lastTarotTurn, tarotCount, maxTarots, shouldTrigger } = data;
    this.log('info', 'TAROT:GATES', `Turn ${userTurnCount} check`, {
      formula: `${userTurnCount} % ${turnInterval} = ${moduloResult}`,
      lastTarotTurn,
      sessionCount: `${tarotCount}/${maxTarots}`,
      willTrigger: shouldTrigger ? 'YES' : 'NO',
    });
  }

  // ─── Vision/Image Logging ───────────────────────────────────────────

  vision(event: string, data?: {
    hasImage?: boolean;
    imageSize?: number;
    mimeType?: string;
    provider?: string;
    error?: string;
  }) {
    this.log('info', 'VISION', event, data);
  }

  imageGeneration(event: string, data?: {
    provider?: string;
    prompt?: string;
    style?: string;
    aspectRatio?: string;
    success?: boolean;
    error?: string;
    duration?: number;
  }) {
    this.log('info', 'IMAGE:GEN', event, data);
  }

  // ─── Visitor Model Logging ──────────────────────────────────────────

  visitorModel(event: string, data?: {
    userName?: string;
    notes?: string;
    whispers?: string;
    topics?: string[];
  }) {
    this.log('info', 'VISITOR', event, data);
  }

  // ─── LLM/Provider Logging ───────────────────────────────────────────

  llmCall(provider: string, data: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    duration?: number;
    streaming?: boolean;
  }) {
    this.log('debug', 'LLM', `${provider} call`, data);
  }

  // ─── Cognitive Step Logging ─────────────────────────────────────────

  cognitiveStep(stepName: string, event: 'start' | 'end', data?: {
    instructions?: string;
    result?: string;
    duration?: number;
  }) {
    const icon = event === 'start' ? '🧠' : '💡';
    this.log('info', `COGNITIVE:${stepName}`, `${icon} ${event}`, data);
  }

  // ─── Session State Logging ──────────────────────────────────────────

  sessionState(data: {
    userTurnCount: number;
    tarotCount: number;
    lastTarotTurn: number;
    userName?: string;
    visitorModelLength?: number;
  }) {
    this.log('debug', 'SESSION', 'State snapshot', data);
  }

  // ─── Separator for readability ──────────────────────────────────────

  separator(label?: string) {
    const line = label
      ? `\n${'═'.repeat(20)} ${label} ${'═'.repeat(Math.max(0, 50 - label.length))}\n`
      : `\n${'═'.repeat(70)}\n`;

    if (this.enabled) {
      this.buffer.push(line);
      this.scheduleFlush();
    }
    console.log(line);
  }

  requestStart(requestId: string, endpoint: string) {
    this.separator(`REQUEST ${requestId} - ${endpoint}`);
  }

  requestEnd(requestId: string, duration: number) {
    this.log('info', 'REQUEST', `Completed in ${duration}ms`, { requestId });
    this.separator();
  }
}

// Singleton instance
export const localLogger = new LocalLogger();

// Helper to clear the log file
export function clearLocalLog() {
  if (!isServer || !fs) {
    console.log('[LocalLogger] Cannot clear log file in browser');
    return;
  }
  try {
    ensureLogDir();
    fs.writeFileSync(LOG_FILE, `\n${'═'.repeat(70)}\n  Log cleared at ${new Date().toISOString()}\n${'═'.repeat(70)}\n\n`, 'utf-8');
    console.log('[LocalLogger] Log file cleared');
  } catch (e) {
    console.error('[LocalLogger] Failed to clear log:', e);
  }
}

// Helper to get log file path
export function getLogFilePath(): string {
  return LOG_FILE;
}
