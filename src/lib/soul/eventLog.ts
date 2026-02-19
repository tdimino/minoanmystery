/**
 * JSONL Event Logger for Soul Engine
 *
 * Structured, append-only event log inspired by Claudius git-track.sh.
 * Dual-mode: file writes in dev, console.log(JSON.stringify()) in production.
 *
 * Usage:
 *   cat logs/soul-events.jsonl | jq .ev | sort | uniq -c
 *   cat logs/soul-events.jsonl | jq 'select(.ev == "tokens")'
 */

const isServer = typeof window === 'undefined';
const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;
let EVENTS_FILE = '';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB auto-rotate

if (isServer) {
  try {
    fs = require('fs');
    path = require('path');
  } catch {
    // Browser or edge runtime — fs not available
  }

  if (fs && path) {
    const logDir = path.join(process.cwd(), 'logs');
    EVENTS_FILE = path.join(logDir, 'soul-events.jsonl');
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (e) {
      console.error('[EventLog] Failed to create log directory:', e);
    }
  }
}

export interface SoulEvent {
  ts: string;
  sid: string;
  ev: string;
  d?: Record<string, unknown>;
}

/**
 * Auto-rotate log file when it exceeds MAX_FILE_SIZE.
 * Keeps one backup: soul-events.jsonl.1
 */
function rotateIfNeeded(): void {
  if (!fs || !EVENTS_FILE) return;
  try {
    const stats = fs.statSync(EVENTS_FILE);
    if (stats.size > MAX_FILE_SIZE) {
      const backup = EVENTS_FILE + '.1';
      // Remove old backup, rename current to backup
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(EVENTS_FILE, backup);
    }
  } catch (e) {
    // ENOENT is expected on first run; other errors indicate real problems
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[EventLog] Log rotation failed:', e);
    }
  }
}

/**
 * Emit a structured soul event.
 *
 * In development: appends to logs/soul-events.jsonl
 * In production: console.log for Vercel structured logs
 */
export function emitEvent(sessionId: string, event: string, data?: Record<string, unknown>): void {
  if (!isServer) return;

  const entry: SoulEvent = {
    ts: new Date().toISOString(),
    sid: sessionId,
    ev: event,
    ...(data && Object.keys(data).length > 0 ? { d: data } : {}),
  };

  const line = JSON.stringify(entry);

  if (isProduction) {
    // In production, structured JSON goes to Vercel logs
    console.log(line);
  } else if (fs && EVENTS_FILE) {
    // In dev, append to JSONL file
    rotateIfNeeded();
    try {
      fs.appendFileSync(EVENTS_FILE, line + '\n', 'utf-8');
    } catch (e) {
      console.error('[EventLog] Write failed:', e);
    }
  }
}

// Convenience helpers with typed payloads

export const soulEvents = {
  messageIn(sid: string, data: { page?: string; msgCount: number }) {
    emitEvent(sid, 'msg.in', data);
  },

  messageOut(sid: string, data: { process?: string; tokens?: number; latencyMs?: number }) {
    emitEvent(sid, 'msg.out', data);
  },

  transition(sid: string, data: { from: string; to: string; reason?: string }) {
    emitEvent(sid, 'transition', data);
  },

  subprocess(sid: string, data: { name: string; result: string; durationMs?: number }) {
    emitEvent(sid, 'subprocess', data);
  },

  gate(sid: string, data: { gate: string; pass: boolean; threshold?: number; actual?: number }) {
    emitEvent(sid, 'gate', data);
  },

  modelUpdate(sid: string, data: { type: 'notes' | 'whispers' | 'topics' }) {
    emitEvent(sid, 'model.update', data);
  },

  tokens(sid: string, data: { model: string; prompt: number; completion: number }) {
    emitEvent(sid, 'tokens', data);
  },

  sessionStart(sid: string, data: { page?: string; returning: boolean }) {
    emitEvent(sid, 'session.start', data);
  },

  sessionEnd(sid: string, data: { duration: number; totalTokens: number; messages: number }) {
    emitEvent(sid, 'session.end', data);
  },

  sessionHeartbeat(sid: string, data: { msgCount: number; process?: string }) {
    emitEvent(sid, 'session.heartbeat', data);
  },
};
