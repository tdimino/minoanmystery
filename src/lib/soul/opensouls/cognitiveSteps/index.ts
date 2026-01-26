/**
 * Standard cognitive steps library for the Minoan Soul Engine
 */

// Step exports
export { externalDialog } from './externalDialog';
export { internalMonologue } from './internalMonologue';
export { internalDialog, type InternalDialogOptions } from './internalDialog';
export { decision, type DecisionOptions } from './decision';
export { mentalQuery } from './mentalQuery';
export { brainstorm, type BrainstormOptions } from './brainstorm';
export { visitorNotes, type VisitorNotesOptions } from './visitorNotes';
export { visitorWhispers, type WhispersContext } from './visitorWhispers';
export { visionPrompt, type VisionContext } from './visionPrompt';
export { imageCaption, type ImageCaptionContext, type ImageCaptionResult } from './imageCaption';
export { tarotPrompt, type TarotContext, type TarotPromptResult } from './tarotPrompt';
export { poeticComposition, POETIC_REGISTERS, type PoeticRegister, type PoeticCompositionOptions } from './poeticComposition';

// Meta exports for manifest generation
export { meta as externalDialogMeta } from './externalDialog';
export { meta as internalMonologueMeta } from './internalMonologue';
export { meta as internalDialogMeta } from './internalDialog';
export { meta as decisionMeta } from './decision';
export { meta as mentalQueryMeta } from './mentalQuery';
export { meta as brainstormMeta } from './brainstorm';
export { meta as visitorNotesMeta } from './visitorNotes';
export { meta as visitorWhispersMeta } from './visitorWhispers';
export { meta as visionPromptMeta } from './visionPrompt';
export { meta as imageCaptionMeta } from './imageCaption';
export { meta as tarotPromptMeta } from './tarotPrompt';
export { meta as poeticCompositionMeta } from './poeticComposition';

/**
 * All cognitive step metadata for manifest generation
 */
export const cognitiveStepsMeta = {
  externalDialog: () => import('./externalDialog').then(m => m.meta),
  internalMonologue: () => import('./internalMonologue').then(m => m.meta),
  internalDialog: () => import('./internalDialog').then(m => m.meta),
  decision: () => import('./decision').then(m => m.meta),
  mentalQuery: () => import('./mentalQuery').then(m => m.meta),
  brainstorm: () => import('./brainstorm').then(m => m.meta),
  visitorNotes: () => import('./visitorNotes').then(m => m.meta),
  visitorWhispers: () => import('./visitorWhispers').then(m => m.meta),
  visionPrompt: () => import('./visionPrompt').then(m => m.meta),
  imageCaption: () => import('./imageCaption').then(m => m.meta),
  tarotPrompt: () => import('./tarotPrompt').then(m => m.meta),
  poeticComposition: () => import('./poeticComposition').then(m => m.meta),
} as const;

export type CognitiveStepName = keyof typeof cognitiveStepsMeta;
