# SeNARS (Semantic Non-Axiomatic Reasoning System)

SeNARS is a research project and software implementation of a hybrid neuro-symbolic reasoning system. It combines a term-oriented logic (Non-Axiomatic Logic, or NAL) with modern Large Language Models (LLMs) to create an observable platform for exploring advanced AI concepts.

The system is designed for researchers, educators, and developers interested in Explainable AI (XAI), knowledge representation, and the emergent behaviors of hybrid intelligence. It provides a comprehensive toolset for running, visualizing, and analyzing the reasoning process in real-time.

See [PLAN.md](./PLAN.md) for the detailed architectural vision and development roadmap.

---

## Architectural Vision: Towards Compound Intelligence

The long-term goal of SeNARS is to build a system with **Compound Intelligence**. This is an architectural principle where the system's fundamental data structures are designed to make its reasoning processes inherently more efficient and effective over time.

This vision is based on a few core ideas:

1.  **Structural Intelligence**: The data structures themselves—`Term`, `Task`, `Truth`, and `Stamp`—are designed to contain information that allows for automatic analysis and optimization. For example, immutable, normalized `Terms` can be efficiently cached and reused, compounding performance gains.
2.  **Self-Leveraging Algorithms**: The system will be equipped with algorithms that use this structural intelligence to improve their own performance. For instance, the system might learn to allocate processing resources more effectively based on the observed success of past reasoning patterns.
3.  **Emergent Optimization**: The goal is for system-wide improvements to emerge naturally from the interaction of these components, rather than being explicitly hand-coded for every scenario.

**Note:** This is the aspirational vision for the project. The current implementation provides the foundational architecture for this goal, but many of the advanced self-improving algorithms are still under active development.

---

## Current Status & Known Challenges

This project is an active reimplementation and is under continuous development. While the core components are functional, it's important for users and contributors to be aware of the current state:

-   **Term Normalization:** The canonical normalization of `Term` objects is a critical feature for achieving the "Compound Intelligence" vision (e.g., ensuring `(&, A, B)` is treated as identical to `(&, B, A)`). This is partially implemented but requires further work to cover all logical operators and edge cases.
-   **NARS-LM Integration:** The current hybrid reasoning is functional but primarily sequential. More sophisticated protocols for cross-validation and synergistic reasoning between the NAL engine and LLMs are part of the future roadmap.
-   **Performance:** The system includes extensive validation and monitoring, which is invaluable for research but introduces performance overhead. While the architecture is designed for high performance, achieving the sub-millisecond processing targets mentioned in the plan will require dedicated optimization cycles.
-   **"Self-Improvement":** The architecture is *designed* to support self-improvement, but the current implementation does not yet feature fully autonomous, self-optimizing algorithms. This remains a primary research and development goal.

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

For a full list of scripts, including for analysis, visualization, and data management, please see the `package.json` file.

---

## System Architecture

### Core Components

-   **NAR (NARS Reasoner Engine)**: The central orchestrator and public API for the system.
-   **Term**: The immutable, foundational data structure for representing all knowledge.
    -   **Key Features**: `Terms` are strictly immutable and created via a `TermFactory` that handles canonical normalization and caching. This is critical for efficient pattern matching and achieving the "Compound Intelligence" goal. They provide methods like `.visit()` and `.reduce()` for structural analysis.
-   **Task**: An immutable wrapper around a `Term` that represents a unit of work (e.g., a belief to be processed, a question to be answered).
    -   **Key Properties**: A `Task` contains the `term` (content), a NAL `truth` value, a `stamp` for tracking its origin, and a `budget` for resource allocation.
-   **Memory**: The main knowledge base, organizing `Concepts` (collections of `Tasks` related to a `Term`).
-   **Reasoning Engine**: Applies inference rules (both from NAL and from integrated LMs) to derive new knowledge.
-   **Parser**: Translates the Narsese language into `Term` structures.
-   **LM (Language Model Integration)**: Manages interaction with external Large Language Models.

---

## Foundational Concepts for Reinforcement Learning

SeNARS is designed to be a general-purpose reinforcement learning system, a capability rooted in the distinction between **Beliefs** and **Goals**:

-   **Beliefs (`.`):** Represent the system's knowledge about the world. Their truth values express probability (frequency) and certainty (confidence). Beliefs form the system's internal "world model."
-   **Goals (`!`):** Represent desired states or outcomes. Their truth values express desirability and the intensity of that desire. Goals define the system's reward structure and drive its actions.

This separation allows the system to learn and adapt by trying to achieve its goals, observing the outcomes, and updating its beliefs accordingly. This feedback loop is the foundation of reinforcement learning.