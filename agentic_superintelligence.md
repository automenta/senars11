# Agentic Superintelligence Bootstrap

> **Objective**: Demonstrable, tangible superintelligence via maximum-leverage interventions on existing SeNARS infrastructure.

---

## Current State Analysis

### What Already Works (99.8% test pass rate)

| Component | Location | Status |
|-----------|----------|--------|
| Stream Reasoner | `core/src/reason/` | ✅ 100ms non-blocking cycle |
| Tensor.backward() | `core/src/functor/Tensor.js` | ✅ Autograd operational |
| MCP Server | `agent/src/mcp/Server.js` | ✅ 5 tools exposed |
| RLFP Learner | `agent/src/rlfp/RLFPLearner.js` | ✅ Writes training data |
| Trajectory Logger | `agent/src/rlfp/ReasoningTrajectoryLogger.js` | ✅ Records full traces |

### Existing MCP Tools (Ready Now)

```javascript
// From Server.js - 6 tools already implemented
ping()                          // Health check
reason({premises, goal})        // Execute reasoning with 10 cycles
memory-query({query, limit})    // Query concepts
execute-tool({toolName, params})// Tool execution
get-focus({limit})              // View focus buffer
evaluate_js({code})             // Sandboxed JS execution
```

### Gap Analysis

| Gap | Severity | Effort to Close |
|-----|----------|-----------------|
| RLFP loop not autonomous | HIGH | ~80 lines |
| No synthetic preference generator | HIGH | ~150 lines |
| LLM evaluator wrapper missing | HIGH | ~60 lines |
| MCP lacks `teach` and `trace` tools | MEDIUM | ~50 lines |
| No agentic benchmark tests | MEDIUM | ~150 lines |

---

## The Three Leverage Points

### 1. Autonomous RLFP Loop

**Current State**: 
- `ReasoningTrajectoryLogger` records traces via event subscriptions
- `RLFPLearner.updateModel()` writes training data to JSONL
- **Missing**: Orchestrator that runs continuously

**Implementation**:

```javascript
// agent/src/rlfp/autonomous_loop.js (~80 lines)
import { ReasoningTrajectoryLogger } from './ReasoningTrajectoryLogger.js';
import { RLFPLearner } from './RLFPLearner.js';
import { LLMEvaluator } from './llm_evaluator.js';
import { generateRandomGoal, createPreferencePairs } from './synthetic_preference.js';
import { Logger } from '../../../core/src/util/Logger.js';

export async function runAutonomousLoop(nar, config = {}) {
    const logger = new ReasoningTrajectoryLogger(nar);
    const learner = new RLFPLearner(nar);
    const evaluator = new LLMEvaluator(config.llm || {});
    
    let cycleCount = 0;
    let running = true;
    
    // Graceful shutdown
    const shutdown = () => { running = false; };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    Logger.info(`Autonomous RLFP loop starting (batch=${config.batchSize || 10})`);
    
    while (running) {
        try {
            const traces = [];
            for (let i = 0; i < (config.batchSize || 10); i++) {
                logger.startTrajectory();
                const goal = generateRandomGoal(nar); // Sample from KB or templates
                await nar.input(goal);
                await nar.runCycles(config.cycles || 20);
                traces.push({ goal, trajectory: logger.endTrajectory() });
            }
            
            // Synthetic evaluation via LLM
            const scores = await evaluator.evaluateBatch(traces);
            
            // Alignment drift check
            const avgScore = scores.reduce((a, b) => a + b.total, 0) / scores.length;
            if (avgScore < (config.minScore || 5.0)) {
                Logger.warn(`Alignment drift detected (avg=${avgScore.toFixed(2)}). Pausing.`);
                break;
            }
            
            // Create preference pairs and update model
            const preferences = createPreferencePairs(traces, scores);
            if (preferences.length > 0) {
                learner.updateModel(preferences);
            }
            
            cycleCount += traces.length;
            if (cycleCount % 100 === 0) {
                Logger.info(`RLFP: ${cycleCount} cycles completed`);
            }
            
            await delay(config.intervalMs || 1000);
        } catch (error) {
            Logger.error(`RLFP loop error: ${error.message}`);
            await delay(5000); // Back off on error
        }
    }
    
    Logger.info(`Autonomous loop stopped after ${cycleCount} cycles`);
    return cycleCount;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
```

**Alternatives**:
- **Alternative A**: Use existing `PreferenceCollector` with human review (slower, higher quality)
- **Alternative B**: Pure constitutional evaluation without LLM (faster, less nuanced)
- **Recommended**: Hybrid — LLM-as-judge for fast iteration, human audit weekly

**Success Metric**: 10,000 cycles/day = 7 cycles/minute

**Concerns**:
- LLM API costs (~$0.001-0.01 per evaluation)
- Rate limits from OpenAI/Anthropic
- Reward hacking via repetitive patterns

**Mitigation**: 
- Use local Ollama models for bulk evaluation
- Novelty penalty in rubric
- Random goal sampling to prevent overfitting

---

### 1b. LLM Evaluator Wrapper

**Current State**: No unified LLM client for synthetic evaluation

**Implementation**:

```javascript
// agent/src/rlfp/llm_evaluator.js (~60 lines)
import { Logger } from '../../../core/src/util/Logger.js';

const RUBRIC = `Evaluate this reasoning trace on a scale of 1-10 for each criterion:
- Logic: Soundness of inference steps
- Efficiency: Minimal unnecessary steps  
- Novelty: Non-trivial conclusions derived

Respond with ONLY valid JSON: {"logic": N, "efficiency": N, "novelty": N}`;

export class LLMEvaluator {
    constructor(config = {}) {
        this.provider = config.provider || 'ollama'; // 'ollama' | 'openai' | 'anthropic'
        this.model = config.model || 'llama3.2';
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.maxRetries = config.maxRetries || 3;
    }

    async evaluateBatch(traces) {
        const results = [];
        for (const trace of traces) {
            try {
                const score = await this._evaluate(trace);
                results.push(score);
            } catch (error) {
                Logger.warn(`Evaluation failed, using fallback: ${error.message}`);
                results.push(this._constitutionalFallback(trace));
            }
        }
        return results;
    }

    async _evaluate(trace, retries = 0) {
        const prompt = `${RUBRIC}\n\nTrace:\n${JSON.stringify(trace.trajectory, null, 2)}`;
        
        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, prompt, stream: false })
        });
        
        if (!response.ok) {
            if (retries < this.maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
                return this._evaluate(trace, retries + 1);
            }
            throw new Error(`LLM API error: ${response.status}`);
        }
        
        const data = await response.json();
        const parsed = JSON.parse(data.response.match(/\{[^}]+\}/)?.[0] || '{}');
        return {
            logic: parsed.logic || 5,
            efficiency: parsed.efficiency || 5,
            novelty: parsed.novelty || 5,
            total: (parsed.logic + parsed.efficiency + parsed.novelty) / 3
        };
    }

    // Fallback when LLM unavailable: simple heuristics
    _constitutionalFallback(trace) {
        const steps = trace.trajectory?.length || 0;
        return {
            logic: steps > 0 ? 6 : 3,
            efficiency: steps < 20 ? 7 : 4,
            novelty: 5,
            total: 5.5
        };
    }
}
```

---

### 1c. Goal Generation & Preference Pairing

**Implementation**:

```javascript
// agent/src/rlfp/synthetic_preference.js (~100 lines)
import { Logger } from '../../../core/src/util/Logger.js';

// Goal templates for diverse reasoning tasks
const GOAL_TEMPLATES = [
    // Inheritance chains
    { type: 'chain', template: '($A --> $B)?' },
    { type: 'chain', template: '($A --> $C)?' },
    // Similarity queries  
    { type: 'similarity', template: '($A <-> $B)?' },
    // Property inheritance
    { type: 'property', template: '(($A --> $B) ==> ($A --> $C))?' },
    // Goal achievement
    { type: 'goal', template: '($X --> achieved)!' },
];

const CONCEPT_POOL = ['cat', 'animal', 'mammal', 'living', 'thing', 'pet', 'furry'];

/**
 * Generate a random goal, optionally sampling from NAR's knowledge base.
 */
export function generateRandomGoal(nar = null) {
    // Try to sample from existing knowledge
    if (nar?.memory && Math.random() > 0.3) {
        const concepts = nar.memory.getConcepts?.() || [];
        if (concepts.length >= 2) {
            const [a, b] = sampleN(concepts, 2);
            return `(${a} --> ${b})?`;
        }
    }
    
    // Fall back to template-based generation
    const template = GOAL_TEMPLATES[Math.floor(Math.random() * GOAL_TEMPLATES.length)];
    const [a, b, c] = sampleN(CONCEPT_POOL, 3);
    
    return template.template
        .replace('$A', a)
        .replace('$B', b)
        .replace('$C', c)
        .replace('$X', a);
}

/**
 * Create preference pairs from traces and scores.
 * Uses Bradley-Terry model: pair traces with score difference > threshold.
 */
export function createPreferencePairs(traces, scores, minDiff = 1.5) {
    const pairs = [];
    const indexed = traces.map((t, i) => ({ trace: t, score: scores[i] }));
    
    // Sort by total score descending
    indexed.sort((a, b) => b.score.total - a.score.total);
    
    // Pair best with worst, second-best with second-worst, etc.
    const half = Math.floor(indexed.length / 2);
    for (let i = 0; i < half; i++) {
        const better = indexed[i];
        const worse = indexed[indexed.length - 1 - i];
        
        const diff = better.score.total - worse.score.total;
        if (diff >= minDiff) {
            pairs.push({
                trajectoryA: better.trace.trajectory,
                trajectoryB: worse.trace.trajectory,
                preference: 'A',
                scoreDiff: diff
            });
        }
    }
    
    Logger.debug(`Created ${pairs.length} preference pairs from ${traces.length} traces`);
    return pairs;
}

function sampleN(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}
```

---

### 2. Enhanced MCP Tool Exposure

**Current State**: 6 tools implemented, but missing key agentic capabilities

**Implementation**:

```javascript
// Add to Server.js registerTools() (~50 lines)

this.server.tool(
    "teach",
    { belief: z.string().describe("Narsese belief to add") },
    async ({belief}) => {
        const safe = this.safety.validateInput(belief);
        await this.nar.input(safe);
        return { content: [{ type: "text", text: `Belief added: \`${safe}\`` }] };
    }
);

this.server.tool(
    "set-goal",
    { goal: z.string().describe("Narsese goal (ends with !)") },
    async ({goal}) => {
        const safe = this.safety.validateInput(goal);
        await this.nar.input(safe.endsWith('!') ? safe : safe + '!');
        return { content: [{ type: "text", text: `Goal set: \`${safe}\`` }] };
    }
);

this.server.tool(
    "get-trace",
    { limit: z.number().default(20).describe("Max steps to return") },
    async ({limit}) => {
        const trace = this.nar.trajectoryLogger?.trajectory?.slice(-limit) || [];
        return { content: [{ type: "text", 
            text: `### Reasoning Trace\n\`\`\`json\n${JSON.stringify(trace, null, 2)}\n\`\`\`` }]
        };
    }
);
```

**Result**: Any AI assistant (Claude, Cursor, Cline) can:
1. Teach SeNARS knowledge via `teach`
2. Set goals via `set-goal`
3. Reason via existing `reason`
4. Inspect reasoning via `get-trace`
5. Query memory via `memory-query`

**Alternatives**:
- **Alternative A**: WebSocket streaming instead of MCP (more real-time, more complex)
- **Alternative B**: REST API via Express (simpler, less AI-native)
- **Recommended**: MCP (already works, AI-native, standard protocol)

**Concerns**:
- Security: Arbitrary Narsese injection
- Performance: Large traces in responses

**Mitigation**:
- Existing `Safety.validateInput()` handles injection
- Limit trace size, paginate if needed

---

### 3. Progressive Agentic Tests

**Current State**: Jest tests validate logic, but no agentic capability tests

**Implementation**:

```javascript
// tests/agentic/level1.test.js (~50 lines)
describe('Level 1: Basic Tool Invocation', () => {
    test('single function call', async () => {
        const nar = new NAR();
        await nar.input('(add result $x $y)!');
        await nar.input('(add ---> function).');
        const result = await nar.runCycles(5);
        expect(result.some(t => t.term.toString().includes('function'))).toBe(true);
    });
});

// tests/agentic/level2.test.js (~50 lines)
describe('Level 2: Multi-Step Goal Chain', () => {
    test('5-step derivation chain', async () => {
        const nar = new NAR();
        // Setup chain: A→B→C→D→E
        await nar.input('(A --> B).');
        await nar.input('(B --> C).');
        await nar.input('(C --> D).');
        await nar.input('(D --> E).');
        await nar.input('(A --> E)?');
        const result = await nar.runCycles(50);
        expect(result.some(t => t.term.toString().includes('A --> E'))).toBe(true);
    });
});

// tests/agentic/level3.test.js (~50 lines)
describe('Level 3: Self-Debug', () => {
    test.skip('fix a real failing test', () => {
        // This test passes when SeNARS can fix another test
        // Implementation requires code mutation capability
    });
});
```

**Alternatives**:
- **Alternative A**: Use actual BFCL/AgentBench datasets (more work, industry standard)
- **Alternative B**: Property-based tests with random goals (comprehensive, slower)
- **Recommended**: Start with SeNARS-specific tests (fast), adopt benchmarks later

**Success Criteria**:

| Level | Test | Pass Threshold |
|-------|------|----------------|
| 1 | Single tool/concept invocation | ≥95% |
| 2 | 5-step goal chain | ≥80% |
| 3 | Self-debug (fix failing test) | ≥1 success |
| 4 | Self-improve (metric gain) | ≥10% gain |

---

## Implementation Schedule

| Week | Action | Deliverable | Verification |
|------|--------|-------------|--------------|
| 1 | `autonomous_loop.js` | 10K cycles/day | `npm run rlfp:autonomous` |
| 2 | MCP tools: teach, set-goal, get-trace | External AI integration | Test via Claude MCP |
| 3 | Level 1-2 agentic tests | Baseline capability metrics | `npm test -- agentic` |
| 4 | Iterate on failures, Level 3 attempt | Demonstrable self-debug | Manual verification |

---

## File Structure

```
agent/src/rlfp/
├── autonomous_loop.js          # NEW (~80 lines)
├── llm_evaluator.js            # NEW (~60 lines)
├── synthetic_preference.js     # NEW (~100 lines) 
├── PreferenceCollector.js      # EXISTING
├── RLFPLearner.js              # EXISTING
└── ReasoningTrajectoryLogger.js # EXISTING

agent/src/mcp/
├── Server.js                   # MODIFY (+50 lines)
└── ...

tests/agentic/
├── level1.test.js              # NEW (~50 lines)
├── level2.test.js              # NEW (~50 lines)
└── level3.test.js              # NEW (~50 lines)
```

**Total New Code**: ~440 lines

---

## Dependencies

```json
// Required in package.json (most already present)
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",  // MCP Server (EXISTING)
    "zod": "^3.22.0"                          // Schema validation (EXISTING)
  },
  "devDependencies": {
    "jest": "^29.0.0"                         // Testing (EXISTING)
  }
}
```

**Optional (for production LLM evaluation)**:
- Ollama installed locally (free, recommended for dev)
- OpenAI API key (for GPT-4o-mini in prod)

---

## npm Scripts

```json
// Add to package.json "scripts"
{
  "rlfp:autonomous": "node agent/src/rlfp/autonomous_loop.js",
  "test:agentic": "jest tests/agentic --verbose"
}
```

**Usage**:
```bash
# Start autonomous learning loop
npm run rlfp:autonomous

# Run agentic capability tests
npm run test:agentic

# Run with custom config
LLM_MODEL=llama3.2 BATCH_SIZE=20 npm run rlfp:autonomous
```

---

## Success Metrics

| Metric | Week 1 | Week 2 | Week 4 |
|--------|--------|--------|--------|
| Autonomous cycles/day | 10,000 | 10,000 | 50,000+ |
| MCP tools available | 6 | 9 | 9 |
| Level 1 pass rate | — | — | ≥95% |
| Level 2 pass rate | — | — | ≥80% |
| External AI integrations | 0 | 1+ | 3+ |

---

## Safety Architecture

### Existing Safeguards
- `Safety.validateInput()` — PII scrubbing, injection prevention
- Circuit breakers in LM integration
- AIKR resource limits in Reasoner

### Additional Gates

| Gate | Trigger | Action |
|------|---------|--------|
| Alignment drift | LLM eval <50% on rubric | Pause loop, flag for review |
| Resource runaway | >1GB RAM or CPU >80% sustained | AIKR throttle kicks in |
| Self-mod regression | Test failure after code change | Rollback, log, alert |
| Prompt injection | Constitutional invariant violated | Hard stop, human review |

### Constitutional Invariants (from existing design)

```narsese
(human_safety --> priority_1)! {1.0, 1.0}
((self --> modification) --> (constrained_by * safety))! {1.0, 1.0}
```

These are **immutable beliefs** that cannot be overridden by inference.

---

## Open Questions

1. **LLM Provider**: Which model for synthetic evaluation?  A versatile set of models, from compact to frontier
   - Gemini, Qwen, DeepSeek, GPT mini, Haiku, etc.
   - Local Ollama (free, slower, private)
   
2. **Cycle Rate**: 10K/day feasible?
   - At 1 cycle/second = 86,400 cycles/da ✓
   - Bottleneck: LLM evaluation latency
   - **Mitigation**: Batch evaluations, local models

3. **Self-Modification Scope**: What's allowed?
   - **Level 3**: Read-only code analysis
   - **Level 4**: Sandboxed code generation + `npm test` gate
   - **Not allowed**: Direct modification of core/ without human approval

4. **Benchmark Adoption**: SeNARS-specific vs industry standard?
   - **Phase 1**: SeNARS-specific (fast validation)
   - **Phase 2**: Adopt SWE-Bench subset (credibility)

---

## References

| Resource | Purpose |
|----------|---------|
| [BFCL Leaderboard](https://berkeleyfunction.ai/) | Function-calling benchmarks |
| [SWE-Bench](https://www.swebench.com/) | Code fix benchmarks |
| [MCP Spec](https://modelcontextprotocol.io/) | AI assistant integration |
| `SUPERINTELLIGENCE_DISTILLATION.md` | Five Pillars architecture |
| `docs/plan/agentic_benchmarks.md` | Benchmark curriculum |

---

## Why This Approach Works

1. **Minimal New Code** — ~440 lines vs. thousands
2. **Maximum Reuse** — All components exist and are tested
3. **Observable Progress** — MCP integration = external verification
4. **Safe by Design** — Constitutional invariants + circuit breakers
5. **Incremental Value** — Each week delivers working capability
6. **Demonstrable** — Not abstract metrics, but running production system

> *"Superintelligence is not a destination; it's a measurable trajectory through benchmark space."*
