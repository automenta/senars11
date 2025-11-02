# SeNARS (Semantic Non-Axiomatic Reasoning System)

SeNARS is a research project and software implementation of a hybrid neuro-symbolic reasoning system. It combines a term-oriented logic (Non-Axiomatic Logic, or NAL) with modern Large Language Models (LLMs) to create an observable platform for exploring advanced AI concepts.

The system is designed for researchers, educators, and developers interested in Explainable AI (XAI), knowledge representation, and the emergent behaviors of hybrid intelligence. It provides a comprehensive toolset for running, visualizing, and analyzing the reasoning process in real-time.

For the detailed architectural vision and development roadmap, see **[PLAN.md](./PLAN.md)**.

---

## Architectural Vision: Self-Improving Intelligence

The architectural goal of SeNARS is to build a system guided by the principle of **Self-Improving Intelligence**. This principle posits that a system's reasoning processes can become inherently more effective over time if its fundamental data structures are designed to support emergent optimization.

This vision is based on a few core ideas:

1.  **Structural Intelligence**: The data structures themselves—`Term`, `Task`, `Truth`, and `Stamp`—are designed to contain information that allows for automatic analysis. For example, immutable, canonically normalized `Terms` can be efficiently cached and reused, improving performance and logical consistency.
2.  **Emergent Optimization**: System-wide improvements can emerge naturally from the interaction of these well-designed components, rather than being explicitly hand-coded for every scenario. For instance, the system can learn to allocate processing resources more effectively by observing the outcomes of past reasoning patterns.

**Note:** This is the aspirational vision for the project. The current implementation provides the foundational architecture to pursue this goal. The specific algorithms for autonomous self-improvement are a primary subject of the ongoing research and development detailed in the project's plan.

---

## Current State of the Implementation

This project is under active development. The core architecture is in place and many components are functional, but it is important for users and contributors to understand the current status:

-   **Term Normalization:** The canonical normalization of `Term` objects is a critical feature for logical consistency (e.g., ensuring `(&, A, B)` is treated as identical to `(&, B, A)`). This is partially implemented, but does not yet cover all logical operators and edge cases.
-   **NARS-LM Integration:** The hybrid reasoning capability is functional but operates primarily in a sequential manner. More sophisticated protocols for synergistic, cross-validating reasoning between the NAL engine and LLMs are a key part of the system's design but are not yet fully implemented.
-   **Performance:** The system includes extensive validation and monitoring, which is invaluable for research but introduces performance overhead. The architecture is designed for high performance, but the current implementation is not yet optimized for production-level speed.
-   **Self-Improvement:** The architecture is *designed* to support self-improvement. However, the current implementation does not yet feature autonomous, self-optimizing algorithms. This capability is the project's primary long-term research and development goal.

---

## Getting Started

The best way to experience SeNARS is through its web interface, which provides a real-time visualization of the reasoning process.

### Common Commands

-   `npm run web`: Start the web UI and backend server. The UI will be available at `http://localhost:5174`.
-   `npm run cli`: Run the command-line interface.
-   `npm run test`: Run all core tests.
-   `npm run test:e2e`: Run end-to-end UI tests.
-   `npm run demo`: Run a live, interactive demonstration.
-   `npm run dev`: Run the core engine in watch mode for development.

For a full list of scripts, see the `package.json` file.

---

## System Architecture Overview

### Core Components

-   **NAR (NARS Reasoner Engine)**: The central orchestrator and public API for the system.
-   **Term**: The immutable, foundational data structure for representing all knowledge. `Terms` are created via a `TermFactory` that handles canonical normalization and caching.
-   **Task**: An immutable wrapper around a `Term` that represents a unit of work (e.g., a belief to be processed, a question to be answered). It contains the `term` (content), a NAL `truth` value, a `stamp` for tracking its origin, and a `budget` for resource allocation.
-   **Memory**: The main knowledge base, organizing `Concepts` (collections of `Tasks` related to a `Term`).
-   **Reasoning Engine**: Applies inference rules (both from NAL and from integrated LMs) to derive new knowledge.
-   **Parser**: Translates the Narsese language into `Term` structures.
-   **LM (Language Model Integration)**: Manages interaction with external Large Language Models.

---

## Foundational Concepts for Reinforcement Learning

SeNARS is designed as a general-purpose reinforcement learning system, a capability rooted in the distinction between **Beliefs** and **Goals**:

-   **Beliefs (`.`):** Represent the system's knowledge about the world. Their truth values express probability (frequency) and certainty (confidence). Beliefs form the system's internal "world model."
-   **Goals (`!`):** Represent desired states or outcomes. Their truth values express desirability and the intensity of that desire. Goals define the system's reward structure and drive its actions.

This separation allows the system to learn and adapt by trying to achieve its goals, observing the outcomes, and updating its beliefs accordingly. This feedback loop is the foundation of reinforcement learning.
