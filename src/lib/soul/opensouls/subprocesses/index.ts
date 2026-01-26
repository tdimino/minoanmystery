/**
 * Subprocesses for the Minoan Soul Engine
 *
 * Subprocesses run alongside mental processes to update
 * persistent state, model the visitor, and maintain context.
 *
 * NOTE: embodiesTheTarot is NOT exported here because it uses
 * server-only Node.js modules (fs, path) for loading reference images.
 * Import it directly from './embodiesTheTarot' in API routes only.
 */

export { modelsTheVisitor, meta as modelsTheVisitorMeta, type ModelsTheVisitorConfig } from './modelsTheVisitor';
export {
  embodiesTheVision,
  meta as embodiesTheVisionMeta,
  resetVisionState,
  type EmbodiesTheVisionConfig,
  type VisionResult,
  type VisionProcessContext,
} from './embodiesTheVision';
export {
  scholarsReflection,
  meta as scholarsReflectionMeta,
  type ScholarsReflectionConfig,
} from './scholarsReflection';
export {
  poeticReflection,
  meta as poeticReflectionMeta,
  type PoeticReflectionConfig,
} from './poeticReflection';

/**
 * Lazy loaders for subprocess meta (for manifest generation)
 */
export const subprocessesMeta = {
  modelsTheVisitor: () => import('./modelsTheVisitor').then(m => m.meta),
  scholarsReflection: () => import('./scholarsReflection').then(m => m.meta),
  poeticReflection: () => import('./poeticReflection').then(m => m.meta),
  embodiesTheVision: () => import('./embodiesTheVision').then(m => m.meta),
  embodiesTheTarot: () => import('./embodiesTheTarot').then(m => m.meta),
} as const;

export type SubprocessName = keyof typeof subprocessesMeta;

// Server-only exports - import directly from the file in API routes:
// import { embodiesTheTarot, resetTarotState } from './embodiesTheTarot';
