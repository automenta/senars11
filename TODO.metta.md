# MeTTa × SeNARS: Implementation Roadmap

> **Philosophy**: Evolutionary refactor toward minimal core. Everything that can be MeTTa should be MeTTa.

---

## Executive Summary

**Goal**: Refactor existing MeTTa implementation (~2000 LOC) into a minimal kernel (~600 LOC JS) + expressive standard library (~400 LOC MeTTa).

**Approach**: Extract, don't rewrite. Preserve working code and tests while migrating logic to MeTTa.

**Timeline**: 4 phases over 3-4 weeks.

**Result**: 
- 40% code reduction (~1200 → ~700 LOC)
- Total flexibility (everything is MeTTa rules)
- Full introspection and self-modification
- Stronger SeNARS integration
- Easier to extend and maintain

---

## What We're Building

### Kernel (~600 LOC JavaScript)

```
kernel/
├── Term.js          (~60 LOC)  # Interned atoms, structural equality
├── Space.js         (~80 LOC)  # Set + functor index
├── Unify.js         (~80 LOC)  # Pattern matching with occurs check
├── Reduce.js        (~80 LOC)  # Single-step rewriting
├── Ground.js        (~50 LOC)  # Native function registry

Parser.js            (~80 LOC)  # String → Atom
MeTTaInterpreter.js  (~100 LOC) # Wire kernel + load stdlib
SeNARSBridge.js      (~70 LOC)  # Bidirectional MeTTa ↔ NARS
```

### Standard Library (~500 LOC MeTTa)

```
stdlib/
├── core.metta       (~60 LOC)  # Logic, binding, sequencing
├── list.metta       (~50 LOC)  # map, filter, fold, etc
├── match.metta      (~40 LOC)  # Non-deterministic pattern matching
├── types.metta      (~50 LOC)  # Type constraints and checking
├── truth.metta      (~40 LOC)  # Truth value operations
├── nal.metta        (~50 LOC)  # NAL inference rules
├── attention.metta  (~40 LOC)  # ECAN (STI, spreading, decay)
├── control.metta    (~60 LOC)  # Meta-reasoning, strategy scripting
├── search.metta     (~50 LOC)  # DFS, BFS, A*, etc
└── learn.metta      (~30 LOC)  # Rule learning, reinforcement
```

### Demonstrations & Examples (~300 LOC MeTTa)

**Phase 4 Core Demos** (3 demos, ~200 LOC):
```
demos/
├── maze_solver.metta         (~80 LOC)  # Grid pathfinding with A*
├── adaptive_reasoning.metta  (~70 LOC)  # Strategy switching demo
└── truth_chain.metta         (~50 LOC)  # Multi-step deduction
```

**Examples** (6 examples, ~150 LOC):
```
examples/metta/
├── basics/
│   ├── arithmetic.metta      (~20 LOC)  # Basic math operations
│   ├── lists.metta           (~30 LOC)  # List manipulation
│   └── functions.metta       (~20 LOC)  # Lambda, let, closures
└── logic/
    ├── socrates.metta        (~30 LOC)  # Classic deduction
    ├── inheritance.metta     (~25 LOC)  # NAL inheritance rules
    └── revision.metta        (~25 LOC)  # Truth revision
```

**Extended Demo Ecosystem** (40+ demos - see [PROTOTYPE_DEMOS.md](file:///home/me/senars11/PROTOTYPE_DEMOS.md)):
- **11 Categories** (A-K): Explainability, Temporal, Uncertainty, Memory, Adversarial, Analogical, Meta-Cognition, Resource-Bounded, Learning, Compositional, Multi-Agent
- **10 NARL Benchmarks**: Progressive difficulty levels (Trace → Compose)
- **Integration**: Post-MVP expansion (Month 2+)

**Total: ~1100 LOC** (vs current ~1200 LOC)

---

## Trade-offs

### What We Gain ✅

| Benefit | Impact |
|---------|--------|
| **Code Reduction** | 50% smaller codebase |
| **Flexibility** | Hot-swap any logic without restart |
| **Introspection** | Query system rules via `(match &self ...)` |
| **Self-Modification** | System can learn new rules |
| **Composability** | Small functions combine into complex behaviors |
| **Clarity** | Logic is declarative MeTTa, not imperative JS |
| **Testability** | MeTTa rules can be tested in isolation |

### What We Keep ✅

| Preserved | Status |
|-----------|--------|
| **All tests pass** | Refactor guided by test suite |
| **Examples work** | No breaking changes to demos |
| **SeNARS integration** | Bridge preserved and enhanced |
| **Performance** | Similar or better (functor indexing) |

### What We Accept ⚠️

| Trade-off | Mitigation |
|-----------|------------|
| **LOC not 200** | V5's 200 LOC didn't include parser/errors. 600 is honest. |
| **Not pure minimal** | Pragmatism over purity. Infrastructure adds real value. |
| **Slower than C++** | JS is 5x slower than theoretical optimal, but fast enough. |
| **Incomplete SeNARS** | Doesn't leverage Attention/Temporal yet. Can add later. |

---

## Implementation Phases

### Phase 1: Extract Kernel (Days 1-3)

**Goal**: Pull minimal primitives from existing working code.

#### Tasks

- [ ] **`kernel/Term.js`** (Extract from `TermFactory`)
  - Interned symbols for O(1) equality
  - `sym()`, `var()`, `exp()` constructors
  - Structural `equals()`
  
- [ ] **`kernel/Space.js`** (Simplify `MeTTaSpace`)
  - Remove NARS-specific logic
  - Core: `add()`, `remove()`, `has()`, `all()`
  - Add functor index: `rulesFor(op)`
  
- [ ] **`kernel/Unify.js`** (Extract from `MeTTaHelpers`)
  - `unify(pattern, term, bindings)` with occurs check
  - `subst(template, bindings)`
  
- [ ] **`kernel/Reduce.js`** (Simplify `ReductionEngine`)
  - `step(atom, space, ground)` - single reduction
  - `reduce(atom, space, ground, limit)` - full reduction
  - Indexed rule lookup via `space.rulesFor('=')`
  
- [ ] **`kernel/Ground.js`** (Simplify `GroundedAtoms`)
  - Function registry
  - Core ops: `+`, `-`, `*`, `/`, `<`, `>`, `==`
  - Space ops: `add-atom`, `rm-atom`, `get-atoms`
  - I/O: `print`, `now`

**Success Criteria**:
- [ ] Kernel tests pass: `npm test tests/unit/metta/kernel/`
- [ ] `(+ (* 2 3) 4)` → `10`
- [ ] Pattern matching works: `(= (fib $n) ...)` rules match

**Checkpoint 1 Validation**:
```bash
# After Phase 1 completion
npm test tests/unit/metta/
node -e "const {Term} = require('./core/src/metta/kernel/Term'); console.log('Term OK');"
node -e "const {Space} = require('./core/src/metta/kernel/Space'); console.log('Space OK');"
```

**Time**: 3 days

---

### Phase 2: Bootstrap Standard Library (Days 4-7)

**Goal**: Move logic from JS to MeTTa.

#### Tasks

- [ ] **`stdlib/core.metta`**
  ```metta
  (= (if True $t $_) $t)
  (= (if False $_ $e) $e)
  (= (let $x $v $b) ((λ $x $b) $v))
  (= ((λ $x $b) $v) (subst $x $v $b))
  ```

- [ ] **`stdlib/list.metta`**
  ```metta
  (= (map $f ()) ())
  (= (map $f (: $h $t)) (: ($f $h) (map $f $t)))
  (= (fold $f $z ()) $z)
  (= (fold $f $z (: $h $t)) (fold $f ($f $h $z) $t))
  ```

- [ ] **`stdlib/match.metta`**
  ```metta
  (= (match $s $p $t)
     (let $a (elem $s)
       (let $θ (unify $p $a)
         (if (ok? $θ) (subst $t $θ) ()))))
  ```

- [ ] **`stdlib/types.metta`**
  ```metta
  (: + (-> Num Num Num))
  (= (typeof $x) (match &self (: $x $t) $t))
  ```

- [ ] **`Parser.js`** 
  - S-expression tokenizer
  - `parse(string)` → `Term`

- [ ] **`MeTTaInterpreter.js`**
  - Wire kernel components
  - Load stdlib on initialization
  - Public API: `run(code)`, `load(file)`

**Success Criteria**:
- [ ] `(map (λ $x (* $x 2)) (: 1 (: 2 ())))` → `(: 2 (: 4 ()))`
- [ ] Type errors caught: `(+ "string" 5)` → `TypeError`
- [ ] All `examples/metta/basics/` work

**Checkpoint 2 Validation**:
```bash
# After Phase 2 completion
npm test tests/unit/metta/
node examples/metta/basics/arithmetic.metta || echo "Create this example"
node -e "const {MeTTaInterpreter} = require('./core/src/metta/MeTTaInterpreter'); const m = new MeTTaInterpreter(); console.log(m.run('(+ 1 2)'));"
```

**Time**: 4 days

---

### Phase 3: Reasoning & Meta-Control (Days 8-12)

**Goal**: NAL rules in MeTTa, deep SeNARS integration, meta-reasoning.

#### Tasks

- [ ] **`stdlib/truth.metta`**
  ```metta
  (= (tv $f $c) (TV $f $c))
  (= (truth-ded $t1 $t2) (&truth-ded $t1 $t2))
  ```

- [ ] **`stdlib/nal.metta`**
  ```metta
  (= (ded (Inh $s $m) (Inh $m $p))
     (Inh $s $p :tv (truth-ded (tv-of $1) (tv-of $2))))
  ```

- [ ] **`stdlib/attention.metta`**
  ```metta
  (= (sti $a) (match &self (STI $a $v) $v))
  (= (spread $a $d) (map ...))
  ```

- [ ] **`stdlib/control.metta`** *(NEW)*
  ```metta
  ; Strategy scripting - MeTTa-driven reasoning control
  (= (select-premises $task $n)
     (top-n (sort-by-sti (get-related $task)) $n))
  
  (= (adaptive-strategy $task)
     (if (< (confidence-of $task) 0.5)
         (exploratory-selection $task)
         (conservative-selection $task)))
  ```

- [ ] **Introspection Primitives** *(NEW)*
  - Expose `&get-sti`, `&set-sti` for Budget interaction
  - Add `&system-stats` for metrics access
  - Bind `&get-related` to concept link traversal

- [ ] **`SeNARSBridge.js`**
  - Register `&derive`, `&truth-ded`, `&truth-ind`, etc
  - Register control primitives (`&nars-derive`, `&get-concept`)
  - `mettaToNars()` / `narsToMetta()` converters
  - Sync STI atoms ↔ NARS Budget

**Success Criteria**:
- [ ] Deduction chain: `Socrates → Human → Mortal` with truth propagation
- [ ] Can call `(&derive (Inh cat animal))` from MeTTa
- [ ] Strategy switching: `(adaptive-strategy ...)` selects different premises
- [ ] Introspection: `(&system-stats)` returns atom count, STI distribution
- [ ] All `examples/metta/logic/` work

**Checkpoint 3 Validation**:
```bash
# After Phase 3 completion
npm test tests/unit/metta/
npm test tests/integration/metta/
node examples/metta/logic/socrates.metta || echo "Create this example"
node -e "const m = new MeTTaInterpreter(); m.run('(&system-stats)');"
```

**Time**: 5 days

---

### Phase 4: Intelligence & Capability (Days 13-16)

**Goal**: Self-modification, search, learning, capability demonstrations.

#### Tasks

- [ ] **`stdlib/search.metta`**
  ```metta
  (= (dfs $goal $state)
     (if ($goal $state) $state
         (first-success (map (dfs $goal) (successors $state)))))
  
  (= (astar $goal $heuristic $frontier)
     (let $best (min-by $heuristic $frontier)
       (if ($goal $best) $best
           (astar $goal $heuristic 
                  (merge (remove $best $frontier) (successors $best))))))
  ```

- [ ] **`stdlib/learn.metta`**
  ```metta
  (= (learn-rule $p $r $c) (add-atom (= $p $r :conf $c)))
  (= (reinforce $r $δ) ...)
  ```

- [ ] **Capability Demonstrations** *(NEW)*
  - **`demos/maze_solver.metta`** (~80 LOC)
    - 10x10 grid representation as atoms
    - DFS and A* implementations from `search.metta`
    - Heuristic: Manhattan distance to goal
    - Output: Path + step count + timing
  
  - **`demos/adaptive_reasoning.metta`** (~70 LOC)
    - Two strategies: exploratory (low confidence) vs conservative (high confidence)
    - Task set with varying confidence levels
    - Demonstrates `(adaptive-strategy $task)` switching
    - Metrics: premise selection distribution
  
  - **`demos/truth_chain.metta`** (~50 LOC)
    - Knowledge base: `(Inh Socrates Human)`, `(Inh Human Mortal)`
    - Multi-step deduction with truth value propagation
    - Shows confidence decay: 0.9 → 0.81 → 0.729...
    - Validates NAL deduction rules

- [ ] **Performance Enhancements**
  - Measure reduction overhead (baseline)
  - Add memoization for expensive rules
  - Consider tail-call optimization

- [ ] **Integration Tests**
  - Full reasoning cycles (MeTTa → NARS → MeTTa)
  - Self-modifying agent: learns rule, applies it
  - Hybrid queries: MeTTa pattern match + NARS inference
  - Control flow: MeTTa strategy selects NARS premises

**Success Criteria**:
- [ ] Maze demo: Solves 10x10 grid in < 100ms
- [ ] Adaptive demo: Shows measurable strategy switching
- [ ] Truth demo: Correct confidence decay across 3+ steps
- [ ] Agent learns new rules and applies them
- [ ] All tests green: `npm test`
- [ ] Performance acceptable (< 1ms per reduction step)

**Checkpoint 4 Validation (Final)**:
```bash
# After Phase 4 completion - FULL VALIDATION
npm test
node demos/maze_solver.metta
node demos/adaptive_reasoning.metta
node demos/truth_chain.metta
node benchmarks/reduction-speed.js
echo "MVP COMPLETE "
```

**Time**: 4 days

---

## Migration Path

### Existing Code Mapping

| Current File | New Location | Notes |
|--------------|--------------|-------|
| `TermFactory.js` | `kernel/Term.js` | Extract core, keep factory as adapter |
| `MeTTaSpace.js` | `kernel/Space.js` | Simplify, remove NARS coupling |
| `MeTTaHelpers.js` (Unification) | `kernel/Unify.js` | Extract pure functions |
| `ReductionEngine.js` | `kernel/Reduce.js` | Simplify to step/reduce |
| `GroundedAtoms.js` | `kernel/Ground.js` | Keep as registry |
| `NonDeterminism.js` | `stdlib/match.metta` | Move logic to MeTTa |
| `TypeSystem.js` | `stdlib/types.metta` | Express as constraint rules |
| `MacroExpander.js` | (Remove) | Macros are just early reduction |
| `SeNARSBridge.js` | `SeNARSBridge.js` | Enhance with grounded ops |
| `MeTTaInterpreter.js` | `MeTTaInterpreter.js` | Simplify to wire kernel |

### Test Migration

All existing tests adapt with minimal changes:

```javascript
// Before
const space = new MeTTaSpace(memory, termFactory);

// After
const space = new Space();
const metta = new MeTTaInterpreter();
```

---

## Success Metrics

### Functional

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All examples work: `examples/metta/basics/` and `examples/metta/logic/`
- [ ] All demos execute successfully: maze solver, adaptive reasoning, truth chain
- [ ] New capabilities: introspection, self-modification, meta-reasoning

### Performance

- [ ] < 1ms per reduction step (current: ~0.5ms, target: maintain)
- [ ] < 10ms for 1000-atom space query (with indexing)
- [ ] Comparable or better than current implementation

### Code Quality

- [ ] ~1000 total LOC (vs current ~2000)
- [ ] Clear separation: kernel (~600) vs stdlib (~400)
- [ ] All public APIs documented
- [ ] Test coverage > 80%

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tests break during refactor | Medium | High | Incremental extraction, run tests after each file |
| Performance regression | Low | Medium | Benchmark before/after, add profiling |
| Missing stdlib features | Medium | Medium | Simulation identified core needs, expand iteratively |
| SeNARS integration issues | Low | High | Preserve bridge, enhance gradually |
| Timeline slip | Medium | Low | Phases are independent, can ship incrementally |

---

## Future Enhancements (Post-MVP)

### Short Term (Week 4-5)
- [ ] Memoization decorator for expensive rules
- [ ] Tail-call optimization
- [ ] Add temporal atoms: `(at $t $statement)`

### Medium Term (Month 2) — Deep SeNARS Integration
- [ ] **Full ECAN Integration**
  - Attention spreading in MeTTa: `(spread-activation $atom $decay)`
  - Forgetting rules: `(decay-sti $threshold)`
- [ ] **Sensor/Effector Binding**
  - `(Sensor $id)` evaluates to fresh data
  - `(&exec $action)` triggers side effects
- [ ] **NARL Benchmark Suite** (10 levels)
  - Level 1-3: Trace, Revise, Persist
  - Level 4-6: Cause, Resist, Uncertain
  - Level 7-10: Analog, Meta, Bound, Compose
  - See [PROTOTYPE_DEMOS.md](file:///home/me/senars11/PROTOTYPE_DEMOS.md) for specifications
- [ ] Parallel non-determinism (Promise-based)
- [ ] Probabilistic programming primitives

### Long Term (Month 3+) — Alternative Implementations & Full Demo Suite
- [ ] **Extended Demo Catalog** (40+ demos)
  - Category A-K demonstrations (see [complete_demo_catalog.md](file:///home/me/.gemini/antigravity/brain/dc2d173d-5ccb-4070-98c1-5ed705e49000/complete_demo_catalog.md))
  - Explainability, Temporal, Uncertainty, Memory, Adversarial
  - Analogical, Meta-Cognition, Resource-Bounded, Learning
  - Compositional, Multi-Agent
- [ ] Multiple type systems (structural, gradual, dependent) in MeTTa
- [ ] Pluggable search strategies as MeTTa modules
- [ ] Neural grounding (embeddings as atoms)
- [ ] Distributed Space (multi-machine)
- [ ] Full temporal reasoning (NAL-7)
- [ ] Multi-agent protocols
- [ ] Visual programming interface

---

## Execution Guide

### Directory Structure (Create First)

```bash
# Create all directories upfront
mkdir -p core/src/metta/kernel
mkdir -p core/src/metta/stdlib
mkdir -p demos
mkdir -p examples/metta/basics
mkdir -p examples/metta/logic
mkdir -p tests/unit/metta/kernel
mkdir -p tests/integration/metta
mkdir -p benchmarks
```

### Phase 1 Execution (Days 1-3)

```bash
# Day 1: Term.js extraction
cp core/src/term/TermFactory.js core/src/metta/kernel/Term.js
# Edit to extract: sym(), var(), exp(), equals()
npm test tests/unit/metta/

# Day 2: Space.js + Unify.js
# Extract from MeTTaSpace.js and MeTTaHelpers.js
npm test tests/unit/metta/

# Day 3: Reduce.js + Ground.js
# Extract from ReductionEngine.js and GroundedAtoms.js
npm test tests/unit/metta/
```

### Phase 2 Execution (Days 4-7)

```bash
# Day 4-5: Create stdlib/*.metta files
touch core/src/metta/stdlib/core.metta
touch core/src/metta/stdlib/list.metta
touch core/src/metta/stdlib/match.metta
touch core/src/metta/stdlib/types.metta

# Day 6-7: Wire interpreter + load stdlib
# Update MeTTaInterpreter.js to use kernel
npm test tests/unit/metta/
```

### Phase 3 Execution (Days 8-12)

```bash
# Day 8-9: truth.metta + nal.metta
touch core/src/metta/stdlib/truth.metta
touch core/src/metta/stdlib/nal.metta

# Day 10-11: control.metta + attention.metta
touch core/src/metta/stdlib/control.metta
touch core/src/metta/stdlib/attention.metta

# Day 12: SeNARSBridge enhancements
# Add &get-sti, &set-sti, &system-stats, &nars-derive
npm test tests/unit/metta/
npm test tests/integration/metta/
```

### Phase 4 Execution (Days 13-16)

```bash
# Day 13: search.metta + learn.metta
touch core/src/metta/stdlib/search.metta
touch core/src/metta/stdlib/learn.metta

# Day 14-15: Capability demos
touch demos/maze_solver.metta
touch demos/adaptive_reasoning.metta
touch demos/truth_chain.metta

# Day 16: Integration tests + performance
npm test
node benchmarks/reduction-speed.js
```

### Daily Validation Checklist

```bash
# Run after every significant change
npm test tests/unit/metta/       # Must pass
git status                         # Track changes
git add -A && git commit -m "..."  # Commit frequently
```

### File Dependencies

```
Phase 1 (Kernel):
  Term.js      ← standalone
  Space.js     ← Term.js
  Unify.js     ← Term.js
  Reduce.js    ← Term.js, Space.js, Unify.js
  Ground.js    ← Term.js

Phase 2 (Stdlib):
  core.metta   ← kernel complete
  list.metta   ← core.metta
  match.metta  ← core.metta
  types.metta  ← core.metta

Phase 3 (Reasoning):
  truth.metta     ← core.metta
  nal.metta       ← truth.metta
  control.metta   ← core.metta
  attention.metta ← control.metta

Phase 4 (Intelligence):
  search.metta ← core.metta, list.metta
  learn.metta  ← core.metta, nal.metta
  demos/*      ← all stdlib
```

---

## Conclusion

This roadmap balances:
- **Elegance**: Minimal kernel, expressive MeTTa
- **Pragmatism**: Extract from working code, don't rewrite
- **Capability**: Full NAL, types, learning, introspection
- **Integration**: Preserve and enhance SeNARS bridge

**We're not building the theoretical minimum.** We're building **the practical minimum that works.**

The result will be a powerful, flexible foundation that can grow into whatever we need.

---

*Version 7.2 — Final with Execution Guide*
*Last Updated: 2026-01-09*
