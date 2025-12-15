# SeNARS Development Plan

> **Semantic Non-Axiomatic Reasoning System**  
> **Status**: Phase 3 Complete | NAL-1 to NAL-6 + NAL-8 | 99.8% Test Pass Rate  
> **Updated**: 2025-12-15

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
   (Tracing, Serialization)      (Functor, Builtins, Is)         (Pure Tensor Logic)
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

### 5.1 TensorFunctor Base — Core Operations

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

### 5.2 Tensor Class — Autograd Support

**File**: `core/src/functor/Tensor.js`  
**Effort**: 2 days

```javascript
/**
 * Tensor - N-dimensional array with optional gradient tracking
 */
class Tensor {
    constructor(data, options = {}) {
        this.data = Array.isArray(data) ? data : [data];
        this.shape = this._inferShape(data);
        this.requiresGrad = options.requiresGrad ?? false;
        this.grad = null;
        this._gradFn = null;
        this._parents = [];
    }

    // === Shape ===
    
    get ndim() { return this.shape.length; }
    get size() { return this.shape.reduce((a, b) => a * b, 1); }

    reshape(newShape) → Tensor;
    transpose(axes?) → Tensor;
    
    // === Arithmetic (creates computation graph) ===
    
    add(other) → Tensor {
        const result = new Tensor(
            this._elementwise(other, (a, b) => a + b),
            { requiresGrad: this.requiresGrad || other.requiresGrad }
        );
        if (result.requiresGrad) {
            result._gradFn = 'add';
            result._parents = [this, other];
        }
        return result;
    }

    mul(other) → Tensor;
    matmul(other) → Tensor;
    
    // === Activations ===
    
    relu() → Tensor {
        const result = new Tensor(
            this.data.map(x => Math.max(0, x)),
            { requiresGrad: this.requiresGrad }
        );
        if (result.requiresGrad) {
            result._gradFn = 'relu';
            result._parents = [this];
        }
        return result;
    }

    sigmoid() → Tensor;
    tanh() → Tensor;
    softmax(axis = -1) → Tensor;

    // === Autograd ===
    
    backward(grad = null) {
        if (!this.requiresGrad) return;
        
        grad = grad ?? new Tensor(this.data.map(() => 1));
        this.grad = this.grad ? this.grad.add(grad) : grad;
        
        // Propagate gradients
        if (this._gradFn && this._parents.length > 0) {
            const grads = this._computeGrad(this._gradFn, grad, this._parents);
            this._parents.forEach((p, i) => {
                if (p.requiresGrad) p.backward(grads[i]);
            });
        }
    }

    _computeGrad(fn, outGrad, parents) → Tensor[] {
        switch (fn) {
            case 'add':
                return [outGrad, outGrad];
            case 'mul':
                return [outGrad.mul(parents[1]), outGrad.mul(parents[0])];
            case 'relu':
                return [outGrad.mul(new Tensor(parents[0].data.map(x => x > 0 ? 1 : 0)))];
            case 'matmul':
                return [
                    outGrad.matmul(parents[1].transpose()),
                    parents[0].transpose().matmul(outGrad)
                ];
            // ... other gradient functions
        }
    }

    // === Serialization ===
    
    toJSON() → object {
        return { data: this.data, shape: this.shape };
    }

    static fromJSON(json) → Tensor {
        return new Tensor(json.data);
    }
}
```

---

### 5.3 Layer Abstraction — Neural Networks as Prolog

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

### 5.4 PrologStrategy Integration

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

### 5.5 Backend Abstraction

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

### 5.6 Gradient-Based Operations

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

### 5.7 Training Loop as Terms

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

### 5.8 Integration Tests

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

### Phase 5 Summary

| Component | File | Effort |
|-----------|------|--------|
| TensorFunctor base | `core/src/functor/TensorFunctor.js` | 3 days |
| Tensor class + autograd | `core/src/functor/Tensor.js` | 2 days |
| Activations | (in TensorFunctor) | 1 day |
| Layer abstraction | (Prolog rules) | 1 day |
| PrologStrategy integration | `core/src/reason/strategy/PrologStrategy.js` | 1 day |
| Backend abstraction | `core/src/functor/backends/` | 2 days |
| Gradient operations | (in TensorFunctor) | 3 days |
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

---

## Phase 6: RLFP — Reinforcement Learning from Preferences

> **Goal**: Learn reasoning preferences from human feedback  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing), Phase 5 (TensorFunctor)

### 6.1 Trajectory Logger (Complete Skeleton)

**File**: `agent/src/rlfp/ReasoningTrajectoryLogger.js`  
**Effort**: 4 hours

Subscribe to agent events, capture full reasoning traces using DerivationTracer.

### 6.2 Preference Collector

**File**: `agent/src/rlfp/PreferenceCollector.js`  
**Effort**: 4 hours

A/B comparison UI, preference recording.

### 6.3 RLFP Learner with Tensor Support

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

### 6.4 Integration Loop

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

### Phase 6 Total: ~1 week

---

## Phase 7: Interactive — Demo Runner & Playground

> **Goal**: Visual debugging, heuristic tuning  
> **Effort**: ~1 week  
> **Prereqs**: Phase 4 (Tracing, Serialization)

### 7.1 Enhanced Demo Runner

**Extend**: `agent/src/demo/DemoWrapper.js`  
**Effort**: 4-6 hours

- 🟢 Color-coded output (Belief/Goal/Question)
- 🔴 Duplicate detection
- Filtering by punctuation/priority/depth
- Problem domains: logic, causal, goals, analogy, variables

### 7.2 Web Playground

**Location**: `ui/src/pages/Playground.jsx`  
**Effort**: 3-4 days

- InputPanel (Narsese editor)
- BeliefsPanel (real-time)
- TraceViewer (mermaid from DerivationTracer)
- MemoryGraph (D3 visualization)
- ControlPanel (Step/Run/Pause)

**Leverages**: Existing `ui/src/components/`, `WebSocketManager.js`

### Phase 7 Total: ~1 week

---

## Phase 8: Scale — Advanced Indexing

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

## Phase 9: Temporal — NAL-7 (Deferred)

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
| **RLFP** | 6 | Phase 5 | Preference learning |
| **Hopfield** | 6+ | Embeddings ✅ | Associative retrieval |
| **Bayesian** | 6+ | None | Principled uncertainty |
| **GNN** | 8+ | Indexing | Graph learning |
| **Differentiable Logic** | 6+ | Phase 5 | End-to-end training |

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
| Proof-Carrying Code | Phase 5 |
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
| **5** | TensorFunctor | 2.5 weeks | Neuro-symbolic, RLFP ML |
| **6** | RLFP | 1 week | Preference learning |
| **7** | Interactive | 1 week | Visual debugging |
| **8** | Scale | 1-2 weeks | 100K+ concepts |
| **9** | Temporal | 4 weeks | NAL-7 |

**Critical Path**: Phase 4 → Phase 5 → Phase 6

---

*Tensor-first architecture. TensorFunctor enables gradient-based RLFP.*  
*Build on what exists. The subsystems are documented and ready.*
