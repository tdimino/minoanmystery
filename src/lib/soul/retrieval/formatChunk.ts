/**
 * Shared Chunk Formatting Utilities
 *
 * Extracted from dossierRetrieval.ts and raggySearch.ts to eliminate duplication.
 */

import type { DossierChunk } from './dossierRetrieval';

/**
 * Format a single dossier chunk for display
 *
 * @param chunk - The dossier chunk to format
 * @param index - Zero-based index for numbering (displayed as 1-based)
 * @returns Formatted markdown string
 */
export function formatChunk(chunk: DossierChunk, index: number): string {
  const source = chunk.metadata.dossier.replace(/^souls\/minoan\/dossiers\//, '');
  const section = chunk.metadata.section || 'General';
  const tags = chunk.metadata.tags?.join(', ') || '';

  return `### Source ${index + 1}: ${source}
**Section**: ${section}${tags ? `\n**Tags**: ${tags}` : ''}

${chunk.content}`;
}

/**
 * Format multiple chunks with a separator
 *
 * @param chunks - Array of dossier chunks
 * @param separator - Separator between chunks (default: markdown horizontal rule)
 * @returns Formatted markdown string, or null if no chunks
 */
export function formatChunks(
  chunks: DossierChunk[],
  separator: string = '\n\n---\n\n'
): string | null {
  if (!chunks || chunks.length === 0) {
    return null;
  }

  return chunks.map((chunk, index) => formatChunk(chunk, index)).join(separator);
}

/**
 * Format chunks with a header
 *
 * @param chunks - Array of dossier chunks
 * @param header - Markdown header to prepend
 * @returns Formatted markdown string with header, or null if no chunks
 */
export function formatChunksWithHeader(
  chunks: DossierChunk[],
  header: string = '## Relevant Knowledge'
): string | null {
  const formatted = formatChunks(chunks);
  if (!formatted) {
    return null;
  }
  return `${header}\n\n${formatted}`;
}
