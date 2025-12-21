# SeNARS Observable UI Roadmap

> **Vision**: Transform SeNARS into an **observable "neural galaxy"** where the graph is the primary interface for exploring hybrid NAL-LM reasoning.
> **Philosophy**: "The Graph *IS* the Logic."

**Status**: Ready for Agentic Execution
**Goal**: Unified Observability Platform (CLI + Web)

---

## 1. Architecture: The "Observability Core"

We unify the CLI (`npm run repl`) and Web UI (`ui/`) around a shared core, ensuring that "if it happens in the reasoned, it appears in the UI."

### Unified Data Flow

```mermaid
graph TD
    subgraph Core ["Shared Core (core/src)"]
        NAR[NAR Engine]
        EB[EventBus]
        CMD[CommandRegistry]
        DT[DesignTokens.js]
    end

    subgraph Bridges ["Bridges"]
        WSM[WebSocketMonitor] <-->|JSON Stream| WSC[WebSocketClient]
        Hooks[useAgentLogs]
    end

    subgraph Interfaces ["Interfaces"]
        CLI[CLI REPL (Ink)]
        Web[Web UI (Vanilla JS + Cytoscape)]
    end

    NAR -->|IntrospectionEvents| EB
    EB -->|Stream| WSM
    EB -->|Stream| Hooks
    
    WSM --> Web
    Hooks --> CLI
    
    Web -.->|Commands| CMD
    CLI -.->|Commands| CMD
    
    DT -.->|Styles| Web
    DT -.->|Styles| CLI
```

### Key Integration Points
1.  **Event Ontology**: `core/src/util/IntrospectionEvents.js` is the single source of truth.
    *   *Rule*: A feature exists only if an event exists for it.
2.  **Visual Language**: `core/src/util/DesignTokens.js` defines shared colors, timings, and semantic meanings.
3.  **Control Plane**: `core/src/util/CommandRegistry.js` unifies input handling (`run`, `step`, `input`) across TUI and Web.

---

## 2. Development Methodology: Agentic & Incremental

We utilize an **incremental, agent-driven workflow** designed to automate ~80% of routine coding tasks while maintaining high strategic coherence.

### The Automated Loop (Planner → Generator → Healer)
1.  **Define**: Human sets a micro-goal (e.g., "Visualize goal derivation edges").
2.  **Act**: Agents execute changes using the "Shortcuts" and "Power Moves" defined below.
3.  **Verify**:
    *   **Functional**: Playwright E2E tests (interaction, updates).
    *   **Visual**: Regression testing against baselines.
    *   **Perceptual**: AI-based aesthetic scoring (Target: >7.0/10) to ensure the "Neural Galaxy" feel.
4.  **Tune**: Feedback loop to refine aesthetics and performance.

### Verification Standards
*   **Performance check**: Graph updates must handle >30fps at 500 nodes.
*   **Aesthetic check**: Automated scoring (using local vision models or APIs) for layout harmony and clutter reduction.

---

## 3. Implementation Plan: The 10-Step Progression

We execute in 4 parallel tracks, broken down into granular, testable increments (The "Element → Gesture → Dynamic" Sequence).

### Track A: Foundation Consolidation
*Goal: Solid bedrock for shared assets.*

1.  **Unified Command Registry**: Refactor `TUI.js` commands into `core/src/util/CommandRegistry.js`.
2.  **Design Token Injection**: Create `ui/src/utils/ThemeGenerator.js` to map `DesignTokens` to CSS variables.

### Track B: The "Neural Galaxy" (Visuals)
*Goal: Beautiful, organic, informative graph.*

3.  **Static Nodes (Elements)**: Render nodes using `GraphConfig` styles mapping to Narsese semantics (Concept=Blue, Goal=Amber).
4.  **Organic Layout (Structure)**: Implement high-quality force-directed layout (e.g., `fcose` or similar) for non-overlapping, harmonious clusters.
5.  **Smart Edges (Connections)**: Color-code edges by type (Inheritance=Green, Similarity=Blue). Implement hover details.

### Track C: Deep Observability
*Goal: Seeing the machine think in real-time.*

6.  **Live Deltas (Dynamics)**: Animate graph updates from the Event Stream.
    *   *Shortcut*: Listen to `reasoning:derivation` -> Trigger `.pulse-new` animation.
7.  **Focus & Attention**: Visual saliency for active processing.
    *   *Shortcut*: Map `memory:focus:promote` -> Node Glow effect.
    *   *Shortcut*: Map `lm:prompt` -> Spinner overlay on node.
8.  **Vital Signs**: Real-time gauges for CPU Throttle, Derivation Depth, and Cycle/Sec.

### Track D: Interactive Time-Travel
*Goal: Rewind, Replay, Reinforce.*

9.  **Timeline Scrubber**: Allow users to scroll back through reasoning cycles.
    *   *Impl*: Snapshot `GraphManager` state into a `RingBuffer`.
10. **RLFP Interface**: "Teacher" mode.
    *   *Impl*: Drag-to-rank derivation paths in the UI; emit feedback events to the backend.

---

## 4. Technical Specifications & Power Moves

| Feature | Specification | Power Move / Shortcut |
| :--- | :--- | :--- |
| **Graph Engine** | **Cytoscape.js** (Vanilla JS) | Use `compound nodes` for concept clustering (`cy.add({ parent: ... })`). |
| **Streaming** | **WebSocket** (Native) | Use `WebSocketMonitor.bufferEvent()` to batch high-frequency updates (10ms window). |
| **Layout** | **Organic / Force-Directed** | Prioritize specific layout extensions (like `fcose`) that support constraints and clustering. |
| **Semantics** | **Visual Ontology** | Map Narsese directly to CSS: `node[type="goal"] { shape: diamond }`. |
| **Perception** | **Aesthetics > 7.0** | Use any available Perceptual/Vision model (CLIP/SigLIP) to validate "beauty" in CI/CD. |

### Visual Ontology Reference (`GraphConfig.js`)

| Semantic Element | Shape | Color (Token) | Motion / Effect |
| :--- | :--- | :--- | :--- |
| **Belief** `.` | Ellipse | `concept` (Teal) | Static |
| **Goal** `!` | Diamond | `task` (Amber) | Pulse if active |
| **Question** `?` | Triangle | `query` (Purple) | Spin on processing |
| **Operation** `^` | Square | `action` (Red) | Flash on execution |

---

## 5. Development Rules

1.  **No Logic in UI**: The UI is a "dumb" terminal. It only renders what the Event Stream says.
2.  **Event-First**: If you want to see it, emit an event for it (`IntrospectionEvents.js`).
3.  **Performance First**: Lazy-load graph details. Throttle rendering to 30fps.
4.  **Accessibility**: Ensure high contrast and keyboard navigation for the core graph.

## 6. Verification Commands

*   **CLI Check**: `node agent/src/cli/Repl.js` -> Verify `run`, `step` via shared Registry.
*   **Web Check**: `cd ui && npm start` -> Verify connection and live graph updates.
*   **Load Test**: `node examples/demo-agent.js` -> Verify smooth rendering under load (500+ nodes).