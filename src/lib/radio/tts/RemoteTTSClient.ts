/**
 * RemoteTTSClient - Client for the Mac Mini TTS server
 *
 * Communicates with the qwen3-tts-server over Tailscale network
 * to generate audio for Kothar and Artifex's voices.
 */

import type { TTSRequest, TTSResult, RadioSoulName, AudioFormat } from '../types';
import { SOUL_VOICES, SOUL_STYLES } from '../types';

export interface TTSClientConfig {
  /** Server URL (e.g., 'http://mac-mini.local:8000') */
  serverUrl: string;

  /** Bearer token for authentication */
  bearerToken: string;

  /** Connection timeout in ms */
  timeout?: number;
}

export class RemoteTTSClient {
  private serverUrl: string;
  private bearerToken: string;
  private timeout: number;
  private ws: WebSocket | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: TTSClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.bearerToken = config.bearerToken;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Check if the TTS server is healthy
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    modelLoaded: boolean;
    queueSize: number;
    ffmpegAvailable?: boolean;
    supportedFormats?: string[];
  }> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { healthy: false, modelLoaded: false, queueSize: 0 };
      }

      const data = await response.json();
      return {
        healthy: data.status === 'healthy',
        modelLoaded: data.model_loaded,
        queueSize: data.queue_size,
        ffmpegAvailable: data.ffmpeg_available,
        supportedFormats: data.supported_formats,
      };
    } catch {
      return { healthy: false, modelLoaded: false, queueSize: 0 };
    }
  }

  /**
   * Generate TTS for a soul's utterance via HTTP
   *
   * @param soul - The soul (Kothar or Artifex)
   * @param text - Text to synthesize
   * @param instruct - Optional style instruction
   * @param format - Audio format: 'pcm', 'wav', or 'aac' (default: 'pcm')
   */
  async generateForSoul(
    soul: RadioSoulName,
    text: string,
    instruct?: string,
    format: AudioFormat = 'pcm'
  ): Promise<TTSResult> {
    const request: TTSRequest = {
      text,
      speaker: SOUL_VOICES[soul],
      instruct: instruct ?? SOUL_STYLES[soul],
      format,
    };

    return this.generate(request);
  }

  /**
   * Generate TTS audio via HTTP endpoint
   *
   * Supports multiple output formats:
   * - 'pcm': Raw Float32 samples (default)
   * - 'wav': WAV format with headers
   * - 'aac': ADTS-wrapped AAC (for HLS streaming)
   */
  async generate(request: TTSRequest): Promise<TTSResult> {
    const response = await fetch(`${this.serverUrl}/tts/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS generation failed: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const format = request.format ?? 'pcm';

    // Get sample rate and duration from response headers
    const sampleRate = parseInt(response.headers.get('X-Sample-Rate') ?? '12000', 10);
    const duration = parseFloat(response.headers.get('X-Duration') ?? '0');

    if (format === 'aac' || format === 'wav') {
      // For AAC/WAV, return raw binary data (not Float32Array)
      // The consumer (HLSSegmenter) will handle it directly
      return {
        audioBuffer: null, // Use rawBuffer instead for encoded formats
        rawBuffer: arrayBuffer,
        sampleRate,
        durationMs: duration * 1000,
        format,
      };
    }

    // For PCM, parse as Float32Array
    const audioBuffer = new Float32Array(arrayBuffer);
    const durationMs = (audioBuffer.length / sampleRate) * 1000;

    return {
      audioBuffer,
      sampleRate,
      durationMs,
      format: 'pcm',
    };
  }

  /**
   * Connect to WebSocket for streaming chunks
   */
  private async connectStream(): Promise<void> {
    const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/tts/stream';

    return new Promise((resolve, reject) => {
      let settled = false;
      this.ws = new WebSocket(wsUrl);

      const cleanup = () => {
        // Remove handlers to prevent memory leaks
        if (this.ws) {
          this.ws.onopen = null;
          this.ws.onerror = null;
        }
      };

      this.ws.onopen = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      };

      this.ws.onerror = (error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`WebSocket connection failed: ${error}`));
        }
      };

      // Set timeout for connection
      setTimeout(() => {
        if (!settled && this.ws?.readyState !== WebSocket.OPEN) {
          settled = true;
          cleanup();
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Ensure WebSocket is connected, preventing concurrent connection attempts
   */
  private async ensureConnected(): Promise<void> {
    // If already connected, return immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // If a connection attempt is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start a new connection attempt
    this.connectionPromise = this.connectStream()
      .finally(() => {
        this.connectionPromise = null;
      });

    return this.connectionPromise;
  }

  /**
   * Generate via WebSocket (lower latency for streaming)
   *
   * NOTE: WebSocket endpoint currently only supports PCM format.
   * For AAC/WAV encoding, use the HTTP generate() method instead.
   *
   * @param request - TTS request (format field is ignored, always returns PCM)
   */
  async generateStreaming(request: TTSRequest): Promise<TTSResult> {
    // Warn if caller requested non-PCM format (WebSocket only supports PCM)
    if (request.format && request.format !== 'pcm') {
      console.warn(
        `[RemoteTTSClient] WebSocket streaming only supports PCM format. ` +
        `Requested format '${request.format}' will be ignored. ` +
        `Use generate() for AAC/WAV encoding.`
      );
    }

    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let serverSampleRate = 12000; // Default, may be overridden by server response

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.ws?.removeEventListener('message', handleMessage);
        this.ws?.removeEventListener('close', handleClose);
        this.ws?.removeEventListener('error', handleError);
      };

      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.status === 'done') {
              // Use server-provided sample rate if available
              if (msg.sample_rate) {
                serverSampleRate = msg.sample_rate;
              }

              // Combine chunks into single buffer
              const combined = new Uint8Array(totalBytes);
              let offset = 0;
              for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
              }

              // Parse as Float32 PCM
              const audioBuffer = new Float32Array(combined.buffer);
              const durationMs = msg.duration
                ? msg.duration * 1000
                : (audioBuffer.length / serverSampleRate) * 1000;

              cleanup();
              resolve({
                audioBuffer,
                sampleRate: serverSampleRate,
                durationMs,
                format: 'pcm',
              });
            } else if (msg.status === 'error') {
              cleanup();
              reject(new Error(msg.message || 'Unknown server error'));
            }
          } catch (parseError) {
            cleanup();
            reject(new Error(`Failed to parse server message: ${parseError}`));
          }
        } else {
          // Binary audio chunk
          const chunk = new Uint8Array(event.data);
          chunks.push(chunk);
          totalBytes += chunk.length;
        }
      };

      const handleClose = (event: CloseEvent) => {
        cleanup();
        reject(new Error(`WebSocket closed during generation: code=${event.code} reason=${event.reason || 'unknown'}`));
      };

      const handleError = (event: Event) => {
        cleanup();
        reject(new Error(`WebSocket error during generation: ${event}`));
      };

      this.ws!.addEventListener('message', handleMessage);
      this.ws!.addEventListener('close', handleClose);
      this.ws!.addEventListener('error', handleError);

      // Set timeout for generation
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`WebSocket streaming timeout after ${this.timeout}ms`));
      }, this.timeout);

      // Send request with token in payload (omit format, always PCM)
      const wsRequest = {
        text: request.text,
        speaker: request.speaker,
        instruct: request.instruct,
        speed: request.speed,
        token: this.bearerToken,
      };
      this.ws!.send(JSON.stringify(wsRequest));
    });
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default RemoteTTSClient;
