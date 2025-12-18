# Engineering Roadmap: Production-Grade Neuro-Symbolic LM Integration

**Objective:** Achieve deterministic, high-fidelity hybrid reasoning with zero tolerance for silent failures, format mismatches, or quality degradation.

## 1. Deep Forensics & Observability
**Goal:** Eliminate "black box" inference failures.

- [ ] **Token-Level Inspector (`TransformersJSProvider`)**
    - Log exact input token IDs passed to the ONNX runtime.
    - Log attention masks and position IDs to verify padding logic.
    - Log top-k probabilities for the first 5 generated tokens to detect distribution mismatch.
- [ ] **Pipeline Telemetry**
    - Capture and log inference latency (TTFT - Time To First Token).
    - Capture decoding throughput (tokens/sec).
    - Warn on `dtype` mismatches (e.g., fp32 fallback on headers).

## 2. Strict Template Enforcement
**Goal:** Guarantee model instruction compliance.

- [ ] **Jinja2 Template Engine Port**
    - Implement a lightweight Jinja2 renderer compatible with HuggingFace `chat_template`.
    - **Blocking Requirement:** Refuse initializion of `Chat` models if no valid template is found.
- [ ] **Role Normalization**
    - Enforce structured `messages` array (`[{role: 'user', content: ...}]`) as the only valid input for Chat models.
    - Ban raw string concatenation for non-base models.

## 3. Systematic Model Validation (The "Grid")
**Goal:** Identify the "Golden" Model/Quantization pair.

Execute the following verification matrix on standard consumer hardware:

| Model | Variant | Quant/Dtype | Task | Target Metrics |
|-------|---------|-------------|------|----------------|
| **Qwen1.5** | 0.5B-Chat | q8 / fp16 | `text-gen` | >10 t/s, Zero Hallucination |
| **Phi-3** | Mini-4k | q4 | `text-gen` | Logic Consistency Score |
| **Gemma** | 2b-it | q4 | `text-gen` | Instruction Following |
| **TinyLlama** | 1.1B | q4 | `text-gen` | Latency < 200ms |

## 4. Zero-Tolerance Error Handling
**Goal:** Fail loud, fail fast.

- [ ] **Circuit Breaker Upgrades**
    - **Empty Output Panic:** If `output.trim().length === 0`, throw `CriticalInferenceError`.
    - **EOS Detection:** Detect premature End-Of-Sequence generation indicating template corruption.
    - **Narsese Validator:** Post-process parsing. If output contains `(` or `<` but fails `NarseseParser`, mark as failure.

## 5. Architectural Enhancements
**Goal:** Naturalize the integration.

- [ ] **Asynchronous "Thought" Stream**
    - Decouple reasoning from the REPL loop. Allow the Agent to stream "thoughts" in the background while accepting new user input.
- [ ] **Bi-Directional Translation Tests**
    - Automated test suite: `Narsese -> English -> Narsese`. Consistency check must be 100%.

---
*Status: Ready for Phase 5 Execution*
