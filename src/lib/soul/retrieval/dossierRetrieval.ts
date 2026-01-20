/**
 * Dossier Retrieval - RAG for Kothar's Knowledge Base
 *
 * Retrieves relevant dossier chunks from Supabase pgvector
 * using VoyageAI voyage-4-lite for query embeddings.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embedQuery } from '../../voyage';
import { formatChunks } from './formatChunk';

export interface DossierChunk {
  id: string;
  content: string;
  metadata: {
    dossier: string;
    section: string;
    chunk_index: number;
    tags: string[];
    source_type: 'biography' | 'poetry' | 'scholarly' | 'etymology' | 'oracle' | 'quotes';
  };
  similarity: number;
}

export interface RetrievalOptions {
  topK?: number;
  threshold?: number;
  sourceTypes?: string[];
  tags?: string[];
}

/**
 * Supabase RPC response row type for match_kothar_dossiers
 */
interface DossierRow {
  id: string;
  content: string;
  metadata: DossierChunk['metadata'];
  similarity: number;
}

const DEFAULT_OPTIONS: Required<RetrievalOptions> = {
  topK: 3,
  threshold: 0.7,
  sourceTypes: [],
  tags: [],
};

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client singleton
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || import.meta.env?.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Retrieve relevant dossier chunks for a query
 *
 * Uses voyage-4-lite for query embedding (compatible with voyage-4-large document embeddings)
 * via asymmetric retrieval pattern.
 */
export async function retrieveDossierChunks(
  query: string,
  options: RetrievalOptions = {}
): Promise<DossierChunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Generate query embedding with voyage-4-lite
    const queryEmbedding = await embedQuery(query);

    const supabase = getSupabaseClient();

    // Call the match_kothar_dossiers RPC function
    const { data, error } = await supabase.rpc('match_kothar_dossiers', {
      query_embedding: queryEmbedding,
      match_threshold: opts.threshold,
      match_count: opts.topK,
      filter_source_types: opts.sourceTypes.length > 0 ? opts.sourceTypes : null,
      filter_tags: opts.tags.length > 0 ? opts.tags : null,
    });

    if (error) {
      console.error('[DossierRetrieval] Supabase RPC error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: DossierRow) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
  } catch (error) {
    console.error('[DossierRetrieval] Error:', error);
    return [];
  }
}

/**
 * Format retrieved chunks for WorkingMemory injection
 *
 * Creates a structured knowledge context string suitable for
 * insertion into the KNOWLEDGE_DOSSIER region.
 *
 * @deprecated Use formatChunks from ./formatChunk.ts directly for new code
 */
export function formatDossierContext(chunks: DossierChunk[]): string | null {
  return formatChunks(chunks);
}

/**
 * High-level retrieval function for chat integration
 *
 * Retrieves and formats dossier context in one call.
 * Returns null if no relevant chunks found.
 */
export async function retrieveDossierContext(
  query: string,
  options: RetrievalOptions = {}
): Promise<string | null> {
  const chunks = await retrieveDossierChunks(query, options);
  return formatDossierContext(chunks);
}

/**
 * Check if RAG is configured and available
 */
export function isRagAvailable(): boolean {
  const url = process.env.SUPABASE_URL || import.meta.env?.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_ANON_KEY;
  const voyageKey = process.env.VOYAGE_API_KEY || import.meta.env?.VOYAGE_API_KEY;

  return !!(url && key && voyageKey);
}
