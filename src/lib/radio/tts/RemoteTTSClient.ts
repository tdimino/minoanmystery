/**
 * RemoteTTSClient - Client for the Mac Mini TTS server
 *
 * Communicates with the qwen3-tts-server over Tailscale network
 * to generate audio for Kothar and Tamarru's voices.
 */

import type { TTSRequest, TTSResult, RadioSoulName } from '../types';
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
  async healthCheck(): Promise<{ healthy: boolean; modelLoaded: boolean; queueSize: number }> {
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
      };
    } catch {
      return { healthy: false, modelLoaded: false, queueSize: 0 };
    }
  }

  /**
   * Generate TTS for a soul's utterance via HTTP
   */
  async generateForSoul(
    soul: RadioSoulName,
    text: string,
    instruct?: string
  ): Promise<TTSResult> {
    const request: TTSRequest = {
      text,
      speaker: SOUL_VOICES[soul],
      instruct: instruct ?? SOUL_STYLES[soul],
    };

    return this.generate(request);
  }

  /**
   * Generate TTS audio via HTTP endpoint
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
    const audioBuffer = new Float32Array(arrayBuffer);

    // Estimate duration based on sample rate (12kHz for 12Hz models)
    const sampleRate = 12000;
    const durationMs = (audioBuffer.length / sampleRate) * 1000;

    return {
      audioBuffer,
      sampleRate,
      durationMs,
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
   */
  async generateStreaming(request: TTSRequest): Promise<TTSResult> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

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
          const msg = JSON.parse(event.data);
          if (msg.status === 'done') {
            // Combine chunks into single buffer
            const combined = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }

            const audioBuffer = new Float32Array(combined.buffer);
            const sampleRate = 12000;
            const durationMs = (audioBuffer.length / sampleRate) * 1000;

            cleanup();
            resolve({ audioBuffer, sampleRate, durationMs });
          } else if (msg.status === 'error') {
            cleanup();
            reject(new Error(msg.message));
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

      // Send request with token in payload
      this.ws!.send(JSON.stringify({
        ...request,
        token: this.bearerToken,
      }));
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
