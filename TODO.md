# SeNARS Development Plan

> **Semantic Non-Axiomatic Reasoning System**  
> **Status**: Phase 6 Complete | NAL-1 to NAL-6 + NAL-8 | 99.8% Test Pass Rate  
> **Updated**: 2025-12-16

---

## Principles

| Principle | Implication |
|-----------|-------------|
| **NAL First** | LM augments, not replaces formal semantics |
| **Declarative** | Logic defined by patterns, not imperative code |
| **Compiled** | Patterns compiled to optimized decision trees |
| **Composable** | Standard interfaces, plug-and-play |
| **Observable** | Emit events, bounded retention |
| **Resource-Aware** | Budgets, timeouts, graceful degradation |
| **Leverage Existing** | Build on existing code, don't rewrite |
| **Tensor-Native** | Neural operations as first-class terms |

---

## Quick Reference

| I want to... | Command / Location |
|--------------|-------------------|
| Run reasoning | `const nar = new NAR(); nar.input('(a --> b).');` |
| Start REPL | `node repl/src/Repl.js` |
| Run demos | `node agent/src/demo/demoRunner.js` |
| Start MCP server | `node agent/src/mcp/start-server.js` |
| Run all tests | `npm test` |

---

## Phase Roadmap

```
Phase 4: Core Observability ─► Phase 5: Prolog Enhancements ─► Phase 6: Tensor Logic
   (Tracing, Serialization)      (Functor, Builtins, Is)         (Autograd, Ops)
                                                                       │
                                                                       ▼
                                                                Phase 6.5: TL Complete
                                                                ├─ Tier 1: Einsum, Attention
                                                                ├─ Tier 2: DataLoader, LRScheduler
                                                                └─ Tier 3: Symbolic, ONNX Export
                                                                       │
                                                                       ▼
                                                                Phase 7: RLFP
                                                                (leverages Tensors)
                                                                       │
                                                                       ▼
                                                                Phase 8: Interactive
                                                                (Demo Runner, Playground)
                                                                       │
                                                                       ▼
                                                                Phase 9: Scale ─► Phase 10: Temporal
```

---

## Foundation Status

### Complete Systems

| System | Location | README | Status |
|--------|----------|--------|--------|
| **Core NAR** | `core/src/nar/NAR.js` | — | ✅ |
| **Unifier** | `core/src/term/Unifier.js` | — | ✅ |
| **RuleCompiler** | `core/src/reason/rules/compiler/` | — | ✅ |
| **All 10 Strategies** | `core/src/reason/strategy/` | [README](file:///home/me/senars10/core/src/reason/strategy/README.md) | ✅ |
| **EmbeddingLayer** | `core/src/lm/EmbeddingLayer.js` | — | ✅ |
| **MCP Server** | `agent/src/mcp/` | [README](file:///home/me/senars10/agent/src/mcp/README.md) | ✅ |
| **Demo System** | `agent/src/demo/` | [README](file:///home/me/senars10/agent/src/demo/README.md) | ✅ |
| **RLFP Framework** | `agent/src/rlfp/` | [README](file:///home/me/senars10/agent/src/rlfp/README.md) | Skeleton |
| **Knowledge System** | `agent/src/know/` | [README](file:///home/me/senars10/agent/src/know/README.md) | ✅ |
| **WebSocket API** | `agent/src/server/` | — | ✅ |
| **REPL** | `repl/src/` | — | ✅ |
| **Serialization** | NAR, Memory, Task, Term, Bag, Concept | — | ✅ |
| **Events** | `IntrospectionEvents.js` | — | ✅ |

### NAL Completion

| Level | Status |
|-------|--------|
| NAL-1 to NAL-6 | ✅ |
| NAL-7 (Temporal) | Deferred → Phase 9 |
| NAL-8 (Goals) | ✅ |

### Test Coverage: 105 files, 99.8% pass

---

## Phase 4: Core Observability & Data Infrastructure

> **Goal**: Establish the foundational infrastructure for all future phases  
> **Effort**: ~1-2 days  
> **Unlocks**: Debugging, RLFP, Playground, API, Export/Import, Visualization

### Design Principles

1. **Event-Driven**: All observability via existing `IntrospectionEvents`
2. **Immutable Data**: Traces are append-only, exportable snapshots
3. **Pluggable Formats**: JSON, Mermaid, DOT, HTML, custom
4. **Zero Overhead When Disabled**: No tracing cost unless active
5. **Composable**: Each component usable independently

---

### 4.1 DerivationTracer — Universal Observability Layer

**File**: `core/src/util/DerivationTracer.js`  
**Effort**: 4 hours  
**Dependencies**: `TraceId.js`, `IntrospectionEvents`, `EventBus`

#### Interface

```javascript
/**
 * DerivationTracer - Captures and analyzes reasoning traces
 * 
 * Design: Subscribes to EventBus, records steps immutably, exports on demand.
 * Thread-safe: Each trace has independent state.
 * Memory-bounded: configurable step limit with LRU eviction.
 */
class DerivationTracer {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = {
            maxSteps: options.maxSteps ?? 10000,
            autoStart: options.autoStart ?? false,
            recordSkips: options.recordSkips ?? true,
            ...options
        };
        this.traces = new Map();      // traceId → Trace
        this.activeTrace = null;
        this._subscribed = false;
    }

    // === Lifecycle ===
    
    startTrace(initialTask = null) → string {
        const traceId = TraceId.generate();
        this.traces.set(traceId, {
            id: traceId,
            task: initialTask?.serialize?.() ?? null,
            startTime: Date.now(),
            endTime: null,
            steps: [],
            skips: [],
            derivations: [],
            metadata: {}
        });
        this.activeTrace = traceId;
        this._ensureSubscribed();
        return traceId;
    }

    endTrace(traceId = this.activeTrace) → Trace {
        const trace = this.traces.get(traceId);
        if (!trace) throw new Error(`Trace ${traceId} not found`);
        trace.endTime = Date.now();
        trace.metrics = this._computeMetrics(trace);
        if (traceId === this.activeTrace) this.activeTrace = null;
        return trace;
    }

    // === Recording (via EventBus) ===
    
    _ensureSubscribed() {
        if (this._subscribed) return;
        this.eventBus.on(IntrospectionEvents.RULE_FIRED, this._onRuleFired.bind(this));
        this.eventBus.on(IntrospectionEvents.RULE_NOT_FIRED, this._onRuleSkipped.bind(this));
        this.eventBus.on(IntrospectionEvents.REASONING_DERIVATION, this._onDerivation.bind(this));
        this._subscribed = true;
    }

    _onRuleFired(event) {
        if (!this.activeTrace) return;
        const trace = this.traces.get(this.activeTrace);
        trace.steps.push({
            timestamp: Date.now(),
            rule: event.ruleName,
            premises: event.premises?.map(p => p.serialize?.() ?? p),
            conclusion: event.conclusion?.serialize?.() ?? event.conclusion,
            truth: event.truth ?? null,
            depth: event.depth ?? 0
        });
    }

    _onRuleSkipped(event) {
        if (!this.activeTrace || !this.options.recordSkips) return;
        const trace = this.traces.get(this.activeTrace);
        trace.skips.push({
            timestamp: Date.now(),
            rule: event.ruleName,
            reason: event.reason ?? 'precondition failed'
        });
    }

    _onDerivation(event) {
        if (!this.activeTrace) return;
        const trace = this.traces.get(this.activeTrace);
        trace.derivations.push(event.task?.serialize?.() ?? event);
    }

    // === Query ===
    
    getTrace(traceId) → Trace | null;
    getActiveTrace() → Trace | null;
    list() → string[];  // All trace IDs

    // === Analysis ===
    
    findPath(traceId, fromTerm, toTerm) → Step[] {
        // BFS through steps to find derivation path
    }

    whyNot(traceId, term) → Skip[] {
        // Find skips that could have produced term
    }

    hotRules(traceId) → Map<string, number> {
        // Rule → fire count
    }

    // === Export ===
    
    export(traceId, format: 'json' | 'mermaid' | 'dot' | 'html') → string {
        const trace = this.traces.get(traceId);
        switch (format) {
            case 'json': return JSON.stringify(trace, null, 2);
            case 'mermaid': return this._toMermaid(trace);
            case 'dot': return this._toDot(trace);
            case 'html': return this._toHTML(trace);
        }
    }

    _toMermaid(trace) → string {
        let md = 'graph TD\n';
        trace.steps.forEach((step, i) => {
            const from = step.premises.map(p => p.term || p).join(' + ');
            const to = step.conclusion?.term || step.conclusion;
            md += `  P${i}["${from}"] -->|${step.rule}| C${i}["${to}"]\n`;
        });
        return md;
    }

    // === Persistence ===
    
    save(traceId, path) → Promise<void>;
    load(path) → Promise<Trace>;
    
    // === Metrics ===
    
    _computeMetrics(trace) → TraceMetrics {
        return {
            totalSteps: trace.steps.length,
            totalSkips: trace.skips.length,
            totalDerivations: trace.derivations.length,
            uniqueRules: new Set(trace.steps.map(s => s.rule)).size,
            maxDepth: Math.max(...trace.steps.map(s => s.depth), 0),
            duration: trace.endTime - trace.startTime,
            derivationsPerSecond: trace.derivations.length / ((trace.endTime - trace.startTime) / 1000)
        };
    }
}
```

#### Trace Data Structure

```javascript
interface Trace {
    id: string;
    task: SerializedTask | null;
    startTime: number;
    endTime: number | null;
    steps: Step[];
    skips: Skip[];
    derivations: SerializedTask[];
    metadata: Record<string, any>;
    metrics?: TraceMetrics;
}

interface Step {
    timestamp: number;
    rule: string;
    premises: SerializedTask[];
    conclusion: SerializedTask;
    truth: { frequency: number, confidence: number } | null;
    depth: number;
}

interface Skip {
    timestamp: number;
    rule: string;
    reason: string;
}

interface TraceMetrics {
    totalSteps: number;
    totalSkips: number;
    totalDerivations: number;
    uniqueRules: number;
    maxDepth: number;
    duration: number;
    derivationsPerSecond: number;
}
```

#### Test Cases

```javascript
describe('DerivationTracer', () => {
    test('captures rule firings', async () => {
        const tracer = new DerivationTracer(nar.eventBus);
        const traceId = tracer.startTrace();
        await nar.input('(a --> b).');
        await nar.input('(b --> c).');
        await nar.runCycles(5);
        const trace = tracer.endTrace();
        expect(trace.steps.length).toBeGreaterThan(0);
        expect(trace.metrics.uniqueRules).toBeGreaterThan(0);
    });

    test('exports mermaid format', () => {
        const mermaid = tracer.export(traceId, 'mermaid');
        expect(mermaid).toContain('graph TD');
    });

    test('findPath traces derivation chain', () => {
        const path = tracer.findPath(traceId, 'a', 'c');
        expect(path.length).toBe(2); // a→b, b→c
    });
});
```

---

### 4.2 Serializer — Unified Data Exchange

**File**: `core/src/util/Serializer.js`  
**Effort**: 2 hours  
**Dependencies**: Existing `serialize()` methods, `TermFactory`

#### Interface

```javascript
/**
 * Serializer - Unified data exchange facade
 * 
 * Design: Thin wrapper over existing serialize() methods.
 * Supports JSON, Narsese, and auto-detection.
 * Versioned state for future migrations.
 */
class Serializer {
    static VERSION = '1.0.0';

    // === Core Serialization ===
    
    static toJSON(entity, options = {}) → object {
        if (entity.serialize) return entity.serialize();
        if (entity instanceof Term) return TermSerializer.toJSON(entity);
        throw new Error(`Cannot serialize ${entity.constructor.name}`);
    }

    static fromJSON(json, type: 'task' | 'term' | 'memory' | 'nar' | 'trace') → Entity {
        switch (type) {
            case 'task': return Task.deserialize(json);
            case 'term': return TermFactory.fromJSON(json);
            case 'memory': return Memory.deserialize(json);
            case 'nar': return NAR.deserialize(json);
            case 'trace': return json; // Already structured
        }
    }

    // === Narsese ===
    
    static toNarsese(entity) → string {
        if (entity instanceof Task) return entity.toNarsese();
        if (entity instanceof Term) return TermSerializer.toString(entity);
        throw new Error(`Cannot convert ${entity.constructor.name} to Narsese`);
    }

    static fromNarsese(str) → Term | Task {
        return parse(str); // Uses existing parser
    }

    // === Detection ===
    
    static detect(input) → 'json' | 'narsese' | 'object' {
        if (typeof input === 'string') {
            try { JSON.parse(input); return 'json'; } catch {}
            return 'narsese';
        }
        return 'object';
    }

    static parse(input, defaultType = 'task') → Entity {
        const format = this.detect(input);
        switch (format) {
            case 'json': return this.fromJSON(JSON.parse(input), defaultType);
            case 'narsese': return this.fromNarsese(input);
            case 'object': return input;
        }
    }

    // === State Management ===
    
    static exportState(nar) → NARState {
        return {
            version: this.VERSION,
            timestamp: Date.now(),
            nar: {
                memory: nar.memory.serialize(),
                taskManager: nar.taskManager.serialize(),
                focus: nar.focus.serialize(),
                config: nar.config.toJSON()
            }
        };
    }

    static importState(nar, state) → void {
        state = this.migrate(state, this.VERSION);
        nar.memory = Memory.deserialize(state.nar.memory);
        nar.taskManager = TaskManager.deserialize(state.nar.taskManager);
        nar.focus = Focus.deserialize(state.nar.focus);
    }

    // === Versioning ===
    
    static migrate(state, toVersion) → NARState {
        // Future: handle version migrations
        return state;
    }
}
```

---

### 4.3 LMConfig — Provider Management

**File**: `core/src/lm/LMConfig.js`  
**Effort**: 2 hours  
**Dependencies**: Existing provider patterns from `examples/lm-providers.js`

#### Interface

```javascript
/**
 * LMConfig - Language Model provider configuration
 * 
 * Design: Singleton-ish config manager with persistence.
 * Supports multiple providers, easy switching, validation.
 */
class LMConfig {
    static PROVIDERS = Object.freeze({
        TRANSFORMERS: 'transformers',
        OLLAMA: 'ollama',
        OPENAI: 'openai',
        HUGGINGFACE: 'huggingface',
        DUMMY: 'dummy'
    });

    constructor(options = {}) {
        this.configs = new Map();
        this.active = null;
        this.persistPath = options.persistPath ?? '.senars-lm-config.json';
        
        // Default: Transformers.js (no API key needed)
        this.setProvider(LMConfig.PROVIDERS.TRANSFORMERS, {
            model: 'Xenova/all-MiniLM-L6-v2'
        });
    }

    // === Configuration ===
    
    setProvider(name, config) → void {
        this.configs.set(name, { name, ...config, enabled: true });
    }

    getProvider(name) → ProviderConfig | null {
        return this.configs.get(name) ?? null;
    }

    setActive(name) → void {
        if (!this.configs.has(name)) throw new Error(`Provider ${name} not configured`);
        this.active = name;
    }

    getActive() → ProviderConfig {
        return this.configs.get(this.active);
    }

    // === Validation ===
    
    async test(name = this.active) → Promise<{ success: boolean, message: string }> {
        const config = this.getProvider(name);
        // Attempt minimal operation with provider
        try {
            const provider = this._createProvider(config);
            await provider.embed('test');
            return { success: true, message: 'Connection successful' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // === Persistence ===
    
    save(path = this.persistPath) → void {
        const data = {
            active: this.active,
            providers: Object.fromEntries(this.configs)
        };
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    }

    load(path = this.persistPath) → void {
        if (!fs.existsSync(path)) return;
        const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
        this.active = data.active;
        this.configs = new Map(Object.entries(data.providers));
    }

    // === Factory ===
    
    createActiveProvider() → LMProvider {
        return this._createProvider(this.getActive());
    }
}
```

---

### Phase 4 Summary

| Component | File | Effort | Unlocks |
|-----------|------|--------|---------|
| DerivationTracer | `core/src/util/DerivationTracer.js` | 4 hrs | Debugging, RLFP, Viz |
| Serializer | `core/src/util/Serializer.js` | 2 hrs | API, Import/Export |
| LMConfig | `core/src/lm/LMConfig.js` | 2 hrs | Provider switching |
| **Total** | | **~8 hrs** | |
---

## Phase 5: Prolog Enhancements — Refactor & Extend

> **Goal**: Extract and extend existing PrologStrategy builtins into modular Functor system  
> **Effort**: ~2 days (refactor, not greenfield)  
> **Unlocks**: Custom functors, extensible builtins, Phase 6 Tensor Logic

### Existing Code to Leverage

**PrologStrategy.js already has**:
- `_isBuiltIn()` — Checks for `is`, `>`, `<`, `>=`, `<=`, `=`, `\=` (line 99-102)
- `_solveBuiltIn()` — Handles `is` operator and comparisons (line 113-173)
- `_evalExpression()` — Evaluates `+`, `-`, `*`, `/` (line 176-202)

**Strategy**: Extract → Generalize → Extend (not rebuild)

### Why Before Tensor Logic?

Phase 6 (Tensor Logic) requires:
- **Functor interface** — TensorFunctor extends this base
- **`is` operator** — Tensor expressions use `Out is matmul(A, B)`
- **Registry pattern** — Plugin system for custom evaluators
- **Extended operations** — sqrt, pow, sin, cos, etc.

### Design Principles

1. **Refactor First**: Extract existing code into Functor classes
2. **Backward Compatible**: PrologStrategy continues to work unchanged
3. **Extensible**: Registry pattern for runtime functor registration
4. **Minimal Disruption**: Keep existing tests passing
5. **Trace Integration**: All operations emit introspection events

---

### 5.1 Functor Base Class

**File**: `core/src/functor/Functor.js`  
**Effort**: 4 hours

```javascript
/**
 * Functor - Abstract base for custom Prolog-like evaluators
 * 
 * Subclasses implement evaluate() to handle specific term operators.
 * Used by PrologStrategy to extend evaluation capabilities.
 */
class Functor {
    constructor(options = {}) {
        this.name = options.name ?? this.constructor.name;
        this.operators = new Set();  // Operators this functor handles
    }

    // === Abstract ===
    
    /**
     * Evaluate a term with given bindings
     * @param {Term} term - The term to evaluate
     * @param {Map} bindings - Variable bindings
     * @returns {*} - Result value or new Term
     */
    evaluate(term, bindings) {
        throw new Error('Subclass must implement evaluate()');
    }

    /**
     * Check if this functor can handle the term
     */
    canEvaluate(term) {
        return this.operators.has(term.operator ?? term.name);
    }

    // === Utilities ===
    
    resolve(term, bindings) {
        if (!term) return term;
        if (term.isVariable && bindings.has(term.name)) {
            return this.resolve(bindings.get(term.name), bindings);
        }
        return term;
    }

    resolveAll(terms, bindings) {
        return terms.map(t => this.resolve(t, bindings));
    }

    // === Registration ===
    
    register(operator) {
        this.operators.add(operator);
        return this;
    }

    registerAll(operators) {
        operators.forEach(op => this.operators.add(op));
        return this;
    }
}
```

---

### 5.2 ArithmeticFunctor — Math Operations

**File**: `core/src/functor/ArithmeticFunctor.js`  
**Effort**: 3 hours

```javascript
class ArithmeticFunctor extends Functor {
    constructor() {
        super({ name: 'Arithmetic' });
        this.registerAll([
            'add', 'sub', 'mul', 'div', 'mod',
            'abs', 'neg', 'sqrt', 'pow', 'exp', 'log',
            'sin', 'cos', 'tan', 'floor', 'ceil', 'round',
            'min', 'max', 'random'
        ]);
    }

    evaluate(term, bindings) {
        const op = term.operator ?? term.name;
        const args = this.resolveAll(term.components ?? [], bindings);
        
        switch (op) {
            // Binary
            case 'add': return this.toNumber(args[0]) + this.toNumber(args[1]);
            case 'sub': return this.toNumber(args[0]) - this.toNumber(args[1]);
            case 'mul': return this.toNumber(args[0]) * this.toNumber(args[1]);
            case 'div': return this.toNumber(args[0]) / this.toNumber(args[1]);
            case 'mod': return this.toNumber(args[0]) % this.toNumber(args[1]);
            case 'pow': return Math.pow(this.toNumber(args[0]), this.toNumber(args[1]));
            case 'min': return Math.min(...args.map(a => this.toNumber(a)));
            case 'max': return Math.max(...args.map(a => this.toNumber(a)));
            
            // Unary
            case 'abs': return Math.abs(this.toNumber(args[0]));
            case 'neg': return -this.toNumber(args[0]);
            case 'sqrt': return Math.sqrt(this.toNumber(args[0]));
            case 'exp': return Math.exp(this.toNumber(args[0]));
            case 'log': return Math.log(this.toNumber(args[0]));
            case 'sin': return Math.sin(this.toNumber(args[0]));
            case 'cos': return Math.cos(this.toNumber(args[0]));
            case 'floor': return Math.floor(this.toNumber(args[0]));
            case 'ceil': return Math.ceil(this.toNumber(args[0]));
            case 'round': return Math.round(this.toNumber(args[0]));
            
            // Zero-ary
            case 'random': return Math.random();
            
            default:
                throw new Error(`Unknown arithmetic op: ${op}`);
        }
    }

    toNumber(val) {
        if (typeof val === 'number') return val;
        if (val?.value !== undefined) return val.value;
        throw new Error(`Cannot convert ${val} to number`);
    }
}
```

---

### 5.3 ComparisonFunctor — Relational Operations

**File**: `core/src/functor/ComparisonFunctor.js`  
**Effort**: 2 hours

```javascript
class ComparisonFunctor extends Functor {
    constructor() {
        super({ name: 'Comparison' });
        this.registerAll([
            'eq', 'neq', 'lt', 'lte', 'gt', 'gte',
            '=:=', '=\\=', '<', '=<', '>', '>='
        ]);
    }

    evaluate(term, bindings) {
        const op = term.operator ?? term.name;
        const [a, b] = this.resolveAll(term.components ?? [], bindings);
        
        switch (op) {
            case 'eq': case '=:=': return a === b;
            case 'neq': case '=\\=': return a !== b;
            case 'lt': case '<': return a < b;
            case 'lte': case '=<': return a <= b;
            case 'gt': case '>': return a > b;
            case 'gte': case '>=': return a >= b;
            default:
                throw new Error(`Unknown comparison op: ${op}`);
        }
    }
}
```

---

### 5.4 TypeFunctor — Type Predicates

**File**: `core/src/functor/TypeFunctor.js`  
**Effort**: 2 hours

```javascript
class TypeFunctor extends Functor {
    constructor() {
        super({ name: 'Type' });
        this.registerAll([
            'is_number', 'is_atom', 'is_var', 'is_compound',
            'is_list', 'is_tensor', 'functor', 'arg', 'length'
        ]);
    }

    evaluate(term, bindings) {
        const op = term.operator ?? term.name;
        const args = this.resolveAll(term.components ?? [], bindings);
        
        switch (op) {
            case 'is_number': return typeof args[0] === 'number';
            case 'is_atom': return args[0]?.isAtom ?? false;
            case 'is_var': return args[0]?.isVariable ?? false;
            case 'is_compound': return args[0]?.components?.length > 0;
            case 'is_list': return Array.isArray(args[0]);
            case 'is_tensor': return args[0]?.constructor?.name === 'Tensor';
            case 'functor': return args[0]?.operator ?? args[0]?.name;
            case 'arg': return args[0]?.components?.[args[1]];
            case 'length': return args[0]?.length ?? args[0]?.components?.length ?? 0;
            default:
                throw new Error(`Unknown type op: ${op}`);
        }
    }
}
```

---

### 5.5 FunctorRegistry — Plugin System

**File**: `core/src/functor/FunctorRegistry.js`  
**Effort**: 2 hours

```javascript
/**
 * FunctorRegistry - Central registry for all functors
 */
class FunctorRegistry {
    constructor() {
        this.functors = new Map();      // name → Functor
        this.operatorIndex = new Map(); // operator → Functor
    }

    register(functor) {
        this.functors.set(functor.name, functor);
        for (const op of functor.operators) {
            this.operatorIndex.set(op, functor);
        }
        return this;
    }

    get(name) {
        return this.functors.get(name);
    }

    findForOperator(op) {
        return this.operatorIndex.get(op);
    }

    canEvaluate(term) {
        const op = term.operator ?? term.name;
        return this.operatorIndex.has(op);
    }

    evaluate(term, bindings) {
        const op = term.operator ?? term.name;
        const functor = this.operatorIndex.get(op);
        if (!functor) throw new Error(`No functor for operator: ${op}`);
        return functor.evaluate(term, bindings);
    }

    // Create default registry with standard functors
    static createDefault() {
        return new FunctorRegistry()
            .register(new ArithmeticFunctor())
            .register(new ComparisonFunctor())
            .register(new TypeFunctor());
    }
}
```

---

### 5.6 PrologStrategy Integration

**Extend**: `core/src/reason/strategy/PrologStrategy.js`  
**Effort**: 4 hours

```javascript
class PrologStrategy {
    constructor(options = {}) {
        // ...existing code...
        this.functorRegistry = options.functorRegistry ?? FunctorRegistry.createDefault();
    }

    // Enhanced 'is' operator with functor support
    evaluateIs(lhs, rhs, bindings) {
        let result;
        
        // Check if it's a registered functor operation
        if (this.functorRegistry.canEvaluate(rhs)) {
            result = this.functorRegistry.evaluate(rhs, bindings);
        } else {
            // Fallback to standard evaluation
            result = this.evaluateExpression(rhs, bindings);
        }
        
        return this.unify(lhs, result, bindings);
    }

    // Register custom functor at runtime
    registerFunctor(functor) {
        this.functorRegistry.register(functor);
        return this;
    }
}
```

---

### Phase 5 Summary

| Component | File | Effort | Purpose |
|-----------|------|--------|---------|
| Functor base | `core/src/functor/Functor.js` | 4 hrs | Abstract base class |
| ArithmeticFunctor | `core/src/functor/ArithmeticFunctor.js` | 3 hrs | +, -, *, /, sqrt, etc. |
| ComparisonFunctor | `core/src/functor/ComparisonFunctor.js` | 2 hrs | <, >, =, etc. |
| TypeFunctor | `core/src/functor/TypeFunctor.js` | 2 hrs | is_number, is_list, etc. |
| FunctorRegistry | `core/src/functor/FunctorRegistry.js` | 2 hrs | Plugin system |
| PrologStrategy ext | `core/src/reason/strategy/PrologStrategy.js` | 4 hrs | Integration |
| **Total** | | **~17 hrs (~2 days)** | |

---

## Phase 6: Tensor Logic — Tiered Implementation

> **Goal**: Implement [Tensor Logic](https://arxiv.org/abs/2510.12269) (Domingos, 2024) for unified neuro-symbolic AI  
> **Effort**: ~2-3 weeks (tiered approach)  
> **Prereqs**: Phase 5 (Functor infrastructure)  
> **Unlocks**: Sound reasoning in embedding space, differentiable reasoning, RLFP ML strategies

### Tiered Implementation Strategy

| Tier | Scope | Effort | Deliverable |
|------|-------|--------|-------------|
| **Tier 1** | Forward-Only Ops | 1 week | TensorFunctor with matmul, relu, etc. |
| **Tier 2** | Basic Autograd | 1 week | Gradient tracking for simple graphs |
| **Tier 3** | Advanced (Future) | 2+ weeks | Einstein summation, full differentiable logic |

**Rationale**: Start with working forward pass, add gradients incrementally. Each tier is independently valuable.

---

### Tensor Logic Foundation

**Paper Reference**: [Tensor Logic: The Language of AI](https://arxiv.org/abs/2510.12269) (Domingos, arXiv:2510.12269)

**Key Insight**: Logical rules and Einstein summation are fundamentally the same operation:
- A logical rule `(A ∧ B) → C` can be expressed as tensor contraction
- This unifies neural and symbolic AI at the mathematical level
- Enables **sound reasoning in embedding space** — combining neural scalability with symbolic reliability

**Core Concepts from Tensor Logic**:

| Concept | Description | SeNARS Implementation |
|---------|-------------|----------------------|
| **Tensor Equations** | Unified representation for rules and neural ops | `TensorFunctor.evaluate()` |
| **Einstein Summation** | Index-based tensor contraction | `einsum(subscripts, tensors)` op |
| **Embedding Space Reasoning** | Sound inference over continuous vectors | Integration with `EmbeddingLayer` |
| **Differentiable Logic** | Gradient flow through logical structure | Autograd in `Tensor` class |
| **Probabilistic Semantics** | Tensor values as probabilities | Truth values as tensor entries |

### Design Principles

1. **Terms Are Tensors**: Neural ops expressed as Prolog-like terms
2. **Rules Are Contractions**: Logical rules as tensor index operations
3. **PrologStrategy Integration**: Leverage existing unification and backward chaining
4. **Lazy Evaluation**: Tensors computed on demand during proof search
5. **Gradient Flow**: Optional autograd through term structure
6. **Backend Agnostic**: Abstract over tfjs, onnxruntime, native

### Subsystems

| Subsystem | Purpose | File |
|-----------|---------|------|
| **TensorFunctor** | Core evaluator | `core/src/functor/TensorFunctor.js` |
| **Tensor** | N-d array with autograd | `core/src/functor/Tensor.js` |
| **TensorBackend** | Backend abstraction | `core/src/functor/backends/` |
| **EinsumEngine** | Einstein summation | `core/src/functor/EinsumEngine.js` |
| **TensorRuleCompiler** | Rules → tensor ops | `core/src/functor/TensorRuleCompiler.js` |
| **EmbeddingReasoner** | Sound embedding inference | `core/src/functor/EmbeddingReasoner.js` |

---

### 6.1 TensorFunctor Base — Core Operations

**File**: `core/src/functor/TensorFunctor.js`  
**Effort**: 3 days  
**Dependencies**: PrologStrategy, Functor interface

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       TensorFunctor                              │
├─────────────────────────────────────────────────────────────────┤
│ evaluate(term, bindings) → Tensor | Term                         │
│   │                                                              │
│   ├─► tensor([1,2,3])           → Tensor([1,2,3])               │
│   ├─► matmul(A, B)              → Tensor.matmul(A, B)           │
│   ├─► relu(X)                   → Tensor.relu(X)                │
│   ├─► layer(In, Out, W, B, Act) → Composed computation          │
│   └─► grad(Y, X)                → Gradient of Y wrt X           │
├─────────────────────────────────────────────────────────────────┤
│ resolve(term) → Tensor|Value                                     │
│ createTensor(data) → Tensor                                      │
│ registerOp(name, fn) → void                                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TensorBackend                              │
├─────────────────────────────────────────────────────────────────┤
│ matmul(a, b), add(a, b), mul(a, b)                               │
│ relu(x), sigmoid(x), tanh(x), softmax(x), gelu(x)               │
│ transpose(x), reshape(x, shape), concat(tensors, axis)          │
│ sum(x, axis?), mean(x, axis?), max(x, axis?)                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Core Implementation

```javascript
/**
 * TensorFunctor - Evaluates tensor operations as Prolog terms
 * 
 * Integrates with PrologStrategy for backward chaining.
 * Supports lazy evaluation and gradient tracking.
 */
class TensorFunctor extends Functor {
    constructor(backend = new NativeBackend()) {
        super();
        this.backend = backend;
        this.ops = new Map();
        this._registerBuiltins();
    }

    // === Core Evaluation ===
    
    evaluate(term, bindings) → Tensor | Term {
        const op = term.operator ?? term.name;
        
        // Check if it's a registered op
        if (this.ops.has(op)) {
            const args = term.components.map(c => this.resolve(c, bindings));
            return this.ops.get(op)(...args);
        }

        // Built-in ops
        switch (op) {
            case 'tensor':
                return this.createTensor(term.components[0]);
            
            case 'matmul':
                return this.backend.matmul(
                    this.resolve(term.comp(0), bindings),
                    this.resolve(term.comp(1), bindings)
                );
            
            case 'add':
                return this.backend.add(
                    this.resolve(term.comp(0), bindings),
                    this.resolve(term.comp(1), bindings)
                );
            
            case 'mul':
                return this.backend.mul(
                    this.resolve(term.comp(0), bindings),
                    this.resolve(term.comp(1), bindings)
                );
            
            case 'transpose':
                return this.backend.transpose(this.resolve(term.comp(0), bindings));
            
            // Activations
            case 'relu':
            case 'sigmoid':
            case 'tanh':
            case 'softmax':
            case 'gelu':
                return this.backend[op](this.resolve(term.comp(0), bindings));
            
            // Reduction
            case 'sum':
            case 'mean':
            case 'max':
                return this.backend[op](
                    this.resolve(term.comp(0), bindings),
                    term.comp(1)?.value  // optional axis
                );
            
            // Gradient
            case 'grad':
                return this._gradient(term.comp(0), term.comp(1), bindings);
            
            case 'backward':
                return this.resolve(term.comp(0), bindings).backward();
            
            default:
                throw new Error(`Unknown tensor op: ${op}`);
        }
    }

    resolve(term, bindings) → Tensor | number | number[] {
        // Variable resolution
        if (term.isVariable && bindings.has(term.name)) {
            return this.resolve(bindings.get(term.name), bindings);
        }
        
        // Already a tensor
        if (term instanceof Tensor) return term;
        
        // Numeric literal
        if (typeof term === 'number') return term;
        if (Array.isArray(term)) return this.createTensor(term);
        
        // Compound term - evaluate recursively
        if (term.components) {
            return this.evaluate(term, bindings);
        }
        
        return term;
    }

    createTensor(data, options = {}) → Tensor {
        return new Tensor(data, {
            requiresGrad: options.requiresGrad ?? false,
            backend: this.backend
        });
    }

    registerOp(name, fn) → void {
        this.ops.set(name, fn);
    }

    _registerBuiltins() {
        // Extended ops can be registered here
    }
}
```

---

### 6.2 Tensor Class — Tier 2: Autograd Support

**Status**: ✅ Tier 1 Complete (forward-only ops) | **Next**: Tier 2 (gradient tracking)  
**File**: `core/src/functor/Tensor.js`  
**Effort**: 1 week

#### Tier 1 Status (Completed)

```javascript
class Tensor {
    constructor(data, options = {}) {
        this.data = this._flatten(data);
        this.shape = this._inferShape(data);
        this.requiresGrad = options.requiresGrad ?? false;
        this.backend = options.backend ?? null;
        this.grad = null;           // Tier 2: will accumulate gradients
        this._gradFn = null;        // Tier 2: gradient function
        this._parents = [];         // Tier 2: computation graph
    }
    
    // ✅ Implemented: shape ops (reshape, transpose, get, set)
    // ✅ Implemented: serialization (toJSON, fromJSON)
    // ⏳ Next: backward() and gradient tracking
}
```

#### Tier 2: Reverse-Mode Automatic Differentiation

**Goal**: Add `backward()` method and gradient functions for all operations.

**Core Algorithm**: Topological-sort-based backpropagation

```javascript
class Tensor {
    // === Gradient Computation ===
    
    backward() {
        if (!this.requiresGrad) return;
        
        // Initialize output gradient to ones
        if (this.grad === null) {
            this.grad = this.backend.ones(this.shape);
        }
        
        // Topological sort: visit parents first
        const topo = this._topological Sort();
        for (const tensor of topo) {
            if (tensor._gradFn) {
                tensor._gradFn();  // Execute gradient function
            }
        }
    }
    
    _topologicalSort() {
        const topo = [];
        const visited = new Set();
        
        const dfs = (t) => {
            if (visited.has(t) || !t.requiresGrad) return;
            visited.add(t);
            for (const parent of (t._parents || [])) {
                dfs(parent);
            }
            topo.push(t);
        };
        
        dfs(this);
        return topo.reverse();  // Reverse for parent-first order
    }
    
    zeroGrad() {
        this.grad = null;
    }
}
```

---

### 6.3 NativeBackend — Gradient Functions

**File**: `core/src/functor/backends/NativeBackend.js`  
**Changes**: Update all operations to build computation graph

#### Gradient Formulas Reference

| Operation | Forward | Gradient Formula |
|-----------|---------|------------------|
| **add(a, b)** | `a + b` | `∂L/∂a = ∂L/∂out`, `∂L/∂b = ∂L/∂out` |
| **sub(a, b)** | `a - b` | `∂L/∂a = ∂L/∂out`, `∂L/∂b = -∂L/∂out` |
| **mul(a, b)** | `a ⊙ b` | `∂L/∂a = ∂L/∂out ⊙ b`, `∂L/∂b = ∂L/∂out ⊙ a` |
| **div(a, b)** | `a / b` | `∂L/∂a = ∂L/∂out / b`, `∂L/∂b = -∂L/∂out ⊙ a / b²` |
| **matmul(a, b)** | `a @ b` | `∂L/∂a = ∂L/∂out @ b.T`, `∂L/∂b = a.T @ ∂L/∂out` |
| **relu(a)** | `max(0, a)` | `∂L/∂a = ∂L/∂out ⊙ (a > 0)` |
| **sigmoid(a)** | `σ(a)` | `∂L/∂a = ∂L/∂out ⊙ σ(a) ⊙ (1 - σ(a))` |
| **tanh(a)** | `tanh(a)` | `∂L/∂a = ∂L/∂out ⊙ (1 - tanh²(a))` |
| **softmax(a)** | `softmax(a)` | `∂L/∂a = ∂L/∂out ⊙ softmax(a) ⊙ (1 - softmax(a))` (diagonal) |
| **gelu(a)** | `GELU(a)` | `∂L/∂a = ∂L/∂out ⊙ GELU'(a)` |
| **sum(a, axis)** | `Σa` | `∂L/∂a = broadcast(∂L/∂out, a.shape)` |
| **mean(a, axis)** | `mean(a)` | `∂L/∂a = broadcast(∂L/∂out / size, a.shape)` |

#### Implementation Pattern

```javascript
// Example: Matrix multiplication with autograd
matmul(a, b) {
    // Forward pass
    const result = this._matmulForward(a, b);
    
    // Gradient tracking
    if (a.requiresGrad || b.requiresGrad) {
        result.requiresGrad = true;
        result._parents = [a, b];
        result._gradFn = () => {
            // Gradient w.r.t. a: ∂L/∂a = ∂L/∂out @ b^T
            if (a.requiresGrad) {
                const gradA = this.matmul(result.grad, this.transpose(b));
                a.grad = a.grad ? this.add(a.grad, gradA) : gradA;
            }
            // Gradient w.r.t. b: ∂L/∂b = a^T @ ∂L/∂out
            if (b.requiresGrad) {
                const gradB = this.matmul(this.transpose(a), result.grad);
                b.grad = b.grad ? this.add(b.grad, gradB) : gradB;
            }
        };
    }
    
    return result;
}

// Example: ReLU with autograd
relu(a) {
    const result = new Tensor(
        a.data.map(x => Math.max(0, x)),
        {backend: this}
    );
    
    if (a.requiresGrad) {
        result.requiresGrad = true;
        result._parents = [a];
        result._gradFn = () => {
            // ∂ReLU/∂x = 1 if x > 0, else 0
            const mask = new Tensor(
                a.data.map(x => x > 0 ? 1 : 0),
                {backend: this}
            );
            const gradA = this.mul(result.grad, mask);
            a.grad = a.grad ? this.add(a.grad, gradA) : gradA;
        };
    }
    
    return result;
}
```

#### Key Considerations

1. **Gradient Accumulation**: Always add (`a.grad = a.grad ? add(a.grad, newGrad) : newGrad`)
2. **Broadcasting**: Handle shape mismatches (sum gradients to match input shape)
3. **In-place Safety**: Never modify tensors in gradient functions (breaks graph)
4. **Efficiency**: Cache forward-pass outputs if needed for backward pass (e.g., sigmoid)

---

### 6.4 TensorFunctor — Gradient Operations

**File**: `core/src/functor/TensorFunctor.js`  
**Changes**: Implement `grad` and `backward` operations

```javascript
evaluate(term, bindings) {
    const op = term.operator ?? term.name;
    
    // ... existing forward ops ...
    
    switch (op) {
        // Tier 2 operations
        case 'grad': {
            // Usage: grad(loss, weights) returns ∇_W loss
            const output = this.resolve(term.components[0], bindings);
            const input = this.resolve(term.components[1], bindings);
            
            if (!output.requiresGrad) {
                throw new Error('Cannot compute gradient: output does not require gradients');
            }
            
            // Trigger backward pass
            output.backward();
            
            // Return gradient w.r.t. input
            return input.grad || this.backend.zeros(input.shape);
        }
        
        case 'backward': {
            // Usage: backward(tensor) triggers backprop, returns tensor for chaining
            const tensor = this.resolve(term.components[0], bindings);
            tensor.backward();
            return tensor;
        }
        
        case 'zero_grad': {
            // Usage: zero_grad(tensor) clears gradients
            const tensor = this.resolve(term.components[0], bindings);
            tensor.zeroGrad();
            return tensor;
        }
    }
}
```

---

### 6.5 Integration Tests — Gradient Checking

**File**: `tests/unit/functor/TensorGradients.test.js`

```javascript
describe('Tensor Gradients', function() {
    let backend;
    
    beforeEach(function() {
        backend = new NativeBackend();
    });
    
    describe('binary operations', function() {
        test('scalar multiplication gradient', function() {
            const a = new Tensor([2], {requiresGrad: true, backend});
            const b = new Tensor([3], {requiresGrad: true, backend});
            const c = backend.mul(a, b);  // c = 6
            
            c.backward();
            
            // ∂c/∂a = b = 3, ∂c/∂b = a = 2
            expect(a.grad.data[0]).toBeCloseTo(3);
            expect(b.grad.data[0]).toBeCloseTo(2);
        });
        
        test('matrix multiplication gradient', function() {
            const W = new Tensor([[1, 2], [3, 4]], {requiresGrad: true, backend});
            const x = new Tensor([[5], [6]], {require sGrad: true, backend});
            const y = backend.matmul(W, x);  // 2x1
            
            y.backward();
            
            // Check shapes
            expect(W.grad.shape).toEqual([2, 2]);
            expect(x.grad.shape).toEqual([2, 1]);
        });
    });
    
    describe('activation gradients', function() {
        test('relu gradient mask', function() {
            const a = new Tensor([-1, 0, 1], {requiresGrad: true, backend});
            const b = backend.relu(a);
            
            b.backward();
            
            // Gradient only flows through positive values
            expect(a.grad.toArray()).toEqual([0, 0, 1]);
        });
        
        test('sigmoid gradient at zero', function() {
            const a = new Tensor([0], {requiresGrad: true, backend});
            const b = backend.sigmoid(a);
            
            b.backward();
            
            // σ'(0) = σ(0) * (1 - σ(0)) = 0.5 * 0.5 = 0.25
            expect(a.grad.data[0]).toBeCloseTo(0.25);
        });
    });
    
    describe('numerical gradient checking', function() {
        test('verify analytical gradient with numerical', function() {
            const eps = 1e-4;
            const x = new Tensor([2.0], {requiresGrad: true, backend});
            
            // f(x) = x²
            const y = backend.mul(x, x);
            y.backward();
            const analytical = x.grad.data[0];
            
            // Numerical: (f(x+ε) - f(x-ε)) / 2ε
            const xPlus = new Tensor([2.0 + eps], {backend});
            const xMinus = new Tensor([2.0 - eps], {backend});
            const fPlus = backend.mul(xPlus, xPlus).data[0];
            const fMinus = backend.mul(xMinus, xMinus).data[0];
            const numerical = (fPlus - fMinus) / (2 * eps);
            
            // f'(x) = 2x = 4 at x=2
            expect(analytical).toBeCloseTo(4.0, 5);
            expect(analytical).toBeCloseTo(numerical, 2);
        });
    });
    
    describe('computation graph', function() {
        test('simple MLP forward and backward', function() {
            const x = new Tensor([[1, 2]], {backend});
            const W1 = new Tensor([[0.1, 0.2], [0.3, 0.4]], {requiresGrad: true, backend});
            const W2 = new Tensor([[0.5], [0.6]], {requiresGrad: true, backend});
            
            // Forward: x -> W1 -> ReLU -> W2
            const h = backend.relu(backend.matmul(x, W1));  // 1x2
            const y = backend.matmul(h, W2);  // 1x1
            
            // Backward
            y.backward();
            
            // Verify gradients exist and have correct shapes
            expect(W1.grad).not.toBeNull();
            expect(W1.grad.shape).toEqual([2, 2]);
            expect(W2.grad).not.toBeNull();
            expect(W2.grad.shape).toEqual([2, 1]);
        });
    });
});
```

---

### 6.6 Example: Training Loop

```javascript
// Simple gradient descent
const backend = new NativeBackend();

// Data: y = 3x + 2
const X = new Tensor([[1], [2], [3], [4]], {backend});
const y_true = new Tensor([[5], [8], [11], [14]], {backend});

// Parameters (learnable)
const W = new Tensor([[0.5]], {requiresGrad: true, backend});
const b = new Tensor([[0]], {requiresGrad: true, backend});

const lr = 0.01;  // Learning rate

for (let epoch = 0; epoch < 100; epoch++) {
    // Forward pass: y_pred = Wx + b
    const y_pred = backend.add(backend.matmul(X, W), b);
    
    // Loss: MSE = mean((y_pred - y_true)²)
    const diff = backend.sub(y_pred, y_true);
    const squared = backend.mul(diff, diff);
    const loss = backend.mean(squared);
    
    // Backward pass
    W.zeroGrad();
    b.zeroGrad();
    loss.backward();
    
    // SGD update: W -= lr * ∇W, b -= lr * ∇b
    W.data = W.data.map((w, i) => w - lr * W.grad.data[i]);
    b.data = b.data.map((bi, i) => bi - lr * b.grad.data[i]);
    
    if (epoch % 20 === 0) {
        console.log(`Epoch ${epoch}: loss = ${loss.data[0].toFixed(4)}`);
    }
}

console.log(`Final W: ${W.data[0].toFixed(2)}, b: ${b.data[0].toFixed(2)}`);
// Expected: W ≈ 3.0, b ≈ 2.0
```

---

### Tier 2 Deliverables

- [x] **Tensor.backward()**: Reverse-mode autodiff with topological sort
- [x] **Gradient functions**: All 20+ operations have ∂f/∂x implementations
- [x] **TensorFunctor ops**: `grad()`, `backward()`, `zero_grad()`
- [x] **Unit tests**: Gradient checking, numerical verification
- [x] **Integration test**: Simple MLP training loop
- [x] **Documentation**: Gradient formulas table, usage examples

**Next (Tier 3)**: Truth-Tensor bridge, layer abstractions, loss functions, optimizers

---

---

### Layer Abstraction — Neural Networks as Prolog

**Effort**: 2 days

#### Defining Networks in Narsese/Prolog

```prolog
%% === Layer Definitions ===

% Dense layer: Out = Act(W @ In + B)
layer(In, Out, W, B, Act) :-
    Out is Act(add(matmul(W, In), B)).

% Dropout layer (training mode)
dropout(In, Out, Rate) :-
    Out is mul(In, bernoulli(1 - Rate)).

% Batch normalization
batchnorm(In, Out, Gamma, Beta) :-
    Mean is mean(In),
    Var is var(In),
    Norm is div(sub(In, Mean), sqrt(add(Var, 1e-5))),
    Out is add(mul(Gamma, Norm), Beta).

%% === Network Definitions ===

% Simple MLP
mlp(Input, Output) :-
    layer(Input, H1, w1, b1, relu),
    layer(H1, H2, w2, b2, relu),
    layer(H2, Output, w3, b3, sigmoid).

% Convolutional block (conceptual)
conv_block(In, Out, Filters, KernelSize) :-
    conv2d(In, C1, Filters, KernelSize),
    batchnorm(C1, C2, gamma, beta),
    Out is relu(C2).

%% === Training ===

% Forward pass
?- mlp([0.5, 0.3, 0.2], Prediction).
% Prediction = tensor([0.78])

% Inspect weights
?- mlp(_, _), layer(_, _, W, _, _).
% W = w1 ; W = w2 ; W = w3

% Loss computation
?- mlp(Input, Pred), loss is mse(Pred, Target).

% Gradient
?- mlp(Input, Pred), loss is mse(Pred, Target), grad(loss, w1).
```

---

### PrologStrategy Integration

**Extend**: `core/src/reason/strategy/PrologStrategy.js`  
**Effort**: 1 day

```javascript
class PrologStrategy {
    constructor(options = {}) {
        // ...existing code...
        this.tensorFunctor = options.tensorFunctor ?? new TensorFunctor();
    }

    // Extend evaluation to handle tensor terms
    evaluateBuiltin(term, bindings) {
        // Check if it's a tensor operation
        if (this.tensorFunctor.canEvaluate(term)) {
            return this.tensorFunctor.evaluate(term, bindings);
        }
        
        // Existing builtin handling
        return super.evaluateBuiltin(term, bindings);
    }

    // Handle 'is' operator for tensor expressions
    evaluateIs(lhs, rhs, bindings) {
        const result = this.evaluate(rhs, bindings);
        if (result instanceof Tensor) {
            return this.unify(lhs, result, bindings);
        }
        return super.evaluateIs(lhs, rhs, bindings);
    }
}
```

---

### Backend Abstraction

**File**: `core/src/functor/backends/`  
**Effort**: 2 days

```javascript
// Abstract interface
class TensorBackend {
    matmul(a, b) → Tensor;
    add(a, b) → Tensor;
    mul(a, b) → Tensor;
    transpose(a) → Tensor;
    relu(a) → Tensor;
    sigmoid(a) → Tensor;
    // ...
}

// Native JS implementation (default)
class NativeBackend extends TensorBackend {
    matmul(a, b) {
        // Pure JS matrix multiplication
    }
}

// TensorFlow.js backend (optional)
class TFJSBackend extends TensorBackend {
    matmul(a, b) {
        return tf.matMul(a.toTFTensor(), b.toTFTensor());
    }
}

// ONNX Runtime backend (optional)
class ONNXBackend extends TensorBackend {
    // Load and run ONNX models
}
```

---

### Gradient-Based Operations

**Effort**: 1 week

```javascript
// In TensorFunctor
_gradient(output, wrt, bindings) → Tensor {
    const outTensor = this.resolve(output, bindings);
    const wrtTensor = this.resolve(wrt, bindings);
    
    // Forward pass stores computation graph
    // Backward pass computes gradients
    outTensor.backward();
    
    return wrtTensor.grad;
}

// Usage in Prolog
// ?- Y is matmul(W, X), loss is mse(Y, target), grad(loss, W).
// Returns gradient of loss with respect to W
```

---

### Training Loop as Terms

```prolog
% SGD update step
sgd_step(Params, Grads, LR, NewParams) :-
    NewParams is sub(Params, mul(LR, Grads)).

% Training iteration
train_step(Model, Input, Target, LR) :-
    call(Model, Input, Pred),
    Loss is mse(Pred, Target),
    Grads is grad(Loss, weights),
    sgd_step(weights, Grads, LR, NewWeights),
    update_weights(NewWeights).

% Training loop (meta)
train(Model, Data, Epochs) :-
    Epochs > 0,
    member((Input, Target), Data),
    train_step(Model, Input, Target, 0.01),
    NewEpochs is Epochs - 1,
    train(Model, Data, NewEpochs).
```

---

### Truth-Value ↔ Tensor Bridge

**File**: `core/src/functor/TruthTensorBridge.js`  
**Effort**: 4 hours  
**Dependencies**: TensorFunctor, TruthValue

Formal conversion between NARS Truth Values (Frequency, Confidence) and Tensor values is essential for meaningful neuro-symbolic integration.

#### Core Implementation

```javascript
/**
 * TruthTensorBridge - Bidirectional conversion between NARS truth and tensors
 */
class TruthTensorBridge {
    /**
     * Convert NARS truth value to tensor representation
     * @param {TruthValue} truth - NARS truth value {f, c}
     * @param {string} mode - 'scalar' | 'bounds' | 'vector'
     * @returns {Tensor}
     */
    truthToTensor(truth, mode = 'scalar') {
        const { f, c } = truth;
        switch (mode) {
            case 'scalar':
                // Simple: just use frequency
                return new Tensor([f]);
            case 'bounds':
                // Lower/upper bounds based on confidence
                const lower = f * c;
                const upper = f * c + (1 - c);
                return new Tensor([lower, upper]);
            case 'vector':
                // Full representation: [f, c, expectation]
                const e = c * (f - 0.5) + 0.5;  // NAL expectation
                return new Tensor([f, c, e]);
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * Convert tensor output to NARS truth value
     * @param {Tensor} tensor - Neural network output
     * @param {string} mode - Interpretation mode
     * @returns {TruthValue}
     */
    tensorToTruth(tensor, mode = 'sigmoid') {
        const data = tensor.data.flat();
        switch (mode) {
            case 'sigmoid':
                // Single value → frequency, default confidence
                return { f: data[0], c: 0.9 };
            case 'dual':
                // Two values → frequency, confidence
                return { f: data[0], c: data[1] };
            case 'softmax':
                // Softmax output → frequency from probability
                const maxProb = Math.max(...data);
                return { f: maxProb, c: 1 - 1 / (data.length + 1) };
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }
}
```

#### Prolog Integration

```prolog
% Convert truth value to tensor for neural processing
neural_embedding(Term, Embedding) :-
    truth(Term, F, C),
    Embedding is truth_to_tensor([F, C], vector).

% Interpret neural output as truth value
neural_conclusion(Output, Term, Truth) :-
    Truth is tensor_to_truth(Output, dual),
    assert_belief(Term, Truth).
```

#### Usage in TensorFunctor

```javascript
// In TensorFunctor.evaluate()
case 'truth_to_tensor':
    const truth = this.resolve(term.comp(0), bindings);
    const mode = term.comp(1)?.value ?? 'scalar';
    return this.bridge.truthToTensor(truth, mode);

case 'tensor_to_truth':
    const tensor = this.resolve(term.comp(0), bindings);
    const interpretMode = term.comp(1)?.value ?? 'sigmoid';
    return this.bridge.tensorToTruth(tensor, interpretMode);
```

---

### Integration Tests

**File**: `tests/unit/functor/TensorFunctor.test.js`

```javascript
describe('TensorFunctor', () => {
    let nar, tensorFunctor;

    beforeEach(() => {
        tensorFunctor = new TensorFunctor();
        nar = new NAR({ tensorFunctor });
    });

    test('basic tensor creation', () => {
        const result = tensorFunctor.evaluate(
            TermFactory.create('tensor', [[1, 2, 3]]),
            new Map()
        );
        expect(result.data).toEqual([1, 2, 3]);
    });

    test('matrix multiplication', () => {
        const a = new Tensor([[1, 2], [3, 4]]);
        const b = new Tensor([[5, 6], [7, 8]]);
        const result = tensorFunctor.backend.matmul(a, b);
        expect(result.data).toEqual([[19, 22], [43, 50]]);
    });

    test('relu activation', () => {
        const x = new Tensor([-1, 0, 1, 2]);
        const result = tensorFunctor.backend.relu(x);
        expect(result.data).toEqual([0, 0, 1, 2]);
    });

    test('gradient tracking', () => {
        const x = new Tensor([2], { requiresGrad: true });
        const y = x.mul(x);  // y = x^2
        y.backward();
        expect(x.grad.data).toEqual([4]);  // dy/dx = 2x = 4
    });

    test('MLP forward pass via Prolog', async () => {
        await nar.input('layer(In, Out, W, B, relu) :- Out is relu(add(matmul(W, In), B)).');
        await nar.input('mlp(X, Y) :- layer(X, H, [[0.5]], [0.1], relu), layer(H, Y, [[0.3]], [0], sigmoid).');
        const result = await nar.query('?- mlp([1.0], Y).');
        expect(result).toHaveProperty('Y');
    });
});
```

---

### Phase 6 Summary

| Component | File | Effort |
|-----------|------|--------|
| TensorFunctor base | `core/src/functor/TensorFunctor.js` | 3 days |
| Tensor class + autograd | `core/src/functor/Tensor.js` | 2 days |
| Activations | (in TensorFunctor) | 1 day |
| Layer abstraction | (Prolog rules) | 1 day |
| PrologStrategy integration | `core/src/reason/strategy/PrologStrategy.js` | 1 day |
| Backend abstraction | `core/src/functor/backends/` | 2 days |
| Gradient operations | (in TensorFunctor) | 3 days |
| Truth-Tensor Bridge | `core/src/functor/TruthTensorBridge.js` | 4 hours |
| Integration tests | `tests/unit/functor/` | 2 days |
| **Total** | | **~2.5 weeks** |

---

### Architectural Benefits

1. **Unified Representation**: Models, data, and logic all as Terms
2. **Introspectable**: Query network structure with Prolog
3. **Composable**: Mix symbolic rules with neural layers
4. **Extensible**: Register custom ops, swap backends
5. **Differentiable**: Gradient flow through term structure
6. **RLFP-Ready**: Neural reward models via TensorFunctor

## Phase 6.5: Tensor Logic Completion & Optimization

> **Goal**: Complete Tensor Logic paper primitives, add production-grade training ergonomics  
> **Effort**: ~20 hrs (~1 week) — *ultra-optimized + full-featured*  
> **Prereqs**: Phase 6 Tiers 1-3 (✅ complete)  
> **Unlocks**: Full paper parity, production training workflows, NAL integration foundation

### Ultra-Optimization Strategy

| Strategy | Original | Now | How |
|----------|----------|-----|-----|
| **Einsum as syntax** | 12 hrs | 1.5 hrs | Pattern-match to existing `matmul`/`mul`/`sum` |
| **Attention for FREE** | 1.5 hrs | 0 hrs | Just `einsum → softmax → einsum` composition |
| **LayerNorm/BatchNorm** | 1.5 hrs | 0.5 hrs | Compose from mean/div/mul |
| **Single TrainingUtils.js** | 12 hrs | 4 hrs | All utilities + scaffolds in one file |
| **Eliminate Tier 3 files** | 8 hrs | 0.5 hrs | Inline stubs in TrainingUtils.js |

### Design Principles

1. **Composition over implementation** — Attention, norms, similarity are just compositions
2. **Scaffolds don't need files** — 3-line stubs inline in TrainingUtils.js
3. **Add missing essentials** — concat/slice/stack more useful than temperature
4. **Free capabilities** — Multi-head attention, positional encoding once einsum works

### Summary of Completed Work (Phase 6)

| Component | Status | Lines | Key Features |
|-----------|--------|-------|--------------|
| `Tensor.js` | ✅ | ~200 | N-d arrays, autograd, backward(), topological sort |
| `NativeBackend.js` | ✅ | ~450 | All ops with gradients: matmul, add/sub/mul/div, activations, reductions |
| `TensorFunctor.js` | ✅ | ~195 | Prolog term evaluation, 30+ ops registered |
| `TruthTensorBridge.js` | ✅ | ~60 | 6 conversion modes |
| `LossFunctor.js` | ✅ | ~80 | MSE, MAE, binary/cross-entropy |
| `Optimizer.js` | ✅ | ~110 | SGD (momentum), Adam, RMSprop |

**Test coverage**: 690+ tests passing (98%)

---

### Tier 1: Core Ops (~5 hrs, was 8 hrs)

Complete core primitives via **composition** from existing ops.

#### 1.1 Einsum — Pattern-Matching (1.5 hrs)

**File**: `core/src/functor/backends/NativeBackend.js`

> [!TIP]
> **Key insight**: The existing `matmul`, `mul`, `sum` already have gradients!  
> Einsum becomes a **syntax layer**, not a new computation engine.

```javascript
einsum(subscripts, ...tensors) {
    const patterns = {
        'ij,jk->ik': () => this.matmul(tensors[0], tensors[1]),
        'i,i->': () => this.sum(this.mul(tensors[0], tensors[1])),
        'i,j->ij': () => this.outer(tensors[0], tensors[1]),
        'ij->ji': () => this.transpose(tensors[0]),
        'ii->': () => this.trace(tensors[0]),
        'ij->i': () => this.sum(tensors[0], 1),
        'ij->j': () => this.sum(tensors[0], 0),
    };
    return patterns[subscripts.replace(/\s/g, '')]?.() ?? this._fallbackEinsum(subscripts, tensors);
}

outer(a, b) {
    const result = this._createTensor(a.data.flatMap(x => b.data.map(y => x * y)), [a.shape[0], b.shape[0]]);
    if (a.requiresGrad || b.requiresGrad) {
        result.requiresGrad = true;
        result._parents = [a, b];
        result._gradFn = () => {
            if (a.requiresGrad) this._accumulateGrad(a, this.sum(result.grad, 1));
            if (b.requiresGrad) this._accumulateGrad(b, this.sum(result.grad, 0));
        };
    }
    return result;
}

trace(a) {
    const n = Math.min(a.shape[0], a.shape[1] ?? a.shape[0]);
    let val = 0;
    for (let i = 0; i < n; i++) val += a.data[i * (a.shape[1] ?? 1) + i];
    const result = new Tensor([val], { backend: this });
    if (a.requiresGrad) {
        result.requiresGrad = true;
        result._parents = [a];
        result._gradFn = () => {
            const gradA = this.zeros(a.shape);
            for (let i = 0; i < n; i++) gradA.data[i * (a.shape[1] ?? 1) + i] = result.grad.data[0];
            this._accumulateGrad(a, gradA);
        };
    }
    return result;
}
```

#### 1.2 Composed Ops — FREE or Near-Free (0.5 hrs)

> [!NOTE]
> These ops are **pure composition** of existing ops with gradients.  
> No new gradient logic needed!

```javascript
// Attention = einsum + softmax (FREE - no new gradients)
attention(q, k, v, scale = null) {
    const d = scale ?? Math.sqrt(k.shape[k.shape.length - 1]);
    const scores = this.div(this.einsum('ij,kj->ik', q, k), d);
    const weights = this.softmax(scores, -1);
    return this.einsum('ij,jk->ik', weights, v);
}

// LayerNorm = mean + variance + normalize (0.25 hrs)
layerNorm(x, eps = 1e-5) {
    const mean = this.mean(x, -1);
    const variance = this.mean(this.pow(this.sub(x, mean), 2), -1);
    return this.div(this.sub(x, mean), this.sqrt(this.add(variance, eps)));
}

// CosineSimilarity (FREE)
cosineSimilarity(a, b) {
    const dot = this.sum(this.mul(a, b));
    return this.div(dot, this.mul(this.sqrt(this.sum(this.mul(a, a))), this.sqrt(this.sum(this.mul(b, b)))));
}

// Dropout (0.25 hrs - no gradient logic, mask is constant)
dropout(x, p = 0.5, training = true) {
    if (!training) return x;
    const mask = this._createTensor(x.data.map(() => Math.random() > p ? 1 : 0), x.shape);
    return this.div(this.mul(x, mask), 1 - p);
}

// Clamp = compose min/max (FREE)
clamp(x, min, max) { return this.min(this.max(x, min), max); }
```

#### 1.3 Essential Array Ops (1 hr)

**File**: `NativeBackend.js`

```javascript
concat(tensors, axis = 0) {
    // Concatenate along axis with gradient support
    const shapes = tensors.map(t => t.shape);
    const newShape = [...shapes[0]];
    newShape[axis] = shapes.reduce((s, sh) => s + sh[axis], 0);
    const resultData = [];  // Interleave data along axis
    // ... implementation
    return this._createGradientTensor(resultData, newShape, tensors);
}

slice(a, start, end, axis = 0) {
    // Slice with gradient support
    const sliceSize = end - start;
    const resultData = [];  // Extract slice
    // ... implementation
    return this._createGradientTensor(resultData, newShape, [a]);
}

stack(tensors, axis = 0) {
    // Add dimension then concatenate
    const expanded = tensors.map(t => this.unsqueeze(t, axis));
    return this.concat(expanded, axis);
}

gather(a, indices, axis = 0) {
    // Gather values by index with gradient support
    // ... implementation
    return this._createGradientTensor(resultData, newShape, [a]);
}
```

#### 1.4 TensorFunctor Integration (0.5 hrs)

**File**: `core/src/functor/TensorFunctor.js`

> [!TIP]
> **Elegant Extensibility**: Call registered Modules from Prolog!

```javascript
registerModule(name, module) {
    this.registerOp(name, (...args) => module.forward(...args));
}

// Usage in Prolog:
// ?- linear_layer(Input, Output).
```

#### 1.5 Tests (1 hr)

```javascript
describe('Ultra-Composed Ops', () => {
    test.each([
        ['attention', () => backend.attention(q, k, v)],
        ['layerNorm', () => backend.layerNorm(x)],
        ['cosineSimilarity', () => backend.cosineSimilarity(a, b)],
        ['concat', () => backend.concat([a, b], 0)],
    ])('%s gradient matches numerical', (name, fn) => {
        // Numerical gradient check
    });
});
```

#### 1.6 Initialization & Randomness (1 hr)

**File**: `NativeBackend.js`

```javascript
randn(shape, mean = 0, std = 1) {
    // Box-Muller transform
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Array(size);
    for (let i = 0; i < size; i += 2) {
        const u = 1 - Math.random();
        const v = Math.random();
        const z1 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
        data[i] = z1 * std + mean;
        if (i + 1 < size) data[i + 1] = z2 * std + mean;
    }
    return this._createTensor(data, shape);
}

xavierUniform(shape, gain = 1.0) {
    const fanIn = shape[0], fanOut = shape[1] ?? shape[0];
    const bound = gain * Math.sqrt(6.0 / (fanIn + fanOut));
    return this.random(shape).mul(2 * bound).sub(bound);
}

kaimingNormal(shape, a = 0, mode = 'fan_in', nonlinearity = 'leaky_relu') {
    const fan = mode === 'fan_in' ? shape[0] : (shape[1] ?? shape[0]);
    const gain = nonlinearity === 'relu' ? Math.sqrt(2.0) : 1.0; // simplified
    const std = gain / Math.sqrt(fan);
    return this.randn(shape, 0, std);
}
```

---

### Tier 2: Training Ergonomics & Modules (~8 hrs, was 5 hrs)

Enable real-world training workflows with a **PyTorch-like Module system**.

#### 2.1 TrainingUtils.js — Consolidated (4.5 hrs)

*(Unchanged content for TrainingUtils.js)*

#### 2.2 Module System (3 hrs)

**File**: `core/src/functor/Module.js`

> [!TIP]
> **Full-featured Layer Abstraction**: Auto-parameter registration, train/eval modes, state dicts.

```javascript
export class Module {
    constructor() {
        this._modules = new Map();
        this._parameters = new Map();
        this.training = true;
    }

    registerParameter(name, tensor) {
        this._parameters.set(name, tensor);
        return tensor;
    }

    registerModule(name, module) {
        this._modules.set(name, module);
        return module;
    }

    parameters() {
        let params = [...this._parameters.values()];
        for (const mod of this._modules.values()) params.push(...mod.parameters());
        return params;
    }

    train(mode = true) {
        this.training = mode;
        for (const mod of this._modules.values()) mod.train(mode);
        return this;
    }

    eval() { return this.train(false); }
    
    forward(...args) { throw new Error('Not implemented'); }
    
    stateDict() {
        const dict = {};
        for (const [k, v] of this._parameters) dict[k] = v.data; // Serialize data
        for (const [k, m] of this._modules) {
            const childDict = m.stateDict();
            for (const [ck, cv] of Object.entries(childDict)) dict[`${k}.${ck}`] = cv;
        }
        return dict;
    }
    
    loadStateDict(dict) {
        for (const [k, v] of this._parameters) {
            if (dict[k]) v.data = dict[k]; // Load data
        }
        for (const [k, m] of this._modules) {
            // Filter dict for child prefix
            const childDict = {};
            Object.keys(dict).filter(key => key.startsWith(`${k}.`)).forEach(key => {
                childDict[key.slice(k.length + 1)] = dict[key];
            });
            m.loadStateDict(childDict);
        }
    }
}

export class Linear extends Module {
    constructor(inFeatures, outFeatures, bias = true) {
        super();
        this.weight = this.registerParameter('weight', backend.kaimingNormal([inFeatures, outFeatures]));
        if (bias) this.bias = this.registerParameter('bias', backend.zeros([outFeatures]));
    }
    forward(input) {
        let out = backend.matmul(input, this.weight);
        if (this.bias) out = backend.add(out, this.bias);
        return out;
    }
}

export class Embedding extends Module {
    constructor(numEmbeddings, embeddingDim) {
        super();
        this.weight = this.registerParameter('weight', backend.randn([numEmbeddings, embeddingDim]));
    }
    forward(input) {
        // input is indices tensor
        // backend.gather or simple row lookup
        return backend.gather(this.weight, input);
    }
}

export class Sequential extends Module {
    constructor(...modules) {
        super();
        modules.forEach((m, i) => this.registerModule(String(i), m));
        this.layers = modules;
    }
    forward(input) { return this.layers.reduce((x, layer) => layer.forward(x), input); }
}

export class MultiHeadAttention extends Module {
    constructor(dModel, numHeads) {
        super();
        // Uses backend.attention composed op
    }
}
```

#### 2.3 Tests (0.5 hrs)

```javascript
describe('TrainingUtils', () => {
    test('DataLoader shuffles and batches', () => { /* ... */ });
    test('LRScheduler schedules correctly', () => { /* ... */ });
    test('EarlyStopping triggers', () => { /* ... */ });
});
```

---

### Tier 3: Eliminated

> [!NOTE]
> Tier 3 scaffolds are now **inline stubs** in TrainingUtils.js (3 classes, ~10 lines total).  
> No separate files needed for TODO placeholders.

---

### Tier 4: NAL Integration (Deferred)

> [!NOTE]
> Deferred until Tiers 1-3 are complete and stable.

```javascript
// Deferred: Enhanced TruthTensorBridge
truthToTensor(truth, mode, requiresGrad = false)  // gradient-capable
tensorToTruth(tensor, mode)  // with confidence calibration

// Deferred: NAL operations as differentiable tensor ops
revision(t1, t2, k), deduction(p1, p2), induction(p1, p2), abduction(p1, p2)

// Deferred: Belief embedding integration
embedBelief(term, embedding), similaritySearch(embedding, k)
```

---

### Files Summary (Optimized)

| File | Action | Tier | Effort |
|------|--------|------|--------|
| `NativeBackend.js` | MODIFY | 1 | 5 hrs |
| `TensorFunctor.js` | MODIFY | 1 | 1 hr |
| `TrainingUtils.js` | NEW | 2 | 5 hrs |
| `Module.js` | NEW | 2 | 3 hrs |
| Tests | NEW | ALL | 2 hrs |
| **Total** | | | **16 hrs** |

### Phase Summary (Optimized)

| Tier | Focus | Effort | Status |
|------|-------|--------|--------|
| **Tier 1** | Core ops + Initialization | 6 hrs | Ready |
| **Tier 2** | Training ergonomics + Module System | 8 hrs | Ready |
| **Tier 3** | Eliminated (merged into Tier 2) | 0 hrs | Merged |
| **Tier 4** | NAL Integration | ~5 hrs | Deferred |

### Competitive Position After Phase 6.5

| Capability | Rust TL | PyTorch | **SeNARS** |
|------------|---------|---------|------------|
| Einsum | ✅ | ✅ | ✅ (Tier 1) |
| Attention | ✅ | ✅ | ✅ (Tier 1, composed) |
| Layers/Modules | ❌ | ✅ | ✅ (Tier 2, Module.js) |
| Initialization | ❌ | ✅ | ✅ (Tier 1, Kaiming/Xavier) |
| DataLoader | ✅ | ✅ | ✅ (Tier 2) |
| LR Scheduler | ✅ | ✅ | ✅ (Tier 2) |
| Autograd | ✅ | ✅ | ✅ (Done) |
| Graph Optimizer | ✅ | ❌ | Scaffold (Tier 2) |
| ONNX Export | ❌ | ✅ | Scaffold (Tier 2) |

### Phase 6.5 Total: ~20 hrs (~1 week) — *ultra-optimized + full-featured*

---


## Phase 7: RLFP — Reinforcement Learning from Preferences

> **Goal**: Learn reasoning preferences from human feedback  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing), Phase 5 (TensorFunctor)

### 7.1 Trajectory Logger (Complete Skeleton)

**File**: `agent/src/rlfp/ReasoningTrajectoryLogger.js`  
**Effort**: 4 hours

Subscribe to agent events, capture full reasoning traces using DerivationTracer.

### 7.2 Preference Collector

**File**: `agent/src/rlfp/PreferenceCollector.js`  
**Effort**: 4 hours

A/B comparison UI, preference recording.

### 7.3 RLFP Learner with Tensor Support

**File**: `agent/src/rlfp/RLFPLearner.js`  
**Effort**: 2 days

```javascript
class RLFPLearner {
    constructor(tensorFunctor);
    
    // Reward model (neural via TensorFunctor)
    rewardModel(trajectory) → score;
    
    // Preference learning
    trainRewardModel(preferences: Preference[]);
    
    // Policy update
    updatePolicy(trajectory, reward);
}
```

**Leverages TensorFunctor for**:
- Neural reward model (`mlp(trajectory_embedding, score)`)
- Gradient-based policy optimization
- Differentiable NAL (experimental)

### 7.4 Integration Loop

**Effort**: 1 day

```javascript
async function rlfpLoop(agent) {
    const logger = new ReasoningTrajectoryLogger(agent.eventBus);
    const collector = new PreferenceCollector();
    const learner = new RLFPLearner(tensorFunctor);
    
    while (true) {
        const traj1 = await runTask(agent, task);
        const traj2 = await runTask(agent, task, { variant: true });
        
        const preference = await collector.collect(traj1, traj2);
        await learner.trainRewardModel([preference]);
    }
}
```

### Phase 7 Total: ~1 week

---

## Phase 8: Interactive — Demo Runner & Playground

> **Goal**: Visual debugging, heuristic tuning  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing, Serialization)

### 8.1 Enhanced Demo Runner

**Extend**: `agent/src/demo/DemoWrapper.js`  
**Effort**: 4-6 hours

- 🟢 Color-coded output (Belief/Goal/Question)
- 🔴 Duplicate detection
- Filtering by punctuation/priority/depth
- Problem domains: logic, causal, goals, analogy, variables

### 8.2 Web Playground

**Location**: `ui/src/pages/Playground.jsx`  
**Effort**: 3-4 days

- InputPanel (Narsese editor)
- BeliefsPanel (real-time)
- TraceViewer (mermaid from DerivationTracer)
- MemoryGraph (D3 visualization)
- ControlPanel (Step/Run/Pause)

**Leverages**: Existing `ui/src/components/`, `WebSocketManager.js`

### Phase 8 Total: ~1 week

---

## Phase 9: Scale — Advanced Indexing

> **Goal**: Support 100K+ concepts  
> **Effort**: 1-2 weeks  
> **Optional** — defer until needed

```javascript
class TermIndex {
    findByPattern(pattern) → Term[];
    findByOperator(op) → Term[];
    findSimilar(term, k) → Term[];
    topK(k, filter?) → Term[];
}
```

| Scale | Strategy |
|-------|----------|
| <10K | In-memory Map |
| 10K-100K | Trie + B-Tree + LRU |
| 100K-1M | Web Workers |
| 1M+ | External store |

---

## Phase 10: Temporal — NAL-7 (Deferred)

> **Prerequisite**: Temporal representation spec

| Task | Effort |
|------|--------|
| Representation spec | 1 week |
| Operators: `=/>`, `=\>`, `=\|>` | 1 week |
| TemporalBuffer | 1 week |
| NAL-7 rules | 1 week |
| CausalStrategy | 4 hours |

---

## ML Technique Priority

| Technique | Phase | Prereqs | Benefit |
|-----------|-------|---------|---------|
| **TensorFunctor** | 5 | Unifier ✅ | Neural ops as terms |
| **RLFP** | 6 | Phase 6 | Preference learning |
| **Hopfield** | 6+ | Embeddings ✅ | Associative retrieval |
| **Bayesian** | 6+ | None | Principled uncertainty |
| **GNN** | 8+ | Indexing | Graph learning |
| **Differentiable Logic** | 6+ | Phase 6 | End-to-end training |

---

## Ecosystem Status

| Component | Status | Phase |
|-----------|--------|-------|
| MCP Server | ✅ | Done |
| Demo System | ✅ | Done (enhance in 7) |
| Knowledge System | ✅ | Done |
| RLFP | Skeleton | 6 |
| WebSocket API | ✅ | Done |
| REPL | ✅ | Done |
| Tools | ✅ | Done |
| Web Playground | ❌ | 7 |
| TensorFunctor | ❌ | 5 |

---

## Domain Applications

| Domain | Requirements | Phase Ready |
|--------|-------------|-------------|
| **Legal** | Unification ✅ | Now |
| **Education** | Tracing | 4 |
| **Research** | RLFP | 6 |
| **ML Research** | TensorFunctor | 5 |
| **Medical** | Temporal | 9 |
| **Game AI** | Temporal | 9 |

---

## Speculative / Long-Term

| Item | Prereqs |
|------|---------|
| Neuromorphic NARS | Phase 9 |
| Embodied Reasoning | Phase 9 |
| Distributed Multi-Agent | WebSocket ✅ |
| Self-Modifying Architecture | Phase 6 |
| Proof-Carrying Code | Phase 6 |
| Attention-Guided Inference | Embeddings ✅ |
| Belief Compression | Phase 8 |
| Active Learning | Phase 4, 6 |
| Rule Induction | Phase 4, 5 |

---

## Leverage Shortcuts

| Task | Naive | Actual |
|------|-------|--------|
| Tracing | 1 week | **3 hrs** |
| Serialization | 3 days | **2 hrs** |
| Demo Runner | 3-4 days | **4-6 hrs** |
| RLFP | 1 week | **1 week** (after Phase 5) |
| MCP Server | 1 week | **0** (done!) |

---

## Verification

```bash
npm test
npm test -- --testPathPattern=TensorFunctor
npm test -- --testPathPattern=DerivationTracer
node agent/src/mcp/start-server.js
node agent/src/demo/demoRunner.js
node repl/src/Repl.js
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| NAR API | [NAR.js](file:///home/me/senars10/core/src/nar/NAR.js) |
| Unifier | [Unifier.js](file:///home/me/senars10/core/src/term/Unifier.js) |
| Strategies | [strategy/](file:///home/me/senars10/core/src/reason/strategy/) |
| Events | [IntrospectionEvents.js](file:///home/me/senars10/core/src/util/IntrospectionEvents.js) |
| MCP Server | [mcp/Server.js](file:///home/me/senars10/agent/src/mcp/Server.js) |
| Demo System | [demo/](file:///home/me/senars10/agent/src/demo/) |
| RLFP | [rlfp/](file:///home/me/senars10/agent/src/rlfp/) |
| Subsystems | [agent/src/README.md](file:///home/me/senars10/agent/src/README.md) |

---

## Phase Summary

| Phase | Focus | Effort | Unlocks |
|-------|-------|--------|---------|
| **4** | Core Observability | 1 day | Debugging, API |
| **5** | Prolog Enhancements | 1 week | Plugin system, clean builtins |
| **6** | Tensor Logic (Core) | 2 weeks | Autograd, TensorFunctor |
| **6.5** | Tensor Logic (Opt) | 20 hrs | Training, Einsum, Modules |
| **7** | RLFP | 1 week | Preference learning |
| **8** | Interactive | 1 week | Visual debugging |
| **9** | Scale | 1-2 weeks | 100K+ concepts |
| **10** | Temporal | 4 weeks | NAL-7 |

---

*Tensor-first architecture. TensorFunctor enables gradient-based RLFP.*  
*Build on what exists. The subsystems are documented and ready.*
