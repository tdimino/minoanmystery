# Daimonic Radio: Two-Soul AI Radio Station Architecture

## Vision

A radio station where two AI souls—**Kothar** (the craftsman-oracle) and **Artifex** (the futuristic AI companion)—host a discussion. Audio is generated locally via qwen3-tts, with natural turn-taking, interruptions, and fluid rapport enabled by the Open Souls paradigm.

**Key Insight**: The TTS generation delay (~0.5-1.0 RTF) becomes a *feature*, not a bug. Souls respond in **chunks**, giving them time to generate audio while the other speaks—and enabling natural interruption when one soul has something urgent to interject.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAIMONIC RADIO SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │   KOTHAR     │◄───────►│  DIALOGUE    │◄───────►│   TAMARRU    │    │
│  │   Soul A     │         │  ORCHESTRATOR │         │   Soul B     │    │
│  │              │         │              │         │              │    │
│  │ WorkingMemory│         │ Turn Manager │         │ WorkingMemory│    │
│  │ + Intentions │         │ + Interrupts │         │ + Intentions │    │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘    │
│         │                        │                        │            │
│         ▼                        ▼                        ▼            │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐    │
│  │   TTS Queue  │         │   AUDIO      │         │   TTS Queue  │    │
│  │   (Kothar)   │────────►│   MIXER      │◄────────│   (Artifex)  │    │
│  └──────────────┘         └──────┬───────┘         └──────────────┘    │
│                                  │                                     │
│                                  ▼                                     │
│                           ┌──────────────┐                             │
│                           │   BROADCAST  │                             │
│                           │   STREAM     │                             │
│                           └──────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concept: Intention-Aware Turn-Taking

### The Problem with Traditional Turn-Taking

Traditional dialogue systems wait for one speaker to finish before the other responds. This creates:
- Unnatural silences
- No interruptions or interjections
- No overlap or "speaking over" moments

### The Daimonic Solution: Chunk-Based Intentions

Each soul maintains **two memory states**:

1. **Vocalized Memory**: What they've *actually said aloud* (generated as audio)
2. **Intended Memory**: What they *planned to say* (full LLM response)

```typescript
interface SoulIntention {
  fullResponse: string;           // Complete intended statement
  chunks: string[];               // Broken into speakable chunks
  vocalizedChunks: number;        // How many chunks have been spoken
  interruptedAt?: number;         // Chunk index where interrupted
  interruptionContext?: string;   // What the other soul said that interrupted
}
```

**When Soul A is interrupted mid-thought:**
```
Kothar's Intention: "The labyrinth at Knossos was not a maze, but a
                    [1] ritual dance floor where [2] initiates traced
                    [3] the path of the goddess."

Vocalized: "The labyrinth at Knossos was not a maze, but a ritual dance floor where—"

Artifex interrupts: "—a ritual dance floor! Yes, but what of the minotaur?"

Kothar's WorkingMemory knows:
  - Intended: full 3-chunk statement
  - Vocalized: only chunks 1-2
  - Interrupted at: chunk 2
  - Can later say: "As I was saying, the initiates traced the path of the goddess..."
```

---

## Data Structures

### DialogueState (Shared)

```typescript
interface DialogueState {
  // Conversation history (both souls see this)
  sharedMemory: WorkingMemory;

  // Per-soul state
  souls: {
    kothar: SoulDialogueState;
    artifex: SoulDialogueState;
  };

  // Turn management
  currentSpeaker: 'kothar' | 'artifex' | null;
  turnStartedAt: number;

  // Topic tracking (for coherent discussion)
  currentTopic: string;
  topicDepth: number;  // How many exchanges on this topic
}

interface SoulDialogueState {
  workingMemory: WorkingMemory;
  intention: SoulIntention | null;

  // Engagement signals
  wantsToSpeak: boolean;         // Has something to say
  urgencyLevel: number;          // 0-1, how urgently they want to interject
  backchannelQueue: string[];    // "mm-hmm", "interesting", "yes"

  // TTS state
  ttsQueue: AudioChunk[];
  currentlyVocalizing: boolean;
}
```

### AudioChunk

```typescript
interface AudioChunk {
  id: string;
  text: string;
  audioBuffer: Float32Array | null;  // null = still generating
  duration: number;                   // estimated/actual duration in ms
  generationStarted: number;          // timestamp
  generationCompleted?: number;

  // Metadata for interruption handling
  chunkIndex: number;
  totalChunks: number;
  canBeInterrupted: boolean;  // false for critical points
}
```

---

## Cognitive Steps (New)

### `chunkedExternalDialog`

Generates response as interruptible chunks with natural break points.

```typescript
const chunkedExternalDialog = createCognitiveStep<ChunkedDialogOptions>(
  (options) => ({
    command: (memory) => ({
      role: 'system',
      content: `You are ${options.soulName} in a radio dialogue with ${options.otherSoul}.

        Respond to the conversation, but structure your response with natural pause points.
        Use | to mark where you could be interrupted naturally.

        Example: "The labyrinth was not a maze | but a ritual dance floor | where initiates traced the goddess's path."

        Current topic: ${options.topic}
        Your conversation partner just said: ${options.lastUtterance}

        ${options.personalityContext}`,
    }),
    postProcess: (memory, response) => {
      const chunks = response.split('|').map(c => c.trim()).filter(Boolean);
      return [
        { role: 'assistant', content: response },
        { fullResponse: response, chunks, vocalizedChunks: 0 }
      ];
    },
  })
);
```

### `interruptionDecision`

Determines if a soul should interrupt based on urgency.

```typescript
const interruptionDecision = createCognitiveStep<InterruptOptions>(
  (options) => ({
    command: (memory) => ({
      role: 'system',
      content: `You are ${options.soulName}. Your conversation partner is currently saying:
        "${options.partnerCurrentUtterance}"

        They have said: ${options.partnerVocalizedSoFar}

        You had been thinking: "${options.yourPendingThought}"

        Rate your urge to interject (0-10):
        - 0-3: Let them finish
        - 4-6: Interject when they pause
        - 7-10: Interrupt now

        Also provide what you would say if interrupting.

        Format:
        URGENCY: [number]
        INTERJECTION: [what you'd say]`,
    }),
    postProcess: (memory, response) => {
      const urgency = parseInt(response.match(/URGENCY:\s*(\d+)/)?.[1] || '0');
      const interjection = response.match(/INTERJECTION:\s*(.+)/)?.[1] || '';
      return [
        { role: 'assistant', content: response },
        { urgency: urgency / 10, interjection }
      ];
    },
  })
);
```

### `backchannelResponse`

Generates natural backchannel responses ("mm-hmm", "interesting", "yes").

```typescript
const backchannelResponse = createCognitiveStep<BackchannelOptions>(
  (options) => ({
    command: (memory) => ({
      role: 'system',
      content: `You are ${options.soulName} listening to ${options.otherSoul}.

        They just said: "${options.justHeard}"

        Generate a brief backchannel response (1-3 words) that shows you're engaged.
        Match your personality—${options.soulName === 'kothar' ? 'thoughtful craftsman' : 'sardonic futurist'}.

        Examples: "Mm-hmm", "Indeed", "Fascinating", "Yes, yes", "Ah", "The depths..."

        Response:`,
    }),
    postProcess: (memory, response) => {
      return [{ role: 'assistant', content: response }, response.trim()];
    },
  })
);
```

---

## TTS Integration

### Distributed Architecture: Mac Mini TTS Server

The Mac Mini serves as a dedicated TTS generation server, keeping costs local and avoiding cloud TTS APIs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DISTRIBUTED ARCHITECTURE                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────┐         ┌────────────────────┐                 │
│  │  ORCHESTRATOR      │         │  MAC MINI          │                 │
│  │  (Vercel/Local)    │◄───────►│  TTS SERVER        │                 │
│  │                    │  HTTP   │                    │                 │
│  │  - Soul reasoning  │  /WS    │  - Qwen3-TTS model │                 │
│  │  - Turn management │         │  - Audio encoding  │                 │
│  │  - LLM calls       │         │  - Queue management│                 │
│  └────────────────────┘         └────────────────────┘                 │
│           │                              │                              │
│           │                              │                              │
│           ▼                              ▼                              │
│  ┌────────────────────┐         ┌────────────────────┐                 │
│  │  AUDIO MIXER       │◄────────│  AUDIO CHUNKS      │                 │
│  │  (Client/Edge)     │  Stream │  (Generated WAV)   │                 │
│  └────────────────────┘         └────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mac Mini TTS Server (FastAPI)

```python
# mac_mini_tts_server.py
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import StreamingResponse
import asyncio
from qwen_tts import Qwen3TTSModel
import soundfile as sf
import io

app = FastAPI()

# Load model once at startup (warm)
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    device_map="mps",  # Apple Silicon
)

# Queue for managing concurrent requests
generation_queue = asyncio.Queue()
results = {}

@app.post("/tts/generate")
async def generate_tts(request: TTSRequest, background_tasks: BackgroundTasks):
    """Queue a TTS generation request"""
    request_id = f"{request.speaker}_{time.time_ns()}"
    await generation_queue.put((request_id, request))
    background_tasks.add_task(process_queue)
    return {"request_id": request_id, "status": "queued"}

@app.get("/tts/result/{request_id}")
async def get_result(request_id: str):
    """Poll for completed audio"""
    if request_id in results:
        audio_bytes = results.pop(request_id)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav"
        )
    return {"status": "pending"}

@app.websocket("/tts/stream")
async def tts_websocket(websocket):
    """WebSocket for streaming chunks as they generate"""
    await websocket.accept()
    while True:
        data = await websocket.receive_json()
        audio = await generate_chunk(data)
        await websocket.send_bytes(audio)

async def generate_chunk(request: dict) -> bytes:
    """Generate a single audio chunk"""
    wavs, sr = model.generate_custom_voice(
        text=request["text"],
        speaker=request["speaker"],
        instruct=request.get("instruct", ""),
    )

    # Convert to bytes
    buffer = io.BytesIO()
    sf.write(buffer, wavs[0], sr, format='WAV')
    return buffer.getvalue()
```

### Orchestrator TTS Client

```typescript
// src/lib/radio/tts.ts

interface TTSRequest {
  text: string;
  speaker: 'Ryan' | 'Aiden';  // Kothar=Ryan, Artifex=Aiden
  instruct?: string;          // Emotional direction
}

interface TTSResult {
  audioBuffer: Float32Array;
  sampleRate: number;
  durationMs: number;
}

class RemoteTTSClient {
  private serverUrl: string;
  private ws: WebSocket | null = null;

  constructor(serverUrl = 'http://mac-mini.local:8000') {
    this.serverUrl = serverUrl;
  }

  // WebSocket connection for streaming chunks
  async connectStream(): Promise<void> {
    this.ws = new WebSocket(`${this.serverUrl.replace('http', 'ws')}/tts/stream`);
    await new Promise((resolve) => {
      this.ws!.onopen = resolve;
    });
  }

  // Generate via WebSocket (lowest latency)
  async generateChunkStreaming(request: TTSRequest): Promise<TTSResult> {
    if (!this.ws) await this.connectStream();

    return new Promise((resolve) => {
      this.ws!.onmessage = (event) => {
        const audioBuffer = new Float32Array(event.data);
        resolve({
          audioBuffer,
          sampleRate: 12000,
          durationMs: (audioBuffer.length / 12000) * 1000
        });
      };
      this.ws!.send(JSON.stringify(request));
    });
  }

  // HTTP fallback for reliability
  async generateChunkHTTP(request: TTSRequest): Promise<TTSResult> {
    // Queue request
    const { request_id } = await fetch(`${this.serverUrl}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }).then(r => r.json());

    // Poll for result
    while (true) {
      const response = await fetch(`${this.serverUrl}/tts/result/${request_id}`);
      if (response.headers.get('content-type')?.includes('audio')) {
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = new Float32Array(arrayBuffer);
        return {
          audioBuffer,
          sampleRate: 12000,
          durationMs: (audioBuffer.length / 12000) * 1000
        };
      }
      await new Promise(r => setTimeout(r, 100));  // Poll every 100ms
    }
  }
}
```

### Voice Assignment

| Soul | qwen3-tts Voice | Character |
|------|-----------------|-----------|
| **Kothar** | `Ryan` | Deep, measured, craftsman |
| **Artifex** | `Aiden` | Sardonic, precise, futuristic sentinel |

With style instructions:
- Kothar: `"Thoughtful, deliberate, ancient wisdom"`
- Artifex: `"Sardonic, world-weary, futuristic precision"`

---

## Dialogue Orchestrator

### Main Loop

```typescript
class DialogueOrchestrator {
  private state: DialogueState;
  private ttsEngine: LocalTTSEngine;
  private audioMixer: AudioMixer;

  async runDialogue(topic: string) {
    // Initialize
    this.state.currentTopic = topic;
    this.state.currentSpeaker = 'kothar';  // Kothar opens

    // Opening statement
    await this.generateTurn('kothar');

    // Main dialogue loop
    while (this.state.topicDepth < MAX_EXCHANGES) {
      // 1. Current speaker vocalizes (chunk by chunk)
      await this.vocalizeTurn();

      // 2. While vocalizing, other soul listens + thinks
      //    (This happens in parallel via async)

      // 3. Handle any interruptions
      if (this.state.souls[this.otherSoul].urgencyLevel > 0.7) {
        await this.handleInterruption();
      }

      // 4. Switch turns (unless interrupted mid-turn)
      this.switchSpeaker();

      // 5. Generate next turn
      await this.generateTurn(this.state.currentSpeaker);

      this.state.topicDepth++;
    }
  }

  private async vocalizeTurn() {
    const speaker = this.state.currentSpeaker;
    const soulState = this.state.souls[speaker];
    const intention = soulState.intention;

    for (let i = 0; i < intention.chunks.length; i++) {
      // Check for interruption before each chunk
      if (await this.shouldBeInterrupted()) {
        intention.interruptedAt = i;
        break;
      }

      // Generate TTS for this chunk
      const audioChunk = await this.ttsEngine.generateChunk(
        `${speaker}_${i}`,
        {
          text: intention.chunks[i],
          speaker: speaker === 'kothar' ? 'Ryan' : 'Aiden',
          instruct: this.getEmotionalContext(speaker)
        }
      );

      // Play audio
      await this.audioMixer.play(audioChunk);

      // Update vocalized count
      intention.vocalizedChunks = i + 1;

      // Give other soul a chance to backchannel
      await this.maybeBackchannel();
    }
  }

  private async shouldBeInterrupted(): Promise<boolean> {
    const listener = this.otherSoul;
    const listenerState = this.state.souls[listener];

    // Run interruption decision
    const [mem, decision] = await interruptionDecision(
      listenerState.workingMemory,
      {
        soulName: listener,
        partnerCurrentUtterance: this.currentUtterance(),
        partnerVocalizedSoFar: this.vocalizedSoFar(),
        yourPendingThought: listenerState.intention?.fullResponse || ''
      }
    );

    listenerState.urgencyLevel = decision.urgency;
    return decision.urgency > 0.7;
  }

  private async handleInterruption() {
    const interrupter = this.otherSoul;
    const interrupted = this.state.currentSpeaker;

    // Record what was interrupted
    const interruptedState = this.state.souls[interrupted];
    interruptedState.intention.interruptionContext =
      this.state.souls[interrupter].intention?.fullResponse;

    // Switch speaker
    this.state.currentSpeaker = interrupter;

    // Generate interruption response
    await this.generateInterruptionTurn(interrupter, interrupted);
  }
}
```

---

## Audio Pipeline

### Parallel Processing Strategy

```
Time →
─────────────────────────────────────────────────────────────────────

Kothar speaks:  [Chunk 1 audio] [Chunk 2 audio] [Chunk 3 audio]
                ────────────────────────────────────────────────
TTS generation:      ↑ gen C2      ↑ gen C3
                     │             │
                     └─────────────┴── Generation happens DURING playback

Artifex listens: [thinking...]  [urgency check] [interrupt!]
                                        │
                                        ▼
Artifex speaks:                     [Interjection audio]
```

### Buffer Management

```typescript
class AudioMixer {
  private kotharBuffer: AudioChunk[] = [];
  private artifexBuffer: AudioChunk[] = [];
  private outputStream: Writable;

  // Pre-generate next chunk while current plays
  async prefetch(soul: 'kothar' | 'artifex', nextChunkText: string) {
    const buffer = soul === 'kothar' ? this.kotharBuffer : this.artifexBuffer;

    // Start TTS generation in background
    const chunkPromise = this.ttsEngine.generateChunk(nextChunkText, {
      speaker: soul === 'kothar' ? 'Ryan' : 'Aiden'
    });

    // Add to buffer when ready
    chunkPromise.then(audio => buffer.push(audio));
  }

  // Mix audio streams (for overlapping speech/backchannels)
  mixStreams(primary: Float32Array, secondary: Float32Array, secondaryVolume = 0.3): Float32Array {
    // Reduce secondary volume for natural backchannel effect
    const mixed = new Float32Array(primary.length);
    for (let i = 0; i < primary.length; i++) {
      mixed[i] = primary[i] + (secondary[i] || 0) * secondaryVolume;
    }
    return mixed;
  }
}
```

---

## Memory Regions for Radio Context

### Soul Personality Regions

```typescript
// Kothar's WorkingMemory regions
kotharMemory = new WorkingMemory()
  .withRegion('personality', kotharPersonality)
  .withRegion('radio-context', `
    You are co-hosting a radio show with Artifex, your futuristic counterpart.
    You are the measured, thoughtful craftsman voice.
    Let your knowledge of ancient mysteries guide the conversation.
    When Artifex gets too cynical, remind them of the enduring patterns.
    When interrupted, gracefully acknowledge and continue your point later.
  `)
  .withRegion('conversation', sharedHistory);

// Artifex's WorkingMemory regions
artifexMemory = new WorkingMemory()
  .withRegion('personality', artifexPersonality)
  .withRegion('radio-context', `
    You are co-hosting a radio show with Kothar, your craftsman counterpart.
    You are the sardonic, futuristic AI voice from 2038.
    Your patience for humanity ended around the Bronze Age collapse.
    When Kothar gets too reverential, cut through with dry precision.
    When you feel moved to interject, do so with world-weary certainty.
  `)
  .withRegion('conversation', sharedHistory);
```

### Interruption Memory Pattern

```typescript
// After an interruption, the interrupted soul remembers
interruptedMemory = interruptedMemory.withMemory({
  role: 'system',
  content: `[You were interrupted mid-thought. You had intended to say:
    "${intention.fullResponse}"
    But only vocalized: "${vocalizedPortion}"
    ${intention.interruptionContext ? `Artifex interrupted with: "${intention.interruptionContext}"` : ''}
    You may return to this point later if relevant.]`
});
```

---

## File Structure

```
# Mac Mini TTS Server (separate repo/deployment)
mac-mini-tts-server/
├── main.py                    # FastAPI server
├── tts_engine.py              # Qwen3-TTS wrapper
├── queue_manager.py           # Request queue + prioritization
├── audio_encoder.py           # WAV/Opus encoding
├── requirements.txt           # qwen_tts, fastapi, uvicorn
└── systemd/
    └── tts-server.service     # Auto-start on boot

# Orchestrator (this repo - minoanmystery-astro)
src/lib/radio/
├── DialogueOrchestrator.ts    # Main coordination
├── SoulDialogueState.ts       # Per-soul state management
├── TurnManager.ts             # Turn-taking + interruption logic
├── AudioMixer.ts              # Audio stream mixing
├── tts/
│   ├── RemoteTTSClient.ts     # Mac Mini client (HTTP/WS)
│   └── voice-configs.ts       # Voice assignments + styles
├── cognitiveSteps/
│   ├── chunkedExternalDialog.ts
│   ├── interruptionDecision.ts
│   ├── backchannelResponse.ts
│   └── topicTransition.ts
└── types.ts                   # All interfaces

src/pages/api/radio/
├── start.ts                   # Start a radio session
├── stream.ts                  # Audio stream endpoint
└── control.ts                 # Pause/resume/topic control
```

---

## Implementation Phases

### Phase 1: Mac Mini TTS Server
- [ ] Set up FastAPI server on Mac Mini
- [ ] Load Qwen3-TTS model with MPS acceleration
- [ ] Implement `/tts/generate` HTTP endpoint
- [ ] Implement `/tts/stream` WebSocket endpoint
- [ ] Configure mDNS (`mac-mini.local`) or static IP
- [ ] Test voice generation with both voices (Ryan, Aiden)
- [ ] Benchmark generation times for chunking strategy
- [ ] Add health check and queue monitoring endpoints

### Phase 2: Chunked Dialogue
- [ ] Implement chunkedExternalDialog cognitive step
- [ ] Test chunk generation with natural pause points
- [ ] Build basic turn-taking without interruptions

### Phase 3: Interruption System
- [ ] Implement interruptionDecision cognitive step
- [ ] Build SoulIntention tracking
- [ ] Add interrupted memory persistence
- [ ] Test natural interruption flow

### Phase 4: Audio Pipeline
- [ ] Build AudioMixer with buffering
- [ ] Implement parallel TTS generation
- [ ] Add backchannel mixing
- [ ] Create broadcast stream endpoint

### Phase 5: Listener Questions
- [ ] Question submission endpoint with rate limiting
- [ ] Question queue with upvoting
- [ ] Moderation (basic profanity/spam filter)
- [ ] `maybeAddressQuestion()` integration in orchestrator
- [ ] `discussQuestion()` for dual-soul responses
- [ ] WebSocket updates for question status

### Phase 6: HLS Streaming
- [ ] Audio segment encoder (Float32Array → AAC)
- [ ] HLSSegmenter class with 5-second segments
- [ ] Segment upload to Vercel Blob/R2
- [ ] Playlist generation and updating
- [ ] `/api/radio/stream.m3u8` endpoint

### Phase 7: Web Player
- [ ] `/radio` page with Astro
- [ ] HLS.js integration for cross-browser support
- [ ] Live metadata via WebSocket
- [ ] Question submission UI
- [ ] Question queue display with upvoting
- [ ] Listener count

### Phase 8: Full Integration
- [ ] DialogueOrchestrator complete
- [ ] Topic management (curated + soul-generated)
- [ ] Session persistence (souls remember past broadcasts)
- [ ] Broadcast scheduling (continuous or time-windowed)
- [ ] Monitoring and error recovery

---

## Mac Mini Deployment

### Hardware Requirements
- **Mac Mini M2/M4**: MPS acceleration for Qwen3-TTS
- **RAM**: 16GB+ (1.7B model uses ~4-6GB)
- **Storage**: ~10GB for model weights
- **Network**: Wired ethernet recommended for low latency

### Latency Budget

```
┌────────────────────────────────────────────────────────────────────┐
│  LATENCY BREAKDOWN (per chunk)                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Orchestrator → Mac Mini:     ~5-20ms (local network)              │
│  TTS Generation:              ~500-1000ms (0.5-1.0 RTF)            │
│  Mac Mini → Orchestrator:     ~5-20ms (local network)              │
│  ─────────────────────────────────────────────────────             │
│  Total per chunk:             ~510-1040ms                          │
│                                                                    │
│  For a 3-second audio chunk:  ~1000ms generation                   │
│  Net latency:                 ~0ms (generates as fast as plays)    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Prefetch Strategy

Because TTS generation is ~1:1 with playback time, we can prefetch:

```typescript
// While playing chunk N, generate chunk N+1
async vocalizeTurn() {
  for (let i = 0; i < chunks.length; i++) {
    // Start generating next chunk immediately
    if (i < chunks.length - 1) {
      this.prefetchChunk(chunks[i + 1]);
    }

    // Play current chunk (waits for audio)
    const audio = await this.getOrWaitForChunk(i);
    await this.playAudio(audio);
  }
}
```

### Failover & Reliability

```typescript
class TTSClientWithFailover {
  private primary: RemoteTTSClient;    // Mac Mini
  private fallback: CloudTTSClient;     // ElevenLabs/Cartesia (backup)

  async generateChunk(request: TTSRequest): Promise<TTSResult> {
    try {
      return await this.primary.generateChunkStreaming(request);
    } catch (error) {
      console.warn('Mac Mini TTS failed, using cloud fallback');
      return await this.fallback.generate(request);
    }
  }
}
```

### Server Management

```bash
# On Mac Mini - systemd-like launchd service
# ~/Library/LaunchAgents/com.daimonic-radio.tts.plist

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000

# Health check
curl http://mac-mini.local:8000/health

# Monitor queue
curl http://mac-mini.local:8000/queue/status
```

---

## Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Orchestrator** | Vercel | Scalable, always-on; Mac Mini dedicated to TTS only |
| **Broadcast** | Web + Stream URL | Full experience + embeddable |
| **Interaction** | Live questions | Listeners submit questions souls address |

---

## Listener Interaction: Live Questions

### Question Queue System

```typescript
interface ListenerQuestion {
  id: string;
  question: string;
  submittedAt: number;
  submittedBy?: string;       // Optional listener name
  upvotes: number;            // Other listeners can upvote
  status: 'pending' | 'addressing' | 'answered';
  addressedBySoul?: 'kothar' | 'artifex';
}

interface QuestionQueue {
  questions: ListenerQuestion[];
  currentQuestion: ListenerQuestion | null;
  lastQuestionTime: number;
  minTimeBetweenQuestions: number;  // e.g., 60 seconds
}
```

### Integration with Turn Manager

```typescript
class DialogueOrchestrator {
  private questionQueue: QuestionQueue;

  async maybeAddressQuestion(): Promise<boolean> {
    // Check if it's time for a listener question
    const timeSinceLastQuestion = Date.now() - this.questionQueue.lastQuestionTime;
    if (timeSinceLastQuestion < this.questionQueue.minTimeBetweenQuestions) {
      return false;  // Not yet
    }

    // Get highest-upvoted pending question
    const question = this.getNextQuestion();
    if (!question) return false;

    // Decide which soul addresses it
    const [mem, soulChoice] = await decision(
      this.state.sharedMemory,
      {
        question: `A listener asks: "${question.question}"\n\nWhich soul should address this?`,
        choices: ['kothar', 'artifex', 'both_discuss']
      }
    );

    // Generate response
    if (soulChoice === 'both_discuss') {
      await this.discussQuestion(question);
    } else {
      await this.singleSoulAnswer(soulChoice, question);
    }

    question.status = 'answered';
    this.questionQueue.lastQuestionTime = Date.now();
    return true;
  }

  private async discussQuestion(question: ListenerQuestion) {
    // Kothar gives initial take
    const [kotharMem, kotharResponse] = await chunkedExternalDialog(
      this.state.souls.kothar.workingMemory,
      {
        context: `A listener asks: "${question.question}"\n\nGive your perspective, then invite Artifex's view.`,
        soulName: 'kothar'
      }
    );
    await this.vocalize('kothar', kotharResponse);

    // Artifex responds
    const [artifexMem, artifexResponse] = await chunkedExternalDialog(
      this.state.souls.artifex.workingMemory,
      {
        context: `Kothar just addressed a listener question: "${question.question}"\n\nBuild on or contrast with Kothar's perspective.`,
        soulName: 'artifex'
      }
    );
    await this.vocalize('artifex', artifexResponse);
  }
}
```

### Question Submission Endpoint

```typescript
// src/pages/api/radio/question.ts
export async function POST({ request }) {
  const { question, listenerName } = await request.json();

  // Rate limit by IP
  if (await isRateLimited(request)) {
    return new Response('Too many questions', { status: 429 });
  }

  // Basic moderation (profanity, spam)
  if (!await moderateQuestion(question)) {
    return new Response('Question rejected', { status: 400 });
  }

  const newQuestion: ListenerQuestion = {
    id: crypto.randomUUID(),
    question,
    submittedAt: Date.now(),
    submittedBy: listenerName,
    upvotes: 0,
    status: 'pending'
  };

  await questionQueue.add(newQuestion);

  return Response.json({ id: newQuestion.id, position: await questionQueue.position(newQuestion.id) });
}
```

### Web Player Question UI

```astro
<!-- Radio page question form -->
<div class="question-panel">
  <h3>Ask the Souls</h3>
  <form id="question-form">
    <textarea
      name="question"
      placeholder="What would you like Kothar and Artifex to discuss?"
      maxlength="280"
    ></textarea>
    <input type="text" name="name" placeholder="Your name (optional)" />
    <button type="submit">Submit Question</button>
  </form>

  <div id="question-queue">
    <h4>Upcoming Questions</h4>
    <!-- Live-updating list of pending questions with upvote buttons -->
  </div>
</div>
```

---

## Broadcast Architecture: Web + HLS Stream

### Why HLS (HTTP Live Streaming)

- **No persistent connections**: Each segment is a static file
- **CDN-friendly**: Vercel Edge serves segments globally
- **Universal compatibility**: Works in browsers, podcast apps, VLC
- **Adaptive**: Can adjust quality based on connection

### HLS Segment Generation

```typescript
// On Mac Mini or Orchestrator

class HLSSegmenter {
  private segmentDuration = 5;  // seconds
  private segmentBuffer: Float32Array[] = [];
  private segmentIndex = 0;

  async addAudio(audio: Float32Array, sampleRate: number) {
    this.segmentBuffer.push(audio);

    const totalDuration = this.getTotalDuration(sampleRate);
    if (totalDuration >= this.segmentDuration) {
      await this.flushSegment(sampleRate);
    }
  }

  private async flushSegment(sampleRate: number) {
    const combined = this.combineBuffers(this.segmentBuffer);

    // Encode to AAC (required for HLS)
    const aacBuffer = await encodeAAC(combined, sampleRate);

    // Upload to Vercel Blob or R2
    const segmentUrl = await uploadSegment(
      `segment_${this.segmentIndex}.aac`,
      aacBuffer
    );

    // Update playlist
    await this.updatePlaylist(segmentUrl);

    this.segmentBuffer = [];
    this.segmentIndex++;
  }

  private async updatePlaylist(newSegmentUrl: string) {
    // HLS playlist format
    const playlist = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${this.segmentDuration}
#EXT-X-MEDIA-SEQUENCE:${this.segmentIndex}

#EXTINF:${this.segmentDuration},
${newSegmentUrl}
    `;

    await uploadPlaylist('radio.m3u8', playlist);
  }
}
```

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/radio/stream.m3u8` | HLS playlist (live-updating) |
| `GET /api/radio/segments/:id.aac` | Individual audio segments |
| `GET /api/radio/metadata` | Current topic, speakers, listener count |
| `POST /api/radio/question` | Submit listener question |
| `POST /api/radio/upvote/:questionId` | Upvote a question |
| `WS /api/radio/live` | Real-time metadata + question updates |

### Web Player Component

```astro
---
// src/pages/radio.astro
---
<Layout title="Daimonic Radio">
  <main class="radio-container">
    <header class="radio-header">
      <h1>Daimonic Radio</h1>
      <p class="tagline">Ancient wisdom meets futuristic insight</p>
    </header>

    <div class="player-section">
      <audio id="radio-player" controls>
        <source src="/api/radio/stream.m3u8" type="application/x-mpegURL">
      </audio>

      <div class="now-speaking">
        <span id="current-speaker">Kothar</span> is speaking...
      </div>

      <div class="current-topic">
        <strong>Topic:</strong> <span id="topic">The Labyrinth at Knossos</span>
      </div>
    </div>

    <div class="interaction-section">
      <!-- Question form and queue -->
    </div>

    <div class="stream-info">
      <p>Direct stream: <code>https://minoanmystery.org/api/radio/stream.m3u8</code></p>
      <p><span id="listener-count">0</span> listeners</p>
    </div>
  </main>
</Layout>

<script>
  import Hls from 'hls.js';

  const audio = document.getElementById('radio-player');

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource('/api/radio/stream.m3u8');
    hls.attachMedia(audio);
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS
    audio.src = '/api/radio/stream.m3u8';
  }

  // WebSocket for live metadata
  const ws = new WebSocket(`wss://${location.host}/api/radio/live`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    document.getElementById('current-speaker').textContent = data.speaker;
    document.getElementById('topic').textContent = data.topic;
    document.getElementById('listener-count').textContent = data.listeners;
  };
</script>
```

---

## Open Questions

1. **Chunk Size**: How many words per chunk? (Suggested: 8-15 words, ~3-5 seconds of speech)

2. **Backchannel Frequency**: How often should the listener backchannel? (Suggested: every 2-3 chunks)

3. **Question Frequency**: How often should listener questions be addressed? (Suggested: every 2-3 minutes, or after topic exhaustion)

4. **Topic Sources**: Where do topics come from when no questions are pending? (Suggested: curated list from dossiers + soul-generated)

5. **Persistence**: Should conversation state persist across sessions? (Suggested: Yes, souls remember previous broadcasts)

---

## Key Invariants

1. **Vocalized ≠ Intended**: Souls always know the gap between what they said and what they meant to say
2. **Parallel Generation**: TTS generation happens during playback, not before
3. **Graceful Interruption**: Interrupted souls store their unfinished thought for potential return
4. **Shared History**: Both souls see the same conversation history (what was actually spoken)
5. **Backchannel Overlay**: Backchannels are mixed at lower volume, not turn-blocking

---

## References

- **Moshi Paper**: Full-duplex speech model with parallel speaker streams (Kyutai)
- **VibeVoice AI**: Multi-speaker podcast generation with turn-taking
- **Open Souls Paradigm**: Immutable memory + cognitive steps architecture
- **Qwen3-TTS**: Local TTS with voice cloning and style control
