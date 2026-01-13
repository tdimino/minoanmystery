/**
 * Voice Module
 *
 * Exports TTS (Cartesia) and STT (Deepgram) clients for voice integration.
 */

// TTS - Cartesia Sonic
export {
  CartesiaTTS,
  getCartesiaTTS,
  resetCartesiaTTS,
} from './CartesiaTTS';

export type { TTSOptions } from './CartesiaTTS';

// STT - Deepgram Nova
export {
  DeepgramSTT,
  getDeepgramSTT,
  resetDeepgramSTT,
} from './DeepgramSTT';

export type { STTOptions, STTCallbacks } from './DeepgramSTT';
