# Subquadratic / Aldea AI - LLM Production Deployment

## Source
- Type: Portfolio
- Primary Sources: Internal project summaries, LinkedIn profile
- Verification: Current employment
- Last Updated: 2026-01-16
- **Research Status**: Verified from portfolio content (ongoing project)

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Organization** | Subquadratic (dba Aldea AI) |
| **Industry** | AI/ML Infrastructure |
| **Duration** | July 2025 - Present |
| **Tom's Role** | Founding Engineer / Principal AI/ML Engineer |
| **Focus** | Large-scale LLM deployment, GPU optimization, inference serving |

---

## The Challenge

Training fine-tuned AI personas is one thing. Serving them at production scale with sub-second latency is another.

### Core Problems
1. **Model Size**: 70B parameter models require 140GB+ in BF16—too large for single GPU
2. **Latency Requirements**: Conversational AI needs sub-second response times
3. **Dynamic Personas**: Different fine-tuned adapters (LoRAs) need to be switchable at runtime
4. **Cost Efficiency**: GPU infrastructure is expensive—maximize utilization

The goal: deploy multiple fine-tuned 70B models with runtime persona switching and production-grade reliability.

---

## Tom's Approach

### Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GPU Server (4x H100)                      │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   Inference A       │    │   Inference B       │         │
│  │   (GPUs 0,1)        │    │   (GPUs 2,3)        │         │
│  │   Port: 18000       │    │   Port: 28000       │         │
│  │                     │    │                     │         │
│  │  Fused 70B Model    │    │  Base 70B + LoRAs   │         │
│  │  TP=2, BF16         │    │  TP=2, BF16         │         │
│  │                     │    │  - Persona A        │         │
│  │                     │    │  - Persona B        │         │
│  └─────────────────────┘    └─────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Technical Stack

| Category | Technologies |
|----------|--------------|
| **ML Frameworks** | TensorRT-LLM, TensorRT 10.x, PyTorch, HuggingFace Transformers |
| **Serving** | NVIDIA Triton Inference Server, gRPC, REST APIs |
| **Infrastructure** | Docker, Docker Compose, NVIDIA Container Toolkit |
| **GPU Computing** | CUDA 12.x, cuBLAS, cuDNN, OpenMPI |
| **Cloud** | Lambda Labs GPU Cloud |
| **Models** | 70B base models, LoRA/PEFT adapters |

---

## Key Technical Achievements

### 1. Multi-GPU Tensor Parallelism (TP=2)
- Configured tensor parallelism to split 70B model weights across 2 GPUs
- Achieved ~140GB model serving on 2x 80GB H100s with headroom for KV-cache
- Implemented proper GPU isolation using environment variables for container-level resource partitioning

### 2. TensorRT-LLM Engine Optimization
- Converted HuggingFace checkpoints to TensorRT-LLM format
- Built optimized TensorRT engines with:
  - **Paged KV-cache** for memory-efficient long-context inference
  - **Flash Attention** for accelerated attention computation
  - **GEMM plugin optimizations** for BF16 matrix operations
  - **Custom sequence length limits** tuned for use case

### 3. LoRA Adapter Infrastructure
- Implemented **runtime LoRA adapter loading** for dynamic model behavior switching
- Converted HuggingFace LoRA checkpoints to TensorRT-LLM NumPy format
- Configured LoRA cache memory allocation to support multiple concurrent adapters
- Enabled rank-64 adapters targeting attention and MLP layers

### 4. Triton Ensemble Pipeline
Deployed canonical TensorRT-LLM Triton ensemble architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Preprocessing  │ → │  TensorRT-LLM   │ → │  Postprocessing │
│  (tokenization) │    │   (inference)   │    │ (detokenization)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- Dynamic configuration management
- Inflight batching for high-throughput concurrent request handling

### 5. Production Hardening
- Resolved TensorRT version mismatch issues (build container vs runtime container alignment)
- Debugged MPI worker spawn failures in containerized environments
- Implemented OpenMPI environment variable fixes for container compatibility
- Configured proper GPU memory allocation with KV cache fraction tuning

### 6. Advanced LoRA Switching at Scale
Extended the system to support **multi-GB LoRA adapter switching** at tensor parallelism > 1:

**Shared Memory LoRA Pipeline:**
```
┌─────────────────────────────────────────────────────────────┐
│                     LoRA Seeding Flow                        │
│  1. Load LoRA weights (BF16) into shared memory             │
│  2. Register memory region with inference server            │
│  3. Send metadata-only request (region name + task_id)      │
│  4. Server caches LoRA weights                              │
│  5. Subsequent requests use task_id only (zero-copy)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Build Pipeline

1. **Checkpoint Conversion**: HuggingFace → TensorRT-LLM checkpoint format
2. **Engine Building**: TensorRT-LLM checkpoint → Optimized TensorRT engine
3. **LoRA Conversion**: HuggingFace LoRA → NumPy tensors for runtime loading
4. **Template Population**: Dynamic config generation
5. **Container Orchestration**: Docker Compose with GPU pinning and resource isolation

---

## Challenges Solved

1. **TensorRT Version Mismatch**: Identified that engines built with newer TRT-LLM failed to deserialize on older Triton. Solution: Build engines inside the runtime container itself.

2. **MPI Worker Spawn Failures**: OpenMPI's process spawning failed in Docker containers. Solution: Configured orchestrator mode to use single-process architecture.

3. **GPU Isolation**: Standard CUDA environment variables were ignored in NVIDIA container runtime. Solution: Used proper Docker Compose device reservations.

4. **LoRA Cache OOM**: Default LoRA cache size insufficient for 70B models. Solution: Configured host memory and max adapter size parameters.

5. **RoPE Configuration**: Extended context models use custom RoPE scaling. Solution: Verified automatic reading of scaling parameters from config files.

6. **BF16 LoRA Dtype Mismatch**: Host NumPy doesn't support BF16. Solution: Store BF16 bit-patterns in uint16 arrays, converting via FP32 intermediate.

7. **Weight Streaming**: Plugin weights aren't streamable. Solution: Rebuild engines with plugin disabled alongside streaming flags.

8. **Multi-GB LoRA Payloads**: gRPC/MPI transport constraints blocked large adapter uploads. Solution: Implemented system shared memory for LoRA seeding—register regions, send only metadata over gRPC.

---

## Metrics & Results

| Metric | Value |
|--------|-------|
| **Model Size** | 70B parameters (141GB in BF16) |
| **Inference Precision** | BF16 with optional FP8 KV-cache |
| **Max Context** | 8,192 tokens (configurable up to 128K) |
| **Tensor Parallelism** | 2-way GPU split |
| **LoRA Adapters** | Multiple persona adapters with runtime switching |
| **Batch Size** | Up to 64 concurrent requests |

---

## Skills Demonstrated

- **Large Language Model Deployment**: Production-scale 70B model serving
- **NVIDIA TensorRT & TensorRT-LLM**: Engine optimization, quantization
- **Multi-GPU Inference Architecture**: Tensor parallelism design
- **Container Orchestration for ML**: Docker Compose with GPU pinning
- **Production Debugging**: CUDA/GPU issue resolution
- **LoRA/PEFT Adapter Deployment**: Runtime persona switching
- **Infrastructure-as-Code**: Reproducible ML systems

---

## Lessons Learned

- **Engines are runtime-version-specific**: Every TensorRT update requires engine rebuilds
- **Weight streaming requires plugin disabling**: Plugin weights aren't streamable
- **Model config correctness is fragile**: Ensemble mapping requires exact input/output declarations
- **Two TP>1 instances on one node** needs strict GPU pinning, conservative KV cache fractions, and careful memory budgeting

---

## Why This Matters for Kothar

While Kothar runs on cloud LLM APIs rather than self-hosted infrastructure, understanding the full deployment stack—from tensor parallelism to LoRA switching—informs architectural decisions at every level.

When visitors ask about LLM infrastructure or model deployment, Kothar draws from hands-on experience building production GPU serving systems.

---

## Cross-References
- **Portfolio**: aldea-soul-engine.md (overall architecture)
- **Portfolio**: aldea-llm-evaluation.md (evaluation framework)
- **Biography**: ai-ml-chapter.md (career context)

## RAG Tags
Subquadratic, Aldea, Aldea AI, Founding Engineer, Principal AI/ML Engineer, LLM deployment, TensorRT-LLM, TensorRT, Triton Inference Server, NVIDIA, H100, GPU, tensor parallelism, TP=2, multi-GPU, LoRA, PEFT, adapter switching, runtime switching, inference optimization, KV cache, Flash Attention, BF16, FP8, Docker, container orchestration, Lambda Labs, production ML, model serving, 70B parameters, shared memory, zero-copy, engine building, checkpoint conversion, Tom di Mino, 2025, ML infrastructure
