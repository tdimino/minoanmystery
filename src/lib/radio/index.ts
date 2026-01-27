/**
 * Daimonic Radio - Main exports
 *
 * A two-soul AI radio station where Kothar and Tamarru host discussions
 * with natural turn-taking, interruptions, and fluid rapport.
 */

// Types
export * from './types';

// Cognitive Steps
export {
  chunkedExternalDialog,
  interruptionDecision,
  backchannelResponse,
} from './cognitiveSteps';

// Meta exports
export {
  chunkedExternalDialogMeta,
  interruptionDecisionMeta,
  backchannelResponseMeta,
} from './cognitiveSteps';

// TTS Client
export { RemoteTTSClient, type TTSClientConfig } from './tts';

// Audio Pipeline
export {
  AudioBuffer,
  AudioMixer,
  type AudioBufferConfig,
  type AudioBufferSnapshot,
  type AudioMixerConfig,
  type MixerState,
} from './audio';

// Orchestrator
export { DialogueOrchestrator, type DialogueOrchestratorConfig } from './DialogueOrchestrator';

// Question Manager
export {
  QuestionManager,
  type QuestionManagerConfig,
  type ModerationResult,
} from './QuestionManager';
