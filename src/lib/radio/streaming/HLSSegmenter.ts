/**
 * HLSSegmenter - Audio segmentation for HLS streaming
 *
 * Buffers incoming audio and produces fixed-duration segments for HLS.
 *
 * Supports two modes:
 * 1. PCM mode: Buffers Float32 samples, encodes to WAV (fallback for development)
 * 2. AAC mode: Receives pre-encoded AAC from TTS server, passes through directly
 *
 * Flow:
 * 1. Audio arrives from DialogueOrchestrator (either PCM or pre-encoded AAC)
 * 2. For PCM: Chunks are accumulated in internal buffer, then encoded
 * 3. For AAC: Pre-encoded segments are passed through directly
 * 4. Segments are uploaded to store
 * 5. PlaylistManager is notified to update m3u8
 */

import { AudioBuffer } from '../audio/AudioBuffer';
import type { SegmentStore, StoredSegment } from './SegmentStore';
import type { PlaylistManager } from './PlaylistManager';

// ============================================
// Types
// ============================================

export interface HLSSegmenterConfig {
  /** Target segment duration in seconds (default: 5) */
  segmentDurationSeconds?: number;

  /** Audio sample rate (default: 12000 for Qwen TTS) */
  sampleRate?: number;

  /** Segment store for uploads */
  store: SegmentStore;

  /** Playlist manager to notify on new segments */
  playlistManager: PlaylistManager;

  /** Session identifier for segment naming */
  sessionId: string;

  /** Audio format: 'pcm' for Float32 (encodes to WAV), 'aac' for pass-through */
  audioFormat?: 'pcm' | 'aac';

  /** Callback when segment is ready */
  onSegmentReady?: (segment: StoredSegment) => void;

  /** Callback on error */
  onError?: (error: Error, context: string) => void;
}

export interface SegmenterStats {
  /** Total segments produced */
  totalSegments: number;

  /** Total audio duration processed (seconds) */
  totalDurationSeconds: number;

  /** Current buffer duration (seconds) */
  bufferDurationSeconds: number;

  /** Average segment encoding time (ms) */
  avgEncodingTimeMs: number;

  /** Total bytes uploaded */
  totalBytesUploaded: number;
}

// ============================================
// HLSSegmenter Class
// ============================================

export class HLSSegmenter {
  private config: Required<Omit<HLSSegmenterConfig, 'store' | 'playlistManager' | 'sessionId' | 'audioFormat'>> & {
    store: SegmentStore;
    playlistManager: PlaylistManager;
    sessionId: string;
    audioFormat: 'pcm' | 'aac';
  };

  /** Accumulated audio samples */
  private buffer: Float32Array;

  /** Current write position in buffer */
  private bufferPosition: number;

  /** Current sequence number */
  private sequenceNumber: number;

  /** Statistics */
  private stats: SegmenterStats;

  /** Encoding time samples for averaging */
  private encodingTimes: number[] = [];

  constructor(config: HLSSegmenterConfig) {
    this.config = {
      segmentDurationSeconds: 5,
      sampleRate: 12000,
      audioFormat: 'pcm',
      onSegmentReady: () => {},
      onError: () => {},
      ...config,
    };

    // Pre-allocate buffer for one segment
    const samplesPerSegment = this.config.segmentDurationSeconds * this.config.sampleRate;
    this.buffer = new Float32Array(samplesPerSegment);
    this.bufferPosition = 0;
    this.sequenceNumber = 0;

    this.stats = {
      totalSegments: 0,
      totalDurationSeconds: 0,
      bufferDurationSeconds: 0,
      avgEncodingTimeMs: 0,
      totalBytesUploaded: 0,
    };
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Add audio to the segmenter buffer.
   * Automatically flushes segments when threshold is reached.
   */
  async addAudio(audio: AudioBuffer): Promise<void> {
    const samples = audio.getScaledSamples();
    await this.addSamples(samples);
  }

  /**
   * Add raw samples to the segmenter buffer.
   *
   * Optimized to minimize copies:
   * - Single copy when samples fit in remaining buffer space
   * - Chunked copies only when samples span segment boundaries
   */
  async addSamples(samples: Float32Array): Promise<void> {
    const samplesPerSegment = this.config.segmentDurationSeconds * this.config.sampleRate;
    const remaining = samplesPerSegment - this.bufferPosition;

    // Fast path: samples fit entirely in current buffer
    if (samples.length <= remaining) {
      this.buffer.set(samples, this.bufferPosition);
      this.bufferPosition += samples.length;
      this.stats.bufferDurationSeconds = this.bufferPosition / this.config.sampleRate;

      if (this.bufferPosition >= samplesPerSegment) {
        await this.flushSegment();
      }
      return;
    }

    // Slow path: samples span segment boundaries
    let offset = 0;

    while (offset < samples.length) {
      const remainingInBuffer = samplesPerSegment - this.bufferPosition;
      const remainingInSamples = samples.length - offset;
      const toCopy = Math.min(remainingInBuffer, remainingInSamples);

      // Use subarray for zero-copy view (subarray doesn't allocate)
      this.buffer.set(samples.subarray(offset, offset + toCopy), this.bufferPosition);
      this.bufferPosition += toCopy;
      offset += toCopy;

      this.stats.bufferDurationSeconds = this.bufferPosition / this.config.sampleRate;

      if (this.bufferPosition >= samplesPerSegment) {
        await this.flushSegment();
      }
    }
  }

  /**
   * Force flush the current buffer (even if not full).
   * Call this at the end of a session to emit the final partial segment.
   */
  async flush(): Promise<void> {
    if (this.bufferPosition > 0) {
      await this.flushSegment();
    }
  }

  /**
   * Add pre-encoded AAC audio directly as a segment.
   *
   * This is used when the TTS server returns AAC-encoded audio,
   * allowing direct pass-through without re-encoding.
   *
   * @param aacData - Pre-encoded AAC audio (ADTS format)
   * @param durationSeconds - Duration of the audio in seconds
   */
  async addEncodedSegment(aacData: ArrayBuffer, durationSeconds: number): Promise<void> {
    const startTime = Date.now();

    try {
      // Upload directly - no encoding needed
      const segmentId = `segment_${this.sequenceNumber}`;
      const segment = await this.config.store.upload(
        `${this.config.sessionId}/${segmentId}`,
        aacData,
        durationSeconds,
        this.sequenceNumber
      );

      // Notify playlist manager
      await this.config.playlistManager.addSegment(segment);

      // Update stats
      this.updateStats(Date.now() - startTime, durationSeconds, aacData.byteLength);

      // Notify callback
      this.config.onSegmentReady(segment);

      // Increment sequence
      this.sequenceNumber++;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError(err, `addEncodedSegment(${this.sequenceNumber})`);
      throw err;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): SegmenterStats {
    return { ...this.stats };
  }

  /**
   * Get current sequence number
   */
  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  /**
   * Reset the segmenter (for new session)
   */
  reset(): void {
    this.buffer.fill(0);
    this.bufferPosition = 0;
    this.sequenceNumber = 0;
    this.encodingTimes = [];
    this.stats = {
      totalSegments: 0,
      totalDurationSeconds: 0,
      bufferDurationSeconds: 0,
      avgEncodingTimeMs: 0,
      totalBytesUploaded: 0,
    };
  }

  // ============================================
  // Private - Segment Processing
  // ============================================

  /**
   * Update segment statistics after upload
   */
  private updateStats(processingTimeMs: number, durationSeconds: number, byteLength: number): void {
    this.encodingTimes.push(processingTimeMs);
    if (this.encodingTimes.length > 10) {
      this.encodingTimes.shift();
    }

    this.stats.totalSegments++;
    this.stats.totalDurationSeconds += durationSeconds;
    this.stats.totalBytesUploaded += byteLength;
    this.stats.avgEncodingTimeMs =
      this.encodingTimes.reduce((a, b) => a + b, 0) / this.encodingTimes.length;
  }

  private async flushSegment(): Promise<void> {
    const startTime = Date.now();

    try {
      // Get the buffered samples (may be partial for final segment)
      // Use subarray for zero-copy view, only copy when encoding
      const segmentSamples = this.bufferPosition === this.buffer.length
        ? this.buffer
        : this.buffer.subarray(0, this.bufferPosition);
      const durationSeconds = segmentSamples.length / this.config.sampleRate;

      // Encode as AAC
      const encodedData = await this.encodeSegment(segmentSamples);

      // Upload to store
      const segmentId = `segment_${this.sequenceNumber}`;
      const segment = await this.config.store.upload(
        `${this.config.sessionId}/${segmentId}`,
        encodedData,
        durationSeconds,
        this.sequenceNumber
      );

      // Notify playlist manager
      await this.config.playlistManager.addSegment(segment);

      // Update stats
      this.updateStats(Date.now() - startTime, durationSeconds, encodedData.byteLength);

      // Notify callback
      this.config.onSegmentReady(segment);

      // Increment sequence and reset buffer
      this.sequenceNumber++;
      this.buffer.fill(0);
      this.bufferPosition = 0;
      this.stats.bufferDurationSeconds = 0;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError(err, `flushSegment(${this.sequenceNumber})`);
      throw err;
    }
  }

  /**
   * Encode audio samples as AAC.
   *
   * Since browsers don't have native AAC encoding, we use WAV for now.
   * In production, you'd want to:
   * 1. Use ffmpeg.wasm for client-side encoding
   * 2. Or send to a server-side encoding endpoint
   * 3. Or use a dedicated audio encoding service
   *
   * For compatibility, HLS also supports MPEG-TS with MP3, or fMP4 with AAC.
   */
  private async encodeSegment(samples: Float32Array): Promise<ArrayBuffer> {
    // Create an AudioBuffer wrapper for encoding
    const audioBuffer = AudioBuffer.create({
      samples,
      sampleRate: this.config.sampleRate,
    });

    // For now, encode as WAV (widely supported, slightly larger)
    // TODO: Add AAC encoding via ffmpeg.wasm or server-side transcoding
    return this.encodeAsWav(audioBuffer);
  }

  /**
   * Encode as WAV format (fallback for broad compatibility).
   *
   * NOTE: For production HLS, AAC encoding is required (RFC 8216).
   * WAV is used here for development because:
   * 1. No native browser/Node AAC encoder
   * 2. ffmpeg.wasm adds significant bundle size
   * 3. External encoding service would add latency
   *
   * Options for production AAC:
   * - Server-side transcoding endpoint using ffmpeg
   * - Cloud encoding service (AWS MediaConvert, etc.)
   * - ffmpeg.wasm with Web Workers
   */
  private encodeAsWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const samples = audioBuffer.getScaledSamples();
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = this.config.sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, this.config.sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert Float32 samples to Int16 using bulk operations
    // This is ~10x faster than per-sample DataView.setInt16()
    const int16View = new Int16Array(buffer, 44, samples.length);

    for (let i = 0; i < samples.length; i++) {
      // Clamp sample to [-1, 1] range
      const sample = samples[i];
      const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample;

      // Convert to 16-bit integer
      // Asymmetric scaling: negative maps to [-32768, 0), positive to [0, 32767]
      int16View[i] = clamped < 0
        ? Math.round(clamped * 0x8000)
        : Math.round(clamped * 0x7fff);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}

// ============================================
// Factory
// ============================================

export function createHLSSegmenter(config: HLSSegmenterConfig): HLSSegmenter {
  return new HLSSegmenter(config);
}

export default HLSSegmenter;
