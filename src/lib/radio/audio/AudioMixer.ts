/**
 * AudioMixer - Manages audio pipeline for Daimonic Radio
 *
 * Handles buffering, prefetching, and mixing of audio chunks from both souls.
 * Follows the Open Souls paradigm with clear separation of state and effects.
 *
 * Key Features:
 * - Prefetching: Generate chunk N+1 while playing chunk N
 * - Backchannel mixing: Overlay listener responses at reduced volume (0.3x)
 * - Dual-soul buffering: Separate queues for Kothar and Artifex
 * - Smooth transitions: Crossfade between chunks
 */

import { AudioBuffer } from './AudioBuffer';
import type { RemoteTTSClient } from '../tts/RemoteTTSClient';
import type { AudioChunk, RadioSoulName } from '../types';
import { SOUL_VOICES, SOUL_STYLES } from '../types';

// ============================================
// Types
// ============================================

export interface AudioMixerConfig {
  /** TTS client for audio generation */
  ttsClient: RemoteTTSClient;

  /** Sample rate for output (default: 12000) */
  sampleRate?: number;

  /** Backchannel volume multiplier (default: 0.3) */
  backchannelVolume?: number;

  /** Crossfade duration in ms (default: 50) */
  crossfadeDurationMs?: number;

  /** Number of chunks to prefetch (default: 2) */
  prefetchCount?: number;

  /** Callback when audio is ready for playback */
  onAudioReady?: (buffer: AudioBuffer, soul: RadioSoulName, chunkId: string) => void;

  /** Callback when prefetch completes */
  onPrefetchComplete?: (soul: RadioSoulName, chunkIndex: number) => void;

  /** Callback on error */
  onError?: (error: Error, context: string) => void;
}

export interface PendingChunk {
  /** Chunk identifier */
  id: string;

  /** Text to synthesize */
  text: string;

  /** Soul speaking */
  soul: RadioSoulName;

  /** Whether this is a backchannel */
  isBackchannel: boolean;

  /** Chunk index in the full response */
  index: number;

  /** Promise resolving to audio buffer */
  audioPromise: Promise<AudioBuffer>;

  /** Resolved audio buffer (null until ready) */
  audioBuffer: AudioBuffer | null;

  /** Status */
  status: 'pending' | 'generating' | 'ready' | 'playing' | 'done' | 'error';

  /** Error if failed */
  error?: Error;

  /** Timestamp when generation started */
  generationStarted: number;

  /** Timestamp when generation completed */
  generationCompleted?: number;

  /**
   * Deferred promise resolver - stored to resolve audioPromise when generation completes.
   * @internal
   */
  _resolve: (buffer: AudioBuffer) => void;

  /**
   * Deferred promise rejector - stored to reject audioPromise on error or cancellation.
   * Used in clearQueue() to release closures and prevent memory leaks.
   * @internal
   */
  _reject: (error: Error) => void;
}

export interface MixerState {
  /** Currently playing chunk */
  currentChunk: PendingChunk | null;

  /** Playback position in current chunk (ms) */
  playbackPositionMs: number;

  /** Per-soul chunk queues */
  soulQueues: Record<RadioSoulName, PendingChunk[]>;

  /** Backchannel queue (mixed over primary audio) */
  backchannelQueue: PendingChunk[];

  /** Whether mixer is running */
  isPlaying: boolean;

  /** Current primary speaker */
  primarySpeaker: RadioSoulName | null;

  /** Total chunks processed */
  totalChunksProcessed: number;

  /** Total generation time (ms) */
  totalGenerationTimeMs: number;
}

// ============================================
// AudioMixer Class
// ============================================

export class AudioMixer {
  private config: Required<AudioMixerConfig>;
  private state: MixerState;
  private generationLock = new Map<string, boolean>();

  constructor(config: AudioMixerConfig) {
    this.config = {
      sampleRate: 12000,
      backchannelVolume: 0.3,
      crossfadeDurationMs: 50,
      prefetchCount: 2,
      onAudioReady: () => {},
      onPrefetchComplete: () => {},
      onError: () => {},
      ...config,
    };

    this.state = this.createInitialState();
  }

  // ============================================
  // Private - State Management
  // ============================================

  /**
   * Creates a new state object with updated fields.
   *
   * NOTE: Full immutability isn't practical for real-time audio pipelines.
   * Audio chunks arrive at high frequency, and copying large queue arrays
   * on every update would cause GC pressure and latency spikes. Instead,
   * we use this helper for soul queue updates (low frequency) while
   * allowing direct mutation for high-frequency operations like status
   * changes. The getState() method returns a defensive copy for consumers.
   */
  private updateState(updates: Partial<MixerState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };
  }

  /**
   * Creates a new soul queues object with an updated queue for one soul.
   * Returns a new soulQueues object without mutating the original.
   */
  private updateSoulQueue(
    soul: RadioSoulName,
    newQueue: PendingChunk[]
  ): Record<RadioSoulName, PendingChunk[]> {
    return {
      ...this.state.soulQueues,
      [soul]: newQueue,
    };
  }

  private createInitialState(): MixerState {
    return {
      currentChunk: null,
      playbackPositionMs: 0,
      soulQueues: {
        kothar: [],
        artifex: [],
      },
      backchannelQueue: [],
      isPlaying: false,
      primarySpeaker: null,
      totalChunksProcessed: 0,
      totalGenerationTimeMs: 0,
    };
  }

  // ============================================
  // Public API - Queue Management
  // ============================================

  /**
   * Queue chunks for a soul's utterance (with prefetching)
   */
  async queueUtterance(
    soul: RadioSoulName,
    chunks: string[],
    utteranceId: string
  ): Promise<void> {
    const pendingChunks = chunks.map((text, index) =>
      this.createPendingChunk(soul, text, utteranceId, index, false)
    );

    // Add to soul's queue
    this.state.soulQueues[soul].push(...pendingChunks);

    // Start prefetching first N chunks
    await this.prefetchChunks(soul);
  }

  /**
   * Queue a backchannel response (will be mixed at lower volume)
   */
  async queueBackchannel(soul: RadioSoulName, text: string): Promise<void> {
    const chunk = this.createPendingChunk(
      soul,
      text,
      `backchannel-${Date.now()}`,
      0,
      true
    );

    this.state.backchannelQueue.push(chunk);

    // Generate immediately for backchannels
    await this.generateAudio(chunk);
  }

  /**
   * Clear all queues for a soul (e.g., on interruption)
   *
   * Rejects pending promises to release deferred closures and prevent memory leaks.
   * Each pending promise holds a closure with resolve/reject functions; if never
   * settled, these closures persist indefinitely.
   */
  clearQueue(soul: RadioSoulName): void {
    const cancelError = new Error(`Queue cleared for ${soul}`);

    for (const chunk of this.state.soulQueues[soul]) {
      // Reject pending promises to release closures
      if (chunk.status === 'pending' || chunk.status === 'generating') {
        chunk._reject(cancelError);
      }
      chunk.status = 'done';
    }

    // Use immutable update pattern for soul queue
    this.updateState({
      soulQueues: this.updateSoulQueue(soul, []),
    });
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    this.clearQueue('kothar');
    this.clearQueue('artifex');

    // Also reject backchannel promises to prevent memory leaks
    const cancelError = new Error('All queues cleared');
    for (const chunk of this.state.backchannelQueue) {
      if (chunk.status === 'pending' || chunk.status === 'generating') {
        chunk._reject(cancelError);
      }
    }
    this.state.backchannelQueue = [];
  }

  // ============================================
  // Public API - Playback Control
  // ============================================

  /**
   * Start playback for a soul
   */
  startPlayback(soul: RadioSoulName): void {
    this.state.isPlaying = true;
    this.state.primarySpeaker = soul;
    this.processNextChunk();
  }

  /**
   * Stop playback
   */
  stopPlayback(): void {
    this.state.isPlaying = false;
    this.state.currentChunk = null;
    this.state.primarySpeaker = null;
  }

  /**
   * Pause playback
   */
  pausePlayback(): void {
    this.state.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resumePlayback(): void {
    if (this.state.primarySpeaker) {
      this.state.isPlaying = true;
      this.processNextChunk();
    }
  }

  /**
   * Switch primary speaker (for turn transitions)
   */
  switchSpeaker(newSpeaker: RadioSoulName): void {
    // Mark current chunk as interrupted if playing
    if (this.state.currentChunk && this.state.currentChunk.soul !== newSpeaker) {
      this.state.currentChunk.status = 'done';
    }

    this.state.primarySpeaker = newSpeaker;

    // Start prefetching for new speaker
    this.prefetchChunks(newSpeaker);
  }

  // ============================================
  // Public API - State Access
  // ============================================

  /**
   * Get current mixer state (immutable snapshot)
   */
  getState(): Readonly<MixerState> {
    return {
      ...this.state,
      soulQueues: {
        kothar: [...this.state.soulQueues.kothar],
        artifex: [...this.state.soulQueues.artifex],
      },
      backchannelQueue: [...this.state.backchannelQueue],
    };
  }

  /**
   * Get queue depth for a soul
   */
  getQueueDepth(soul: RadioSoulName): number {
    return this.state.soulQueues[soul].filter(c => c.status !== 'done').length;
  }

  /**
   * Check if any chunks are ready to play
   */
  hasReadyChunks(soul: RadioSoulName): boolean {
    return this.state.soulQueues[soul].some(c => c.status === 'ready');
  }

  /**
   * Get generation statistics
   */
  getStats(): { avgGenerationMs: number; totalChunks: number } {
    return {
      avgGenerationMs: this.state.totalChunksProcessed > 0
        ? this.state.totalGenerationTimeMs / this.state.totalChunksProcessed
        : 0,
      totalChunks: this.state.totalChunksProcessed,
    };
  }

  // ============================================
  // Private - Chunk Management
  // ============================================

  private createPendingChunk(
    soul: RadioSoulName,
    text: string,
    utteranceId: string,
    index: number,
    isBackchannel: boolean
  ): PendingChunk {
    const id = `${soul}-${utteranceId}-${index}`;

    // Create a deferred promise with typed resolvers
    let resolveAudio!: (buffer: AudioBuffer) => void;
    let rejectAudio!: (error: Error) => void;
    const audioPromise = new Promise<AudioBuffer>((resolve, reject) => {
      resolveAudio = resolve;
      rejectAudio = reject;
    });

    // Return chunk with properly typed _resolve and _reject
    // These are used by clearQueue() to reject pending promises and release closures
    return {
      id,
      text,
      soul,
      isBackchannel,
      index,
      audioPromise,
      audioBuffer: null,
      status: 'pending',
      generationStarted: 0,
      _resolve: resolveAudio,
      _reject: rejectAudio,
    };
  }

  // ============================================
  // Private - Prefetching
  // ============================================

  /**
   * Prefetch upcoming chunks for a soul.
   *
   * NOTE: We no longer filter by generationLock here to avoid a TOCTOU race:
   * between the filter and the generateAudio call, another async operation
   * could start generating the same chunk. Instead, generateAudio atomically
   * checks and acquires the lock, returning early if already locked.
   */
  private async prefetchChunks(soul: RadioSoulName): Promise<void> {
    const queue = this.state.soulQueues[soul];

    // Only filter by status - lock check happens atomically in generateAudio
    const pendingChunks = queue.filter(c => c.status === 'pending');

    // Start generation for up to prefetchCount chunks
    const toGenerate = pendingChunks.slice(0, this.config.prefetchCount);

    await Promise.all(
      toGenerate.map(chunk => this.generateAudio(chunk))
    );
  }

  // ============================================
  // Private - Audio Generation
  // ============================================

  /**
   * Generate audio for a chunk.
   *
   * Uses atomic lock acquisition to prevent TOCTOU races: the has() check
   * and set() are not truly atomic in JS, but since we're single-threaded,
   * they execute without interleaving within this synchronous section.
   * This is safe as long as we don't await between check and set.
   */
  private async generateAudio(chunk: PendingChunk): Promise<void> {
    // Atomic lock acquisition - check and set synchronously before any await
    // This prevents TOCTOU races from prefetchChunks parallel calls
    if (this.generationLock.has(chunk.id)) {
      return;
    }
    this.generationLock.set(chunk.id, true);

    chunk.status = 'generating';
    chunk.generationStarted = Date.now();

    try {
      // Generate TTS
      const result = await this.config.ttsClient.generateForSoul(
        chunk.soul,
        chunk.text,
        chunk.isBackchannel
          ? `${SOUL_STYLES[chunk.soul]} - brief acknowledgment`
          : undefined
      );

      // Create AudioBuffer from TTS result
      let audioBuffer = AudioBuffer.create({
        samples: result.audioBuffer,
        sampleRate: result.sampleRate,
        id: chunk.id,
      });

      // Apply backchannel volume reduction
      if (chunk.isBackchannel) {
        audioBuffer = audioBuffer.withVolume(this.config.backchannelVolume);
      }

      // Apply crossfade
      if (this.config.crossfadeDurationMs > 0) {
        audioBuffer = audioBuffer
          .withFadeIn(this.config.crossfadeDurationMs / 2)
          .withFadeOut(this.config.crossfadeDurationMs / 2);
      }

      chunk.audioBuffer = audioBuffer;
      chunk.status = 'ready';
      chunk.generationCompleted = Date.now();

      // Update stats
      this.state.totalChunksProcessed++;
      this.state.totalGenerationTimeMs +=
        chunk.generationCompleted - chunk.generationStarted;

      // Resolve the audio promise (releases deferred closure)
      chunk._resolve(audioBuffer);

      // Notify
      this.config.onPrefetchComplete(chunk.soul, chunk.index);

      // Continue prefetching
      this.prefetchChunks(chunk.soul);

    } catch (error) {
      chunk.status = 'error';
      chunk.error = error instanceof Error ? error : new Error(String(error));
      // Reject the audio promise (releases deferred closure)
      chunk._reject(chunk.error);
      this.config.onError(chunk.error, `generateAudio(${chunk.id})`);
    } finally {
      this.generationLock.delete(chunk.id);
    }
  }

  // ============================================
  // Private - Playback Processing
  // ============================================

  /**
   * Process the next chunk in the queue.
   *
   * Uses queueMicrotask instead of direct recursion to:
   * 1. Prevent stack overflow from deep recursion
   * 2. Allow the event loop to process other tasks
   * 3. Ensure errors in one iteration don't create infinite retry loops
   */
  private async processNextChunk(): Promise<void> {
    if (!this.state.isPlaying || !this.state.primarySpeaker) {
      return;
    }

    const soul = this.state.primarySpeaker;
    const queue = this.state.soulQueues[soul];

    // Find next ready chunk
    const nextChunk = queue.find(c => c.status === 'ready');

    if (!nextChunk) {
      // No ready chunk - check if we have pending ones
      const pendingChunk = queue.find(c =>
        c.status === 'pending' || c.status === 'generating'
      );

      if (pendingChunk) {
        // Wait for it, then schedule next iteration via microtask
        try {
          await pendingChunk.audioPromise;
          // Use queueMicrotask to avoid deep recursion and allow event loop breathing room
          queueMicrotask(() => this.processNextChunk());
        } catch (error) {
          // Generation failed - notify via callback
          const err = error instanceof Error ? error : new Error(String(error));
          this.config.onError(err, `processNextChunk(${pendingChunk.id})`);

          // Remove failed chunk from queue
          const idx = queue.indexOf(pendingChunk);
          if (idx > -1) {
            queue.splice(idx, 1);
          }

          // Schedule next iteration via microtask to prevent infinite error loops
          // The microtask boundary ensures we don't immediately retry on persistent errors
          queueMicrotask(() => this.processNextChunk());
        }
      }
      return;
    }

    // Set as current chunk
    this.state.currentChunk = nextChunk;
    nextChunk.status = 'playing';
    this.state.playbackPositionMs = 0;

    // Check for backchannels to mix
    const mixedBuffer = await this.mixWithBackchannels(nextChunk);

    // Notify that audio is ready
    this.config.onAudioReady(mixedBuffer, soul, nextChunk.id);

    // Mark as done and remove from queue
    nextChunk.status = 'done';
    const idx = queue.indexOf(nextChunk);
    if (idx > -1) {
      queue.splice(idx, 1);
    }
  }

  // ============================================
  // Private - Backchannel Mixing
  // ============================================

  private async mixWithBackchannels(primaryChunk: PendingChunk): Promise<AudioBuffer> {
    const primaryBuffer = primaryChunk.audioBuffer!;

    // Find ready backchannels from the OTHER soul
    const otherSoul = primaryChunk.soul === 'kothar' ? 'artifex' : 'kothar';
    const backchannels = this.state.backchannelQueue.filter(
      c => c.soul === otherSoul && c.status === 'ready'
    );

    if (backchannels.length === 0) {
      return primaryBuffer;
    }

    // Mix backchannels into primary audio
    let mixedBuffer = primaryBuffer;

    for (const backchannel of backchannels) {
      if (backchannel.audioBuffer) {
        // Mix at a random-ish offset within the chunk
        // (simulating natural timing variation)
        const maxOffset = Math.max(
          0,
          primaryBuffer.durationMs - backchannel.audioBuffer.durationMs - 100
        );
        const offset = Math.floor(Math.random() * maxOffset);

        mixedBuffer = mixedBuffer.mix(backchannel.audioBuffer, offset);
      }

      // Mark backchannel as done
      backchannel.status = 'done';
    }

    // Clean up processed backchannels
    this.state.backchannelQueue = this.state.backchannelQueue.filter(
      c => c.status !== 'done'
    );

    return mixedBuffer;
  }

  // ============================================
  // Public API - Advanced Operations
  // ============================================

  /**
   * Generate audio for multiple chunks in parallel
   */
  async generateParallel(
    requests: Array<{ soul: RadioSoulName; text: string; id: string }>
  ): Promise<Map<string, AudioBuffer>> {
    const results = new Map<string, AudioBuffer>();

    const promises = requests.map(async (req) => {
      try {
        const result = await this.config.ttsClient.generateForSoul(
          req.soul,
          req.text
        );

        const buffer = AudioBuffer.create({
          samples: result.audioBuffer,
          sampleRate: result.sampleRate,
          id: req.id,
        });

        results.set(req.id, buffer);
      } catch (error) {
        this.config.onError(
          error instanceof Error ? error : new Error(String(error)),
          `generateParallel(${req.id})`
        );
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Convert AudioChunk (from types.ts) to AudioBuffer
   */
  chunkToBuffer(chunk: AudioChunk): AudioBuffer | null {
    if (!chunk.audioBuffer) {
      return null;
    }

    return AudioBuffer.create({
      samples: chunk.audioBuffer,
      sampleRate: this.config.sampleRate,
      id: chunk.id,
    });
  }

  /**
   * Create a mixed output buffer from primary + backchannel
   */
  mixBuffers(
    primary: AudioBuffer,
    backchannel: AudioBuffer,
    backchannelOffsetMs = 0
  ): AudioBuffer {
    // Apply backchannel volume
    const quietBackchannel = backchannel.withVolume(this.config.backchannelVolume);
    return primary.mix(quietBackchannel, backchannelOffsetMs);
  }

  /**
   * Reset mixer to initial state
   */
  reset(): void {
    this.stopPlayback();
    this.clearAllQueues();
    this.generationLock.clear();
    this.state = this.createInitialState();
  }
}

export default AudioMixer;
