#!/usr/bin/env npx tsx
/**
 * Generate Soul Engine Manifests
 *
 * This script scans the cognitiveSteps, mentalProcesses, and subprocesses
 * directories and generates type-safe manifests for lazy-loading.
 *
 * Usage: npm run generate:manifests
 *
 * @pattern Open Souls - Build-time codegen
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENSOULS_DIR = path.join(__dirname, '../src/lib/soul/opensouls');
const GENERATED_DIR = path.join(OPENSOULS_DIR, 'generated');

/**
 * Get all TypeScript files in a directory (excluding index.ts and non-module files)
 */
function getModuleFiles(dir: string, excludes: string[] = []): string[] {
  const fullPath = path.join(OPENSOULS_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Directory not found: ${fullPath}`);
    return [];
  }

  const defaultExcludes = ['index.ts', 'types.ts', 'runner.ts'];
  const allExcludes = [...defaultExcludes, ...excludes];

  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.ts') && !allExcludes.includes(f))
    .map(f => f.replace('.ts', ''));
}

/**
 * Extract export name from filename (camelCase)
 */
function toExportName(filename: string): string {
  // Handle files like 'embodiesTheTarot.ts' -> 'embodiesTheTarot'
  return filename;
}

/**
 * Generate cognitive steps manifest
 */
function generateCognitiveStepsManifest(): void {
  const modules = getModuleFiles('cognitiveSteps');
  console.log(`Found ${modules.length} cognitive steps: ${modules.join(', ')}`);

  const imports = modules.map(m => `  ${m}: () => import('../cognitiveSteps/${m}'),`).join('\n');
  const names = modules.map(m => `  '${m}',`).join('\n');

  const content = `/**
 * Cognitive Steps Manifest
 *
 * Auto-generated manifest for discovering and lazy-loading cognitive steps.
 * Each entry provides a lazy import function for code-splitting support.
 *
 * @generated Do not edit manually - regenerate with \`npm run generate:manifests\`
 */

/**
 * Lazy import functions for all cognitive steps
 */
export const cognitiveSteps = {
${imports}
} as const;

/**
 * Type-safe cognitive step names
 */
export type CognitiveStepName = keyof typeof cognitiveSteps;

/**
 * All cognitive step names as an array
 */
export const cognitiveStepNames: readonly CognitiveStepName[] = [
${names}
] as const;

/**
 * Load a cognitive step by name
 */
export async function loadCognitiveStep(name: CognitiveStepName) {
  return cognitiveSteps[name]();
}
`;

  fs.writeFileSync(
    path.join(GENERATED_DIR, 'cognitiveSteps.manifest.ts'),
    content
  );
  console.log('Generated cognitiveSteps.manifest.ts');
}

/**
 * Generate mental processes manifest
 */
function generateMentalProcessesManifest(): void {
  // Exclude utility files that aren't mental processes
  const modules = getModuleFiles('mentalProcesses', ['transitions.ts']);
  console.log(`Found ${modules.length} mental processes: ${modules.join(', ')}`);

  const imports = modules.map(m => `  ${m}: () => import('../mentalProcesses/${m}'),`).join('\n');
  const names = modules.map(m => `  '${m}',`).join('\n');

  const content = `/**
 * Mental Processes Manifest
 *
 * Auto-generated manifest for discovering and lazy-loading mental processes.
 *
 * @generated Do not edit manually - regenerate with \`npm run generate:manifests\`
 */

/**
 * Lazy import functions for all mental processes
 */
export const mentalProcesses = {
${imports}
} as const;

/**
 * Type-safe mental process names
 */
export type MentalProcessName = keyof typeof mentalProcesses;

/**
 * All mental process names as an array
 */
export const mentalProcessNames: readonly MentalProcessName[] = [
${names}
] as const;

/**
 * Load a mental process by name
 */
export async function loadMentalProcess(name: MentalProcessName) {
  return mentalProcesses[name]();
}
`;

  fs.writeFileSync(
    path.join(GENERATED_DIR, 'mentalProcesses.manifest.ts'),
    content
  );
  console.log('Generated mentalProcesses.manifest.ts');
}

/**
 * Generate subprocesses manifest
 */
function generateSubprocessesManifest(): void {
  const modules = getModuleFiles('subprocesses');
  console.log(`Found ${modules.length} subprocesses: ${modules.join(', ')}`);

  const imports = modules.map(m => `  ${m}: () => import('../subprocesses/${m}'),`).join('\n');
  const names = modules.map(m => `  '${m}',`).join('\n');

  const content = `/**
 * Subprocesses Manifest
 *
 * Auto-generated manifest for discovering and lazy-loading subprocesses.
 *
 * @generated Do not edit manually - regenerate with \`npm run generate:manifests\`
 */

/**
 * Lazy import functions for all subprocesses
 */
export const subprocesses = {
${imports}
} as const;

/**
 * Type-safe subprocess names
 */
export type SubprocessName = keyof typeof subprocesses;

/**
 * All subprocess names as an array
 */
export const subprocessNames: readonly SubprocessName[] = [
${names}
] as const;

/**
 * Load a subprocess by name
 */
export async function loadSubprocess(name: SubprocessName) {
  return subprocesses[name]();
}
`;

  fs.writeFileSync(
    path.join(GENERATED_DIR, 'subprocesses.manifest.ts'),
    content
  );
  console.log('Generated subprocesses.manifest.ts');
}

/**
 * Generate index file
 */
function generateIndex(): void {
  const content = `/**
 * Generated Manifests Index
 *
 * Re-exports all generated manifests for the Soul Engine.
 * These manifests provide type-safe, lazy-loaded access to all modules.
 *
 * @generated Do not edit manually - regenerate with \`npm run generate:manifests\`
 */

export * from './cognitiveSteps.manifest';
export * from './mentalProcesses.manifest';
export * from './subprocesses.manifest';
`;

  fs.writeFileSync(path.join(GENERATED_DIR, 'index.ts'), content);
  console.log('Generated index.ts');
}

/**
 * Main entry point
 */
function main(): void {
  console.log('Generating Soul Engine manifests...\n');

  // Ensure generated directory exists
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  generateCognitiveStepsManifest();
  generateMentalProcessesManifest();
  generateSubprocessesManifest();
  generateIndex();

  console.log('\nManifest generation complete!');
}

main();
