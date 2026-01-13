/**
 * Cartesia TTS Client
 *
 * Browser-side client for text-to-speech using the /api/soul/tts endpoint.
 * Handles audio playback with Web Audio API for smooth streaming.
 */

export interface TTSOptions {
  /** Voice ID to use (optional - uses default if not specified) */
  voiceId?: string;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export class CartesiaTTS {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;

  constructor() {
    // AudioContext will be created on first use (requires user interaction)
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /**
   * Speak the given text
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const { voiceId, onStart, onEnd, onError } = options;

    // Stop any currently playing audio
    this.stop();

    try {
      // Fetch audio from TTS endpoint
      const response = await fetch('/api/soul/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TTS request failed');
      }

      // Get audio data
      const audioData = await response.arrayBuffer();

      // Decode and play
      const audioContext = this.ensureAudioContext();

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audioBuffer = await audioContext.decodeAudioData(audioData);

      // Create source node
      this.currentSource = audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(audioContext.destination);

      // Handle playback events
      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        onEnd?.();
      };

      // Start playback
      this.isPlaying = true;
      onStart?.();
      this.currentSource.start(0);
    } catch (error) {
      this.isPlaying = false;
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      console.error('[CartesiaTTS] Error:', err);
    }
  }

  /**
   * Speak from an async iterable stream (collects then speaks)
   */
  async speakStream(
    stream: AsyncIterable<string>,
    options: TTSOptions = {}
  ): Promise<void> {
    // Collect stream into full text
    let text = '';
    for await (const chunk of stream) {
      text += chunk;
    }

    // Speak the collected text
    return this.speak(text, options);
  }

  /**
   * Stop current playback
   */
  stop(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  /**
   * Check if currently playing
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let ttsInstance: CartesiaTTS | null = null;

export function getCartesiaTTS(): CartesiaTTS {
  if (!ttsInstance) {
    ttsInstance = new CartesiaTTS();
  }
  return ttsInstance;
}

export function resetCartesiaTTS(): void {
  if (ttsInstance) {
    ttsInstance.destroy();
    ttsInstance = null;
  }
}
