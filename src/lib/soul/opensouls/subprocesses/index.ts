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

export { modelsTheVisitor, type ModelsTheVisitorConfig } from './modelsTheVisitor';
export {
  embodiesTheVision,
  resetVisionState,
  type EmbodiesTheVisionConfig,
  type VisionResult,
  type VisionProcessContext,
} from './embodiesTheVision';
export {
  scholarsReflection,
  type ScholarsReflectionConfig,
} from './scholarsReflection';

// Server-only exports - import directly from the file in API routes:
// import { embodiesTheTarot, resetTarotState } from './embodiesTheTarot';
