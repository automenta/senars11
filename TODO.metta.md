# MeTTa × SeNARS: Unified Cognitive Architecture

> **Vision**: A self-describing, meta-programmable reasoning system where logic, control, and knowledge share a unified representation—enabling the system to reason about and modify its own reasoning.

---

## Architectural Principles

| Principle | Manifestation |
|-----------|---------------|
| **Homoiconicity** | Rules, data, and control are all atoms in the same space |
| **Meta-Circularity** | The interpreter can interpret itself; rules can rewrite rules |
| **Grounded Abstraction** | Symbolic reasoning with escape hatches to native computation |
| **Non-Deterministic Completeness** | Superposition semantics for exhaustive search |
| **Uncertainty-Native** | Truth values as first-class citizens, not bolted on |
| **Composable Inference** | Small inference rules compose into complex reasoning |
| **Observable Execution** | Every operation emits events; the system is fully introspectable |

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                            │
│   Demos · Agents · Domain Applications · External Integrations      │
├─────────────────────────────────────────────────────────────────────┤
│                       META-COGNITION LAYER                          │
│   Attention (ECAN) · Strategy Selection · Self-Modification         │
├─────────────────────────────────────────────────────────────────────┤
│                        REASONING LAYER                              │
│   NAL Rules · PLN Inference · Planning · Learning                   │
├─────────────────────────────────────────────────────────────────────┤
│                       INTERPRETATION LAYER                          │
│   MeTTaInterpreter · ReductionEngine · NonDeterminism · Macros     │
├─────────────────────────────────────────────────────────────────────┤
│                       REPRESENTATION LAYER                          │
│   MeTTaSpace · TypeSystem · MatchEngine · GroundedAtoms            │
├─────────────────────────────────────────────────────────────────────┤
│                        FOUNDATION LAYER                             │
│   TermFactory · BaseMeTTaComponent · EventBus · Memory              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

### Foundation Layer ✅
| Component | File | Status |
|-----------|------|--------|
| Term Factory | `core/src/term/TermFactory.js` | ✅ Complete |
| Base Component | `helpers/BaseMeTTaComponent.js` | ✅ Complete |
| Event System | SeNARS EventBus | ✅ Integrated |

### Representation Layer ✅
| Component | File | Status |
|-----------|------|--------|
| MeTTa Space | `MeTTaSpace.js` | ✅ Memory sync |
| Match Engine | `MatchEngine.js` | ✅ Unification |
| Type System | `TypeSystem.js`, `TypeChecker.js` | ✅ H-M inference |
| Grounded Atoms | `GroundedAtoms.js` | ✅ Arithmetic/Logic |

### Interpretation Layer ✅
| Component | File | Status |
|-----------|------|--------|
| Interpreter | `MeTTaInterpreter.js` | ✅ Core ops |
| Reduction Engine | `ReductionEngine.js` | ✅ Evaluation |
| Non-Determinism | `NonDeterminism.js` | ✅ Superposition |
| Macro Expander | `MacroExpander.js` | ✅ Basic macros |

### Reasoning Layer ⏳
| Component | File | Status |
|-----------|------|--------|
| SeNARS Bridge | `SeNARSBridge.js` | ✅ Bidirectional |
| Rule Adapter | `helpers/MeTTaRuleAdapter.js` | ✅ Basic |
| NAL in MeTTa | `stdlib/rules_nal.metta` | ❌ Pending |
| PLN Functions | (grounded) | ❌ Pending |

### Meta-Cognition Layer ❌
| Component | File | Status |
|-----------|------|--------|
| ECAN Attention | - | ❌ Not started |
| MeTTa Strategies | `strategies/MeTTaStrategy.js` | ❌ Pending |
| Self-Modification | - | ❌ Pending |

---

## 🏗️ Track 1: Unified Knowledge Foundation

> **Goal**: Single source of truth where MeTTa atoms and NARS tasks are interchangeable views of the same knowledge.

### 1.1 Canonical Atom-Task Mapping

```javascript
// Bidirectional isomorphism: Atom ↔ Task
class AtomTaskIsomorphism {
    // MeTTa Atom → NARS Task
    atomToTask(atom, punctuation = '.') {
        return {
            term: atom,
            punctuation,
            truth: this.extractTruth(atom),
            budget: this.extractBudget(atom),
            stamp: this.extractStamp(atom)
        };
    }
    
    // NARS Task → MeTTa Atom (with metadata)
    taskToAtom(task) {
        return this.termFactory.compound('Task', [
            task.term,
            this.termFactory.compound('tv', [task.truth.f, task.truth.c]),
            this.termFactory.compound('budget', [task.budget.priority])
        ]);
    }
}
```

**Truth Value Extraction Protocol:**
```metta
; Explicit truth annotation
(Statement :tv (0.9 0.8))

; Confidence-only (default f=0.9)
(Statement :conf 0.8)

; Bare statement (default <0.9, 0.9>)
Statement

; PLN-style with evidence
(TruthValue Statement (Evidence $pos $neg))
```

### 1.2 Space as PremiseSource

```javascript
class MeTTaSpace extends BaseMeTTaComponent {
    // PremiseSource interface for Reasoner
    async *stream(signal) {
        for (const atom of this.atoms) {
            if (signal?.aborted) return;
            yield this.isomorphism.atomToTask(atom);
        }
    }
    
    // Indexed retrieval
    getByFunctor(functor) {
        return this.functorIndex.get(functor) ?? [];
    }
    
    getByType(type) {
        return this.typeIndex.get(type) ?? [];
    }
}
```

### 1.3 Multi-Index Architecture

| Index Type | Key | Value | Use Case |
|------------|-----|-------|----------|
| Functor Index | `functor` | `Set<Atom>` | Fast pattern head matching |
| Type Index | `type` | `Set<Atom>` | Type-directed retrieval |
| Arity Index | `(functor, arity)` | `Set<Atom>` | Structural filtering |
| Truth Index | `confidence bucket` | `Set<Atom>` | Certainty-based selection |
| Recency Index | `timestamp` | `SortedSet<Atom>` | Temporal reasoning |

```javascript
class IndexedSpace extends MeTTaSpace {
    constructor(memory, termFactory) {
        super(memory, termFactory);
        this.indices = {
            functor: new Map(),
            type: new Map(),
            arityFunctor: new Map(),
            confidence: new BucketedIndex(10), // 10 buckets
            recency: new SortedSet((a, b) => b.timestamp - a.timestamp)
        };
    }
    
    addAtom(atom) {
        super.addAtom(atom);
        this._updateIndices(atom, 'add');
    }
}
```

### 1.4 Deliverables

- [ ] `SpaceToTaskAdapter.js` - Isomorphism implementation
- [ ] `IndexedSpace.js` - Multi-index extension
- [ ] Update `Reasoner.js` to accept `MeTTaSpace` as PremiseSource
- [ ] Integration test: circular flow (atom → task → derivation → atom)

---

## 🧮 Track 2: Complete Logic System

> **Goal**: All NAL-1 through NAL-8 inference implemented as executable MeTTa rules, with PLN truth functions as grounded atoms.

### 2.1 Truth Function Library

```javascript
// Register ALL truth functions from Truth.js
const TRUTH_FUNCTIONS = {
    // First-order
    'truth:deduction':   (tv1, tv2) => Truth.deduction(tv1, tv2),
    'truth:induction':   (tv1, tv2) => Truth.induction(tv1, tv2),
    'truth:abduction':   (tv1, tv2) => Truth.abduction(tv1, tv2),
    'truth:exemplification': (tv1, tv2) => Truth.exemplification(tv1, tv2),
    
    // Revision
    'truth:revision':    (tv1, tv2) => Truth.revision(tv1, tv2),
    
    // Compositional
    'truth:intersection': (tv1, tv2) => Truth.intersection(tv1, tv2),
    'truth:union':        (tv1, tv2) => Truth.union(tv1, tv2),
    'truth:difference':   (tv1, tv2) => Truth.difference(tv1, tv2),
    
    // Higher-order
    'truth:analogy':     (tv1, tv2) => Truth.analogy(tv1, tv2),
    'truth:comparison':  (tv1, tv2) => Truth.comparison(tv1, tv2),
    'truth:resemblance': (tv1, tv2) => Truth.resemblance(tv1, tv2),
    
    // Negation
    'truth:negation':    (tv) => Truth.negation(tv),
    'truth:contraposition': (tv) => Truth.contraposition(tv),
    
    // Temporal
    'truth:eternalization': (tv) => Truth.eternalization(tv),
    'truth:projection':     (tv, t1, t2) => Truth.projection(tv, t1, t2)
};
```

### 2.2 NAL Rule Hierarchy

```metta
; ═══════════════════════════════════════════════════════════════════
; NAL-1: Inheritance
; ═══════════════════════════════════════════════════════════════════

(: nal:deduction (-> Statement Statement Statement))
(= (nal:deduction (Inh $S $M) (Inh $M $P))
   (Inh $S $P :tv (truth:deduction (get-tv $1) (get-tv $2))))

(= (nal:induction (Inh $M $P) (Inh $M $S))
   (Inh $S $P :tv (truth:induction (get-tv $1) (get-tv $2))))

(= (nal:abduction (Inh $P $M) (Inh $S $M))
   (Inh $S $P :tv (truth:abduction (get-tv $1) (get-tv $2))))

(= (nal:exemplification (Inh $S $M) (Inh $M $P))
   (Inh $P $S :tv (truth:exemplification (get-tv $1) (get-tv $2))))

; ═══════════════════════════════════════════════════════════════════
; NAL-2: Similarity
; ═══════════════════════════════════════════════════════════════════

(= (nal:comparison (Inh $M $P) (Inh $M $S))
   (Sim $S $P :tv (truth:comparison (get-tv $1) (get-tv $2))))

(= (nal:analogy (Sim $S $P) (Inh $M $S))
   (Inh $M $P :tv (truth:analogy (get-tv $1) (get-tv $2))))

; ═══════════════════════════════════════════════════════════════════
; NAL-3: Set Operations
; ═══════════════════════════════════════════════════════════════════

(= (nal:intersection-ext ($A ∩ $B))
   (ExtSet (intersection (members $A) (members $B))))

(= (nal:union-int ($A ∪ $B))
   (IntSet (union (members $A) (members $B))))

; ═══════════════════════════════════════════════════════════════════
; NAL-4: Products and Images
; ═══════════════════════════════════════════════════════════════════

(= (nal:product-deduction (Inh (* $A $B) $R))
   (Inh $A (/ $R $B)))

(= (nal:image-deduction (Inh (/ $R $B) $A))
   (Inh (* $A $B) $R))

; ═══════════════════════════════════════════════════════════════════
; NAL-5: Implication
; ═══════════════════════════════════════════════════════════════════

(= (nal:conditional-deduction (Impl $S $P) $S)
   $P :tv (truth:deduction (get-tv $1) (get-tv $2)))

(= (nal:conditional-abduction (Impl $S $P) $P)
   $S :tv (truth:abduction (get-tv $1) (get-tv $2)))

; ═══════════════════════════════════════════════════════════════════
; NAL-6: Variables
; ═══════════════════════════════════════════════════════════════════

(= (nal:unification (Impl $S1 $P) (Impl $S2 $P))
   (Impl (unify $S1 $S2) $P))

(= (nal:introduction $S)
   (ForAll $x (substitute $S $x)))

; ═══════════════════════════════════════════════════════════════════  
; NAL-7: Temporal
; ═══════════════════════════════════════════════════════════════════

(= (nal:induction-temporal (Seq $A $B) (Seq $A $C))
   (Seq $B $C :tv (truth:induction (get-tv $1) (get-tv $2))))

(= (nal:predictive (Impl/> $S $P) $S)
   $P :after (+ (now) (interval $1)))

; ═══════════════════════════════════════════════════════════════════
; NAL-8: Operations
; ═══════════════════════════════════════════════════════════════════

(= (nal:operation-deduction (Op $name $args) (Goal $G))
   (if (achieves (Op $name $args) $G)
       (Execute (Op $name $args))))
```

### 2.3 Rule Compiler & Optimizer

```javascript
class MeTTaRuleCompiler {
    compile(rules) {
        // Build discrimination tree for O(log n) rule matching
        const tree = new DiscriminationTree();
        
        for (const rule of rules) {
            const pattern = this.extractPattern(rule);
            const action = this.extractAction(rule);
            tree.insert(pattern, { rule, action, priority: this.computePriority(rule) });
        }
        
        return tree;
    }
    
    computePriority(rule) {
        // Priority factors:
        // - Specificity (more specific patterns first)
        // - Frequency of successful application
        // - Computational cost estimate
        return this.specificity(rule) * this.successRate(rule) / this.costEstimate(rule);
    }
}
```

### 2.4 Deliverables

- [ ] `stdlib/truth.metta` - Truth function bindings
- [ ] `stdlib/nal1.metta` through `stdlib/nal8.metta` - Complete NAL
- [ ] `MeTTaRuleCompiler.js` - Discrimination tree compilation
- [ ] Truth value propagation in ReductionEngine
- [ ] Tests for each NAL level with known examples from NARS literature

---

## 🎭 Track 3: Non-Determinism & Search

> **Goal**: Complete superposition semantics with controllable search strategies.

### 3.1 Enhanced Superposition

```javascript
class NonDeterminism extends BaseMeTTaComponent {
    // Lazy superposition (generator-based)
    *superpose(atoms) {
        for (const atom of atoms) {
            yield this.interpreter.reduce(atom);
        }
    }
    
    // Collapse with strategy
    collapse(superposition, strategy = 'all') {
        const results = [...superposition];
        
        switch (strategy) {
            case 'all':     return results;
            case 'first':   return results.slice(0, 1);
            case 'random':  return [results[Math.floor(Math.random() * results.length)]];
            case 'best':    return [this.selectBest(results)];
            case 'sample':  return this.sampleK(results, this.config.sampleSize ?? 10);
        }
    }
    
    // Parallel evaluation with early termination
    async collapseParallel(superposition, predicate) {
        return Promise.race(
            [...superposition].map(async atom => {
                const result = await this.interpreter.reduce(atom);
                if (predicate(result)) return result;
                throw new NotSatisfied();
            })
        );
    }
}
```

### 3.2 Search Strategies

```metta
; Depth-first search (default)
(= (search-dfs $goal $state)
   (if (goal? $state) 
       $state
       (superpose (map (lambda ($action) 
                         (search-dfs $goal (apply $action $state)))
                       (valid-actions $state)))))

; Breadth-first search
(= (search-bfs $goal $frontier)
   (match $frontier (Cons $state $rest)
     (if (goal? $state)
         $state
         (search-bfs $goal (append $rest (successors $state))))))

; A* search with heuristic
(= (search-astar $goal $frontier)
   (let (($best (min-by heuristic $frontier)))
     (if (goal? $best)
         $best
         (search-astar $goal 
           (insert-sorted (successors $best) 
                          (remove $best $frontier))))))

; Iterative deepening
(= (search-iddfs $goal $state)
   (fold-until found?
     (lambda ($depth) (search-dfs-limited $goal $state $depth))
     (iterate inc 1)))
```

### 3.3 Choice Points & Backtracking

```javascript
class ChoicePoint {
    constructor(alternatives, continuation, bindings) {
        this.alternatives = alternatives;
        this.continuation = continuation;
        this.bindings = new Map(bindings);
        this.index = 0;
    }
    
    next() {
        if (this.index >= this.alternatives.length) return null;
        return {
            value: this.alternatives[this.index++],
            bindings: new Map(this.bindings)
        };
    }
    
    hasMore() { return this.index < this.alternatives.length; }
}

class BacktrackingInterpreter extends MeTTaInterpreter {
    constructor(...args) {
        super(...args);
        this.choiceStack = [];
    }
    
    choose(alternatives) {
        if (alternatives.length === 0) {
            return this.backtrack();
        }
        
        if (alternatives.length > 1) {
            this.choiceStack.push(new ChoicePoint(
                alternatives.slice(1),
                this.currentContinuation,
                this.currentBindings
            ));
        }
        
        return alternatives[0];
    }
    
    backtrack() {
        while (this.choiceStack.length > 0) {
            const cp = this.choiceStack.pop();
            const next = cp.next();
            if (next) {
                if (cp.hasMore()) this.choiceStack.push(cp);
                this.currentBindings = next.bindings;
                return next.value;
            }
        }
        return this.termFactory.atomic('Empty');
    }
}
```

### 3.4 Deliverables

- [ ] Lazy generator-based superposition
- [ ] Collapse strategies (first, random, best, sample)
- [ ] `stdlib/search.metta` - Search algorithm library
- [ ] Choice point backtracking interpreter
- [ ] Parallel collapse with early termination

---

## 🎮 Track 4: Scriptable Meta-Reasoning

> **Goal**: Control flow, attention, and strategy are MeTTa programs that the system can introspect and modify.

### 4.1 Attention Allocation (ECAN)

```metta
; Attention values as atom metadata
(: AttentionValue (-> Number Number AtomMeta))
(: STI (-> Atom Number))  ; Short-term importance
(: LTI (-> Atom Number))  ; Long-term importance

; Spreading activation
(= (spread-activation $atom $amount)
   (for-each (links $atom)
     (lambda ($link)
       (let (($target (other-end $link $atom))
             ($portion (* $amount (link-weight $link))))
         (inc-sti $target $portion)))))

; Hebbian learning for link weights
(= (hebbian-update $link)
   (let (($a (source $link))
         ($b (target $link)))
     (set-weight $link 
       (+ (weight $link) 
          (* (learning-rate) (STI $a) (STI $b))))))

; Forgetting (rent collection)
(= (collect-rent)
   (for-each (all-atoms)
     (lambda ($atom)
       (let (($new-sti (- (STI $atom) (rent-amount $atom))))
         (if (< $new-sti (forget-threshold))
             (remove-atom $atom)
             (set-sti $atom $new-sti))))))
```

### 4.2 Strategy Framework

```javascript
class MeTTaStrategy extends BaseMeTTaComponent {
    constructor(strategyCode, interpreter) {
        super({}, 'MeTTaStrategy', null, interpreter.termFactory);
        this.interpreter = interpreter;
        this.strategyFn = this.compile(strategyCode);
    }
    
    compile(code) {
        // Parse strategy definition
        const ast = this.interpreter.parser.parse(code);
        // Extract the main selection function
        return ast.find(node => node.head?.name === 'select-premises');
    }
    
    async selectSecondaryPremises(primary, context) {
        const result = await this.interpreter.run(
            `(select-premises ${this.serialize(primary)} ${this.serialize(context)})`
        );
        return result.map(atom => this.isomorphism.atomToTask(atom));
    }
}
```

```metta
; ═══════════════════════════════════════════════════════════════════
; Strategy: Novelty-Seeking (explore uncertain knowledge)
; ═══════════════════════════════════════════════════════════════════
(= (select-premises:novelty $primary $context)
   (let* (($related (match &self (Related $primary $x) $x))
          ($uncertain (filter (lambda ($t) (< (confidence $t) 0.5)) $related))
          ($sorted (sort-by confidence $uncertain)))
     (take 5 $sorted)))

; ═══════════════════════════════════════════════════════════════════
; Strategy: Exploitation (use confident knowledge)
; ═══════════════════════════════════════════════════════════════════
(= (select-premises:exploit $primary $context)
   (let* (($related (match &self (Related $primary $x) $x))
          ($confident (filter (lambda ($t) (> (confidence $t) 0.8)) $related)))
     (take 5 (sort-by (lambda ($t) (- 1 (confidence $t))) $confident))))

; ═══════════════════════════════════════════════════════════════════
; Strategy: Goal-Directed (prioritize goal-relevant)
; ═══════════════════════════════════════════════════════════════════
(= (select-premises:goal-directed $primary $context)
   (let* (($goals (current-goals))
          ($relevant (filter (lambda ($t) (any (goal-relevant? $t) $goals)) 
                            (premises-for $primary))))
     (sort-by goal-utility $relevant)))

; ═══════════════════════════════════════════════════════════════════
; Meta-Strategy: Adaptive selection based on system state
; ═══════════════════════════════════════════════════════════════════
(= (select-strategy)
   (cond
     ((> (novelty-score) 0.8) novelty)      ; Too predictable → explore
     ((< (goal-progress) 0.2) goal-directed) ; Not progressing → focus
     ((> (cpu-load) 0.9) exploit)            ; Overloaded → use known
     (else balanced)))
```

### 4.3 Self-Modification

```metta
; The system can modify its own rules
(= (learn-rule $premise1 $premise2 $conclusion)
   (let (($pattern (generalize (Pair $premise1 $premise2)))
         ($truth (calculate-truth $premise1 $premise2 $conclusion)))
     (add-atom &self 
       (=> $pattern $conclusion :tv $truth :source learned))))

; Self-optimization: remove low-utility rules
(= (prune-rules)
   (for-each (match &self (=> $p $c :utility $u) (Rule $p $c $u))
     (lambda ($rule)
       (if (< (utility $rule) (prune-threshold))
           (remove-atom &self $rule)))))

; Hot-swap strategy at runtime
(= (adapt-control)
   (let (($new-strategy (select-strategy)))
     (set-current-strategy $new-strategy)
     (log "Switched to strategy: " $new-strategy)))
```

### 4.4 Deliverables

- [ ] `ECAN.js` - Attention value management
- [ ] `MeTTaStrategy.js` - Strategy execution framework
- [ ] `stdlib/attention.metta` - ECAN operations
- [ ] `stdlib/strategies/` - Strategy library
- [ ] Self-modification API (add-atom, remove-atom on &self)
- [ ] Runtime strategy switching

---

## 👁️ Track 5: Perception & Action

> **Goal**: Grounded atoms that connect symbolic reasoning to the world via sensors and effectors.

### 5.1 Sensor Framework

```javascript
class SensorRegistry extends BaseMeTTaComponent {
    constructor(config, eventBus, termFactory) {
        super(config, 'SensorRegistry', eventBus, termFactory);
        this.sensors = new Map();
        this.cache = new Map();
        this.cacheTimeout = config.cacheTimeout ?? 1000;
    }
    
    register(name, sampler, options = {}) {
        this.sensors.set(name, {
            sampler,          // () => value
            rate: options.rate ?? 10,      // Hz
            transform: options.transform ?? (x => x),
            type: options.type ?? 'Number'
        });
    }
    
    sample(name) {
        const sensor = this.sensors.get(name);
        if (!sensor) throw new Error(`Unknown sensor: ${name}`);
        
        const cached = this.cache.get(name);
        if (cached && Date.now() - cached.time < this.cacheTimeout) {
            return cached.value;
        }
        
        const raw = sensor.sampler();
        const value = sensor.transform(raw);
        this.cache.set(name, { value, time: Date.now() });
        
        this.emitMeTTaEvent('sensor-sampled', { name, value });
        return this.termFactory.atomic(String(value));
    }
}
```

```metta
; Built-in sensors
(Sensor time) ;=> current timestamp
(Sensor random) ;=> random float [0,1)
(Sensor memory-load) ;=> heap usage ratio
(Sensor attention-focus) ;=> highest-STI atom

; Custom sensor registration (via grounded)
(&register-sensor "temperature" (lambda () (read-gpio 4)))

; Reactive sensing (trigger on change)
(= (on-change $sensor $threshold $action)
   (let (($current (sample $sensor))
         ($prev (previous-value $sensor)))
     (if (> (abs (- $current $prev)) $threshold)
         $action
         Empty)))
```

### 5.2 Effector Framework

```javascript
class EffectorRegistry extends BaseMeTTaComponent {
    constructor(config, eventBus, termFactory) {
        super(config, 'EffectorRegistry', eventBus, termFactory);
        this.effectors = new Map();
        this.sandboxed = config.sandboxed ?? true;
    }
    
    register(name, executor, options = {}) {
        this.effectors.set(name, {
            executor,
            permissions: options.permissions ?? [],
            sideEffect: options.sideEffect ?? true
        });
    }
    
    execute(name, ...args) {
        const effector = this.effectors.get(name);
        if (!effector) throw new Error(`Unknown effector: ${name}`);
        
        if (this.sandboxed && effector.sideEffect) {
            this.emitMeTTaEvent('effector-request', { name, args, awaiting: 'approval' });
            // In sandboxed mode, queue for approval
            return this.queueForApproval(name, args);
        }
        
        this.emitMeTTaEvent('effector-executed', { name, args });
        return effector.executor(...args);
    }
}
```

```metta
; Safe effectors (always allowed)
(exec (print $message))
(exec (log $level $message))
(exec (emit-event $name $data))

; Controlled effectors (require approval or capability)
(exec (file-write $path $content) :requires (capability file-write))
(exec (http-request $url $method $body) :requires (capability network))
(exec (shell-command $cmd) :requires (capability system))

; Compound actions
(= (save-and-notify $data $path)
   (seq
     (exec (file-write $path $data))
     (exec (emit-event 'saved {:path $path}))))
```

### 5.3 Neural Integration (Optional)

```metta
; Neural network predicates
(: neural-classify (-> Tensor Concept))
(: neural-embed (-> Text Tensor))
(: neural-similarity (-> Tensor Tensor Number))

; Usage
(= (is-cat? $image)
   (> (confidence (neural-classify $image "cat")) 0.8))

; Hybrid reasoning: neural perception + symbolic reasoning
(= (identify-and-reason $image)
   (let (($category (neural-classify $image))
         ($properties (match &self (HasProperty $category $p) $p)))
     (Identified $category $properties)))
```

### 5.4 Deliverables

- [ ] `SensorRegistry.js` - Sensor management
- [ ] `EffectorRegistry.js` - Action execution with sandboxing
- [ ] `stdlib/perception.metta` - Sensor operations
- [ ] `stdlib/action.metta` - Effector operations
- [ ] Built-in sensors (time, random, memory)
- [ ] Capability-based permission system

---

## 🔄 Track 6: Learning & Adaptation

> **Goal**: The system improves its own performance through experience.

### 6.1 Experience-Driven Learning

```metta
; Record experience tuples
(: Experience (-> State Action State Reward Timestamp Experience))

; Store experiences
(= (record-experience $s $a $s' $r)
   (add-atom &self 
     (Experience $s $a $s' $r (now))))

; Learn from experience (temporal difference)
(= (td-update $state $action)
   (let* (($experiences (match &self (Experience $state $action $s' $r $t) 
                               (Exp $s' $r)))
          ($avg-reward (mean (map reward $experiences)))
          ($avg-next-value (mean (map (lambda ($e) (value (next-state $e))) 
                                      $experiences))))
     (set-q-value $state $action 
       (+ $avg-reward (* (gamma) $avg-next-value)))))
```

### 6.2 Rule Learning

```metta
; Inductive rule learning from examples
(= (induce-rule $positive-examples $negative-examples)
   (let* (($generalized (lgg $positive-examples))      ; Least general generalization
          ($specialized (specialize $generalized $negative-examples)))
     (if (valid-rule? $specialized)
         (add-atom &self $specialized)
         Empty)))

; Learn from successful derivations
(= (learn-from-derivation $premises $conclusion)
   (let (($pattern (extract-pattern $premises))
         ($support (length $premises)))
     (if (> $support (min-support))
         (add-atom &self 
           (=> $pattern $conclusion :tv (1.0 (/ 1 (+ 1 $support))))))))
```

### 6.3 Reinforcement Learning Integration

```javascript
class MeTTaRL extends BaseMeTTaComponent {
    constructor(interpreter, config) {
        super(config, 'MeTTaRL', null, interpreter.termFactory);
        this.interpreter = interpreter;
        this.episodeBuffer = [];
        this.qTable = new Map(); // Or neural Q-network
    }
    
    async step(state) {
        // Select action using current policy (ε-greedy)
        const action = this.selectAction(state);
        
        // Execute action
        const result = await this.interpreter.run(`(execute ${action})`);
        
        // Observe new state and reward
        const newState = await this.interpreter.run('(observe-state)');
        const reward = this.computeReward(state, action, newState);
        
        // Store experience
        this.episodeBuffer.push({ state, action, newState, reward });
        
        // Periodic update
        if (this.episodeBuffer.length >= this.config.batchSize) {
            this.update();
        }
        
        return { action, reward, newState };
    }
}
```

### 6.4 Deliverables

- [ ] `MeTTaRL.js` - Reinforcement learning integration
- [ ] `stdlib/learning.metta` - Learning operations
- [ ] Experience buffer and replay
- [ ] Q-learning / policy gradient support
- [ ] Rule induction from examples

---

## 🌐 Track 7: Distribution & Scale

> **Goal**: Scale from single-process to distributed cluster seamlessly.

### 7.1 Remote Space Protocol

```javascript
class RemoteMeTTaSpace extends MeTTaSpace {
    constructor(endpoint, options = {}) {
        super(null, options.termFactory);
        this.endpoint = endpoint;
        this.client = new SpaceClient(endpoint, {
            retries: options.retries ?? 3,
            timeout: options.timeout ?? 5000
        });
    }
    
    async addAtom(atom) {
        const serialized = this.serialize(atom);
        await this.client.post('/atoms', { atom: serialized });
        this.emitMeTTaEvent('remote-atom-added', { endpoint: this.endpoint });
    }
    
    async *match(pattern) {
        const serialized = this.serialize(pattern);
        const stream = this.client.stream('/match', { pattern: serialized });
        
        for await (const chunk of stream) {
            yield this.deserialize(chunk);
        }
    }
    
    async getStats() {
        return this.client.get('/stats');
    }
}
```

### 7.2 Sharding Strategy

```metta
; Shard by concept hash
(= (shard-for $atom)
   (mod (hash (head $atom)) (num-shards)))

; Distributed query (map-reduce)
(= (distributed-match $pattern)
   (let* (($shards (all-shards))
          ($partial-results (pmap (lambda ($s) 
                                    (remote-match $s $pattern)) 
                                  $shards)))
     (flatten $partial-results)))

; Consistency protocol
(= (replicated-add $atom)
   (let (($primary (shard-for $atom))
         ($replicas (replica-shards $primary)))
     (seq
       (remote-add $primary $atom)
       (pmap (lambda ($r) (remote-add $r $atom)) $replicas))))
```

### 7.3 Deliverables

- [ ] `RemoteMeTTaSpace.js` - Remote space client
- [ ] `SpaceServer.js` - HTTP/gRPC server for space operations
- [ ] Sharding strategy implementation
- [ ] Distributed match with map-reduce
- [ ] Replication and consistency

---

## 🎨 Track 8: Capability Demonstrations

> **Goal**: Prove capability parity with OpenCog MeTTa through working demos.

### 8.1 Demo Matrix

| Demo | Category | Capabilities Demonstrated | Status |
|------|----------|---------------------------|--------|
| **Syllogism Prover** | Reasoning | Deduction, chaining, proof generation | 📋 Planned |
| **Maze Solver** | Planning | Search, backtracking, state | 📋 Planned |
| **Family Tree** | Knowledge | Queries, transitive closure | 📋 Planned |
| **Supply Chain** | Decision | PLN, risk, expected utility | 📋 Planned |
| **Negotiation** | Multi-Agent | Multiple spaces, utility | 📋 Planned |
| **Chatbot** | Integration | NL→MeTTa, grounding | 📋 Planned |
| **Learning Agent** | Adaptation | RL, rule learning | 📋 Planned |
| **Self-Optimizer** | Meta | Self-modification, introspection | 📋 Planned |

### 8.2 Demo: Complete Reasoning Chain

```metta
; ═══════════════════════════════════════════════════════════════════
; demos/reasoning/socrates.metta
; Demonstrates: Knowledge assertion, rule application, proof trace
; ═══════════════════════════════════════════════════════════════════

; Knowledge base
(Inheritance Socrates Human :tv (1.0 0.95))
(Inheritance Human Mortal :tv (0.99 0.99))
(Inheritance Mortal BeingThatDies :tv (1.0 0.99))

; Load NAL rules
!(import "stdlib/nal1.metta")

; Query: Is Socrates mortal?
; Should derive via deduction chain:
; Socrates → Human → Mortal

!(trace 
  (derive-with-proof 
    (Inheritance Socrates Mortal)))

; Expected output:
; (Proof 
;   (Inheritance Socrates Mortal :tv (0.99 0.93))
;   (Via deduction
;     (Inheritance Socrates Human :tv (1.0 0.95))
;     (Inheritance Human Mortal :tv (0.99 0.99))))
```

### 8.3 Demo: Planning with Uncertainty

```metta
; ═══════════════════════════════════════════════════════════════════
; demos/planning/supply_chain.metta
; Demonstrates: PLN risk assessment, expected utility, decision making
; ═══════════════════════════════════════════════════════════════════

; Situation: Storm approaching port
(Probability StormHitsPort 0.7 :confidence 0.8)
(Consequence (StormHits PortA) (Delay Shipment 5 days))
(Consequence (StormMisses PortA) (Delay Shipment 0 days))

; Alternative: Reroute to PortB
(Cost Reroute 50000)
(Consequence Reroute (Delay Shipment 2 days))

; Cost of delay
(= (delay-cost $days) (* $days 20000))

; Expected utility calculation
(= (expected-utility $action)
   (- (expected-benefit $action)
      (expected-cost $action)))

; Decision
!(let* (($eu-stay (expected-utility Stay))
        ($eu-reroute (expected-utility Reroute)))
   (if (> $eu-reroute $eu-stay)
       (Decision Reroute :reason (Better $eu-reroute $eu-stay))
       (Decision Stay :reason (Better $eu-stay $eu-reroute))))
```

### 8.4 Deliverables

- [ ] `demos/reasoning/socrates.metta` - Syllogism with proof
- [ ] `demos/planning/maze.metta` - A* maze solver
- [ ] `demos/knowledge/family.metta` - Relational queries
- [ ] `demos/decision/supply_chain.metta` - Risk-based decision
- [ ] `demos/multiagent/negotiation.metta` - Two-agent trade
- [ ] `demos/learning/rl_gridworld.metta` - RL agent
- [ ] `demos/meta/self_optimizer.metta` - Self-modifying system

---

## 🔧 Track 9: Developer Experience

> **Goal**: Make MeTTa development delightful with excellent tooling.

### 9.1 Interactive REPL

```javascript
class MeTTaREPL {
    constructor(interpreter) {
        this.interpreter = interpreter;
        this.history = [];
        this.bindings = new Map();
    }
    
    async evaluate(input) {
        // Special commands
        if (input.startsWith(':')) {
            return this.command(input.slice(1));
        }
        
        this.history.push(input);
        
        try {
            const result = await this.interpreter.run(input);
            return { success: true, value: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    command(cmd) {
        const [name, ...args] = cmd.split(' ');
        switch (name) {
            case 'trace': return this.toggleTrace();
            case 'stats': return this.showStats();
            case 'space': return this.inspectSpace();
            case 'type':  return this.showType(args[0]);
            case 'load':  return this.loadFile(args[0]);
            case 'save':  return this.saveSession(args[0]);
            case 'help':  return this.showHelp();
        }
    }
}
```

### 9.2 Visualization

```javascript
class MeTTaVisualizer {
    // Space as graph
    renderSpaceGraph(space, options = {}) {
        const nodes = space.getAtoms().map(atom => ({
            id: atom.id,
            label: atom.toString(),
            type: this.atomType(atom)
        }));
        
        const edges = this.extractLinks(space);
        
        return { nodes, edges, layout: options.layout ?? 'force' };
    }
    
    // Reduction trace as tree
    renderReductionTrace(trace) {
        return {
            type: 'tree',
            root: trace.initial,
            children: trace.steps.map(step => ({
                rule: step.rule,
                before: step.before,
                after: step.after
            }))
        };
    }
    
    // Type inference visualization
    renderTypeInference(term, inferredType, constraints) {
        return {
            term: term.toString(),
            type: inferredType.toString(),
            constraints: constraints.map(c => ({
                lhs: c.lhs.toString(),
                rhs: c.rhs.toString()
            }))
        };
    }
}
```

### 9.3 LSP Server

```javascript
// Language Server Protocol for IDE integration
class MeTTaLSP {
    // Hover: show type and documentation
    onHover(position) { /* ... */ }
    
    // Completion: suggest atoms, functions
    onCompletion(position) { /* ... */ }
    
    // Diagnostics: type errors, undefined refs
    onDiagnostics(document) { /* ... */ }
    
    // Go to definition
    onDefinition(position) { /* ... */ }
    
    // Find references
    onReferences(position) { /* ... */ }
}
```

### 9.4 Deliverables

- [ ] `cli/repl.js` - Interactive REPL with commands
- [ ] `viz/SpaceGraph.js` - Space visualization
- [ ] `viz/TraceTree.js` - Reduction trace visualization
- [ ] `lsp/MeTTaLSP.js` - Language server
- [ ] VS Code extension (uses LSP)
- [ ] Web-based playground

---

## 📊 Success Metrics

### Functional Completeness

| Metric | Target | Measurement |
|--------|--------|-------------|
| NAL Coverage | 100% of NAL-1 to NAL-8 | Automated rule tests |
| Demo Parity | All 8 demos working | Integration tests |
| API Completeness | All MeTTa builtins | API test suite |

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Atom throughput | 10K atoms/sec add | Benchmark |
| Query latency | <10ms for 100K atoms | Benchmark |
| Memory per atom | <1KB average | Profiling |
| Reduction steps | <1000 for typical | Tracing |

### Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage | >80% line coverage | Istanbul |
| Type safety | Zero runtime type errors | TypeChecker |
| Documentation | All public APIs documented | JSDoc |

---

## Implementation Phases

### Phase 1: Logic Foundation (Weeks 1-2)
Focus: Tracks 2, 3
- Complete NAL rule library
- Truth function bindings
- Enhanced non-determinism

### Phase 2: Intelligence (Weeks 3-4)
Focus: Tracks 1, 4
- Unified storage
- ECAN attention
- Scriptable strategies

### Phase 3: Grounding (Weeks 5-6)
Focus: Tracks 5, 6
- Sensor/effector framework
- Learning integration
- Perception-action loop

### Phase 4: Scale & Polish (Weeks 7-8)
Focus: Tracks 7, 8, 9
- Distribution basics
- All demos complete
- Developer tooling

---

## Appendix: File Structure

```
core/src/metta/
├── MeTTaInterpreter.js       # Orchestration
├── MeTTaSpace.js             # Atomspace
├── IndexedSpace.js           # Multi-index (NEW)
├── MatchEngine.js            # Unification
├── ReductionEngine.js        # Evaluation
├── NonDeterminism.js         # Superposition
├── BacktrackingInterpreter.js # Choice points (NEW)
├── TypeSystem.js             # Types
├── TypeChecker.js            # Validation
├── GroundedAtoms.js          # Native functions
├── SeNARSBridge.js           # NARS integration
├── MacroExpander.js          # Macros
├── StateManager.js           # State
├── ECAN.js                   # Attention (NEW)
├── MeTTaRL.js                # Learning (NEW)
├── SensorRegistry.js         # Perception (NEW)
├── EffectorRegistry.js       # Action (NEW)
├── RemoteMeTTaSpace.js       # Distribution (NEW)
├── helpers/
│   ├── BaseMeTTaComponent.js
│   ├── MeTTaHelpers.js
│   ├── MeTTaLib.js
│   ├── MeTTaRuleAdapter.js
│   └── MeTTaRuleCompiler.js  # NEW
├── strategies/
│   ├── UnificationStrategy.js
│   └── MeTTaStrategy.js      # NEW
└── stdlib/
    ├── truth.metta           # NEW
    ├── nal1.metta - nal8.metta # NEW
    ├── search.metta          # NEW
    ├── attention.metta       # NEW
    ├── perception.metta      # NEW
    ├── action.metta          # NEW
    ├── learning.metta        # NEW
    └── strategies/
        ├── novelty.metta     # NEW
        ├── exploit.metta     # NEW
        └── goal-directed.metta # NEW
```

---

*Last Updated: 2026-01-09*
*Version: 2.0 - Comprehensive Architecture*
