/**
 * Conversation Memory
 *
 * Manages conversation history in localStorage with page tagging.
 * Provides global thread + page-specific views for the soul chat.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  page?: string; // Page where message was sent
}

export interface ConversationThread {
  messages: ChatMessage[];
  lastUpdated: number;
  schemaVersion: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;
const DEFAULT_STORAGE_KEY = 'minoan-soul-conversation';
const MAX_MESSAGES = 100;

// ─────────────────────────────────────────────────────────────
// Conversation Memory Class
// ─────────────────────────────────────────────────────────────

export class ConversationMemory {
  private storageKey: string;
  private conversation: ConversationThread;

  constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
    this.conversation = this.load();
  }

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Add a message to the conversation
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMessage: ChatMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
      page: message.page || this.getCurrentPage()
    };

    this.conversation.messages.push(fullMessage);
    this.conversation.lastUpdated = Date.now();

    // Trim if exceeding max
    if (this.conversation.messages.length > MAX_MESSAGES) {
      this.trimHistory(MAX_MESSAGES);
    }

    this.save();
    return fullMessage;
  }

  /**
   * Get all messages, optionally filtered by page
   */
  getMessages(page?: string): ChatMessage[] {
    if (!page) {
      return [...this.conversation.messages];
    }
    return this.conversation.messages.filter(m => m.page === page);
  }

  /**
   * Get recent messages for API context
   */
  getRecentContext(limit: number = 10): ChatMessage[] {
    const messages = this.conversation.messages;
    return messages.slice(-limit);
  }

  /**
   * Get a specific message by ID
   */
  getMessage(id: string): ChatMessage | undefined {
    return this.conversation.messages.find(m => m.id === id);
  }

  /**
   * Get the last message
   */
  getLastMessage(): ChatMessage | undefined {
    return this.conversation.messages[this.conversation.messages.length - 1];
  }

  /**
   * Get conversation statistics
   */
  getStats(): { messageCount: number; lastUpdated: number; uniquePages: string[] } {
    const uniquePages = [...new Set(
      this.conversation.messages
        .map(m => m.page)
        .filter((p): p is string => !!p)
    )];

    return {
      messageCount: this.conversation.messages.length,
      lastUpdated: this.conversation.lastUpdated,
      uniquePages
    };
  }

  /**
   * Clear all conversation history
   */
  clear(): void {
    this.conversation = {
      messages: [],
      lastUpdated: Date.now(),
      schemaVersion: SCHEMA_VERSION
    };
    this.save();
  }

  /**
   * Export conversation as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.conversation, null, 2);
  }

  /**
   * Export conversation as Markdown
   */
  exportAsMarkdown(): string {
    const lines: string[] = [
      '# Soul Conversation',
      '',
      `*Exported: ${new Date().toLocaleString()}*`,
      '',
      '---',
      ''
    ];

    let currentPage: string | undefined;

    for (const msg of this.conversation.messages) {
      // Add page header if changed
      if (msg.page !== currentPage) {
        currentPage = msg.page;
        lines.push(`## Page: ${currentPage || 'Unknown'}`, '');
      }

      const role = msg.role === 'user' ? '**You**' : '**Oracle**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`${role} (${time}):`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ─── Private Methods ────────────────────────────────────────

  private load(): ConversationThread {
    if (typeof localStorage === 'undefined') {
      return this.createEmptyThread();
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.createEmptyThread();
      }

      const parsed = JSON.parse(stored) as ConversationThread;

      // Handle schema migrations
      if (parsed.schemaVersion !== SCHEMA_VERSION) {
        return this.migrateSchema(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('[ConversationMemory] Failed to load:', error);
      return this.createEmptyThread();
    }
  }

  private save(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(this.conversation);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        // QuotaExceededError - trim and retry
        console.warn('[ConversationMemory] Storage quota exceeded, trimming history');
        this.trimHistory(50);
        this.save();
      } else {
        console.error('[ConversationMemory] Failed to save:', error);
      }
    }
  }

  private createEmptyThread(): ConversationThread {
    return {
      messages: [],
      lastUpdated: Date.now(),
      schemaVersion: SCHEMA_VERSION
    };
  }

  private migrateSchema(oldThread: ConversationThread): ConversationThread {
    // Future schema migrations go here
    console.log('[ConversationMemory] Migrating schema from', oldThread.schemaVersion, 'to', SCHEMA_VERSION);
    return {
      ...oldThread,
      schemaVersion: SCHEMA_VERSION
    };
  }

  private trimHistory(keepCount: number): void {
    this.conversation.messages = this.conversation.messages.slice(-keepCount);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getCurrentPage(): string {
    if (typeof window === 'undefined') {
      return '/';
    }
    return window.location.pathname;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let memoryInstance: ConversationMemory | null = null;

export function getConversationMemory(): ConversationMemory {
  if (!memoryInstance) {
    memoryInstance = new ConversationMemory();
  }
  return memoryInstance;
}

export function resetConversationMemory(): void {
  if (memoryInstance) {
    memoryInstance.clear();
  }
  memoryInstance = null;
}
