# Daimonic Radio: Implementation Roadmap

**Date**: January 27, 2025
**Status**: Phase 3 Complete (HLS Streaming + Security Fixes)
**Prerequisite**: `plans/Radio-Architecture-Implementation-01-27-2027.md` (architecture vision)

---

## Executive Summary

The Daimonic Radio codebase has **significantly more infrastructure than expected**. Phases 2-4 from the original plan are largely implemented. This roadmap focuses on the **actual gaps**: TTS server deployment, HLS streaming, and integration testing.

### What's Already Built

| Component | File | Status |
|-----------|------|--------|
| DialogueOrchestrator | `src/lib/radio/DialogueOrchestrator.ts` (667 lines) | ✅ Complete |
| Type definitions | `src/lib/radio/types.ts` (399 lines) | ✅ Complete |
| TTS Client | `src/lib/radio/tts/RemoteTTSClient.ts` (269 lines) | ✅ Complete |
| Audio Mixer | `src/lib/radio/audio/AudioMixer.ts` (719 lines) | ✅ Complete |
| Chunked Dialog | `cognitiveSteps/chunkedExternalDialog.ts` | ✅ Complete |
| Interruption Decision | `cognitiveSteps/interruptionDecision.ts` | ✅ Complete |
| Backchannel Response | `cognitiveSteps/backchannelResponse.ts` | ✅ Complete |
| Question Selector | `cognitiveSteps/questionSelector.ts` | ✅ Complete |
| Question Response | `cognitiveSteps/questionResponse.ts` | ✅ Complete |
| Question Manager | `src/lib/radio/QuestionManager.ts` | ✅ Complete |
| Radio Page UI | `src/pages/radio.astro` | 🟡 Visual only |

### What's Missing

| Component | Priority | Status |
|-----------|----------|--------|
| Mac Mini TTS Server (FastAPI + Qwen3-TTS) | **P0** | ✅ Complete |
| API Endpoints (start, stream, question) | **P1** | ✅ Complete |
| HLS Streaming Infrastructure | **P1** | ✅ Complete |
| AAC Encoding on TTS Server | **P1** | 🔜 Next |
| Web Player Integration | **P2** | Pending |
| End-to-End Testing | **P2** | Pending |

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

## Mac Mini M4 TTS Optimization Strategies

**Hardware**: Mac Mini M4 (16GB RAM, 256GB SSD, Apple Intelligence-enabled)

### Research Summary (January 2025)

Comprehensive research via Exa search and Firecrawl identified 5 optimization paths for TTS on Apple Silicon:

### Strategy 1: MLX-Audio Library (Recommended for Production)

**Repository**: [Blaizzy/mlx-audio](https://github.com/Blaizzy/mlx-audio) (5.5k stars)

| Feature | Details |
|---------|---------|
| **Framework** | Native MLX (Apple's ML framework) |
| **Models** | Kokoro, Qwen3-TTS, CSM, Dia, OuteTTS, Spark, Chatterbox |
| **Quantization** | 3-bit, 4-bit, 6-bit, 8-bit support |
| **API** | OpenAI-compatible REST API built-in |
| **Platform** | Python + Swift package for iOS/macOS |

**Advantages**:
- Native MLX means optimal Apple Silicon utilization
- Pre-built quantized models reduce memory footprint
- REST API simplifies integration with existing FastAPI server
- Actively maintained with frequent updates

**Installation**:
```bash
pip install mlx-audio
```

**Usage**:
```python
from mlx_audio.tts.utils import load_model

# Load quantized Kokoro (fastest)
model = load_model("mlx-community/Kokoro-82M-bf16")

# Generate speech
for result in model.generate("Hello from Daimonic Radio!", voice="af_heart"):
    audio = result.audio
```

### Strategy 2: MPS + SDPA Optimization (Current Qwen3-TTS)

**Source**: [lingshunlab.com optimization guide](https://lingshunlab.com/ai/qwen3-tts-on-mac-mini-m4-the-ultimate-installation-optimization-guide)

**Key Code Modifications for M4**:

```python
# Prerequisites
brew install portaudio ffmpeg sox

# Model loading (M4 optimized)
MODEL_PATH = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
tts = Qwen3TTSModel.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.bfloat16,   # M4 fully supports bfloat16
    attn_implementation="sdpa",    # Use SDPA (NOT FlashAttention2)
    device_map="mps",              # Force Apple GPU
)

# CRITICAL: Correct synchronization for M4
if torch.backends.mps.is_available():
    torch.mps.synchronize()  # NOT torch.cuda.synchronize()
```

**Performance Tips**:
- Use `torch.bfloat16` (M4 native support)
- Replace `flash_attention_2` with `sdpa` (Mac-compatible)
- Add punctuation to slow speech: `"Hello, world..."` creates natural pauses
- Speed parameter: `speed=0.85` for 85% speed

### Strategy 3: Quantized Models (Memory Optimization)

**F5-TTS-MLX** ([lucasnewman/f5-tts-mlx](https://github.com/lucasnewman/f5-tts-mlx), 604 stars):

| Model | Size | Generation Time (M3 Max) |
|-------|------|--------------------------|
| Full (bf16) | ~1.5GB | ~4 seconds |
| 8-bit quantized | ~750MB | ~3 seconds |
| 4-bit quantized | ~400MB | ~2.5 seconds |

```bash
# Use quantized model
python -m f5_tts_mlx.generate --text "Hello world" --q 4
```

**Kokoro-MLX** ([tsmdt/kokoro-MLX-blender](https://github.com/tsmdt/kokoro-MLX-blender)):
- Only 82M parameters (vs 1.7B for Qwen3-TTS)
- Voice blending: Mix two voices with ratio parameter
- Gradio web interface included

```bash
# Voice blending example
kbx run -t "Testing voice blend" -v1 am_eric -v2 af_heart -m 0.6
```

### Strategy 4: Apple Neural Engine (Future Optimization)

**Potential**: Up to 3x faster than MPS for some workloads

**Requirements**:
- Convert model to CoreML format
- Use `coremltools` for conversion
- Apple's compact neural TTS achieves ~15ms latency

**Status**: Not yet explored for Qwen3-TTS. Would require significant engineering effort.

### Strategy 5: Environment Setup (Q3-TTS Reference)

**Source**: [esendjer/Q3-TTS](https://github.com/esendjer/Q3-TTS)

**Critical dependencies for macOS Tahoe**:
```bash
# 1. Install LLVM 20
brew install llvm@20

# 2. Set environment
export PATH="/usr/local/opt/llvm@20/bin:$PATH"
export CMAKE_PREFIX_PATH="/usr/local/opt/llvm@20"

# 3. Use Python 3.12 + uv
uv init -p 3.12
uv sync

# 4. Install with torch env workaround
[tool.uv]
required-environments = [
    "sys_platform == 'darwin' and platform_machine == 'x86_64'"
]

# 5. Fix numpy version
uv add 'numpy<2'
```

### Recommendation Matrix

| Strategy | Latency | Memory | Effort | Best For |
|----------|---------|--------|--------|----------|
| **MLX-Audio** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Production (drop-in) |
| **MPS+SDPA** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Current setup optimization |
| **Quantized** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Memory-constrained |
| **Kokoro 82M** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Fastest inference |
| **Neural Engine** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Future (requires CoreML) |

### Recommended Action Plan

1. **Immediate** (Phase 1 optimization):
   - Apply MPS+SDPA code changes to existing Qwen3-TTS server
   - Install portaudio, ffmpeg, sox prerequisites
   - Test bfloat16 + sdpa configuration

2. **Short-term** (if latency insufficient):
   - Evaluate MLX-Audio library as drop-in replacement
   - Test Kokoro 82M for sub-second generation
   - Consider 4-bit quantized F5-TTS

3. **Long-term** (if quality/latency tradeoff needed):
   - Investigate CoreML conversion for Neural Engine acceleration
   - Benchmark all options with production dialogue content

---

## Implementation Phases

### Phase 1: Mac Mini TTS Server (P0) ✅ COMPLETE

**Goal**: Deploy FastAPI server running Qwen3-TTS on Mac Mini.

**Status**: Implemented in previous session. Server deployed at `mac-mini.local:8000`.

**Files to Create**:
```
mac-mini-tts-server/
├── main.py                 # FastAPI endpoints
├── tts_engine.py           # Qwen3-TTS wrapper
├── queue_manager.py        # Request prioritization
├── requirements.txt        # Dependencies
└── README.md               # Setup instructions
```

**Endpoints**:
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/tts/generate` | Queue TTS request |
| GET | `/tts/result/{id}` | Poll for audio |
| WS | `/tts/stream` | WebSocket streaming |
| GET | `/health` | Health check |
| GET | `/queue/status` | Queue monitoring |

**Key Implementation**:
```python
# main.py
from fastapi import FastAPI, BackgroundTasks
from qwen_tts import Qwen3TTSModel

app = FastAPI()

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B",
    device_map="mps",  # Apple Silicon
)

@app.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    # Queue and process

@app.websocket("/tts/stream")
async def tts_websocket(websocket):
    # Real-time streaming
```

**Voice Configuration**:
| Soul | Voice | Style Instruction |
|------|-------|-------------------|
| Kothar | Ryan | "Thoughtful, deliberate, ancient wisdom" |
| Artifex | Aiden | "Warm, curious, gently enthusiastic" |

**Verification**:
1. `curl http://mac-mini.local:8000/health` returns healthy
2. Generate test audio for both voices
3. Measure latency (target: <100ms first packet)

---

### Phase 1b: AAC Encoding on TTS Server (P1) 🔜 NEXT

**Goal**: Add AAC encoding capability to Mac Mini TTS server for HLS compliance.

**Status**: Planned. Required for production HLS (RFC 8216 requires AAC/MP3, not WAV).

**Why on TTS Server?**:
| Option | Bundle Size | Latency | Feasibility |
|--------|-------------|---------|-------------|
| **ffmpeg on Mac Mini** | None (native) | ~10-50ms | ✅ Best |
| ffmpeg.wasm (Node) | ~5MB WASM | ~100-200ms | ⚠️ Heavy |
| aac-encoder.js | ~200KB | ~50ms | ⚠️ Immature |
| ffmpeg in Vercel | N/A | N/A | ❌ Can't install |

**Files to Modify**:
```
mac-mini-tts-server/
├── main.py              # Add format parameter to endpoints
├── audio_encoder.py     # NEW: ffmpeg pipe wrapper
└── requirements.txt     # No new deps (ffmpeg is system)
```

**New Endpoint Parameter**:
```python
# Extend existing /tts/generate endpoint
@app.post("/tts/generate")
async def generate_tts(
    request: TTSRequest,
    format: Literal["pcm", "wav", "aac"] = "pcm"  # NEW
):
    audio_pcm = await tts_engine.generate(request.text, request.voice)

    if format == "aac":
        return encode_to_aac(audio_pcm, sample_rate=24000)
    elif format == "wav":
        return encode_to_wav(audio_pcm, sample_rate=24000)
    else:
        return audio_pcm  # Raw PCM (current behavior)
```

**AAC Encoder Implementation**:
```python
# audio_encoder.py
import subprocess
from typing import Literal

def encode_to_aac(
    pcm_data: bytes,
    sample_rate: int = 24000,
    channels: int = 1,
    bitrate: str = "64k"
) -> bytes:
    """
    Convert raw PCM to AAC using ffmpeg subprocess pipe.

    Performance: ~10-50ms for 5s of audio on M1/M2 Mac Mini.
    Output: ADTS-wrapped AAC (self-contained, no container needed).
    """
    cmd = [
        'ffmpeg', '-y',
        '-f', 's16le',              # Input: signed 16-bit little-endian PCM
        '-ar', str(sample_rate),    # Sample rate (24000 for Qwen TTS)
        '-ac', str(channels),       # Channels (1 = mono)
        '-i', 'pipe:0',             # Read from stdin
        '-c:a', 'aac',              # AAC codec (native ffmpeg)
        '-b:a', bitrate,            # Bitrate (64k good for speech)
        '-f', 'adts',               # ADTS container (HLS compatible)
        '-movflags', '+faststart',  # Optimize for streaming
        'pipe:1'                    # Output to stdout
    ]

    proc = subprocess.run(
        cmd,
        input=pcm_data,
        capture_output=True,
        check=True
    )
    return proc.stdout


def encode_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1) -> bytes:
    """Convert raw PCM to WAV (for development/fallback)."""
    import struct

    num_samples = len(pcm_data) // 2  # 16-bit = 2 bytes per sample
    data_size = len(pcm_data)

    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        36 + data_size,
        b'WAVE',
        b'fmt ',
        16,                    # fmt chunk size
        1,                     # PCM format
        channels,
        sample_rate,
        sample_rate * channels * 2,  # byte rate
        channels * 2,          # block align
        16,                    # bits per sample
        b'data',
        data_size
    )
    return header + pcm_data
```

**Astro Client Update** (RemoteTTSClient):
```typescript
// src/lib/radio/tts/RemoteTTSClient.ts
interface TTSOptions {
  format?: 'pcm' | 'wav' | 'aac';  // Add format option
}

async generate(text: string, voice: string, options?: TTSOptions): Promise<ArrayBuffer> {
  const format = options?.format ?? 'aac';  // Default to AAC for HLS

  const response = await fetch(`${this.serverUrl}/tts/generate?format=${format}`, {
    method: 'POST',
    body: JSON.stringify({ text, voice }),
    // ...
  });
  return response.arrayBuffer();
}
```

**HLSSegmenter Update**:
```typescript
// Since TTS server returns AAC, segmenter just needs to:
// 1. Buffer incoming AAC frames
// 2. Package into ADTS segments (no re-encoding needed)
// 3. Update content-type to 'audio/aac'
```

**Verification**:
```bash
# 1. Check ffmpeg is installed on Mac Mini
ssh mac-mini "ffmpeg -version"

# 2. Test AAC endpoint
curl -X POST "http://mac-mini.local:8000/tts/generate?format=aac" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "Ryan"}' \
  -o test.aac

# 3. Verify AAC file is valid
ffprobe test.aac

# 4. Test in HLS player (should work on iOS Safari)
```

**Migration Path**:
1. Add `audio_encoder.py` to TTS server
2. Add `format` parameter to endpoints
3. Update `RemoteTTSClient` to request AAC
4. Update `HLSSegmenter` to pass-through AAC (no WAV encoding)
5. Update `SegmentStore` content-type to `audio/aac`

---

### Phase 2: API Endpoints (P1) ✅ COMPLETE

**Goal**: Create server-side endpoints for radio control.

**Status**: Implemented January 27, 2025. All endpoints created and integrated with DialogueOrchestrator.

**Environment Variables Added**:
- `TTS_SERVER_URL` - URL to qwen3-tts server
- `TTS_BEARER_TOKEN` - Optional authentication token

**Files to Create/Modify**:
```
src/pages/api/radio/
├── start.ts      # Start radio session
├── stream.ts     # Audio stream (HLS playlist)
├── question.ts   # Submit listener question
├── upvote.ts     # Upvote question
└── status.ts     # Current state (topic, speaker, etc.)
```

**Endpoint Specs**:

```typescript
// POST /api/radio/start
// Starts a new radio session with a topic
interface StartRequest {
  topic: string;
  duration?: number;  // Max duration in minutes
}

// GET /api/radio/stream.m3u8
// Returns HLS playlist

// POST /api/radio/question
interface QuestionRequest {
  question: string;
  listenerName?: string;
}

// WebSocket /api/radio/live
// Real-time metadata updates
interface LiveUpdate {
  speaker: 'kothar' | 'artifex';
  topic: string;
  listeners: number;
  currentQuestion?: string;
}
```

**Integration Points**:
- Connect to `DialogueOrchestrator` for session management
- Connect to `QuestionManager` for question handling
- Connect to `RemoteTTSClient` for audio generation

---

### Phase 3: HLS Streaming (P1) ✅ COMPLETE

**Goal**: Broadcast audio as HLS stream for universal playback.

**Status**: Implemented January 27, 2025. HLS infrastructure created with segmenter, playlist manager, and storage abstraction.

**Files Created**:
- `src/lib/radio/streaming/SegmentStore.ts` - In-memory and Vercel Blob backends
- `src/lib/radio/streaming/HLSSegmenter.ts` - 5-second segment buffering
- `src/lib/radio/streaming/PlaylistManager.ts` - m3u8 playlist generation
- `src/lib/radio/streaming/index.ts` - Module exports
- `src/pages/api/radio/hls/playlist.ts` - Serve m3u8 playlists
- `src/pages/api/radio/hls/segment.ts` - Serve audio segments

**Dependencies Added**: `@vercel/blob`

**Files to Create**:
```
src/lib/radio/streaming/
├── HLSSegmenter.ts      # Segment audio into 5s chunks
├── PlaylistManager.ts   # Generate/update m3u8
└── SegmentStore.ts      # Upload to Vercel Blob/R2
```

**Key Implementation**:
```typescript
class HLSSegmenter {
  private segmentDuration = 5;  // seconds

  async addAudio(audio: Float32Array, sampleRate: number) {
    // Buffer audio
    // When >= 5s, encode to AAC and upload
  }

  private async flushSegment() {
    const aacBuffer = await encodeAAC(combined, sampleRate);
    const url = await this.store.upload(`segment_${index}.aac`, aacBuffer);
    await this.playlist.addSegment(url);
  }
}
```

**Playlist Format**:
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:42

#EXTINF:5.0,
https://storage.example.com/segment_42.aac
#EXTINF:5.0,
https://storage.example.com/segment_43.aac
```

**Storage Options**:
- Vercel Blob (simplest, integrated)
- Cloudflare R2 (cheapest for high volume)
- S3 (most flexible)

#### Phase 3b: Security & Performance Fixes ✅ COMPLETE

After code review, the following issues were identified and fixed:

**Critical Fixes**:
| Issue | Fix |
|-------|-----|
| `URL.createObjectURL()` browser-only API | Replaced with API endpoint URLs |
| Segment ID path inconsistency | Added `storagePath` vs `id` distinction in StoredSegment |
| Malformed baseUrl concatenation | Removed baseUrl, use segment.url directly |
| Path traversal vulnerability | Added regex validation for sessionId/segmentId |
| Array modification during iteration | Collect IDs first, then delete |

**Security Improvements**:
| Area | Change |
|------|--------|
| Input validation | Regex patterns for sessionId (`/^radio_\d+_[a-z0-9]+$/`) and segmentId (`/^segment_\d+$/`) |
| CORS | Restricted to same-origin in production |
| Memory limits | Added `maxTotalBytes` (50MB default) to prevent DoS |

**Performance Optimizations**:
| Area | Change |
|------|--------|
| WAV encoding | Use `Int16Array` bulk view instead of per-sample `DataView.setInt16()` |
| Audio buffering | Fast path for samples that fit in buffer, use `subarray` for zero-copy views |
| Cleanup | Parallel deletion in VercelBlobStore |

**Known Limitation**:
- WAV encoding used instead of AAC (HLS RFC 8216 requires AAC/MP3)
- Production options documented: ffmpeg server-side, cloud encoding, or ffmpeg.wasm

---

### Phase 4: Web Player Integration (P2)

**Goal**: Connect radio.astro UI to live backend.

**Files to Modify**:
- `src/pages/radio.astro` - Add HLS.js, WebSocket connection
- `src/styles/radio.css` - Ensure styling works with live data

**Key Features**:
1. **HLS Playback** via hls.js (cross-browser)
2. **Live Metadata** via WebSocket
3. **Question Submission** with rate limiting
4. **Question Queue** with upvoting
5. **Listener Count** display

**Implementation**:
```astro
<script>
  import Hls from 'hls.js';

  const audio = document.getElementById('radio-player');

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource('/api/radio/stream.m3u8');
    hls.attachMedia(audio);
  }

  // WebSocket for live updates
  const ws = new WebSocket(`wss://${location.host}/api/radio/live`);
  ws.onmessage = (e) => updateUI(JSON.parse(e.data));
</script>
```

---

### Phase 5: Integration Testing (P2)

**Goal**: End-to-end validation of the complete system.

**Test Scenarios**:

| Test | Steps | Expected |
|------|-------|----------|
| Basic dialogue | Start session, let souls talk for 2 min | Smooth turn-taking, no audio gaps |
| Interruption | Trigger high-urgency response | Natural interruption, interrupted soul remembers |
| Backchannel | Long monologue | Listener soul adds "mm-hmm", "interesting" |
| Question | Submit question mid-dialogue | Souls address it within 2 minutes |
| HLS playback | Open stream in browser + VLC | Plays in both, <10s latency |
| Reconnection | Disconnect/reconnect stream | Resumes without error |

**Monitoring**:
- TTS queue depth
- Audio buffer levels
- Stream latency
- Error rates

---

## Revised Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. TTS Server | 2-3 days | Mac Mini access |
| 2. API Endpoints | 1-2 days | Phase 1 |
| 3. HLS Streaming | 2-3 days | Phase 2 |
| 4. Web Player | 1-2 days | Phase 3 |
| 5. Integration | 1-2 days | All above |
| **Total** | **7-12 days** | |

---

## Files to Modify

### New Files
- `mac-mini-tts-server/` (entire directory)
- `src/pages/api/radio/start.ts`
- `src/pages/api/radio/stream.ts`
- `src/pages/api/radio/question.ts`
- `src/pages/api/radio/upvote.ts`
- `src/pages/api/radio/status.ts`
- `src/lib/radio/streaming/HLSSegmenter.ts`
- `src/lib/radio/streaming/PlaylistManager.ts`
- `src/lib/radio/streaming/SegmentStore.ts`

### Modified Files
- `src/pages/radio.astro` - Connect to live backend
- `src/lib/radio/types.ts` - Update voice names (Tamarru → Artifex)
- Environment variables for TTS server URL

---

## Verification Plan

### Phase 1 Verification
```bash
# On Mac Mini
cd mac-mini-tts-server
uvicorn main:app --host 0.0.0.0 --port 8000

# Test health
curl http://mac-mini.local:8000/health

# Test generation
curl -X POST http://mac-mini.local:8000/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "The labyrinth awaits.", "speaker": "Ryan"}'
```

### Full System Verification
```bash
# Start dev server
npm run dev

# In browser
# 1. Navigate to /radio
# 2. Click "Start Radio"
# 3. Verify audio plays
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

1. ✅ ~~Approve this plan~~
2. ✅ ~~Set up Mac Mini with Python, FastAPI, Qwen3-TTS~~ (Phase 1 complete)
3. ✅ ~~Implement API Endpoints~~ (Phase 2 complete)
4. ✅ ~~HLS Streaming Infrastructure~~ (Phase 3 complete)
5. **Begin Phase 1b**: AAC Encoding on TTS Server
   - Add `audio_encoder.py` with ffmpeg pipe wrapper
   - Add `format` parameter to `/tts/generate` endpoint
   - Update `RemoteTTSClient` to request AAC format
   - Update `HLSSegmenter` to pass-through AAC (no re-encoding)
   - Verify on iOS Safari (strict HLS compliance required)
6. **Phase 4**: Web Player Integration
   - Add hls.js to radio.astro for HLS playback
   - Connect WebSocket for live metadata updates
   - Implement question submission UI
   - Add listener count display
