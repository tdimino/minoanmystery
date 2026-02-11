/**
 * PlaylistManager - HLS m3u8 playlist generation
 *
 * Generates and maintains HLS playlists in compliance with RFC 8216.
 * Supports:
 * - Live playlists (EVENT type with growing window)
 * - Sliding window playlists (for long streams)
 * - VOD playlists (for on-demand playback)
 *
 * Playlist Types:
 * - EVENT: All segments are retained (good for short sessions)
 * - LIVE: Sliding window removes old segments (for long broadcasts)
 * - VOD: Static playlist with all segments (for recordings)
 */

import type { StoredSegment } from './SegmentStore';

// ============================================
// Types
// ============================================

export type PlaylistType = 'EVENT' | 'LIVE' | 'VOD';

export interface PlaylistManagerConfig {
  /** Session identifier */
  sessionId: string;

  /** Playlist type (default: EVENT) */
  type?: PlaylistType;

  /** Target segment duration in seconds (default: 5) */
  targetDuration?: number;

  /** Maximum segments in sliding window (for LIVE type, default: 6) */
  maxSegmentsInWindow?: number;

  /** HLS version (default: 3) */
  version?: number;

  /** Whether to include EXT-X-PROGRAM-DATE-TIME tags */
  includeProgramDateTime?: boolean;

  /** Base URL for segment URLs (optional, for absolute URLs) */
  baseUrl?: string;
}

export interface PlaylistState {
  /** Current media sequence number (first segment in playlist) */
  mediaSequence: number;

  /** Current discontinuity sequence */
  discontinuitySequence: number;

  /** All segments in the playlist */
  segments: StoredSegment[];

  /** Whether the stream has ended */
  ended: boolean;

  /** Session start time */
  startTime: Date;
}

// ============================================
// PlaylistManager Class
// ============================================

export class PlaylistManager {
  private config: Required<PlaylistManagerConfig>;
  private state: PlaylistState;

  constructor(config: PlaylistManagerConfig) {
    this.config = {
      type: 'EVENT',
      targetDuration: 5,
      maxSegmentsInWindow: 6,
      version: 3,
      includeProgramDateTime: true,
      baseUrl: '',
      ...config,
    };

    this.state = {
      mediaSequence: 0,
      discontinuitySequence: 0,
      segments: [],
      ended: false,
      startTime: new Date(),
    };
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Add a new segment to the playlist
   */
  async addSegment(segment: StoredSegment): Promise<void> {
    this.state.segments.push(segment);

    // For LIVE type, maintain sliding window
    if (this.config.type === 'LIVE') {
      while (this.state.segments.length > this.config.maxSegmentsInWindow) {
        this.state.segments.shift();
        this.state.mediaSequence++;
      }
    }
  }

  /**
   * Mark a discontinuity (e.g., when stream characteristics change)
   */
  markDiscontinuity(): void {
    this.state.discontinuitySequence++;
  }

  /**
   * Mark the stream as ended (adds EXT-X-ENDLIST)
   */
  end(): void {
    this.state.ended = true;
  }

  /**
   * Generate the m3u8 playlist content
   */
  generate(): string {
    const lines: string[] = [];

    // Header
    lines.push('#EXTM3U');
    lines.push(`#EXT-X-VERSION:${this.config.version}`);
    lines.push(`#EXT-X-TARGETDURATION:${Math.ceil(this.config.targetDuration)}`);
    lines.push(`#EXT-X-MEDIA-SEQUENCE:${this.state.mediaSequence}`);

    // Playlist type
    if (this.config.type === 'EVENT') {
      lines.push('#EXT-X-PLAYLIST-TYPE:EVENT');
    } else if (this.config.type === 'VOD') {
      lines.push('#EXT-X-PLAYLIST-TYPE:VOD');
    }
    // LIVE type doesn't include playlist type tag (implicit)

    // Discontinuity sequence (if any discontinuities)
    if (this.state.discontinuitySequence > 0) {
      lines.push(`#EXT-X-DISCONTINUITY-SEQUENCE:${this.state.discontinuitySequence}`);
    }

    // Segment entries
    let previousSequence = this.state.mediaSequence - 1;

    for (const segment of this.state.segments) {
      // Check for discontinuity (gap in sequence numbers)
      if (segment.sequenceNumber > previousSequence + 1) {
        lines.push('#EXT-X-DISCONTINUITY');
      }

      // Program date-time (optional, helps with seeking)
      if (this.config.includeProgramDateTime) {
        const segmentTime = new Date(segment.createdAt);
        lines.push(`#EXT-X-PROGRAM-DATE-TIME:${segmentTime.toISOString()}`);
      }

      // Segment duration and URL
      lines.push(`#EXTINF:${segment.durationSeconds.toFixed(3)},`);
      lines.push(this.getSegmentUrl(segment));

      previousSequence = segment.sequenceNumber;
    }

    // End list marker (for VOD or ended EVENT streams)
    if (this.state.ended || this.config.type === 'VOD') {
      lines.push('#EXT-X-ENDLIST');
    }

    return lines.join('\n');
  }

  /**
   * Get current playlist state
   */
  getState(): Readonly<PlaylistState> {
    return {
      ...this.state,
      segments: [...this.state.segments],
    };
  }

  /**
   * Get segment count
   */
  getSegmentCount(): number {
    return this.state.segments.length;
  }

  /**
   * Get total duration (seconds)
   */
  getTotalDuration(): number {
    return this.state.segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  }

  /**
   * Reset the playlist (for new session)
   */
  reset(): void {
    this.state = {
      mediaSequence: 0,
      discontinuitySequence: 0,
      segments: [],
      ended: false,
      startTime: new Date(),
    };
  }

  /**
   * Import segments (for recovering state)
   */
  importSegments(segments: StoredSegment[]): void {
    this.state.segments = [...segments].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    if (this.state.segments.length > 0) {
      this.state.mediaSequence = this.state.segments[0].sequenceNumber;
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private getSegmentUrl(segment: StoredSegment): string {
    // Always use the segment's URL (properly constructed by SegmentStore)
    // For in-memory store: /api/radio/hls/segment?sessionId=X&segmentId=segment_N
    // For Vercel Blob: CDN URL like https://xxx.vercel-storage.com/...
    return segment.url;
  }
}

// ============================================
// Master Playlist (for multi-quality streams)
// ============================================

export interface StreamVariant {
  /** Bandwidth in bits per second */
  bandwidth: number;

  /** Average bandwidth (optional) */
  averageBandwidth?: number;

  /** Codec string (e.g., "mp4a.40.2" for AAC-LC) */
  codecs: string;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Channels */
  channels: number;

  /** Playlist URL */
  playlistUrl: string;

  /** Name/label */
  name?: string;
}

/**
 * Generate a master playlist for multi-quality streams.
 * For audio-only streams, uses EXT-X-MEDIA with GROUP-ID.
 */
export function generateMasterPlaylist(
  variants: StreamVariant[],
  defaultVariantIndex = 0
): string {
  const lines: string[] = [];

  lines.push('#EXTM3U');
  lines.push('#EXT-X-VERSION:4');

  // Audio renditions
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const isDefault = i === defaultVariantIndex;

    lines.push(
      `#EXT-X-MEDIA:TYPE=AUDIO,` +
      `GROUP-ID="audio",` +
      `NAME="${variant.name ?? `Quality ${i + 1}`}",` +
      `DEFAULT=${isDefault ? 'YES' : 'NO'},` +
      `AUTOSELECT=${isDefault ? 'YES' : 'NO'},` +
      `CHANNELS="${variant.channels}",` +
      `URI="${variant.playlistUrl}"`
    );
  }

  // Stream-inf entries
  for (const variant of variants) {
    lines.push(
      `#EXT-X-STREAM-INF:` +
      `BANDWIDTH=${variant.bandwidth},` +
      (variant.averageBandwidth ? `AVERAGE-BANDWIDTH=${variant.averageBandwidth},` : '') +
      `CODECS="${variant.codecs}",` +
      `AUDIO="audio"`
    );
    lines.push(variant.playlistUrl);
  }

  return lines.join('\n');
}

// ============================================
// Factory
// ============================================

export function createPlaylistManager(config: PlaylistManagerConfig): PlaylistManager {
  return new PlaylistManager(config);
}

export default PlaylistManager;
