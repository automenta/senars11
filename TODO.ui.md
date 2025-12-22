# SeNARS Observable UI Roadmap

> **Vision**: Transform SeNARS into an **observable "neural galaxy"** where the graph is the primary interface for exploring hybrid NAL-LM reasoning.
> **Philosophy**: "The Graph *IS* the Logic."

**Status**: Planning / Pre-Alpha
**Goal**: Unified Observability Platform (CLI + Web)

---

## 1. Architecture: The "Observability Core"

We unify the CLI (`npm run repl`) and Web UI (`ui/`) around a shared core, ensuring that "if it happens in the reasoner, it appears in the UI."

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
        WebREPL[Web REPL Overlay]
    end

    NAR -->|IntrospectionEvents| EB
    EB -->|Stream| WSM
    EB -->|Stream| Hooks
    
    WSM --> Web
    WSM --> WebREPL
    Hooks --> CLI
    
    Web -.->|Commands| CMD
    WebREPL -.->|Commands| CMD
    CLI -.->|Commands| CMD
    
    DT -.->|Styles| Web
    DT -.->|Styles| WebREPL
    DT -.->|Styles| CLI
```

### Key Integration Points
1.  **Event Ontology**: `core/src/util/IntrospectionEvents.js` is the single source of truth.
    *   *Rule*: A feature exists only if an event exists for it.
2.  **Visual Language**: `core/src/util/DesignTokens.js` defines shared colors, timings, and semantic meanings.
3.  **Control Plane**: `core/src/util/CommandRegistry.js` unifies input handling (`run`, `step`, `input`) across TUI and Web.

---

## 2. Development Methodology: Agentic & Incremental

We utilize an **incremental, agent-driven workflow**.

### The Automated Loop
1.  **Define**: Micro-goal (e.g., "Visualize goal derivation").
2.  **Act**: Execute changes using "Shortcuts" (existing code) and "Power Moves" (high-leverage libs).
3.  **Verify**:
    *   **Functional**: Use PLaywright E2E.
    *   **Visual**: Regression checks.
    *   **Performance**: Maintain >30fps.

### Verification Standards
*   **Performance**: >30fps at 500 nodes.
    *   *Strategy*: Level-of-Detail (LOD) culling, viewport filtering.
*   **Aesthetics**: No overlapping nodes, clear edge routing.

---

## 3. Implementation Plan: The 10-Step Progression

### Phase 0: Foundations & Prerequisites
*Goal: Ensure the plumbing exists before building the tapping.*

1.  **Command Infrastructure**:
    *   Create `core/src/util/CommandRegistry.js`.
    *   Pattern: `registry.register(name, handler, meta)`.
    *   *Tasks*: Refactor `TUI.js` and `ReplMessageHandler.js` to use this.
2.  **Event Ontology Expansion**:
    *   Update `IntrospectionEvents.js` with missing events:
        *   `memory:focus:promote`, `memory:focus:demote`
        *   `lm:prompt:start`, `lm:prompt:complete`, `lm:error`
        *   `reasoning:goal:achieved`, `reasoning:derivation:chain`

### Track A: Core Infrastructure
*Goal: Unified logic and shared assets.*

3.  **Design Token Injection**: 
    *   Create `ui/src/utils/ThemeGenerator.js` to map `DesignTokens` to CSS variables.
4.  **Log Unification**:
    *   Create `agent/src/cli/hooks/useAgentLogs.js` (if missing) to standardize CLI output.

### Track B: The "Neural Galaxy" (Visuals)
*Goal: Beautiful, organic, readable graph.*

5.  **Static Nodes (Elements)**: 
    *   Render nodes using `GraphConfig` styles mapping to Narsese terms (Concept=Teal, Goal=Amber).
6.  **Organic Layout (Structure)**: 
    *   Implement `fcose` (or `cola`/`elk` if bundle size is high).
    *   *Optimization*: Use Web Worker for layout calculation.
7.  **Smart Edges (Connections)**: 
    *   Full semantic coloring (Inheritance vs Similarity) via `DesignTokens`.

### Track C: Deep Observability
*Goal: Seeing the machine think in real-time.*

8.  **Live Deltas**:
    *   Animate updates from `EventStream`.
    *   *Shortcut*: `reasoning:derivation` -> Pulse animation.
9.  **Vital Signs & Focus**:
    *   Visual saliency: Glow effect for `memory:focus:promote`.
    *   Spinners for `lm:prompt:start`.
    *   Gauges for CPU/Cycle rate.

### Track D: Interactive Control
*Goal: User agency and feedback.*

10. **Timeline Scrubber** (Time-Travel):
    *   Snapshot `GraphManager` state every N cycles into a RingBuffer.
    *   UI slider to rewind/replay.
11. **Web REPL Panel**:
    *   Implement `ui/src/components/WebRepl.js`.
    *   Terminal overlay on graph connecting to `CommandRegistry`.
    *   Supports `run`, `step`, and full logic interaction.
12. **RLFP Interface** (Teacher Mode):
    *   *Backend*: Implement feedback ingestion.
    *   *UI*: Drag-to-rank derivation paths -> Emit `reasoning:feedback` events.

### Track E: Developer Experience (New)
*Goal: Tools for the builders.*

12. **Debug Panel**:
    *   Live Event Inspector (filter/pause stream).
    *   Raw Memory View (JSON tree).
    *   Performance Overlay (FPS, Latency).

### Track F: Accessibility (New)
*Goal: Observability for all.*

13. **A11y Core**:
    *   ARIA labels for graph nodes.
    *   Keyboard navigation (Tab-index through focus concepts).
    *   High-contrast mode toggled via `DesignTokens`.

---

## 4. File Impact Analysis

| Track | Key Files Modified | New Files Created |
| :--- | :--- | :--- |
| **0. Infra** | `TUI.js`, `ReplMessageHandler.js`, `IntrospectionEvents.js` | `CommandRegistry.js` |
| **A. Core** | `GraphConfig.js` | `ThemeGenerator.js`, `useAgentLogs.js` |
| **B. Visuals** | `GraphManager.js`, `GraphStyles.js` | — |
| **C. Observe** | `WebSocketMonitor.js`, `NodeRenderer.js` | — |
| **D. Interact** | `ReplKeyHandler.js` | `TimeTravelManager.js`, `WebRepl.js` |
| **E. Dev** | `App.js` | `DebugPanel.js`, `EventInspector.js` |
| **F. A11y** | `CanvasWrapper.js` | `A11yController.js` |

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **Cytoscape Performance** | High | High | LOD culling, viewport filtering, max node limits. |
| **Event Storms** | Medium | High | Batching in `WebSocketMonitor` (already exists). |
| **Layout Instability** | Medium | Medium | Use deterministic seeds, run layout in Web Worker. |
| **Command Divergence** | High | Medium | Strict adherence to `CommandRegistry` as sole source. |

---

## 6. Future Enhancements (Post-MVP)

*   **Perceptual Scoring**: Use CLIP/SigLIP to automate "beauty" scores (Moved from core path).
*   **3D Visualization**: Three.js renderer for massive graphs (>10k nodes).
*   **Plugin System**: Allow community custom renderers.
*   **Offline Mode**: Load/Save event streams for offline analysis.