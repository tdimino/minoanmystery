#!/usr/bin/env npx ts-node
/**
 * Embedding Ingestion Script
 *
 * Reads chunked dossiers, generates embeddings with VoyageAI voyage-4-large,
 * and uploads to Supabase pgvector.
 *
 * Usage:
 *   npx ts-node scripts/ingest-embeddings.ts
 *   npx ts-node scripts/ingest-embeddings.ts --input chunks.json
 *   npx ts-node scripts/ingest-embeddings.ts --dry-run
 *   npx ts-node scripts/ingest-embeddings.ts --clear  # Clear existing embeddings first
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DEFAULT_INPUT = join(process.cwd(), 'scripts', 'dossier-chunks.json');
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const BATCH_SIZE = 50; // VoyageAI allows up to 1000, but we batch for progress
const EMBEDDING_DIMENSION = 1024;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DossierChunk {
  content: string;
  metadata: {
    dossier: string;
    section: string;
    chunk_index: number;
    tags: string[];
    source_type: string;
    title?: string;
  };
}

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
  model: string;
}

// ─────────────────────────────────────────────────────────────
// VoyageAI Client
// ─────────────────────────────────────────────────────────────

async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<{ embeddings: number[][]; tokens: number }> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-4-large',
      input_type: 'document',
      output_dimension: EMBEDDING_DIMENSION,
      output_dtype: 'float',
      truncation: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VoyageAI API error: ${response.status} - ${error}`);
  }

  const data: VoyageEmbeddingResponse = await response.json();

  return {
    embeddings: data.data.map(item => item.embedding),
    tokens: data.usage?.total_tokens || 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────────────────────

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createClient(url, key);
}

async function clearExistingEmbeddings(supabase: SupabaseClient): Promise<number> {
  // First count existing records
  const { count, error: countError } = await supabase
    .from('kothar_dossiers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Failed to count embeddings: ${countError.message}`);
  }

  // Then delete all
  const { error: deleteError } = await supabase
    .from('kothar_dossiers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    throw new Error(`Failed to clear embeddings: ${deleteError.message}`);
  }

  return count || 0;
}

async function insertChunks(
  supabase: SupabaseClient,
  chunks: DossierChunk[],
  embeddings: number[][]
): Promise<void> {
  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: embeddings[i],
    metadata: chunk.metadata,
  }));

  const { error } = await supabase
    .from('kothar_dossiers')
    .insert(rows);

  if (error) {
    throw new Error(`Failed to insert chunks: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Progress Display
// ─────────────────────────────────────────────────────────────

function formatProgress(current: number, total: number, tokens: number): string {
  const percent = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
  return `[${bar}] ${percent}% (${current}/${total}) | ${tokens.toLocaleString()} tokens`;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const clearFirst = args.includes('--clear');
  const inputIndex = args.indexOf('--input');
  const inputPath = inputIndex !== -1 ? args[inputIndex + 1] : DEFAULT_INPUT;

  // Check environment
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (!voyageKey) {
    console.error('❌ VOYAGE_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!dryRun) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
      process.exit(1);
    }
  }

  // Load chunks
  if (!existsSync(inputPath)) {
    console.error(`❌ Chunks file not found: ${inputPath}`);
    console.error('   Run chunk-dossiers.ts first to generate chunks');
    process.exit(1);
  }

  const chunks: DossierChunk[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
  console.log(`📚 Loaded ${chunks.length} chunks from ${inputPath}`);

  if (dryRun) {
    console.log('\n🏃 Dry run - calculating costs...');

    // Estimate tokens
    const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);

    console.log(`   Estimated tokens: ${estimatedTokens.toLocaleString()}`);
    console.log(`   voyage-4-large cost: $${((estimatedTokens / 1_000_000) * 0.12).toFixed(4)}`);
    console.log(`   (First 200M tokens are free!)`);
    console.log('\n   Run without --dry-run to proceed with ingestion');
    return;
  }

  const supabase = createSupabaseClient();

  // Clear existing if requested
  if (clearFirst) {
    console.log('\n🗑️  Clearing existing embeddings...');
    const cleared = await clearExistingEmbeddings(supabase);
    console.log(`   Cleared ${cleared} existing records`);
  }

  // Process in batches
  console.log('\n🚀 Starting embedding generation and ingestion...');
  let totalTokens = 0;
  let processed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content);

    try {
      // Generate embeddings
      const { embeddings, tokens } = await generateEmbeddings(texts, voyageKey);
      totalTokens += tokens;

      // Insert to Supabase
      await insertChunks(supabase, batch, embeddings);

      processed += batch.length;
      process.stdout.write(`\r   ${formatProgress(processed, chunks.length, totalTokens)}`);
    } catch (error) {
      console.error(`\n❌ Error processing batch starting at index ${i}:`, error);
      throw error;
    }
  }

  console.log('\n\n✅ Ingestion complete!');
  console.log(`   Total chunks: ${processed}`);
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Embedding cost: $${((totalTokens / 1_000_000) * 0.12).toFixed(4)} (free tier: 200M tokens)`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
