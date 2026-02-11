# Daimonic Radio: Implementation Roadmap

**Date**: January 27, 2025
**Status**: Phase 5 Complete (Integration Testing Passed)
**Prerequisite**: `plans/Radio-Architecture-Implementation-01-27-2027.md` (architecture vision)

---

## Executive Summary

The Daimonic Radio codebase has **significantly more infrastructure than expected**. Phases 1-4b are now complete, including web player integration and code review fixes. Next up: integration testing.

### Implementation Status

| Phase | Component | Status |
|-------|-----------|--------|
| **Phase 1** | Mac Mini TTS Server | ✅ Complete |
| **Phase 1b** | AAC Encoding | ✅ Complete |
| **Phase 2** | API Endpoints | ✅ Complete |
| **Phase 3** | HLS Streaming | ✅ Complete |
| **Phase 3b** | Security Fixes | ✅ Complete |
| **Phase 3c** | Security Hardening | ✅ Complete |
| **Phase 4** | Web Player Integration | ✅ Complete |
| **Phase 4b** | Code Review Fixes | ✅ Complete |
| **Phase 5** | Integration Testing | ✅ Complete |

### What's Already Built

| Component | File | Status |
|-----------|------|--------|
| DialogueOrchestrator | `src/lib/radio/DialogueOrchestrator.ts` (667 lines) | ✅ Complete |
| Type definitions | `src/lib/radio/types.ts` (416 lines) | ✅ Complete |
| TTS Client | `src/lib/radio/tts/RemoteTTSClient.ts` (305 lines) | ✅ Complete |
| Audio Mixer | `src/lib/radio/audio/AudioMixer.ts` (719 lines) | ✅ Complete |
| HLS Segmenter | `src/lib/radio/streaming/HLSSegmenter.ts` (428 lines) | ✅ Complete |
| Playlist Manager | `src/lib/radio/streaming/PlaylistManager.ts` | ✅ Complete |
| Segment Store | `src/lib/radio/streaming/SegmentStore.ts` | ✅ Complete |
| API: Start | `src/pages/api/radio/start.ts` | ✅ Complete |
| API: HLS Playlist | `src/pages/api/radio/hls/playlist.ts` | ✅ Complete |
| API: HLS Segment | `src/pages/api/radio/hls/segment.ts` | ✅ Complete |
| Audio Encoder | `qwen3-tts/server/audio_encoder.py` | ✅ Complete |
| Chunked Dialog | `cognitiveSteps/chunkedExternalDialog.ts` | ✅ Complete |
| Interruption Decision | `cognitiveSteps/interruptionDecision.ts` | ✅ Complete |
| Backchannel Response | `cognitiveSteps/backchannelResponse.ts` | ✅ Complete |
| Question Selector | `cognitiveSteps/questionSelector.ts` | ✅ Complete |
| Question Response | `cognitiveSteps/questionResponse.ts` | ✅ Complete |
| Question Manager | `src/lib/radio/QuestionManager.ts` | ✅ Complete |
| Radio Page UI | `src/pages/radio.astro` | ✅ Complete |

---

## Technology Decision: PersonaPlex-7B vs Qwen3-TTS

### Research Summary

| Aspect | PersonaPlex-7B | Qwen3-TTS |
|--------|----------------|-----------|
| **Type** | End-to-end speech-to-speech | Text-to-speech only |
| **Full-duplex** | Native (listen + speak simultaneously) | Requires orchestration |
| **Parameters** | 7B | 1.7B |
| **Latency** | ~200ms response, 70ms speaker switch | 97ms first-packet |
| **Hardware** | A100/H100 GPU required | MPS-compatible (Mac Mini) |
| **Architecture** | Single model does reasoning + speech | Separate LLM + TTS |
| **Voice Cloning** | Limited | 3-second cloning |
| **Languages** | English-focused | 10 languages |
| **Source** | NVIDIA (open source) | Alibaba (open source) |

### Recommendation: **Qwen3-TTS + LLM Orchestration**

**Rationale**:

1. **Hardware Fit**: Mac Mini with MPS acceleration can run Qwen3-TTS. PersonaPlex requires $10k+ GPU server.

2. **Architecture Alignment**: Current codebase is built around chunk-based orchestration with separate LLM reasoning. Switching to PersonaPlex would require rewriting DialogueOrchestrator, AudioMixer, and all cognitive steps.

3. **Control**: Separate LLM allows fine-tuned personality control via Open Souls paradigm. PersonaPlex combines reasoning and speech, limiting persona customization.

4. **Latency**: 97ms first-packet time is excellent for chunked dialogue. The ~1:1 RTF (real-time factor) enables prefetch-while-playing strategy already implemented in AudioMixer.

5. **Future Option**: If full-duplex becomes critical, PersonaPlex can be evaluated as a future upgrade when hardware costs decrease.

---

## Implementation Phases

### Phase 1: Mac Mini TTS Server (P0) ✅ COMPLETE

**Goal**: Deploy FastAPI server running Qwen3-TTS on Mac Mini.

**Status**: Deployed at `mac-mini.local:8000` with Tailscale.

**What Was Built**:
- FastAPI server with `/tts/generate` and `/health` endpoints
- TTS engine wrapper for Qwen3-TTS-12Hz-1.7B
- WebSocket streaming support
- Bearer token authentication

**Files Created** (in `/Users/tomdimino/Desktop/Programming/qwen3-tts`):
```
server/
├── main.py                 # FastAPI endpoints
├── tts_engine.py           # Persistent model wrapper
├── audio_encoder.py        # AAC/WAV encoding (Phase 1b)
└── __init__.py
```

**Endpoints**:
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/tts/generate` | Generate TTS (pcm/wav/aac) |
| WS | `/tts/stream` | WebSocket streaming |
| GET | `/health` | Health check with capabilities |

**Voice Configuration**:
| Soul | Voice | Style Instruction |
|------|-------|-------------------|
| Kothar | Ryan | "Thoughtful, deliberate, ancient wisdom" |
| Tamarru | Aiden | "Passionate, rhythmic, mystical fervor" |

---

### Phase 1b: AAC Encoding (P1) ✅ COMPLETE

**Goal**: Add AAC encoding capability to Mac Mini TTS server for HLS compliance.

**Status**: Implemented January 27, 2025.

**Why Server-Side AAC**:
| Option | Bundle Size | Latency | Feasibility |
|--------|-------------|---------|-------------|
| **ffmpeg on Mac Mini** | None (native) | ~10-50ms | ✅ Best |
| ffmpeg.wasm (Node) | ~5MB WASM | ~100-200ms | ⚠️ Heavy |
| aac-encoder.js | ~200KB | ~50ms | ⚠️ Immature |
| ffmpeg in Vercel | N/A | N/A | ❌ Can't install |

**What Was Built**:

1. **audio_encoder.py** - ffmpeg subprocess wrapper:
   - `encode_to_aac()` - PCM → AAC (ADTS format)
   - `encode_to_wav()` - PCM → WAV (fallback)
   - `check_ffmpeg_available()` - Capability check

2. **Format negotiation**:
   - TTS server returns `supported_formats` in health check
   - Client auto-selects AAC if available, WAV fallback
   - HLS segments served with correct content-type

3. **Type updates**:
   - `AudioFormat = 'pcm' | 'wav' | 'aac'`
   - `TTSResult.audioBuffer` now nullable for encoded formats
   - `TTSResult.rawBuffer` for binary data

**Files Modified**:
- `qwen3-tts/server/main.py` - Format parameter
- `qwen3-tts/server/audio_encoder.py` - NEW
- `src/lib/radio/types.ts` - AudioFormat type
- `src/lib/radio/tts/RemoteTTSClient.ts` - Format support
- `src/lib/radio/streaming/HLSSegmenter.ts` - AAC pass-through
- `src/lib/radio/streaming/SegmentStore.ts` - Content-type detection

---

### Phase 2: API Endpoints (P1) ✅ COMPLETE

**Goal**: Create server-side endpoints for radio control.

**Status**: Implemented January 27, 2025.

**What Was Built**:
- Session management with in-memory store
- Auto-cleanup of old sessions (keeps last 5)
- HLS integration with segmenter/playlist manager
- Question manager integration

**Files Created**:
```
src/pages/api/radio/
├── start.ts              # POST: Start radio session
├── stream.ts             # SSE: Audio stream events
├── hls/
│   ├── playlist.ts       # GET: m3u8 playlist
│   └── segment.ts        # GET: Audio segments
```

**Environment Variables**:
- `TTS_SERVER_URL` - URL to qwen3-tts server
- `TTS_BEARER_TOKEN` - Authentication token

---

### Phase 3: HLS Streaming (P1) ✅ COMPLETE

**Goal**: Broadcast audio as HLS stream for universal playback.

**Status**: Implemented January 27, 2025.

**What Was Built**:

1. **HLSSegmenter** (`src/lib/radio/streaming/HLSSegmenter.ts`):
   - Buffers incoming audio
   - Produces 5-second segments
   - Supports PCM→WAV encoding or AAC pass-through
   - Statistics tracking

2. **PlaylistManager** (`src/lib/radio/streaming/PlaylistManager.ts`):
   - m3u8 playlist generation
   - EVENT or VOD playlist types
   - Program date-time support

3. **SegmentStore** (`src/lib/radio/streaming/SegmentStore.ts`):
   - In-memory store for development
   - Vercel Blob adapter for production
   - Auto-cleanup with retention policy
   - Content-type detection from binary headers

**Dependencies Added**: `@vercel/blob`

---

### Phase 3b: Security & Performance Fixes ✅ COMPLETE

**Critical Fixes Applied**:
| Issue | Fix |
|-------|-----|
| `URL.createObjectURL()` browser-only API | Replaced with API endpoint URLs |
| Segment ID path inconsistency | Added `storagePath` vs `id` distinction |
| Malformed baseUrl concatenation | Removed baseUrl, use segment.url directly |
| Path traversal vulnerability | Added regex validation for sessionId/segmentId |
| Array modification during iteration | Collect IDs first, then delete |

**Performance Optimizations**:
| Area | Change |
|------|--------|
| WAV encoding | Use `Int16Array` bulk view instead of per-sample `DataView.setInt16()` |
| Audio buffering | Fast path for samples that fit in buffer, use `subarray` for zero-copy views |
| Stats tracking | Extracted `updateStats()` helper to reduce duplication |

---

### Phase 3c: Security Hardening ✅ COMPLETE

Code review findings addressed January 27, 2025.

**CRITICAL (Fixed)**:
| Issue | Fix Applied |
|-------|-------------|
| Command injection via bitrate parameter | Added `ALLOWED_BITRATES` allowlist validation |
| WebSocket error leaks exception details | Errors logged internally, generic messages sent to client |
| Empty catch blocks in WebSocket handler | Added logging, specific exception types |

**HIGH (Fixed)**:
| Issue | Fix Applied |
|-------|-------------|
| Missing input validation (sample_rate, channels) | Added range validation (8000-48000 Hz, 1-2 channels) |
| Bare `except` clause | Replaced with specific exception handling |
| Missing rawBuffer handling in generateStreaming | Added format consistency, warned on non-PCM request |
| Timing attack on token comparison | Using `secrets.compare_digest()` for constant-time comparison |
| encode_to_wav has no error handling | Added try/except with proper error propagation |

**MEDIUM (Fixed)**:
| Issue | Fix Applied |
|-------|-------------|
| check_ffmpeg_available hides failure reason | Added `log_on_failure` param + `get_ffmpeg_status()` function |
| Health check returns degraded state without logging | Added warning logs for model not loaded / ffmpeg unavailable |

---

### Phase 4: Web Player Integration (P2) ✅ COMPLETE

**Goal**: Connect radio.astro UI to live backend.

**Status**: Implemented January 27, 2025.

**What Was Built**:

1. **HLS.js Integration**:
   - CDN-loaded HLS.js (v1.5.7) for cross-browser support
   - Native HLS support detection for Safari/iOS
   - Error recovery (network errors, media errors)
   - Low latency mode enabled

2. **SSE Real-time Updates**:
   - Replaced polling with EventSource connection
   - Handles `state`, `speech`, `question`, `audio`, `heartbeat` events
   - Auto-reconnection on connection loss

3. **Session Management**:
   - Check for existing active session on page load
   - Topic prompt when starting new session
   - Session state tracking (initialized → running → stopped)

4. **Transcript System**:
   - Live transcript populated from SSE speech events
   - Visual distinction: Kothar (Tyrian purple) vs Artifex (cyan)
   - Avatar + bubble layout with animated fade-in
   - Auto-scroll to newest entries
   - Last 50 entries rendered for performance

5. **Play Button Flow**:
   - Click prompts for topic if no session
   - Starts session → connects SSE → starts HLS playback
   - Loading state while session starts
   - Toggle play/pause for active session

6. **CSS Enhancements**:
   - Transcript entry styling with soul-specific colors
   - Play button disabled/loading states
   - Smooth scrollbar styling for transcript
   - Fade-in animation for new transcript entries

**Files Modified**:
- `src/pages/radio.astro` - Complete rewrite of script section
- `src/styles/radio.css` - Transcript and play button enhancements

---

### Phase 4b: Code Review Fixes ✅ COMPLETE

**Goal**: Address issues identified by code review subagents.

**Status**: Fixed January 27, 2025.

**Issues Fixed**:

| Severity | Issue | Fix |
|----------|-------|-----|
| CRITICAL | Event listener memory leak in `renderQuestionQueue()` | Switched to event delegation (attach once) |
| CRITICAL | SSE cleanup missing on navigation | Added `astro:before-swap` handler |
| CRITICAL | HLS race condition in error recovery | Added null checks before `hls.startLoad()` |
| HIGH | XSS vulnerability in question queue | Added `escapeAttr()` for `data-id` attributes |
| HIGH | Audio element accumulation | Reuse existing element, guard with `isInitialized` |
| MEDIUM | Visualizer animation performance | Changed `height` → `transform: scaleY()` |
| MEDIUM | Firefox scrollbar missing | Added `scrollbar-width`, `scrollbar-color` |
| MEDIUM | Touch targets below 44px | Expanded volume button touch target via `::before` |
| LOW | `inset` shorthand compatibility | Replaced with explicit `top/right/bottom/left` |
| LOW | Missing focus-visible states | Added `:focus-visible` to all interactive elements |

**Changes Summary**:

1. **Event Delegation** (`radio.astro`):
   - `setupQueueEventDelegation()` attaches once in `initRadio()`
   - Click events bubble up, no per-button listeners on re-render

2. **SSE Cleanup** (`radio.astro`):
   - `astro:before-swap` event triggers `cleanup()` when navigating away
   - Prevents EventSource leaks during View Transitions

3. **HLS Race Condition** (`radio.astro`):
   - Guard: `if (!hls) return` at start of error handler
   - Optional chaining: `hls?.startLoad()`, `hls?.recoverMediaError()`

4. **XSS Prevention** (`radio.astro`):
   - New `escapeAttr()` function for attribute values
   - Applied to all `data-id` attributes in question queue

5. **Audio Element Reuse** (`radio.astro`):
   - Check for existing `#radio-audio` before creating
   - `isInitialized` flag prevents double `initRadio()` calls

6. **CSS Performance** (`radio.css`):
   - Visualizer bars use `transform: scaleY()` + `will-change: transform`
   - GPU-accelerated animation, no layout thrashing

7. **Accessibility** (`radio.css`):
   - Firefox scrollbar: `scrollbar-width: thin; scrollbar-color`
   - Volume button touch target: 44px via `::before` pseudo-element
   - `:focus-visible` on play, volume, submit, copy, upvote buttons

**Files Modified**:
- `src/pages/radio.astro` - Security and memory leak fixes
- `src/styles/radio.css` - Performance and accessibility improvements

---

### Phase 5: Integration Testing (P2) ✅ COMPLETE

**Goal**: End-to-end validation of the complete system.

**Status**: All core tests passed on January 28, 2026 using TTS mock server.

**Test Results**:

| Test | Steps | Result |
|------|-------|--------|
| Basic dialogue | Start session, let souls talk | ✅ 11 turns, 4:20 runtime, speakers alternated |
| Audio generation | TTS mock server | ✅ Base64 audio chunks in SSE stream |
| HLS streaming | Check playlist/segments | ✅ 4 segments @ 5s each = 20s audio |
| HLS segment fetch | GET segment endpoint | ✅ 200 OK, audio/wav, 120KB |
| Question submission | POST /api/radio/question | ✅ Question accepted, queued |
| Question upvote | POST /api/radio/upvote | ✅ Upvote counted |
| Question addressed | Check status | ✅ questionsAddressed: 1 |
| SSE streaming | Connect to stream | ✅ State, audio, speech events |

**Test Commands Used**:
```bash
# Start session
curl -X POST http://localhost:4321/api/radio/start \
  -H "Content-Type: application/json" \
  -d '{"topic":"The mysteries of the Minoan labyrinth"}'

# Connect SSE stream (triggers dialogue)
curl -N http://localhost:4321/api/radio/stream?sessionId=<id>

# Check HLS playlist
curl http://localhost:4321/api/radio/hls/playlist?sessionId=<id>

# Submit question
curl -X POST http://localhost:4321/api/radio/question \
  -H "Content-Type: application/json" \
  -d '{"question":"How did Minoans navigate?","listenerName":"Theseus"}'

# Check status
curl http://localhost:4321/api/radio/status
```

**Fix Applied During Testing**:
- LLM provider initialization: Added `createOpenRouterProvider()` to start.ts
- Environment variable access: Use `import.meta.env` for Astro/Vite compatibility

**Remaining Tests (Manual)**:
- Browser HLS playback with HLS.js
- VLC playback of m3u8 URL
- Stream reconnection after disconnect

**Monitoring**:
- TTS queue depth: 0 (mock mode)
- Audio queue length: 7 chunks buffered
- Stream latency: <100ms (polling interval)
- Error rates: 0 errors during test

---

## Revised Timeline

| Phase | Status | Notes |
|-------|--------|-------|
| 1. TTS Server | ✅ Done | Deployed on Mac Mini |
| 1b. AAC Encoding | ✅ Done | ffmpeg integration |
| 2. API Endpoints | ✅ Done | start, stream, HLS |
| 3. HLS Streaming | ✅ Done | Segmenter, playlist, store |
| 3b. Security Fixes | ✅ Done | Path traversal, validation |
| 3c. Security Hardening | ✅ Done | Command injection, timing attacks, error handling |
| 4. Web Player | ✅ Done | HLS.js + SSE integration |
| 4b. Code Review Fixes | ✅ Done | Security, memory, accessibility |
| 5. Integration | ✅ Done | All core tests passed |

---

## Files Modified (Cumulative)

### New Files Created
- `qwen3-tts/server/main.py`
- `qwen3-tts/server/tts_engine.py`
- `qwen3-tts/server/audio_encoder.py`
- `src/pages/api/radio/start.ts`
- `src/pages/api/radio/stream.ts`
- `src/pages/api/radio/hls/playlist.ts`
- `src/pages/api/radio/hls/segment.ts`
- `src/lib/radio/streaming/HLSSegmenter.ts`
- `src/lib/radio/streaming/PlaylistManager.ts`
- `src/lib/radio/streaming/SegmentStore.ts`
- `src/lib/radio/streaming/index.ts`

### Modified Files
- `src/lib/radio/types.ts` - AudioFormat, TTSResult
- `src/lib/radio/tts/RemoteTTSClient.ts` - Format support
- `src/lib/radio/index.ts` - Exports

---

## Verification Plan

### Phase 1 Verification ✅
```bash
# Test health
curl http://mac-mini.local:8000/health

# Test generation with AAC
curl -X POST http://mac-mini.local:8000/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TTS_BEARER_TOKEN" \
  -d '{"text": "The labyrinth awaits.", "speaker": "Ryan", "format": "aac"}' \
  -o test.aac

# Verify AAC file
ffprobe test.aac
```

### Full System Verification
```bash
# Start dev server
npm run dev

# In browser
# 1. Navigate to /radio
# 2. Click "Start Radio"
# 3. Verify audio plays via HLS
# 4. Submit a question
# 5. Verify question appears in queue
# 6. Verify souls address question
```

---

## Open Questions

1. **Storage**: Vercel Blob vs R2 for HLS segments? (Recommend: start with Vercel Blob for simplicity)

2. **Persistence**: Should dialogue state persist across server restarts? (Recommend: no, treat each session as ephemeral)

3. **Scheduling**: Continuous broadcast vs scheduled shows? (Recommend: start with on-demand, add scheduling later)

---

## Next Steps

1. ✅ ~~Phase 1: TTS Server~~
2. ✅ ~~Phase 1b: AAC Encoding~~
3. ✅ ~~Phase 2: API Endpoints~~
4. ✅ ~~Phase 3: HLS Streaming~~
5. ✅ ~~Phase 3b: Security Fixes~~
6. ✅ ~~Phase 3c: Security Hardening~~
7. ✅ ~~Phase 4: Web Player Integration~~
   - Added HLS.js for cross-browser audio streaming
   - Connected SSE for real-time metadata updates
   - Implemented session start flow with topic prompt
   - Added live transcript population from SSE speech events
   - Added visual distinction for Kothar vs Artifex in transcript
   - Handled HLS/browser fallbacks (native Safari, HLS.js for others)
8. 🔜 **Begin Phase 5**: Integration Testing
   - Test basic dialogue flow
   - Test question submission and addressing
   - Test HLS playback in multiple browsers
   - Verify reconnection behavior
