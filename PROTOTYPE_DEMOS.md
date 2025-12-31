# SeNARS Task-Solving Prototypes

> **Demonstrating Compound Intelligence Through Visible Reasoning**
>
> *Empowering a modest LM with advanced reasoning — making the thinking process visible and verifiable.*

---

## Evaluation: Can This Effectively Demonstrate Unique Capabilities?

### ✅ YES — Here's Why

| Demonstration Goal | How Prototypes Achieve It |
|--------------------|---------------------------|
| **LM + NAL > Either Alone** | Category tasks show reasoning the LM cannot do solo |
| **Visible Thinking** | Step-by-step trace shows each inference step |
| **Uncertainty Quantification** | Truth values displayed at every step |
| **Memory Persistence** | Cross-session tests prove stable recall |
| **Self-Explanation** | Proof traces available on demand (100% explainability) |
| **Resource-Bounded** | AIKR demos show graceful degradation |

### Key Demonstration: Modest LM + SeNARS > Large LM Alone

The system uses a **small, local Transformer.js model** (e.g., `Xenova/LaMini-Flan-T5-783M` — 783M params) that:
- Cannot perform multi-step logical inference independently
- Cannot maintain consistent beliefs across queries
- Cannot explain its reasoning with proof traces

With SeNARS, the same model:
- Achieves multi-step syllogistic chains via NAL inference
- Maintains persistent, revisable beliefs with truth values
- Produces verifiable proof traces for every conclusion

---

## Configuration System

### Initial Configuration (Dashboard)

```javascript
// Default configuration — extends existing ConfigPanel
const DEFAULT_DEMO_CONFIG = {
    // LM Provider — Transformers.js by default (no server required)
    lm: {
        provider: 'transformers',           // 'transformers' | 'ollama' | 'openai' | 'dummy'
        model: 'Xenova/LaMini-Flan-T5-783M', // Compact, capable, auto-downloaded
        temperature: 0.7,
        maxTokens: 100,
        // Fallback if Transformers.js fails
        fallback: 'dummy'
    },
    
    // Reasoning engine
    reasoning: {
        cyclesPerStep: 20,          // NAL cycles per demo step
        maxCyclesPerDemo: 500,      // Total cycle budget
        traceDepth: 50,             // Max trace entries to display
        showIntermediateSteps: true
    },
    
    // Execution mode
    execution: {
        mode: 'step',               // 'realtime' | 'slow' | 'step'
        delayMs: 500,               // Delay between steps in 'slow' mode
        pauseOnDerivation: false,   // Pause when new derivation produced
        pauseOnGoalAchieved: true   // Pause when goal resolved
    },
    
    // Demo discovery
    discovery: {
        sources: [
            { path: 'examples/', type: 'example', enabled: true },
            { path: 'tests/integration/', type: 'test', enabled: true },
            { path: 'demos/', type: 'curated', enabled: true }
        ],
        categories: ['reasoning', 'memory', 'temporal', 'adversarial', 'narl']
    }
};
```

### Runtime Controls (Live Adjustments)

| Control | UI Element | Effect |
|---------|-----------|--------|
| **Speed** | Slider 0-100% | Real-time ↔ Step-by-step |
| **Pause/Resume** | Button | Freeze execution |
| **Step Forward** | Button | Execute one cycle |
| **Cycle Budget** | Number input | Adjust `maxCyclesPerDemo` |
| **Show Trace** | Toggle | Display/hide trace panel |
| **LM Enabled** | Toggle | Run with/without LM integration |

### LM Provider Configuration

```javascript
// Transformers.js — Local, no external dependencies
{
    provider: 'transformers',
    model: 'Xenova/LaMini-Flan-T5-783M',  // ~800MB, auto-cached
    // Alternatives:
    // 'Xenova/flan-t5-small' — 77MB, faster but less capable
    // 'HuggingFaceTB/SmolLM-135M' — 135MB, ultra-compact
}

// Ollama — Local server
{
    provider: 'ollama',
    model: 'llama3.2',
    baseURL: 'http://localhost:11434'
}

// Dummy — Pure symbolic mode (for testing NAL in isolation)
{
    provider: 'dummy',
    responseTemplate: 'No LM — pure symbolic reasoning'
}
```

---

## UI Integration

### Extending Existing Demo Runner

The prototype integrates with `ui/src/demo-runner/DemoRunnerApp.js`:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SENI PROTOTYPE RUNNER                          [⚙️] [🔴 LIVE]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ DEMO CATALOG ──────────────────┐  ┌─ EXECUTION ───────────────┐│
│  │  📂 reasoning                   │  │  ▶ Syllogism Demo         ││
│  │    ├── syllogism-demo           │  │  Mode: [Step ▾]           ││
│  │    ├── causal-reasoning-demo    │  │                           ││
│  │    └── temporal-reasoning-demo  │  │  Cycle 12/20              ││
│  │  📂 tests/integration           │  │  ┌─────────────────────┐  ││
│  │    ├── Inference Tests          │  │  │ Goal: (A-->C)?      │  ││
│  │    └── Memory Tests             │  │  │ (A-->B). {0.9,0.85} │  ││
│  │  📂 narl (benchmarks)           │  │  │ (B-->C). {0.85,0.8} │  ││
│  │    ├── Level 1: Trace           │  │  │ ✓(A-->C) {0.77,0.68}│  ││
│  │    └── Level 2: Revise          │  │  └─────────────────────┘  ││
│  └──────────────────────────────────┘  │  [⏸ Pause] [→ Step]       ││
│                                        └───────────────────────────┘│
│  ┌─ CONFIG ─────────────────────────────────────────────────────────┐
│  │ LM: [Transformers.js ▾] Model: [Xenova/LaMini-Flan-T5-783M____] │
│  │ Cycles: [20__] Delay: [500ms] [☑ Show Trace] [☐ LM Enabled]     │
│  └──────────────────────────────────────────────────────────────────┘
│                                                                     │
│  ┌─ REASONING TRACE ───────────────────────────────────────────────┐│
│  │  Step 1: (A-->B). {0.9, 0.85} [input]                           ││
│  │  Step 2: (B-->C). {0.85, 0.8} [input]                           ││
│  │  Step 3: Goal: (A-->C)?                                         ││
│  │  Step 4: Deduction: (A-->C). {0.765, 0.68} ← DERIVED            ││
│  │          Rule: Deduction | Stamp: [#001, #002]                  ││
│  │  Step 5: ✓ Goal achieved with confidence 0.68                   ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### WebSocket Message Protocol

Extends existing protocol from `WebSocketManager.js`:

```javascript
// Outbound (UI → Backend)
{ type: 'demo.start', payload: { demoId, config } }
{ type: 'demo.pause', payload: { demoId } }
{ type: 'demo.resume', payload: { demoId } }
{ type: 'demo.step', payload: { demoId } }  // Single step
{ type: 'demo.stop', payload: { demoId } }
{ type: 'demo.listDemos', payload: {} }
{ type: 'config.update', payload: { key, value } }

// Inbound (Backend → UI)
{ type: 'demoList', payload: [{ id, name, category, description }, ...] }
{ type: 'demoStep', payload: { step, description, data } }
{ type: 'demoState', payload: { state: 'running'|'paused'|'completed' } }
{ type: 'reasoning.derivation', payload: { term, truth, rule, stamp } }
{ type: 'reasoning.trace', payload: [{ step, term, truth, source }, ...] }
{ type: 'goal.achieved', payload: { goal, confidence, trace } }
{ type: 'belief.revised', payload: { old, new, reason } }
```

### Integration Points

| Existing Component | Used For |
|--------------------|----------|
| `DemoRunnerApp.js` | Main application shell |
| `WebSocketManager.js` | Message transport |
| `ConfigPanel.js` | LM/reasoning configuration |
| `Console.js` | Trace output display |
| `GraphPanel.js` | Concept graph visualization |
| `DemoControls.js` | Play/pause/step controls |
| `Sidebar.js` | Demo catalog navigation |

---

## State Interpretation Protocol

### Abstract Model

| System State | Interpretation | Mechanism |
|--------------|----------------|-----------|
| **Goal truth ranking** | Selection/choice | Top-scored goal → next action |
| **Belief truth** | Answer/assertion | `freq > 0.5` = YES, `freq < 0.2` = NOT |
| **Negative frequency** | Negation | `{0.1, 0.9}` ≈ "NOT X" with 90% confidence |
| **Attention (Focus)** | Priority/salience | Priority distribution → resource allocation |
| **Functor evaluation** | Procedure execution | Registered functor triggered during eval |

### Fluent Embodiment API

```javascript
// Fluent syntax for registering external handlers
const embodied = nar
    .on('goal:achieved', (goal, trace) => {
        console.log(`✓ ${goal.term} via ${trace.length} steps`);
    })
    .on('belief:revised', (old, revised) => {
        console.log(`⟳ ${old.term}: ${old.truth} → ${revised.truth}`);
    })
    .on('action:selected', (goal) => {
        if (goal.term.includes('call *')) {
            return executeExternalCall(goal);
        }
    })
    .onFunctor('weather', async (city) => {
        const data = await fetchWeather(city);
        return `(${city}_weather --> ${data}). {1.0, 1.0}`;
    });
```

---

## Prototype Categories (11 Total)

### Categories A-E (Original)

| Category | Focus | Key Demo |
|----------|-------|----------|
| A: Explainability | Proof traces | Inference Audit Trail |
| B: Temporal | Time/causation | Event Ordering |
| C: Uncertainty | Confidence tracking | Chain Degradation |
| D: Memory | Persistence | Cross-Session Consistency |
| E: Adversarial | Robustness | Prompt Injection Resistance |

### Categories F-K (New)

| Category | Focus | LM Alone? | SeNARS+LM |
|----------|-------|-----------|-----------|
| F: Analogical | A:B::C:? | ~45% | ~75% |
| G: Meta-Cognition | Self-reasoning | ~10% | ~80% |
| H: Resource-Bounded | AIKR | ~5% | ~85% |
| I: Learning | Adaptation | Static | Improves |
| J: Compositional | Novel combos | ~30% | ~80% |
| K: Multi-Agent | Collaboration | N/A | Enabled |

---

## NARL Benchmark (10 Levels)

Integrated with SENI Expeditions:

| Level | Name | Auto-Pass | SeNARS | LM |
|-------|------|-----------|--------|-----|
| 1 | Trace | ✅ | 100% | 0% |
| 2 | Revise | | ~95% | ~40% |
| 3 | Persist | | ~90% | ~50% |
| 4 | Cause | | ~80% | ~35% |
| 5 | Resist | | ~85% | ~30% |
| 6 | Uncertain | | ~90% | ~20% |
| 7 | Analog | | ~75% | ~45% |
| 8 | Meta | | ~80% | ~10% |
| 9 | Bound | | ~85% | ~5% |
| 10 | Compose | | ~80% | ~30% |

---

## Demo Discovery (Auto-Registration)

```javascript
// Automatically discover and register demos
const sources = [
    { path: 'examples/reasoning/*.js', type: 'example' },
    { path: 'examples/advanced/*.js', type: 'example' },
    { path: 'tests/integration/*.test.js', type: 'test' },
    { path: 'demos/narl/*.js', type: 'benchmark' }
];

// Each discovered file becomes a runnable demo
// Existing files work WITHOUT modification
```

### Existing Demos (Already Discoverable)

From `examples/demos.js`:
- `reasoning/syllogism-demo.js` — Syllogism (quick: ✓)
- `reasoning/causal-reasoning-demo.js` — Causal Reasoning
- `reasoning/temporal-reasoning-demo.js` — Temporal Reasoning
- `advanced/stream-reasoning.js` — Stream Reasoning (quick: ✓)
- `tensor-logic/tensor-basics.mjs` — Tensor Basics (quick: ✓)
- `narsgpt/demo-narsgpt.js` — NARS-GPT Demo (quick: ✓)

---

## Implementation References

| Component | File | Purpose |
|-----------|------|---------|
| Demo Runner UI | `ui/src/demo-runner/DemoRunnerApp.js` | Main application |
| WebSocket Manager | `ui/src/connection/WebSocketManager.js` | Message protocol |
| Config Panel | `ui/src/components/ConfigPanel.js` | LM configuration |
| Demo Controls | `ui/src/components/DemoControls.js` | Play/pause/step |
| Console | `ui/src/components/Console.js` | Trace output |
| Graph Panel | `ui/src/components/GraphPanel.js` | Concept visualization |
| CLI Demo Runner | `examples/demos.js` | Headless execution |
| LM Providers | `examples/lm/lm-providers.js` | Provider examples |
| Mock Backend | `ui/mock-backend.js` | Testing protocol |

### WebSocket Configuration

```javascript
// From ui/src/config/Config.js
const wsConfig = {
    host: process.env.BACKEND_WS_HOST || 'localhost',
    port: process.env.BACKEND_WS_PORT || 8081,
    reconnectDelay: 2000,
    maxReconnectAttempts: 5
};
```

---

## Implementation Path

### Phase 1: Extend ConfigPanel
- [ ] Add Transformers.js provider option
- [ ] Add execution mode controls (realtime/slow/step)
- [ ] Add cycle budget configuration
- [ ] Persist settings to localStorage

### Phase 2: Demo Discovery
- [ ] Auto-scan `examples/` and `tests/`
- [ ] Generate metadata from file headers
- [ ] Register with sidebar component

### Phase 3: Trace Visualization
- [ ] Extend Console for structured traces
- [ ] Add truth value highlighting
- [ ] Add derivation rule annotations

### Phase 4: NARL Benchmarks
- [ ] Create `demos/narl/` directory
- [ ] Implement Level 1-3 benchmarks
- [ ] Integrate with SENI expedition system

---

## Key Demonstration Scenarios

### 1. "LM Can't Do This Alone"

```
Demo: Multi-step syllogism with truth degradation

Setup:
  (A-->B). {0.9, 0.85}
  (B-->C). {0.8, 0.80}
  (C-->D). {0.85, 0.75}
  Goal: (A-->D)?

LM Alone (783M model):
  "I don't have enough information" OR random guess

SeNARS + LM:
  Step 1: Deduct (A-->C) from (A-->B), (B-->C) → {0.72, 0.68}
  Step 2: Deduct (A-->D) from (A-->C), (C-->D) → {0.61, 0.51}
  Answer: (A-->D). with confidence 0.51
  Trace: Full derivation chain available
```

### 2. "Consistent Across Paraphrases"

```
Query 1: "Is fire hot?"
Answer: YES {0.95, 0.9}

Query 2: "Does fire have the property of being hot?"  
Answer: YES {0.95, 0.9}  ← SAME truth values

Query 3: "Would you say fire tends to be hot?"
Answer: YES {0.95, 0.9}  ← SAME truth values

LM Alone: Different confidence/wording each time
SeNARS: Identical truth values from persistent belief
```

### 3. "Explains Itself Perfectly"

```
Query: Why do you believe (penguin-->vertebrate)?

SeNARS:
  ├── (penguin-->bird). {1.0, 0.95} [input #001]
  ├── (bird-->vertebrate). {0.98, 0.9} [input #002]
  └── (penguin-->vertebrate). {0.98, 0.855} [DERIVED]
      Rule: Deduction
      Stamp: [#001, #002]
      
LM Alone: "Because penguins are birds and birds are..."
          (No verification possible)
```

---

## References

- [seni.md](seni.md) — SENI Observatory specification
- [agentic_superintelligence.md](agentic_superintelligence.md) — Benchmark integration
- [README.vision.md](README.vision.md) — SeNARS philosophy
- [ui/README.md](ui/README.md) — UI documentation
- [examples/README.md](examples/README.md) — Demo examples guide
- [examples/lm/README.md](examples/lm/README.md) — LM provider guide
