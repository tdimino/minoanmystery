/**
 * HLS Streaming Module
 *
 * Provides infrastructure for HTTP Live Streaming (HLS) of radio audio:
 * - HLSSegmenter: Buffers audio and produces fixed-duration segments
 * - PlaylistManager: Generates and maintains m3u8 playlists
 * - SegmentStore: Storage abstraction (in-memory or Vercel Blob)
 */

export { HLSSegmenter, createHLSSegmenter } from './HLSSegmenter';
export type { HLSSegmenterConfig, SegmenterStats } from './HLSSegmenter';

export { PlaylistManager, createPlaylistManager, generateMasterPlaylist } from './PlaylistManager';
export type {
  PlaylistManagerConfig,
  PlaylistState,
  PlaylistType,
  StreamVariant,
} from './PlaylistManager';

export {
  InMemorySegmentStore,
  VercelBlobSegmentStore,
  createSegmentStore,
} from './SegmentStore';
export type {
  SegmentStore,
  SegmentStoreConfig,
  StoredSegment,
} from './SegmentStore';
