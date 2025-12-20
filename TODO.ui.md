# SeNARS Graph-Centric UI Roadmap

A pragmatic, incremental plan for evolving the existing UI into an observable "neural galaxy" visualization of hybrid NAL-LM reasoning.

## Current State

The `ui/` directory contains a functional foundation:
- **Stack**: Vanilla JS + Cytoscape.js + WebSocket + Express server
- **Features**: Real-time logs, interactive graph, Narsese command input
- **Testing**: Playwright E2E, Jest unit tests, Storybook components
- **Key Files**: `SeNARSUI.js` (orchestrator), `GraphManager.js` (Cytoscape wrapper), `GraphConfig.js` (styling)

## Design Principles

- **Incremental**: Each phase delivers working, tested functionality
- **Observable**: Every reasoning event is visible and explorable
- **Performant**: Smooth interactions at 60fps, lazy-load large graphs
- **Accessible**: Dark/light modes, keyboard navigation, readable labels

---

## Architecture Enhancements

> **Maximize results with minimal effort through smart architecture choices**

### Event-Driven State Management

Instead of prop-drilling or complex state libraries, leverage the existing `EventBus` pattern:

```js
// Single source of truth for UI state changes
eventBus.on('graph:node:selected', (data) => { /* update all listeners */ });
eventBus.on('graph:layout:changed', (data) => { /* sync panels */ });
```

**Benefit**: Zero new dependencies, consistent with core architecture.

### Component Lazy-Loading

Load heavy components (graph, timeline) only when visible:

```js
// In SeNARSUI.js - defer graph init until sidebar opens
const graphManager = new Proxy({}, {
  get: (_, prop) => {
    if (!this._graphManager) this._graphManager = new GraphManager(...);
    return this._graphManager[prop];
  }
});
```

**Benefit**: Faster initial load, lower memory when graph hidden.

### Shared Style Tokens

Create a single source for colors/spacing used across CSS and JS:

```js
// ui/src/config/DesignTokens.js
export const TOKENS = {
  colors: { concept: '#4ec9b0', goal: '#ff8c00', focus: '#ffd700' },
  timing: { pulse: '300ms', transition: '150ms' },
  spacing: { nodePadding: 8, panelGap: 16 }
};
```

**Benefit**: Change once, update everywhere (CSS vars + JS config).

### Message Protocol Versioning

Future-proof WebSocket messages:

```js
// Add version field to all messages
{ version: 1, type: 'reasoning:derivation', payload: {...} }
```

**Benefit**: Graceful upgrades, backward compatibility.

---

## Codebase Integration Points

> **Shortcuts**: Leverage existing infrastructure for rapid development

### Ready-to-Use Event Sources

| Event | Location | UI Use Case |
|-------|----------|-------------|
| `reasoning:derivation` | `IntrospectionEvents.js` | Animate new belief creation |
| `memory:concept:created` | `IntrospectionEvents.js` | Add node to graph |
| `cycle:step` | `IntrospectionEvents.js` | Timeline tick |
| `rule:fired` | `IntrospectionEvents.js` | Edge highlight animation |
| `memory:consolidation:*` | `IntrospectionEvents.js` | Focus→long-term transition |

```js
// Quick integration via WebSocketMonitor.listenToNAR(nar)
// Already bridges all NAR_EVENTS to WebSocket clients
```

### Existing Graph Styling (`GraphConfig.js`)

Already supports node types via selectors:
```css
node[type = "concept"]  → #4ec9b0 (teal)
node[type = "task"]     → #ff8c00 (orange)
node[type = "question"] → #9d68f0 (purple)
```

**Shortcut**: Add new selectors for goals, focus nodes, LM-active nodes without restructuring.

### RLFP Integration (`ReasoningTrajectoryLogger`)

Trajectory logging already captures:
- `llm_prompt`, `llm_response`, `lm_failure`
- `tool_call` events

**Shortcut**: Pipe logged trajectories to UI for visual diff/ranking interface.

---

## Phase 1: Foundation Polish

> **Goal**: Refine existing UI for production quality

- [ ] **Viewport meta**: Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to `index.html`
- [ ] **Theme system**: CSS custom properties in `style.css` for dark/light mode
- [ ] **Typography**: Google Fonts (Inter/Roboto) via CDN in `index.html`
- [ ] **Layout**: Full-screen responsive canvas, collapsible side panels
- [ ] **Accessibility**: Focus indicators, aria-labels, contrast compliance

**Verification**: Visual regression tests, Lighthouse accessibility audit

---

## Phase 2: Enhanced Graph Visualization

> **Goal**: Make concept relationships beautiful and informative

**Shortcut**: Modify existing `GraphConfig.getGraphStyle()` and `getGraphLayout()`.

**Dependencies** (add to `index.html` before cytoscape init):
```html
<script src="https://unpkg.com/layout-base@2.0.1/layout-base.js"></script>
<script src="https://unpkg.com/cose-base@2.2.0/cose-base.js"></script>
<script src="https://unpkg.com/cytoscape-fcose@2.2.0/cytoscape-fcose.js"></script>
```

- [ ] **Organic layout**: Switch from `cose` to `fcose` in `GraphConfig.js`
- [ ] **Edge styling**: Type-based colors (inheritance=green, similarity=blue) 
  - Add selectors: `edge[type = "inheritance"]`, `edge[type = "similarity"]`
- [ ] **Node sizing**: Already uses `mapData(weight, 0, 100, 20, 80)` — connect weight to priority
- [ ] **Zoom behavior**: Add style rules for zoom-dependent label sizing

**Power move**: Add compound nodes for concept clustering:
```js
// In GraphManager.addNode(), support parent grouping
cy.add({ data: { id: 'cluster_robin', parent: 'bird' } });
```

**Verification**: E2E tests for zoom/pan gestures, screenshot comparisons

---

## Phase 3: Real-Time Streaming

> **Goal**: Live updates with attention-drawing animations

**Shortcut**: `WebSocketMonitor.bufferEvent()` already batches events for efficiency.

- [ ] **Delta protocol**: Use existing `updateFromMessage()` in `GraphManager.js`
- [ ] **Pulse animations**: Add CSS animation class `.pulse-new` triggered on add
- [ ] **Derivation highlighting**: On `reasoning:derivation`, highlight parent→child edge
- [ ] **Backpressure handling**: Respect `WEBSOCKET_CONFIG.minBroadcastInterval` (10ms)

**Power move**: Subscribe to specific events via client capabilities:
```js
// Client can request only needed events
ws.send({ type: 'subscribe', events: ['reasoning:derivation', 'memory:concept:created'] });
```

**Verification**: Integration tests with mock event streams, performance profiling

---

## Phase 4: Task & Goal Visualization

> **Goal**: Distinguish goals, questions, and beliefs visually

**Shortcut**: Extend existing `GraphConfig.GRAPH_COLORS` and node type selectors.

- [ ] **Node shapes**: Add to `GraphConfig.getGraphStyle()`:
  - `node[type = "goal"] { shape: 'diamond' }`
  - `node[type = "question"] { shape: 'triangle' }`
- [ ] **Orbit badges**: Use Cytoscape compound nodes or overlays for active tasks
- [ ] **Side panel**: Enhance existing `graphDetails` element with task history
- [ ] **Goal tracking**: Progress bar based on expectation vs. derived confirmation

**Flexibility**: Support custom punctuation-to-style mapping via config.

**Verification**: E2E tests for task interactions

---

## Phase 5: Focus & Memory Effects

> **Goal**: Visualize attention and memory dynamics

**Shortcut**: Subscribe to `memory:consolidation:*` events already emitted.

- [ ] **Focus glow**: Add `.focus-active` class, animate via CSS `box-shadow`
- [ ] **LM indicator**: On `lm.prompt`/`lm.response`, show spinner/glow on relevant node
- [ ] **Memory depth**: Map `recency` to node opacity (fresher = more opaque)
- [ ] **Consolidation animation**: Animate node transition from focus→long-term

**Power move**: Use `Memory.focusConcepts` getter to highlight focus set.

**Verification**: E2E tests with controlled memory state

---

## Phase 6: Timeline & Replay

> **Goal**: Navigate reasoning history

**Shortcut**: `DerivationTracer` already captures derivation chains.

- [ ] **Timeline scrubber**: Store graph snapshots per cycle
- [ ] **Snapshot system**: Serialize `GraphManager.graphData` (nodes/edges Maps)
- [ ] **Diff view**: Highlight added/removed nodes between timepoints
- [ ] **Export**: Download reasoning traces as JSON (leverages `ReasoningTrajectoryLogger`)

**Power move**: Integrate with `nar.getReasoningTrace()` for cycle-accurate replay.

**Verification**: Unit tests for snapshot logic, E2E for scrubber

---

## Phase 7: Interactive Reasoning (RLFP)

> **Goal**: User feedback shapes future reasoning

**Shortcut**: `ReasoningTrajectoryLogger` already captures full trajectories.

- [ ] **Path ranking**: Drag-to-rank UI over derivation paths
- [ ] **Preference capture**: Send rankings via WebSocket to `PreferenceCollector`
- [ ] **Adaptive styling**: Preferred paths get enhanced styling (thicker edges, brighter)
- [ ] **Feedback indicators**: Show visual diff when RLFP adjustments apply

**Power move**: Use `RLFPLearner` predictions to pre-style high-preference paths.

**Verification**: Integration with RLFP subsystem tests

---

## Optional: Perceptual Refinements

> **Goal**: AI-assisted aesthetic validation (future enhancement)

These optional techniques can augment manual visual review:

- [ ] **Aesthetics scoring**: Choose model based on use case:
  - **LAION Aesthetics V2**: General image aesthetics (baseline)
  - **sac+logos+ava1-l14**: Improved predictor with better calibration
  - **UNIAA/HumanAesExpert**: UI-specific scoring for screenshot evaluation
  - Target: Aesthetics score >7.0
- [ ] **Saliency validation**: Ensure >70% attention on key nodes/concepts
  - Mask background, measure model attention on interactive elements
- [ ] **Legibility checks**: Automated contrast ratio validation on labels
- [ ] **Clutter detection**: Flag overly dense graph regions for layout adjustment

**Integration Example**:
```ts
async function evaluatePerceptual(screenshot: Buffer) {
  const scores = await hfInference(screenshot, { model: 'UNIAA/HumanAesExpert' });
  expect(scores.aesthetic).toBeGreaterThan(7.0);
  expect(scores.saliency_on_nodes).toBeGreaterThan(0.7);
}
```

> [!NOTE]
> Perceptual evaluation requires Hugging Face API access and is best suited for periodic design audits rather than every CI run.

---

## Development Workflow

```
1. Pick next uncompleted item from current phase
2. Write/update E2E test for expected behavior
3. Implement feature in ui/src/
4. Verify against test suite: npm run test:e2e
5. Visual review in browser
6. Run perceptual audit (optional, phases 3+)
7. Commit
```

### Efficiency Multipliers

| Technique | Effort Saved | When to Use |
|-----------|--------------|-------------|
| **Copy existing selector patterns** | ~30% | Adding new node/edge types |
| **Extend GraphConfig vs. new file** | ~50% | Any styling change |
| **Use IntrospectionEvents directly** | ~70% | New event subscriptions |
| **Storybook for component iteration** | ~40% | UI component dev |
| **Mock WebSocket in tests** | ~60% | Integration testing |

### Quick Wins Checklist

- [ ] Update Cytoscape CDN to 3.33.0 in `index.html` (performance boost)
- [ ] Add viewport meta tag (mobile-ready)
- [ ] Create `DesignTokens.js` shared config
- [ ] Add message version field to `WebSocketMonitor`

---

## Key Files Reference

| File | Purpose | Modify For |
|------|---------|------------|
| `ui/index.html` | Entry point, CDN scripts | Phase 1-2 deps |
| `ui/src/config/GraphConfig.js` | Cytoscape styling | Phase 2-5 styling |
| `ui/src/visualization/GraphManager.js` | Graph CRUD operations | Phase 2-6 logic |
| `ui/src/SeNARSUI.js` | Main orchestrator | Event subscriptions |
| `ui/style.css` | Global styles | Phase 1 theming |
| `core/src/util/IntrospectionEvents.js` | Event definitions | New event types |
| `agent/src/rlfp/ReasoningTrajectoryLogger.js` | Trajectory capture | Phase 7 RLFP |

## Test Commands

```bash
cd ui
npm run test:e2e          # Playwright E2E tests
npm run test:unit         # Jest unit tests  
npm run storybook         # Component explorer
npm start                 # Dev server at :8080
```

## Technology Notes

| Component | Version | Notes |
|-----------|---------|-------|
| Cytoscape.js | 3.33.0 | Latest stable, improved animations |
| cytoscape-fcose | 2.2.0 | Requires layout-base + cose-base |
| layout-base | 2.0.1 | fcose dependency |
| cose-base | 2.2.0 | fcose dependency |

- **Streaming**: Native WebSocket via `WebSocketMonitor`
- **Hosting**: Node.js server (`ui/server.js`)
- **Future option**: Migrate to Vite if bundling becomes necessary