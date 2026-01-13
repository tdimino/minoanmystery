/**
 * Deepgram STT Client
 *
 * Browser-side speech-to-text using Deepgram's WebSocket API.
 * Captures microphone audio and streams to Deepgram for real-time transcription.
 */

export interface STTOptions {
  /** Token endpoint URL (default: /api/soul/stt-token) */
  tokenEndpoint?: string;
  /** Language code */
  language?: string;
  /** Enable punctuation */
  punctuate?: boolean;
  /** Enable interim results */
  interimResults?: boolean;
  /** Model to use */
  model?: string;
}

export interface STTCallbacks {
  /** Called with interim transcription */
  onInterim?: (text: string) => void;
  /** Called with final transcription */
  onFinal?: (text: string) => void;
  /** Called when recording starts */
  onStart?: () => void;
  /** Called when recording stops */
  onStop?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<STTOptions> = {
  tokenEndpoint: '/api/soul/stt-token',
  language: 'en',
  punctuate: true,
  interimResults: true,
  model: 'nova-2',
};

export class DeepgramSTT {
  private options: STTOptions;
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording = false;
  private callbacks: STTCallbacks = {};

  constructor(options: STTOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start recording and transcribing
   */
  async start(callbacks: STTCallbacks = {}): Promise<void> {
    if (this.isRecording) {
      console.warn('[DeepgramSTT] Already recording');
      return;
    }

    this.callbacks = callbacks;

    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Connect to Deepgram
      await this.connectWebSocket();

      // Start recording
      this.startRecording();

      this.isRecording = true;
      this.callbacks.onStart?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      this.cleanup();
      throw err;
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.isRecording) return;

    this.cleanup();
    this.callbacks.onStop?.();
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Fetch temporary token from server
   */
  private async fetchToken(): Promise<string> {
    const { tokenEndpoint } = this.options;
    const endpoint = tokenEndpoint || '/api/soul/stt-token';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch STT token');
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error('No token received from server');
    }

    return data.token;
  }

  /**
   * Connect to Deepgram WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    const { language, punctuate, interimResults, model } = this.options;

    // Fetch temporary token from server (keeps API key server-side)
    const token = await this.fetchToken();

    // Build WebSocket URL with query params
    const params = new URLSearchParams({
      model: model || 'nova-2',
      language: language || 'en',
      punctuate: String(punctuate !== false),
      interim_results: String(interimResults !== false),
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
    });
    const wsUrl = `wss://api.deepgram.com/v1/listen?${params}`;

    return new Promise((resolve, reject) => {
      // Create WebSocket connection with token
      this.socket = new WebSocket(wsUrl, ['token', token]);

      this.socket.onopen = () => {
        console.log('[DeepgramSTT] WebSocket connected');
        resolve();
      };

      this.socket.onerror = (event) => {
        console.error('[DeepgramSTT] WebSocket error:', event);
        reject(new Error('WebSocket connection failed'));
      };

      this.socket.onclose = (event) => {
        console.log('[DeepgramSTT] WebSocket closed:', event.code, event.reason);
        if (this.isRecording) {
          this.cleanup();
          this.callbacks.onStop?.();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'Results') {
            const transcript = data.channel?.alternatives?.[0]?.transcript || '';

            if (transcript) {
              if (data.is_final) {
                this.callbacks.onFinal?.(transcript);
              } else {
                this.callbacks.onInterim?.(transcript);
              }
            }
          }
        } catch (error) {
          console.error('[DeepgramSTT] Failed to parse message:', error);
        }
      };
    });
  }

  /**
   * Start MediaRecorder and send audio to WebSocket
   */
  private startRecording(): void {
    if (!this.stream || !this.socket) return;

    // Try to use a format that works well with Deepgram
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[DeepgramSTT] MediaRecorder error:', event);
      this.callbacks.onError?.(new Error('Recording failed'));
      this.cleanup();
    };

    // Start recording with 100ms chunks
    this.mediaRecorder.start(100);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.isRecording = false;

    // Stop MediaRecorder
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch {
          // Ignore errors
        }
      }
      this.mediaRecorder = null;
    }

    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Close WebSocket
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  /**
   * Destroy the instance
   */
  destroy(): void {
    this.cleanup();
    this.callbacks = {};
  }
}

// Singleton instance
let sttInstance: DeepgramSTT | null = null;

export function getDeepgramSTT(options?: STTOptions): DeepgramSTT {
  if (!sttInstance) {
    sttInstance = new DeepgramSTT(options);
  }
  return sttInstance;
}

export function resetDeepgramSTT(): void {
  if (sttInstance) {
    sttInstance.destroy();
    sttInstance = null;
  }
}
