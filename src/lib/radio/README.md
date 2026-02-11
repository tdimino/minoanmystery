# Daimonic Radio

Real-time AI radio broadcast system where two soul personalities (Kothar and Artifex) engage in dialogue about topics proposed by listeners.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DialogueOrchestrator                                        │
│  └── Coordinates turn-taking between souls                   │
│      ├── chunkedExternalDialog (cognitive step)              │
│      ├── interruptionDecision (urgency detection)            │
│      ├── backchannelResponse (listener feedback)             │
│      └── questionSelector/questionResponse                   │
├─────────────────────────────────────────────────────────────┤
│  TTS Layer                                                   │
│  └── RemoteTTSClient                                         │
│      └── Connects to Qwen3-TTS server (Mac Mini)             │
│          ├── POST /tts/generate (PCM, WAV, or AAC)           │
│          └── GET /health (status check)                      │
├─────────────────────────────────────────────────────────────┤
│  Audio Layer                                                 │
│  └── AudioMixer                                              │
│      ├── AudioBuffer (typed audio data)                      │
│      └── Prefetch-while-playing strategy                     │
├─────────────────────────────────────────────────────────────┤
│  Streaming Layer                                             │
│  ├── HLSSegmenter (5-second audio segments)                  │
│  ├── PlaylistManager (m3u8 generation)                       │
│  └── SegmentStore (in-memory or Vercel Blob)                 │
├─────────────────────────────────────────────────────────────┤
│  Question Layer                                              │
│  └── QuestionManager                                         │
│      ├── Priority queue with upvoting                        │
│      ├── Rate limiting per listener                          │
│      └── Selection by semantic relevance                     │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `DialogueOrchestrator.ts` | Main orchestration - turn-taking, topic management |
| `QuestionManager.ts` | Listener question queue with upvoting |
| `types.ts` | TypeScript interfaces for all radio types |
| `index.ts` | Module exports |

### Subdirectories

| Directory | Contents |
|-----------|----------|
| `audio/` | AudioMixer, AudioBuffer for audio processing |
| `cognitiveSteps/` | LLM cognitive steps for dialogue generation |
| `streaming/` | HLS infrastructure (segmenter, playlist, store) |
| `tts/` | RemoteTTSClient for TTS server communication |

## API Endpoints

Located at `src/pages/api/radio/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/radio/start` | POST | Start new radio session |
| `/api/radio/start` | GET | Check active session status |
| `/api/radio/stream` | GET | SSE stream (triggers dialogue loop) |
| `/api/radio/stream` | POST | Control: pause/resume/stop |
| `/api/radio/question` | POST | Submit listener question |
| `/api/radio/upvote` | POST | Upvote a question |
| `/api/radio/status` | GET | Full session status + question queue |
| `/api/radio/hls/playlist` | GET | HLS m3u8 playlist |
| `/api/radio/hls/segment` | GET | Individual HLS audio segment |

## Usage

### Starting a Session

```typescript
// POST /api/radio/start
const response = await fetch('/api/radio/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'The mysteries of the Minoan labyrinth',
    questionsEnabled: true,
    hlsEnabled: true,
  }),
});

const { sessionId, hlsPlaylistUrl, sseStreamUrl } = await response.json();
```

### Connecting to Stream

```typescript
// EventSource for metadata updates
const eventSource = new EventSource(sseStreamUrl);

eventSource.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  switch (type) {
    case 'state':
      updateUI(data.currentSpeaker, data.totalTurns);
      break;
    case 'speech':
      showSpeechBubble(data.soul, data.text);
      break;
    case 'audio':
      // For non-HLS playback
      playAudioChunk(data.audioBase64);
      break;
  }
};
```

### HLS Playback

```typescript
import Hls from 'hls.js';

const audio = document.getElementById('radio-player');
const hls = new Hls();

hls.loadSource(hlsPlaylistUrl);
hls.attachMedia(audio);
audio.play();
```

### Submitting Questions

```typescript
await fetch('/api/radio/question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'How did the Minoans navigate the labyrinth?',
    listenerName: 'Theseus',
  }),
});
```

## Cognitive Steps

Located in `cognitiveSteps/`:

| Step | Purpose |
|------|---------|
| `chunkedExternalDialog.ts` | Generate dialogue in streaming chunks |
| `interruptionDecision.ts` | Detect urgency for interruption |
| `backchannelResponse.ts` | Generate listener feedback ("mm-hmm") |
| `questionSelector.ts` | Select best question from queue |
| `questionResponse.ts` | Generate response to listener question |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TTS_SERVER_URL` | Yes | URL to Qwen3-TTS server |
| `TTS_BEARER_TOKEN` | No | Optional auth token |
| `OPENROUTER_API_KEY` | Yes | For LLM inference |
| `GROQ_API_KEY` | No | Optional fast inference |

## Development

### Running with Mock TTS

```bash
# In qwen3-tts directory
TTS_MOCK=true uv run uvicorn server.main:app --host 127.0.0.1 --port 8000

# Update .env
TTS_SERVER_URL=http://127.0.0.1:8000
```

### Testing

```bash
# Start session
curl -X POST http://localhost:4321/api/radio/start \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test topic"}'

# Connect to stream (triggers dialogue)
curl -N http://localhost:4321/api/radio/stream?sessionId=<id>

# Check status
curl http://localhost:4321/api/radio/status
```

## Soul Personalities

| Soul | Voice | Character |
|------|-------|-----------|
| Kothar | Ryan | Craftsman-sage, deliberate wisdom |
| Artifex | Aiden | Futuristic sentinel, sardonic precision |

Personality files located at `souls/minoan/soul.md` (Kothar) and `souls/minoan/poetic/soul.md` (Artifex).
