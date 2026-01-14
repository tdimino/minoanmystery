/**
 * Essential utilities for the Minoan Soul Engine
 * Adapted from Open Souls patterns
 */

/**
 * indentNicely - Template literal tag for clean multi-line prompts
 *
 * Removes leading whitespace from template literals while preserving
 * intentional indentation. Essential for writing readable cognitive step prompts.
 *
 * @example
 * const prompt = indentNicely`
 *   - Respond warmly to the user
 *   - Keep it brief (1-2 sentences)
 *   - Show genuine curiosity
 * `;
 */
export function indentNicely(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  // Combine template parts with interpolated values
  let result = strings.reduce((acc, str, i) => {
    const value = values[i] !== undefined ? String(values[i]) : '';
    return acc + str + value;
  }, '');

  // Split into lines
  const lines = result.split('\n');

  // Find minimum indentation (excluding empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    const match = line.match(/^(\s*)/);
    if (match) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  }

  // If no indentation found, return as-is
  if (minIndent === Infinity) minIndent = 0;

  // Remove minimum indentation from all lines
  const dedented = lines.map(line => {
    if (line.trim() === '') return '';
    return line.slice(minIndent);
  });

  // Trim leading/trailing empty lines and join
  return dedented
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

/**
 * safeName - Sanitize names for LLM message formatting
 *
 * Removes invalid characters from names to ensure compatibility
 * with LLM APIs that have strict name field requirements.
 *
 * @example
 * safeName("User 123!") // "User_123"
 * safeName("john@example.com") // "john_example_com"
 */
export function safeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64); // Most APIs limit name length
}

/**
 * stripEntityAndVerb - Extract clean content from decision/query results
 *
 * Removes the "Entity decided: " or "Entity evaluated: " prefix from
 * cognitive step outputs when you only need the result value.
 *
 * @example
 * stripEntityAndVerb("Minoan decided: greet_returning_visitor")
 * // "greet_returning_visitor"
 *
 * stripEntityAndVerb("Minoan evaluated: user is ready to contact is true")
 * // "user is ready to contact is true"
 */
export function stripEntityAndVerb(text: string): string {
  // Match patterns like "Entity decided: X" or "Entity evaluated: X"
  const patterns = [
    /^.+?\s+decided:\s*/i,
    /^.+?\s+evaluated:\s*/i,
    /^.+?\s+thought:\s*/i,
    /^.+?\s+concluded:\s*/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, '');
    }
  }

  return text;
}

/**
 * truncateText - Safely truncate text to a maximum length
 *
 * @example
 * truncateText("Hello world", 5) // "Hello..."
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * delay - Promise-based delay utility
 *
 * @example
 * await delay(1000); // Wait 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * generateSessionId - Create a unique session identifier
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `session_${timestamp}_${random}`;
}

/**
 * isAsyncIterable - Type guard for async iterables
 */
export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Symbol.asyncIterator in value
  );
}

/**
 * collectStream - Collect async iterable into a string
 *
 * @example
 * const fullText = await collectStream(streamingResponse);
 */
export async function collectStream(stream: AsyncIterable<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

/**
 * createDeferredPromise - Create a promise with external resolve/reject
 */
export function createDeferredPromise<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// ─────────────────────────────────────────────────────────────
// Name Extraction (Instant, no LLM call)
// Pattern from Open Souls samantha-dreams
// ─────────────────────────────────────────────────────────────

/**
 * Patterns for extracting names from user messages
 * Handles common introduction patterns like:
 * - "Hi, I'm Tom"
 * - "My name is Sarah"
 * - "Tom here!"
 * - "Call me Mike"
 */
const NAME_PATTERNS = [
  // Standard introductions
  /^(?:hi[,!]?\s+)?(?:I'm|I am|my name is|this is|it's)\s+([a-z]+)/i,
  /^(?:hi|hey|hello)[,!]?\s+(?:I'm|it's|this is)\s+([a-z]+)/i,
  // Name at start or end
  /^([a-z]+)\s+here[.!]?$/i,
  /^-\s*([a-z]+)$/i,
  // Casual variations
  /(?:call me|I go by|name's|just)\s+([a-z]+)/i,
  // Just a name (short messages like "Tomar" or "I'm Tomar!")
  /^(?:I'm|im)\s+([a-z]+)[.!]?$/i,
  // Name anywhere in "my name is X" pattern
  /my name (?:is|'s)\s+([a-z]+)/i,
];

/**
 * extractNameHeuristic - Extract a name from a message using pattern matching
 *
 * Instant extraction with no LLM call. Returns null if no valid name found.
 * Names are normalized to have uppercase first letter.
 *
 * @example
 * extractNameHeuristic("Hi, I'm Tom!") // "Tom"
 * extractNameHeuristic("My name is Sarah") // "Sarah"
 * extractNameHeuristic("i'm tomar") // "Tomar"
 * extractNameHeuristic("Hello there") // null
 */
export function extractNameHeuristic(content: string): string | null {
  for (const pattern of NAME_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1]) {
      // Normalize: uppercase first letter, lowercase rest
      const rawName = match[1].trim();
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      // Validate: 2-20 chars, only letters
      if (name.length >= 2 && name.length <= 20 && /^[A-Za-z]+$/.test(name)) {
        return name;
      }
    }
  }
  return null;
}
