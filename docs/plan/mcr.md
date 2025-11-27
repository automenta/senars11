# SeNARS Model Context Reasoner (MCR) Integration Plan

This document outlines the plan for integrating Model Context Reasoner (MCR) functionality into the SeNARS platform. The goal is to create a powerful, synergistic system that leverages the strengths of both SeNARS and MCR, without introducing functional redundancy.

## I. Core Principles

The MCR integration will be guided by the following principles:

*   **Architectural Coherence:** MCR functionality will be integrated directly into the existing SeNARS architecture, avoiding the creation of a separate, parallel system. This will ensure a lean, maintainable codebase.
*   **Leverage Existing Components:** Instead of re-implementing functionality that already exists in SeNARS, we will adapt and extend existing components to support MCR's neurosymbolic capabilities.
*   **Synergy and Expanded Functionality:** The integration will be designed to create a synergistic relationship between SeNARS's existing reasoning capabilities and the new Prolog-style reasoning, expanding the overall functionality of the platform.

## II. Functional Specification

The MCR functionality will be exposed through the `NARTool`, which will provide the following capabilities:

*   **Prolog-style Reasoning:** The `NARTool` will provide `assert_prolog` and `query_prolog` actions, allowing users to interact with a Prolog-style knowledge base.
*   **Stateful Sessions:** The Prolog knowledge base will be maintained within the `PrologStrategy`, which is attached to the SeNARS stream reasoner. This provides a stateful, session-like experience.
*   **LLM-Powered Translation:** While not yet implemented, the MCR integration will eventually leverage SeNARS's existing Language Model (LM) capabilities to translate between natural language and Prolog.

## III. Architectural Implementation

The MCR functionality will be implemented through the following components:

*   **`PrologParser.js`:** This component will be responsible for parsing Prolog facts, rules, and queries into the Narsese format that SeNARS can understand.
*   **`PrologStrategy.js`:** This component will be a new strategy for the SeNARS stream reasoner, responsible for maintaining the Prolog knowledge base and executing Prolog-style queries. It will implement a backward-chaining resolution algorithm with unification and backtracking.
*   **`NARTool.js`:** This existing tool will be extended to include the `assert_prolog` and `query_prolog` actions. It will interact with the `PrologStrategy` through the `NAR.ask` method.
*   **`NAR.js`:** The main `NAR` class will be extended with an `ask` method that allows for direct, goal-directed queries to the stream reasoner's strategies. This will provide a clean, high-level API for interacting with the `PrologStrategy`.
*   **`Strategy.js`:** The main `Strategy` class will be extended with a multi-strategy `ask` method that allows it to delegate goal-directed queries to its sub-strategies.

## IV. Architectural Diagram

```mermaid
graph TD
    subgraph SeNARS Core
        direction LR
        NARTool
        NAR
        StreamReasoner
        Strategy
        PrologStrategy
    end

    subgraph User
        direction LR
        User
    end

    User -- "assert_prolog" --> NARTool
    User -- "query_prolog" --> NARTool
    NARTool -- "this.nar.ask(task)" --> NAR
    NAR -- "this._streamReasoner.strategy.ask(task)" --> StreamReasoner
    StreamReasoner -- "this.strategy.ask(task)" --> Strategy
    Strategy -- "strategy.ask(task)" --> PrologStrategy
    PrologStrategy -- "updates" --> KB[(Knowledge Base)]
    PrologStrategy -- "queries" --> KB
```

## V. Future Work

*   **LLM-Powered Translation:** The MCR integration will be extended to leverage SeNARS's existing LM capabilities to translate between natural language and Prolog.
*   **Ontology Support:** The `PrologStrategy` will be extended to support ontologies, allowing for the validation of facts and rules against a predefined schema.
*   **Persistent Sessions:** The `PrologStrategy` will be extended to support persistent sessions, allowing the knowledge base to be saved and loaded across server restarts.
