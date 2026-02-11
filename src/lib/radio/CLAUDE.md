# Daimonic Radio Module

Two-soul AI radio broadcast system with Kothar (craftsman-sage) and Artifex (futuristic sentinel).

## Structure

| Directory | Purpose |
|-----------|---------|
| `audio/` | AudioBuffer, AudioMixer for playback |
| `cognitiveSteps/` | LLM transformations for dialogue |
| `streaming/` | HLS segmenter, playlist, segment store |
| `tts/` | RemoteTTSClient for Qwen3-TTS server |

## Key Files

- `DialogueOrchestrator.ts` - Turn-taking, interruptions, topic flow
- `QuestionManager.ts` - Listener question queue with upvoting
- `types.ts` - All TypeScript interfaces

## Conventions

- **Soul names**: `RadioSoulName` = `'kothar' | 'artifex'`
- **Voices**: Kothar=Ryan, Artifex=Aiden (Qwen3-TTS)
- **Chunk markers**: Use `|` in text for natural pause points
- **Audio format**: Float32Array PCM, or AAC for HLS

## Cognitive Steps

Located in `cognitiveSteps/`:

| Step | When Used |
|------|-----------|
| `chunkedExternalDialog` | Generate streaming dialogue |
| `interruptionDecision` | Check urgency (0.7+ = interrupt) |
| `backchannelResponse` | Add "mm-hmm" feedback |
| `questionSelector` | Pick best question from queue |
| `questionResponse` | Generate answer to question |

## API Integration

Endpoints at `src/pages/api/radio/`:
- `start.ts` - POST starts session, GET checks status
- `stream.ts` - SSE stream triggers dialogue loop
- `question.ts`, `upvote.ts` - Listener interaction
- `hls/playlist.ts`, `hls/segment.ts` - HLS delivery

## Required Environment

```
TTS_SERVER_URL=http://127.0.0.1:8000  # Qwen3-TTS
OPENROUTER_API_KEY=...                 # LLM inference
```

## Testing

```bash
# Mock TTS (in qwen3-tts dir)
TTS_MOCK=true uv run uvicorn server.main:app --port 8000

# Start session
curl -X POST http://localhost:4321/api/radio/start \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test topic"}'

# Connect stream (triggers dialogue)
curl -N http://localhost:4321/api/radio/stream?sessionId=<id>
```

## Architecture Notes

- DialogueOrchestrator calls cognitive steps in sequence
- TTS runs async; audio queued for playback/HLS
- HLSSegmenter buffers 5-second segments
- SegmentStore: InMemory (dev) or VercelBlob (prod)
