/**
 * AudioBuffer - Immutable audio sample container
 *
 * Follows the Open Souls paradigm: all operations return new instances.
 * Handles Float32Array audio data with volume, mixing, and chunking operations.
 */

export interface AudioBufferConfig {
  /** Audio samples as Float32Array */
  samples: Float32Array;

  /** Sample rate in Hz (default: 12000 for Qwen TTS) */
  sampleRate?: number;

  /** Volume level 0-1 (default: 1.0) */
  volume?: number;

  /** Optional identifier */
  id?: string;
}

export interface AudioBufferSnapshot {
  /** Samples as number[] for JSON serialization, or Float32Array for memory efficiency */
  samples: number[] | Float32Array;
  sampleRate: number;
  volume: number;
  id?: string;
}

export interface ToSnapshotOptions {
  /**
   * If true, keeps samples as Float32Array instead of converting to number[].
   * This is more memory-efficient but not JSON-serializable.
   * @default false
   */
  preserveFloat32Array?: boolean;
}

/**
 * Immutable audio sample container following the Open Souls paradigm.
 *
 * **IMPORTANT: Mutability Limitation**
 *
 * While this class enforces immutability at the API level (all operations return
 * new instances), the underlying `Float32Array` can technically be mutated if
 * accessed directly via the `samples` property. TypeScript's `readonly` only
 * prevents reassignment, not mutation of array contents.
 *
 * To safely access samples without mutation risk, use `getSamplesCopy()` which
 * returns a defensive copy of the underlying array.
 *
 * @example
 * ```ts
 * const buffer = AudioBuffer.create({ samples: new Float32Array([0.1, 0.2]) });
 *
 * // SAFE: Get a copy for external use
 * const safeCopy = buffer.getSamplesCopy();
 *
 * // UNSAFE: Direct access allows mutation (but shouldn't be done)
 * // buffer.samples[0] = 0.5; // This would mutate the internal state!
 * ```
 */
export class AudioBuffer {
  /**
   * Raw audio samples. This property is readonly but the Float32Array contents
   * can technically be mutated. For safe external access, use `getSamplesCopy()`.
   * @see getSamplesCopy
   */
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly volume: number;
  readonly id?: string;

  private constructor(config: AudioBufferConfig) {
    // Deep copy samples for immutability - prevents external mutation of source array
    this.samples = new Float32Array(config.samples);
    this.sampleRate = config.sampleRate ?? 12000;
    this.volume = config.volume ?? 1.0;
    this.id = config.id;
    Object.freeze(this);
  }

  // ============================================
  // Static Constructors
  // ============================================

  /**
   * Create a new AudioBuffer from samples
   */
  static create(config: AudioBufferConfig): AudioBuffer {
    return new AudioBuffer(config);
  }

  /**
   * Create an empty AudioBuffer
   */
  static empty(sampleRate = 12000): AudioBuffer {
    return new AudioBuffer({
      samples: new Float32Array(0),
      sampleRate,
    });
  }

  /**
   * Create silence of specified duration
   */
  static silence(durationMs: number, sampleRate = 12000): AudioBuffer {
    const numSamples = Math.floor((durationMs / 1000) * sampleRate);
    return new AudioBuffer({
      samples: new Float32Array(numSamples),
      sampleRate,
    });
  }

  /**
   * Restore from snapshot
   */
  static fromSnapshot(snapshot: AudioBufferSnapshot): AudioBuffer {
    return new AudioBuffer({
      samples: new Float32Array(snapshot.samples),
      sampleRate: snapshot.sampleRate,
      volume: snapshot.volume,
      id: snapshot.id,
    });
  }

  // ============================================
  // Properties
  // ============================================

  /**
   * Duration in milliseconds
   */
  get durationMs(): number {
    return (this.samples.length / this.sampleRate) * 1000;
  }

  /**
   * Duration in seconds
   */
  get durationSeconds(): number {
    return this.samples.length / this.sampleRate;
  }

  /**
   * Number of samples
   */
  get length(): number {
    return this.samples.length;
  }

  /**
   * Check if buffer is empty
   */
  get isEmpty(): boolean {
    return this.samples.length === 0;
  }

  /**
   * Returns a defensive copy of the samples array.
   * Use this for safe external access when you need to ensure
   * the internal state cannot be mutated.
   *
   * @returns A new Float32Array containing a copy of the samples
   */
  getSamplesCopy(): Float32Array {
    return new Float32Array(this.samples);
  }

  // ============================================
  // Immutable Operations - Volume
  // ============================================

  /**
   * Return new buffer with adjusted volume
   */
  withVolume(newVolume: number): AudioBuffer {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));

    // Scale samples by volume ratio
    const scaleFactor = clampedVolume / this.volume;
    const newSamples = new Float32Array(this.samples.length);

    for (let i = 0; i < this.samples.length; i++) {
      newSamples[i] = this.samples[i] * scaleFactor;
    }

    return new AudioBuffer({
      samples: newSamples,
      sampleRate: this.sampleRate,
      volume: clampedVolume,
      id: this.id,
    });
  }

  /**
   * Return volume-scaled samples (for playback)
   */
  getScaledSamples(): Float32Array {
    if (this.volume === 1.0) {
      return this.samples;
    }

    const scaled = new Float32Array(this.samples.length);
    for (let i = 0; i < this.samples.length; i++) {
      scaled[i] = this.samples[i] * this.volume;
    }
    return scaled;
  }

  // ============================================
  // Immutable Operations - Combining
  // ============================================

  /**
   * Concatenate with another buffer (sequential)
   */
  concat(other: AudioBuffer): AudioBuffer {
    if (other.sampleRate !== this.sampleRate) {
      throw new Error(
        `Sample rate mismatch: ${this.sampleRate} vs ${other.sampleRate}`
      );
    }

    const combined = new Float32Array(this.samples.length + other.samples.length);
    combined.set(this.samples, 0);
    combined.set(other.samples, this.samples.length);

    return new AudioBuffer({
      samples: combined,
      sampleRate: this.sampleRate,
      volume: Math.max(this.volume, other.volume),
    });
  }

  /**
   * Mix with another buffer (overlay, for backchannels)
   * Shorter buffer is padded with silence at the specified offset
   */
  mix(other: AudioBuffer, offsetMs = 0): AudioBuffer {
    if (other.sampleRate !== this.sampleRate) {
      throw new Error(
        `Sample rate mismatch: ${this.sampleRate} vs ${other.sampleRate}`
      );
    }

    const offsetSamples = Math.floor((offsetMs / 1000) * this.sampleRate);
    const otherEnd = offsetSamples + other.samples.length;
    const maxLength = Math.max(this.samples.length, otherEnd);

    const mixed = new Float32Array(maxLength);

    // Copy this buffer's samples
    for (let i = 0; i < this.samples.length; i++) {
      mixed[i] = this.samples[i] * this.volume;
    }

    // Mix in other buffer's samples at offset
    for (let i = 0; i < other.samples.length; i++) {
      const targetIndex = offsetSamples + i;
      if (targetIndex >= 0 && targetIndex < maxLength) {
        // Simple additive mixing with clipping prevention
        const mixedValue = mixed[targetIndex] + other.samples[i] * other.volume;
        mixed[targetIndex] = Math.max(-1, Math.min(1, mixedValue));
      }
    }

    return new AudioBuffer({
      samples: mixed,
      sampleRate: this.sampleRate,
      volume: 1.0, // Volume already applied
    });
  }

  // ============================================
  // Immutable Operations - Slicing
  // ============================================

  /**
   * Slice buffer by sample indices
   */
  slice(start?: number, end?: number): AudioBuffer {
    return new AudioBuffer({
      samples: this.samples.slice(start, end),
      sampleRate: this.sampleRate,
      volume: this.volume,
      id: this.id,
    });
  }

  /**
   * Slice buffer by time (ms)
   */
  sliceByTime(startMs?: number, endMs?: number): AudioBuffer {
    const startSample = startMs !== undefined
      ? Math.floor((startMs / 1000) * this.sampleRate)
      : undefined;
    const endSample = endMs !== undefined
      ? Math.floor((endMs / 1000) * this.sampleRate)
      : undefined;

    return this.slice(startSample, endSample);
  }

  /**
   * Split into chunks of specified duration
   */
  splitByDuration(chunkDurationMs: number): AudioBuffer[] {
    const samplesPerChunk = Math.floor((chunkDurationMs / 1000) * this.sampleRate);
    const chunks: AudioBuffer[] = [];

    for (let i = 0; i < this.samples.length; i += samplesPerChunk) {
      const end = Math.min(i + samplesPerChunk, this.samples.length);
      chunks.push(
        new AudioBuffer({
          samples: this.samples.slice(i, end),
          sampleRate: this.sampleRate,
          volume: this.volume,
          id: this.id ? `${this.id}-chunk-${chunks.length}` : undefined,
        })
      );
    }

    return chunks;
  }

  // ============================================
  // Immutable Operations - Effects
  // ============================================

  /**
   * Apply fade in
   */
  withFadeIn(durationMs: number): AudioBuffer {
    const fadeSamples = Math.floor((durationMs / 1000) * this.sampleRate);
    const newSamples = new Float32Array(this.samples);

    for (let i = 0; i < Math.min(fadeSamples, newSamples.length); i++) {
      const fadeRatio = i / fadeSamples;
      newSamples[i] *= fadeRatio;
    }

    return new AudioBuffer({
      samples: newSamples,
      sampleRate: this.sampleRate,
      volume: this.volume,
      id: this.id,
    });
  }

  /**
   * Apply fade out
   */
  withFadeOut(durationMs: number): AudioBuffer {
    const fadeSamples = Math.floor((durationMs / 1000) * this.sampleRate);
    const newSamples = new Float32Array(this.samples);
    const fadeStart = Math.max(0, newSamples.length - fadeSamples);

    for (let i = fadeStart; i < newSamples.length; i++) {
      const fadeRatio = (newSamples.length - i) / fadeSamples;
      newSamples[i] *= fadeRatio;
    }

    return new AudioBuffer({
      samples: newSamples,
      sampleRate: this.sampleRate,
      volume: this.volume,
      id: this.id,
    });
  }

  /**
   * Pad with silence at start and/or end
   */
  withPadding(startMs: number, endMs: number): AudioBuffer {
    const startSamples = Math.floor((startMs / 1000) * this.sampleRate);
    const endSamples = Math.floor((endMs / 1000) * this.sampleRate);

    const padded = new Float32Array(startSamples + this.samples.length + endSamples);
    padded.set(this.samples, startSamples);

    return new AudioBuffer({
      samples: padded,
      sampleRate: this.sampleRate,
      volume: this.volume,
      id: this.id,
    });
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Export to snapshot for persistence.
   *
   * **Memory Cost Warning**: By default, this converts Float32Array to number[],
   * which roughly doubles memory usage since:
   * - Float32Array: 4 bytes per sample
   * - number[] in JS: ~8-16 bytes per sample (64-bit floats + array overhead)
   *
   * For a 5-second buffer at 12kHz: 60,000 samples = 240KB (Float32) vs ~480KB-960KB (number[])
   *
   * @param options.preserveFloat32Array If true, keeps samples as Float32Array.
   *        More memory-efficient but not JSON-serializable. Default: false.
   * @returns Snapshot object suitable for persistence or restoration
   */
  toSnapshot(options?: ToSnapshotOptions): AudioBufferSnapshot {
    const preserveFloat32 = options?.preserveFloat32Array ?? false;

    return {
      samples: preserveFloat32 ? new Float32Array(this.samples) : Array.from(this.samples),
      sampleRate: this.sampleRate,
      volume: this.volume,
      id: this.id,
    };
  }

  /**
   * Export as ArrayBuffer (for Web Audio API)
   */
  toArrayBuffer(): ArrayBuffer {
    const samples = this.getScaledSamples();
    const buffer = new ArrayBuffer(samples.byteLength);
    new Float32Array(buffer).set(samples);
    return buffer;
  }

  /**
   * Export as Blob (for download/streaming)
   */
  toBlob(mimeType = 'audio/wav'): Blob {
    // Simple WAV encoding
    const wavData = this.encodeWav();
    return new Blob([wavData], { type: mimeType });
  }

  /**
   * Encode as WAV format
   */
  private encodeWav(): ArrayBuffer {
    const samples = this.getScaledSamples();
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = this.sampleRate * blockAlign;
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
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples as 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Combine multiple buffers sequentially.
   *
   * Optimized single-pass implementation: calculates total size first,
   * then copies all buffers in one allocation. This avoids O(n^2) copying
   * that would occur with reduce-based concatenation.
   *
   * @throws Error if buffers have mismatched sample rates
   */
  static concat(...buffers: AudioBuffer[]): AudioBuffer {
    if (buffers.length === 0) {
      return AudioBuffer.empty();
    }

    if (buffers.length === 1) {
      return buffers[0];
    }

    // Validate sample rates match
    const sampleRate = buffers[0].sampleRate;
    for (let i = 1; i < buffers.length; i++) {
      if (buffers[i].sampleRate !== sampleRate) {
        throw new Error(
          `Sample rate mismatch: ${sampleRate} vs ${buffers[i].sampleRate}`
        );
      }
    }

    // Calculate total size in single pass
    let totalLength = 0;
    for (const buffer of buffers) {
      totalLength += buffer.samples.length;
    }

    // Single allocation, copy all buffers
    const combined = new Float32Array(totalLength);
    let offset = 0;
    let maxVolume = 0;

    for (const buffer of buffers) {
      combined.set(buffer.samples, offset);
      offset += buffer.samples.length;
      maxVolume = Math.max(maxVolume, buffer.volume);
    }

    return new AudioBuffer({
      samples: combined,
      sampleRate,
      volume: maxVolume,
    });
  }

  /**
   * Mix multiple buffers together (overlaid)
   */
  static mix(buffers: AudioBuffer[], offsets?: number[]): AudioBuffer {
    if (buffers.length === 0) {
      return AudioBuffer.empty();
    }

    const offs = offsets ?? buffers.map(() => 0);
    let result = buffers[0];

    for (let i = 1; i < buffers.length; i++) {
      result = result.mix(buffers[i], offs[i] ?? 0);
    }

    return result;
  }
}

export default AudioBuffer;
