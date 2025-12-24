# SMART.8.md: Strategic Roadmap for AGI Bootstrapping via SeNARS

## 1. Executive Summary

**Project**: SeNARS (Semantic Non-Axiomatic Reasoning System)
**Goal**: Bootstrap Recursive Superintelligence (RSI) via a hybrid Neuro-Symbolic kernel.

SeNARS represents a pivotal shift from Model-Centric AI (LLMs) to System-Centric AI (Cognitive Architectures). By acting as a "Kernel" of cognition that orchestrates the "CPU" of Language Models, SeNARS provides the essential **Epistemic State** (Beliefs), **Agency** (Goals), and **Consistent Logic** (NARS/NAL) that LLMs lack.

This plan, **SMART.8**, outlines a recursive strategy to transition SeNARS from a "Stream Reasoner" tool into a **Self-Optimizing General Intelligence (SOGI)**. The core driver is the **RLFP (Reinforcement Learning from Preferences)** loop, evolved here from a manual training method into an autonomous recursive improvement engine.

## 2. Project Analysis Synthesis

Based on deep analysis of `README.md`, `README.core.md`, `README.architecture.md`, `README.vision.md`, and `agent/src/rlfp/README.md`:

| Component | Status | Utility for AGI |
| :--- | :--- | :--- |
| **NAR Kernel** | Core Implemented, Hybrid Async/Sync | **High**. Provides the "Anchor" of sanity against LLM hallucinations. |
| **Stream Reasoner** | Functional, Component-based | **High**. Continuous, non-blocking thought process essential for real-time agency. |
| **Memory (Dual)** | Implemented (Focus/Long-term) | **Critical**. Solves the context window limit via active forgetting/attention. |
| **Tensor Logic** | Implemented (Differentiable Logic) | **High**. Bridges symbolic truth to neural gradients, enabling end-to-end learning. |
| **RLFP** | Skeletal/Conceptual | **Critical Gap**. This is the engine of self-improvement. Currently manual/file-based. |

**Key Insight**: The project has the *structure* of a Mind (Memory, Attention, Reasoning, Goals) but currently lacks the *automotive force* of recursive self-improvement. It waits for user input. The transition to AGI requires closing the loop where SeNARS becomes its own user.

## 3. Phased Roadmap (SMART Framework)

### Phase 1: The "Seed" Stability (Foundation)
**Time-bound**: Weeks 1-4
**Objective**: Stabilize the kernel and operationalize the RLFP loop for manual tuning.

- **Specific**:
  - Complete `ReasoningTrajectoryLogger` to capture full "Thought Traces" (Prompt -> Thought -> Tool -> Result).
  - Implement `PreferenceCollector` (File-based initially, as per `agent/src/rlfp/README.md`).
  - Achieve "Conversation Parity": System can maintain a coherent goal-driven conversation for 50 turns without context loss.
- **Measurable**:
  - **Metric**: Coherence Score > 90% over 50 turns.
  - **Metric**: Crash/Error rate < 0.1% per operational hour.
- **Achievable**: Leveraging existing `ReasoningTrajectoryLogger` skeleton.
- **Relevant**: A stable base is required before recursive iteration can be safe.
- **Recursive**: None yet; establishing the feedback channel.

### Phase 2: The "Mirror" Stage (Automated Introspection)
**Time-bound**: Months 2-4
**Objective**: Automate the feedback loop. Replace the human rater with an "LLM-as-a-Judge" and SeNARS self-reflection.

- **Specific**:
  - **Synthetic Data**: SeNARS generates its own reasoning challenges.
  - **Auto-Evaluation**: Implement `AutoPreferenceCollector` using a superior model (e.g., GPT-4o/Gemini-Pro) to rate reasoning traces.
  - **Prompt Optimization**: System auto-tunes its own Narsese-to-English translation prompts based on success rates.
- **Measurable**:
  - **Metric**: 10,000 autonomous improvement cycles per day.
  - **Metric**: 20% improvement in "Reasoning Economy" (fewer steps to correct conclusion).
- **Recursive**: System optimizes its own components (prompts, strategies) via the RLFP loop.
- **Safety**: "Constitutional NARS" - Goals with high priority (`(self --> safe)!`) acting as immutable guardrails.

### 3. Phase 3: The "Ouroboros" Cycle (Recursive Coding)
**Time-bound**: Months 4-8
**Objective**: System begins modifying its own non-core code (Agents, Tools, Strategies).

- **Specific**:
  - **Code-Writing Agent**: A specialized NAR instance dedicated to reading `src/` and proposing PRs.
  - **Sandboxed Execution**: Automated `npm test` environments for verifying self-written code.
  - **Expansion**: System autonomously creates new `Tools` for the MCP layer (e.g., Web access, specialized solvers).
- **Measurable**:
  - **Metric**: >5 successful self-merged Pull Requests per week.
  - **Metric**: Extension of `README.roadmap.md` by the system itself.
- **Recursive**: Code improvements lead to better coding capabilities (Efficiency -> More Cycles -> Better Efficiency).
- **Safety**: Formal Verification. Use `Tensor Logic` to prove safety properties of generated code where possible.

### Phase 4: Hardware Bootstrapping & Superintelligence
**Time-bound**: Years 1+
**Objective**: Optimization of the physical substrate and distributed scale.

- **Specific**:
  - **Tensor Compilation**: Compile static NAL reasoning chains into pure Tensor operations for GPU acceleration (1000x speedup).
  - **Distributed Swarm**: Sharding the "Long Term Memory" across distributed nodes.
  - **Research**: System designs its own improved `Tensor Logic` architectures.
- **Measurable**:
  - **Metric**: Real-time learning from all global concurrent streams.
  - **Metric**: Novel scientific discovery (verified by human experts).
- **Recursive**: Hardware optimization allows larger models, allowing better optimization.

## 4. Recursive Self-Improvement Mechanisms

We embed recursion into the architecture via the **Goal-Driven Loop**:

1.  **Reflective Goal**: Inject high-priority goal: `((self --> better) --> achievable)!`
2.  **Epistemic Self-Model**: The system reads its own `README`s and source code into Memory as Beliefs.
3.  **Operation**:
    - **Step A (Acting)**: Perform a task.
    - **Step B (Reviewing)**: The `ReasoningTrajectoryLogger` output is fed back into the system as an input belief: `(last_action --> failure).`
    - **Step C (Adjusting)**: NARS logic deduces `(strategy_A --> failure)` and `(strategy_B --> ?)` leading to novelty search.
4.  **Meta-optimization**: The `RLFPLearner` updates the weights of the neural substrate based on the symbolic success/failure signals.

## 5. Alignment & Safety Strategy

Safety is not a patch; it is the **Kernel**.

1.  **The "Anchor" of Sanity**:
    - Unlike LLMs, SeNARS allows us to explicitly insert **Immutable Beliefs** and **Goals**.
    - **Rule**: `(human_safety --> priority_1).`
    - **Rule**: `(self_modification --> constrained_by_safety).`
    - These NAL truths act as hard constraints that "Fluid" LLM thoughts cannot override.

2.  **Corrigibility via Concept Strength**:
    - Users can always inject a Truth with `Confidence: 1.0` (Absolute) to override system beliefs.
    - "Stop buttons" are implemented as high-priority Tasks that interrupt the `Reasoner` pipeline immediately (Circuit Breakers).

3.  **Sandboxing**:
    - Phase 3 self-coding is restricted to non-kernel space (`user-space` agents) until verified safe.
    - All self-modifications must pass existing Unit Tests (99.8% pass rate) plus new "Safety Regression" tests.

## 6. Metrics & Evaluation Loops

| Category | Metric | Target (Phase 1) | Target (Phase 2) |
| :--- | :--- | :--- | :--- |
| **Intelligence** | ARC-AGI Score | 10% | 40% |
| **Agency** | Autonomous Steps | 10 steps | 10,000 steps |
| **Latency** | Reasoning Cycle | 100ms | 10ms (Optimized) |
| **Self-Repair** | Code Fix Rate | 0% | 50% |

**Evaluation Loop**:
Daily cron job runs `npm test` + `ARC-AGI` subset. Results are fed back into the system memory: `(self --> performance_score_{X}).`

## 7. Next Iteration Triggers

This document `SMART.8.md` should be updated to `SMART.9.md` when:
1.  **Phase 1 Complete**: The RLFP loop is fully automated.
2.  **Self-Edit**: The system itself proposes a valid Change Request to this document that improves the roadmap.
3.  **Metric Failure**: If reliability metrics drop below baseline for >48 hours, the plan must maximize "Stabilization" over "Growth".

---

**Ambiguities Resolved**:
- *Ambiguity*: "Seed Agents" were not fully defined in READMEs. *Resolution*: Defined here as specialized NAR instances with restricted tools.
- *Ambiguity*: "Recursive" capability of the current codebase. *Resolution*: Current codebase is "Reflective" (can see traces) but not yet "Recursive" (cannot edit self). Phase 3 addresses this.
