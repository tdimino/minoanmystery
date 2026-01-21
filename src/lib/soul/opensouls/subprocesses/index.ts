/**
 * Subprocesses for the Minoan Soul Engine
 *
 * Subprocesses run alongside mental processes to update
 * persistent state, model the visitor, and maintain context.
 */

export { modelsTheVisitor, type ModelsTheVisitorConfig } from './modelsTheVisitor';
export {
  embodiesTheVision,
  resetVisionState,
  type EmbodiesTheVisionConfig,
  type VisionResult,
  type VisionProcessContext,
} from './embodiesTheVision';
