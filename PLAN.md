# SeNARS Development Plan: A Code-Aligned Roadmap

> **Document Purpose**
>
> This document is the definitive development roadmap for SeNARS, starting from the project's current codebase. It is organized into a series of goal-oriented **initiatives** that are explicitly tied to the files and directories within the `src/`, `tests/`, and `docs/` folders.
>
> The primary goal is to provide a clear, actionable path to transform the existing components into a robust, reliable, and fully-functional reasoning system.

## Executive Summary: From a Codebase to a System

The current SeNARS codebase contains many foundational components but requires focused work on correctness, testing, and integration. This plan outlines the initiatives to complete this work, framed to provide maximum clarity for developers navigating the repository.

The roadmap prioritizes tackling the biggest risks first: ensuring the existing components are correct and can be integrated successfully. Each initiative details the specific "Codebase Impact," pointing to the exact files and directories that will be affected.

**Key Guiding Principles:**

1.  **Integrate Early and Often:** Prove that components can work together before investing heavily in their individual features.
2.  **Test What Exists:** Bring the existing code under a comprehensive test harness before extending it.
3.  **Deliver Capabilities, Not Just Components:** Each initiative should result in a more capable and demonstrably functional system.
4.  **Separate Engineering from Research:** Build the stable platform (engineering) required to conduct novel experiments (research).

---

## Initiative 1: Establish an End-to-End Integration Baseline

**Goal:** Prove that the major existing components can be wired together to pass data from input to retrieval. This "tracer bullet" initiative is the highest priority as it de-risks the entire project by exposing fundamental integration flaws immediately.

**Actionable Tasks:**

1.  **Create the "Tracer Bullet" Integration Test:**
    -   Write a single test that instantiates the main `NAR` class, inputs a simple atomic belief (e.g., `"A."`), and asserts that the corresponding belief can be retrieved from memory.
    -   **Codebase Impact:**
        -   **Create/Modify:** `tests/integration/baseline.test.js`
        -   **Files Under Test:** `src/NAR.js`, `src/parser/`, `src/term/TermFactory.js`, `src/task/Task.js`, `src/memory/Memory.js`

**Acceptance Criteria:**

-   A single, passing integration test in `tests/integration/baseline.test.js` demonstrates the full, unbroken data flow from the `NAR.input()` method to the `Memory` store. This test will serve as a regression harness for all subsequent initiatives.

## Initiative 2: Solidify Core Components

**Goal:** Address the known weaknesses in the existing `Term` and `Parser` components. This initiative focuses on correctness, completeness, and test coverage for the foundational data structures.

**Actionable Tasks:**

1.  **`Term` Normalization:**
    -   Refactor the existing `TermFactory` to implement complete canonical normalization for all specified NAL operators.
    -   **Codebase Impact:**
        -   **Modify:** `src/term/TermFactory.js`, `src/term/Term.js`
2.  **`Term` Testing:**
    -   Achieve >95% unit test coverage for the `Term` and `TermFactory` classes. Implement property-based tests for normalization.
    -   **Codebase Impact:**
        -   **Create/Modify:** `tests/unit/Term.test.js`, `tests/unit/TermFactory.test.js`
3.  **`Parser` Enhancement:**
    -   Refactor the existing `Parser` to correctly handle all Narsese syntax and implement robust error recovery.
    -   **Codebase Impact:**
        -   **Modify:** `src/parser/` (relevant parser implementation files)
        -   **Create/Modify:** `tests/unit/Parser.test.js`
4.  **Core Component Documentation:**
    -   Write comprehensive JSDoc/TSDoc for all public methods in the core `Term`, `TermFactory`, and `Parser` modules.
    -   **Codebase Impact:**
        -   **Modify:** `src/term/Term.js`, `src/term/TermFactory.js`, `src/parser/` (add comments)

**Acceptance Criteria:**

-   The `TermFactory` correctly normalizes all documented Narsese term types, verified by tests in `tests/unit/TermFactory.test.js`.
-   The core component test suite passes with >95% coverage.

## Initiative 3: Implement Foundational Reasoning

**Goal:** Transform the system from a data storage mechanism into a true reasoning engine by implementing a complete, end-to-end reasoning capability.

**Actionable Tasks:**

1.  **Implement Core NAL Rules & Truth Functions:**
    -   Implement the NAL rules for **deduction** and **revision** and their corresponding truth value functions.
    -   **Codebase Impact:**
        -   **Create:** `src/reasoning/rules/nal/Deduction.js`, `src/reasoning/rules/nal/Revision.js`
        -   **Modify:** `src/reasoning/RuleEngine.js` (to register new rules)
        -   **Modify:** `src/Truth.js` (to add truth functions)
        -   **Create/Modify:** `tests/unit/Truth.test.js`, `tests/unit/rules/Deduction.test.js`
2.  **Create Syllogism Integration Test:**
    -   Build upon the baseline test to verify a simple syllogism (e.g., `A-->B`, `B-->C` |- `A-->C`).
    -   **Codebase Impact:**
        -   **Create/Modify:** `tests/integration/syllogism.test.js`

**Acceptance Criteria:**

-   The system can successfully perform a syllogistic deduction, verified by the test in `tests/integration/syllogism.test.js`, proving the `Parser`, `Memory`, `RuleEngine`, and `NAR` orchestrator are all working together correctly.

## Initiative 4: NARS-LM Hybrid Integration

**Goal:** Build the robust engineering framework required for NARS-LM experimentation and implement a baseline for hybrid reasoning.

**Actionable Tasks (Engineering Track):**

1.  **Build the LM Integration Framework:**
    -   Implement a provider-agnostic `LM` component, a provider registry, and a circuit breaker for handling API failures.
    -   **Codebase Impact:**
        -   **Modify:** `src/lm/LM.js`, `src/config/SystemConfig.js`
        -   **Create:** `src/lm/ProviderRegistry.js`, `src/lm/util/CircuitBreaker.js`
        -   **Create:** `src/lm/providers/` (e.g., `OpenAIProvider.js`)
2.  **Implement a Baseline Hybrid Workflow:**
    -   Create a new "LM Hypothesis" rule that queries an LM and injects the response back into the system.
    -   **Codebase Impact:**
        -   **Create:** `src/reasoning/rules/lm/Hypothesis.js`
        -   **Create/Modify:** `tests/integration/lm_hybrid.test.js`

**Parallel Research Spike:**

-   **Goal:** Use the new framework to explore and document more advanced synergistic reasoning protocols.
-   **Deliverable:** A research report summarizing findings.
-   **Codebase Impact:**
    -   **Create:** `docs/research/hybrid_reasoning_protocols.md`

**Acceptance Criteria:**

-   The engineering framework is complete and can successfully query an external LM, verified by the test in `tests/integration/lm_hybrid.test.js`.
-   The research spike deliverable is completed.

## Initiative 5: Prepare for External Use

**Goal:** Harden the system by implementing features related to documentation, deployment, security, reliability, and performance.

**Actionable Tasks:**

1.  **Documentation:**
    -   Write a comprehensive user guide and generate complete API documentation.
    -   **Codebase Impact:**
        -   **Create:** `docs/user-guide.md`, `docs/api-reference.md`
2.  **Deployment:**
    -   Create a `Dockerfile` for easy, one-command deployment.
    -   **Codebase Impact:**
        -   **Create:** `Dockerfile`, `docker-compose.yml` (in project root)
3.  **Security & Reliability:**
    -   Implement input sanitization and resource limits.
    -   **Codebase Impact:**
        -   **Modify:** `src/parser/` (sanitization), `src/NAR.js` (resource limits), `src/lm/LM.js` (circuit breaker)
4.  **Performance Optimization:**
    -   Conduct systematic performance profiling, then implement targeted optimizations. Establish benchmarks.
    -   **Codebase Impact:**
        -   **Create:** `benchmarks/` (new benchmark files, e.g., `term_normalization.js`)
        -   **Modify:** Files identified as bottlenecks (e.g., `src/term/TermFactory.js`, `src/memory/Memory.js`)

**Acceptance Criteria:**

-   The system is fully documented and can be deployed via a single `docker-compose up` command.
-   The system is resilient to common failure modes and invalid input.
-   Performance has been measurably improved in at least two identified bottleneck areas, with new files in `benchmarks/` to prove it.
