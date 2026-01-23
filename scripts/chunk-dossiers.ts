#!/usr/bin/env npx ts-node
/**
 * Dossier Chunking Pipeline
 *
 * Reads markdown dossiers from souls/minoan/dossiers/ and chunks them
 * for embedding. Outputs JSON chunks ready for ingestion.
 *
 * Usage:
 *   npx ts-node scripts/chunk-dossiers.ts
 *   npx ts-node scripts/chunk-dossiers.ts --output chunks.json
 *   npx ts-node scripts/chunk-dossiers.ts --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, basename, dirname } from 'path';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DOSSIERS_DIR = join(process.cwd(), 'souls', 'minoan', 'dossiers');
const DEFAULT_OUTPUT = join(process.cwd(), 'scripts', 'dossier-chunks.json');

// Chunking parameters
const MAX_CHUNK_TOKENS = 800;  // Target chunk size
const MIN_CHUNK_TOKENS = 100; // Minimum viable chunk
const OVERLAP_SENTENCES = 1;   // Overlap for context continuity

// Rough token estimation (4 chars per token)
const CHARS_PER_TOKEN = 4;

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
    source_type: SourceType;
    title?: string;
  };
}

type SourceType = 'biography' | 'scholarly' | 'poetry' | 'oracle' | 'etymology' | 'quotes';

interface ParsedDossier {
  path: string;
  title: string;
  tags: string[];
  sourceType: SourceType;
  sections: Section[];
}

interface Section {
  heading: string;
  content: string;
  level: number;
}

// ─────────────────────────────────────────────────────────────
// Dossier Discovery
// ─────────────────────────────────────────────────────────────

function findDossierFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    if (!existsSync(currentDir)) return;

    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.md') && !entry.startsWith('INDEX') && !entry.startsWith('README') && !entry.startsWith('RESEARCHER_PERSONA')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Infer source type from dossier path
 */
function inferSourceType(filePath: string): SourceType {
  const relativePath = relative(DOSSIERS_DIR, filePath).toLowerCase();

  if (relativePath.includes('biography')) return 'biography';
  if (relativePath.includes('scholarly') || relativePath.includes('gordon') || relativePath.includes('astour') || relativePath.includes('harrison')) return 'scholarly';
  if (relativePath.includes('poetry')) return 'poetry';
  if (relativePath.includes('oracle') || relativePath.includes('daimonic')) return 'oracle';
  if (relativePath.includes('quotes')) return 'quotes';
  // thera-knossos-minos research = etymology (Semitic origins, Linear A, etc.)
  if (relativePath.includes('thera-knossos-minos') || relativePath.includes('etymology')) return 'etymology';

  return 'scholarly'; // Default to scholarly for unmapped academic content
}

// ─────────────────────────────────────────────────────────────
// Markdown Parsing
// ─────────────────────────────────────────────────────────────

/**
 * Extract YAML frontmatter tags if present
 * Supports both flat format: tags: [a, b, c]
 * And semantic groupings:
 *   tags:
 *     deities: [a, b]
 *     concepts: [c, d]
 */
function extractFrontmatter(content: string): { tags: string[]; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { tags: [], body: content };
  }

  const [, yaml, body] = frontmatterMatch;
  const tags: string[] = [];

  // Try flat format first: tags: [a, b, c]
  const flatTagsMatch = yaml.match(/^tags:\s*\[(.*?)\]/m);
  if (flatTagsMatch) {
    const flatTags = flatTagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    tags.push(...flatTags.filter(t => t.length > 0));
  }

  // Try semantic groupings format:
  //   tags:
  //     deities: [a, b]
  //     concepts: [c, d]
  const semanticTagsMatch = yaml.match(/^tags:\s*\n((?:\s+\w+:\s*\[.*?\]\n?)+)/m);
  if (semanticTagsMatch) {
    const groupLines = semanticTagsMatch[1];
    const arrayMatches = groupLines.matchAll(/\w+:\s*\[(.*?)\]/g);
    for (const match of arrayMatches) {
      const groupTags = match[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      tags.push(...groupTags.filter(t => t.length > 0));
    }
  }

  return { tags, body };
}

/**
 * Extract title from first H1
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Split markdown into sections by headings
 */
function splitIntoSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }

      // Start new section
      const level = headingMatch[1].length;
      currentSection = {
        heading: headingMatch[2].trim(),
        content: '',
        level,
      };
      contentBuffer = [];
    } else {
      contentBuffer.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

  // If no sections found, create one from the whole content
  if (sections.length === 0 && content.trim().length > 0) {
    sections.push({
      heading: 'Content',
      content: content.trim(),
      level: 2,
    });
  }

  return sections;
}

/**
 * Parse a dossier file
 */
function parseDossier(filePath: string): ParsedDossier {
  const content = readFileSync(filePath, 'utf-8');
  const { tags, body } = extractFrontmatter(content);
  const title = extractTitle(body);
  const sections = splitIntoSections(body);
  const sourceType = inferSourceType(filePath);

  return {
    path: relative(DOSSIERS_DIR, filePath),
    title,
    tags,
    sourceType,
    sections,
  };
}

// ─────────────────────────────────────────────────────────────
// Chunking
// ─────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split text into sentences (simple approach)
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or newline
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
}

/**
 * Chunk a section's content
 */
function chunkSection(
  section: Section,
  dossier: ParsedDossier,
  startIndex: number
): DossierChunk[] {
  const chunks: DossierChunk[] = [];
  const sentences = splitSentences(section.content);

  if (sentences.length === 0) {
    return chunks;
  }

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = startIndex;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);

    // If adding this sentence would exceed max, finalize current chunk
    if (currentTokens + sentenceTokens > MAX_CHUNK_TOKENS && currentChunk.length > 0) {
      // Create chunk
      chunks.push({
        content: currentChunk.join(' '),
        metadata: {
          dossier: `souls/minoan/dossiers/${dossier.path}`,
          section: section.heading,
          chunk_index: chunkIndex,
          tags: dossier.tags,
          source_type: dossier.sourceType,
          title: dossier.title,
        },
      });
      chunkIndex++;

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - OVERLAP_SENTENCES);
      currentChunk = currentChunk.slice(overlapStart);
      currentTokens = estimateTokens(currentChunk.join(' '));
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0 && currentTokens >= MIN_CHUNK_TOKENS) {
    chunks.push({
      content: currentChunk.join(' '),
      metadata: {
        dossier: `souls/minoan/dossiers/${dossier.path}`,
        section: section.heading,
        chunk_index: chunkIndex,
        tags: dossier.tags,
        source_type: dossier.sourceType,
        title: dossier.title,
      },
    });
  } else if (currentChunk.length > 0 && chunks.length > 0) {
    // Merge small remainder with previous chunk
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.content += ' ' + currentChunk.join(' ');
  } else if (currentChunk.length > 0) {
    // Small content, still worth keeping
    chunks.push({
      content: currentChunk.join(' '),
      metadata: {
        dossier: `souls/minoan/dossiers/${dossier.path}`,
        section: section.heading,
        chunk_index: chunkIndex,
        tags: dossier.tags,
        source_type: dossier.sourceType,
        title: dossier.title,
      },
    });
  }

  return chunks;
}

/**
 * Chunk an entire dossier
 */
function chunkDossier(dossier: ParsedDossier): DossierChunk[] {
  const allChunks: DossierChunk[] = [];
  let chunkIndex = 0;

  for (const section of dossier.sections) {
    const sectionChunks = chunkSection(section, dossier, chunkIndex);
    allChunks.push(...sectionChunks);
    chunkIndex += sectionChunks.length;
  }

  return allChunks;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : DEFAULT_OUTPUT;

  console.log('🔍 Scanning dossiers directory...');

  if (!existsSync(DOSSIERS_DIR)) {
    console.error(`❌ Dossiers directory not found: ${DOSSIERS_DIR}`);
    process.exit(1);
  }

  const dossierFiles = findDossierFiles(DOSSIERS_DIR);
  console.log(`📚 Found ${dossierFiles.length} dossier files`);

  const allChunks: DossierChunk[] = [];
  const stats = {
    totalDossiers: 0,
    totalChunks: 0,
    totalTokens: 0,
    bySourceType: {} as Record<string, number>,
  };

  for (const filePath of dossierFiles) {
    try {
      const dossier = parseDossier(filePath);
      const chunks = chunkDossier(dossier);

      if (chunks.length > 0) {
        allChunks.push(...chunks);
        stats.totalDossiers++;
        stats.totalChunks += chunks.length;

        for (const chunk of chunks) {
          stats.totalTokens += estimateTokens(chunk.content);
          stats.bySourceType[chunk.metadata.source_type] =
            (stats.bySourceType[chunk.metadata.source_type] || 0) + 1;
        }

        console.log(`  ✓ ${dossier.path}: ${chunks.length} chunks`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to process ${filePath}:`, error);
    }
  }

  console.log('\n📊 Chunking Summary:');
  console.log(`   Dossiers processed: ${stats.totalDossiers}`);
  console.log(`   Total chunks: ${stats.totalChunks}`);
  console.log(`   Estimated tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`   By source type:`);
  for (const [type, count] of Object.entries(stats.bySourceType)) {
    console.log(`     - ${type}: ${count} chunks`);
  }

  if (dryRun) {
    console.log('\n🏃 Dry run - no output file written');
    console.log('\nSample chunk:');
    if (allChunks.length > 0) {
      console.log(JSON.stringify(allChunks[0], null, 2));
    }
  } else {
    writeFileSync(outputPath, JSON.stringify(allChunks, null, 2));
    console.log(`\n✅ Wrote ${allChunks.length} chunks to ${outputPath}`);
  }
}

main();
