/**
 * SegmentStore - HLS segment storage abstraction
 *
 * Provides storage backends for HLS audio segments:
 * - InMemoryStore: For development/testing (segments stored in Map)
 * - VercelBlobStore: For production (segments uploaded to Vercel Blob)
 *
 * Segments are stored with automatic cleanup based on retention policy.
 */

import { put, del, list } from '@vercel/blob';

// ============================================
// Types
// ============================================

export interface StoredSegment {
  /** Unique segment identifier (e.g., "segment_0") */
  id: string;

  /** Full storage path (e.g., "radio/session_id/segment_0") */
  storagePath: string;

  /** Public URL for the segment (API endpoint or CDN URL) */
  url: string;

  /** Duration in seconds */
  durationSeconds: number;

  /** Sequence number in the stream */
  sequenceNumber: number;

  /** Timestamp when segment was created */
  createdAt: number;

  /** Size in bytes */
  sizeBytes: number;
}

export interface SegmentStoreConfig {
  /** Maximum number of segments to retain (default: 30 = ~2.5 min at 5s segments) */
  maxSegments?: number;

  /** Segment retention time in ms (default: 5 min) */
  retentionMs?: number;

  /** Storage prefix/folder name */
  prefix?: string;

  /** Session ID for URL construction (required for in-memory store) */
  sessionId?: string;

  /** Maximum total memory in bytes (default: 50MB) */
  maxTotalBytes?: number;

  /** Audio format for content-type: 'wav' or 'aac' (default: 'wav') */
  audioFormat?: 'wav' | 'aac';
}

export interface SegmentStore {
  /** Upload a segment and return its URL */
  upload(
    segmentId: string,
    data: ArrayBuffer,
    durationSeconds: number,
    sequenceNumber: number
  ): Promise<StoredSegment>;

  /** Delete a segment by ID */
  delete(segmentId: string): Promise<void>;

  /** Get a segment by ID */
  get(segmentId: string): Promise<StoredSegment | null>;

  /** List all stored segments ordered by sequence number */
  list(): Promise<StoredSegment[]>;

  /** Clean up old segments based on retention policy */
  cleanup(): Promise<number>;

  /** Get total size of stored segments */
  getTotalSize(): Promise<number>;
}

// ============================================
// In-Memory Store (Development)
// ============================================

interface InMemorySegment extends StoredSegment {
  data: ArrayBuffer;
}

/**
 * In-memory segment store for development and testing.
 * Segments are stored in memory and served via API endpoint.
 *
 * Note: Does not use browser-only APIs like URL.createObjectURL().
 * URLs point to /api/radio/hls/segment endpoint for server-side serving.
 */
export class InMemorySegmentStore implements SegmentStore {
  private segments = new Map<string, InMemorySegment>();
  private config: Required<SegmentStoreConfig>;
  private totalBytes = 0;

  constructor(config: SegmentStoreConfig = {}) {
    this.config = {
      maxSegments: config.maxSegments ?? 30,
      retentionMs: config.retentionMs ?? 5 * 60 * 1000,
      prefix: config.prefix ?? 'radio',
      sessionId: config.sessionId ?? '',
      maxTotalBytes: config.maxTotalBytes ?? 50 * 1024 * 1024, // 50MB default
      audioFormat: config.audioFormat ?? 'wav',
    };
  }

  /**
   * Get the content type for segments
   */
  getContentType(): string {
    return this.config.audioFormat === 'aac' ? 'audio/aac' : 'audio/wav';
  }

  async upload(
    segmentId: string,
    data: ArrayBuffer,
    durationSeconds: number,
    sequenceNumber: number
  ): Promise<StoredSegment> {
    // Check memory limit before adding
    if (this.totalBytes + data.byteLength > this.config.maxTotalBytes) {
      // Force cleanup to make room
      await this.cleanup();

      // If still over limit, reject
      if (this.totalBytes + data.byteLength > this.config.maxTotalBytes) {
        throw new Error(`Memory limit exceeded: ${this.config.maxTotalBytes} bytes`);
      }
    }

    // Extract simple segment ID (e.g., "segment_0" from "sessionId/segment_0")
    const simpleId = segmentId.includes('/')
      ? segmentId.split('/').pop()!
      : segmentId;

    // Full storage path
    const storagePath = `${this.config.prefix}/${segmentId}`;

    // Construct API endpoint URL (no browser APIs needed)
    const url = `/api/radio/hls/segment?sessionId=${this.config.sessionId}&segmentId=${simpleId}`;

    const segment: InMemorySegment = {
      id: simpleId,
      storagePath,
      url,
      durationSeconds,
      sequenceNumber,
      createdAt: Date.now(),
      sizeBytes: data.byteLength,
      data,
    };

    this.segments.set(storagePath, segment);
    this.totalBytes += data.byteLength;

    // Trigger cleanup if over segment limit
    await this.cleanup();

    return {
      id: segment.id,
      storagePath: segment.storagePath,
      url: segment.url,
      durationSeconds: segment.durationSeconds,
      sequenceNumber: segment.sequenceNumber,
      createdAt: segment.createdAt,
      sizeBytes: segment.sizeBytes,
    };
  }

  async delete(storagePath: string): Promise<void> {
    const segment = this.segments.get(storagePath);
    if (segment) {
      this.totalBytes -= segment.sizeBytes;
      this.segments.delete(storagePath);
    }
  }

  async get(storagePath: string): Promise<StoredSegment | null> {
    const segment = this.segments.get(storagePath);
    if (!segment) return null;

    return {
      id: segment.id,
      storagePath: segment.storagePath,
      url: segment.url,
      durationSeconds: segment.durationSeconds,
      sequenceNumber: segment.sequenceNumber,
      createdAt: segment.createdAt,
      sizeBytes: segment.sizeBytes,
    };
  }

  async list(): Promise<StoredSegment[]> {
    const segments = Array.from(this.segments.values()).map((s) => ({
      id: s.id,
      storagePath: s.storagePath,
      url: s.url,
      durationSeconds: s.durationSeconds,
      sequenceNumber: s.sequenceNumber,
      createdAt: s.createdAt,
      sizeBytes: s.sizeBytes,
    }));

    // Sort by sequence number
    return segments.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let deleted = 0;

    // Collect IDs to delete first (avoid modifying during iteration)
    const toDelete: string[] = [];

    // Find expired segments
    for (const [storagePath, segment] of this.segments) {
      if (now - segment.createdAt > this.config.retentionMs) {
        toDelete.push(storagePath);
      }
    }

    // Delete expired segments
    for (const storagePath of toDelete) {
      await this.delete(storagePath);
      deleted++;
    }

    // If still over limit, delete oldest by sequence number
    while (this.segments.size > this.config.maxSegments) {
      const sorted = Array.from(this.segments.entries())
        .sort((a, b) => a[1].sequenceNumber - b[1].sequenceNumber);

      if (sorted.length > 0) {
        const [oldestPath] = sorted[0];
        await this.delete(oldestPath);
        deleted++;
      } else {
        break;
      }
    }

    return deleted;
  }

  async getTotalSize(): Promise<number> {
    return this.totalBytes;
  }

  /**
   * Get raw segment data (for API endpoint serving)
   */
  getSegmentData(storagePath: string): ArrayBuffer | null {
    const segment = this.segments.get(storagePath);
    return segment?.data ?? null;
  }

  /**
   * Get segment by simple ID (e.g., "segment_0")
   */
  getSegmentBySimpleId(simpleId: string): InMemorySegment | null {
    for (const segment of this.segments.values()) {
      if (segment.id === simpleId) {
        return segment;
      }
    }
    return null;
  }
}

// ============================================
// Vercel Blob Store (Production)
// ============================================

/**
 * Vercel Blob segment store for production.
 * Segments are uploaded to Vercel Blob storage with automatic CDN distribution.
 */
export class VercelBlobSegmentStore implements SegmentStore {
  private config: Required<SegmentStoreConfig>;
  private segmentMetadata = new Map<string, StoredSegment>();

  constructor(config: SegmentStoreConfig = {}) {
    this.config = {
      maxSegments: config.maxSegments ?? 30,
      retentionMs: config.retentionMs ?? 5 * 60 * 1000,
      prefix: config.prefix ?? 'radio',
      sessionId: config.sessionId ?? '',
      maxTotalBytes: config.maxTotalBytes ?? 100 * 1024 * 1024, // 100MB default for production
      audioFormat: config.audioFormat ?? 'wav',
    };
  }

  /**
   * Get the content type for segments
   */
  getContentType(): string {
    return this.config.audioFormat === 'aac' ? 'audio/aac' : 'audio/wav';
  }

  /**
   * Get file extension for segments
   */
  private getFileExtension(): string {
    return this.config.audioFormat === 'aac' ? 'aac' : 'wav';
  }

  async upload(
    segmentId: string,
    data: ArrayBuffer,
    durationSeconds: number,
    sequenceNumber: number
  ): Promise<StoredSegment> {
    // Extract simple segment ID
    const simpleId = segmentId.includes('/')
      ? segmentId.split('/').pop()!
      : segmentId;

    const ext = this.getFileExtension();
    const storagePath = `${this.config.prefix}/${segmentId}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(storagePath, data, {
      access: 'public',
      contentType: this.getContentType(),
      addRandomSuffix: false,
    });

    const segment: StoredSegment = {
      id: simpleId,
      storagePath,
      url: blob.url, // CDN URL from Vercel Blob
      durationSeconds,
      sequenceNumber,
      createdAt: Date.now(),
      sizeBytes: data.byteLength,
    };

    this.segmentMetadata.set(storagePath, segment);

    // Trigger cleanup
    await this.cleanup();

    return segment;
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await del(storagePath);
      this.segmentMetadata.delete(storagePath);
    } catch (error) {
      console.error(`[VercelBlobStore] Failed to delete ${storagePath}:`, error);
    }
  }

  async get(storagePath: string): Promise<StoredSegment | null> {
    return this.segmentMetadata.get(storagePath) ?? null;
  }

  async list(): Promise<StoredSegment[]> {
    // Return cached metadata, sorted by sequence number
    return Array.from(this.segmentMetadata.values())
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let deleted = 0;

    // Collect paths to delete first (avoid modifying during iteration)
    const toDelete: string[] = [];

    // Find expired segments
    for (const [storagePath, segment] of this.segmentMetadata) {
      if (now - segment.createdAt > this.config.retentionMs) {
        toDelete.push(storagePath);
      }
    }

    // Delete expired segments
    for (const storagePath of toDelete) {
      await this.delete(storagePath);
      deleted++;
    }

    // If still over limit, delete oldest by sequence number
    const segments = await this.list();
    const toDeleteForLimit: string[] = [];

    while (segments.length > this.config.maxSegments) {
      const oldest = segments.shift();
      if (oldest) {
        toDeleteForLimit.push(oldest.storagePath);
      }
    }

    // Delete in parallel for better performance
    await Promise.all(toDeleteForLimit.map(path => this.delete(path)));
    deleted += toDeleteForLimit.length;

    return deleted;
  }

  async getTotalSize(): Promise<number> {
    let total = 0;
    for (const segment of this.segmentMetadata.values()) {
      total += segment.sizeBytes;
    }
    return total;
  }

  /**
   * Sync metadata with Vercel Blob storage.
   * Call this on startup to recover segment list after restart.
   */
  async syncFromStorage(): Promise<void> {
    try {
      const { blobs } = await list({ prefix: this.config.prefix });

      for (const blob of blobs) {
        if (!this.segmentMetadata.has(blob.pathname)) {
          // Extract sequence number from filename (supports both .wav and .aac)
          const match = blob.pathname.match(/segment_(\d+)\.(wav|aac)$/);
          const sequenceNumber = match ? parseInt(match[1], 10) : 0;

          // Extract simple ID
          const simpleId = `segment_${sequenceNumber}`;

          this.segmentMetadata.set(blob.pathname, {
            id: simpleId,
            storagePath: blob.pathname,
            url: blob.url,
            durationSeconds: 5, // Assume standard duration
            sequenceNumber,
            createdAt: blob.uploadedAt.getTime(),
            sizeBytes: blob.size,
          });
        }
      }
    } catch (error) {
      console.error('[VercelBlobStore] Failed to sync from storage:', error);
    }
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create appropriate segment store based on environment.
 *
 * @param config - Store configuration
 * @param config.sessionId - Required for URL construction in development
 */
export function createSegmentStore(config?: SegmentStoreConfig): SegmentStore {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  if (isProduction && hasVercelBlob) {
    console.log('[SegmentStore] Using Vercel Blob storage');
    return new VercelBlobSegmentStore(config);
  }

  if (!config?.sessionId) {
    console.warn('[SegmentStore] sessionId not provided - URLs will be relative');
  }

  console.log('[SegmentStore] Using in-memory storage (development)');
  return new InMemorySegmentStore(config);
}

export default createSegmentStore;
