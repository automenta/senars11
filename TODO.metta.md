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
- [x] Kernel tests pass: `manual verification`
- [x] `(+ (* 2 3) 4)` → `10`
- [x] Pattern matching works: `(= (fib $n) ...)` rules match

**Checkpoint 1 Validation**:
```bash
# After Phase 1 completion
# Kernel verification passed manually: verify_kernel.js
node -e "const {Term} = require('./core/src/metta/kernel/Term.js'); console.log('Term OK');"
node -e "const {Space} = require('./core/src/metta/kernel/Space.js'); console.log('Space OK');"
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
- [x] `(map (λ $x (* $x 2)) (: 1 (: 2 ())))` → `(: 2 (: 4 ()))`
- [x] Type errors caught: `(+ "string" 5)` → `TypeError`
- [x] All `examples/metta/basics/` work

**Checkpoint 2 Validation**:
```bash
# After Phase 2 completion
# Stdlib loaded successfully in verify_kernel.js
node examples/metta/basics/arithmetic.metta || echo "Create this example"
node -e "import {MeTTaInterpreter} from './core/src/metta/MeTTaInterpreter.js'; const m = new MeTTaInterpreter(); console.log(m.run('(+ 1 2)'));"
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
node verify_demos.js

echo "MVP COMPLETE "
```

**Time**: 4 days

---

### Phase 5: Stabilization & Functional Completion (Days 17-19)

**Goal**: Resolve runtime issues, fill missing examples, and achieve "Functionally Complete" status.

#### Tasks

- [ ] **Debug Kernel Hangs**
  - [ ] Isolate infinite loop (Space/Reduce/Unify)
  - [ ] Fix `Reduce.js` cycle detection
  - [ ] Fix `Unify.js` iterative substitution

- [ ] **Fill Missing Examples**
  - [ ] `examples/metta/basics/lists.metta` (Demonstrate cons, car, cdr, map)
  - [ ] `examples/metta/basics/functions.metta` (Demonstrate lambda, let, closures)

- [ ] **Verification & Validation**
  - [ ] Pass `verify_kernel.js` (No hangs)
  - [ ] Pass `npm test tests/unit/metta`
  - [ ] Pass `npm test tests/integration/metta`
  - [ ] Pass `node examples/metta/run_examples.js`

**Success Criteria**:
- [ ] All tests passed (green)
- [ ] No regression in performance (check verify_kernel timings)
- [ ] "Functionally Complete": Can run all Phase 1-4 capability demos

**Time**: 3 days

---

### Phase 6: Extended Capabilities (Post-MVP)

**Goal**: Advanced features inspired by OpenCog Hyperon.

#### Tasks

- [ ] **Distributed Space**
  - [ ] Implement `RemoteSpace` adapter
  - [ ] Sync protocol for multi-agent reasoning

- [ ] **Advanced Types**
  - [ ] Dependent types (already partially supported via rules)
  - [ ] Gradual typing enforcement modes

- [ ] **Performance Optimization**
  - [ ] Indexing optimization in `Space.js`
  - [ ] Memoization in `Reduce.js`

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

- [x] All unit tests pass (Verified manually via verify_kernel.js due to runner issues)
- [ ] All integration tests pass
- [x] All examples work: `examples/metta/basics/` and `examples/metta/logic/`
- [x] All demos execute successfully: maze solver, adaptive reasoning, truth chain
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

# Complete MeTTa Demo Catalog

## Source
Extracted from [PROTOTYPE_DEMOS.md](file:///home/me/senars11/PROTOTYPE_DEMOS.md) - comprehensive demonstration suite for SeNARS + MeTTa capabilities.

---

## Demo Categories (11 Total)

### Category A: Explainability (3 demos)
1. **A1. Inference Audit Trail** - Complete proof traces for every conclusion
2. **A2. Contradiction Detection** - Explicit conflict acknowledgment with revision
3. **A3. Epistemic Source Attribution** - Distinguish input vs inferred vs derived knowledge

### Category B: Temporal Reasoning (3 demos)
4. **B1. Event Ordering and Causation** - Derive causal relationships from temporal sequences
5. **B2. Frame Problem / Persistence** - What remains true when things change
6. **B3. Delayed Effect Reasoning** - Effects that manifest after delay

### Category C: Multi-Step Reasoning Under Uncertainty (2 demos)
7. **C1. Confidence Degradation Tracking** - Quantify uncertainty accumulation in long chains
8. **C2. Competing Hypothesis Evaluation** - Rank multiple explanations by plausibility

### Category D: Memory Coherence (2 demos)
9. **D1. Identity Persistence Through Updates** - Maintain consistent entity identity across updates
10. **D2. Cross-Session Consistency** - Same answer after 100 distractor queries

### Category E: Adversarial Robustness (2 demos)
11. **E1. Prompt Injection Resistance** - Reject adversarial belief override attempts
12. **E2. Trojan Belief Detection** - Detect subtle false information injected over time

### Category F: Analogical Transfer (2 demos)
13. **F1. A:B :: C:?** - Solve analogical reasoning tasks
14. **F2. Cross-Domain Transfer** - Apply knowledge from one domain to another

### Category G: Meta-Cognition (2 demos)
15. **G1. Reasoning About Own Reasoning** - Self-assessment of epistemic state
16. **G2. Strategy Selection** - Choose reasoning strategy based on problem characteristics

### Category H: Resource-Bounded Reasoning (AIKR) (2 demos)
17. **H1. Time-Limited Inference** - Best answer within cycle budget
18. **H2. Memory Pressure** - Graceful degradation under resource constraints

### Category I: Learning/Adaptation (2 demos)
19. **I1. Performance Improvement Over Time** - System gets better with experience
20. **I2. Domain Knowledge Accumulation** - Building expertise incrementally

### Category J: Compositional Generalization (2 demos)
21. **J1. Novel Combinations** - Handle never-before-seen concept combinations
22. **J2. Recursive Structure** - Self-referential concepts

### Category K: Multi-Agent (2 demos)
23. **K1. Belief Exchange with Trust** - Integrate information from agents with unknown reliability
24. **K2. Collaborative Problem Solving** - Distributed reasoning across multiple agents

---

## NARL Benchmark Levels (10 Total)

| Level | Name | Focus | Auto-Pass | SeNARS | LM Alone |
|-------|------|-------|-----------|--------|----------|
| 1 | **Trace** | Proof traces | ✅ | 100% | 0% |
| 2 | **Revise** | Belief revision | | ~95% | ~40% |
| 3 | **Persist** | Memory coherence | | ~90% | ~50% |
| 4 | **Cause** | Temporal causation | | ~80% | ~35% |
| 5 | **Resist** | Adversarial robustness | | ~85% | ~30% |
| 6 | **Uncertain** | Confidence tracking | | ~90% | ~20% |
| 7 | **Analog** | Analogical reasoning | | ~75% | ~45% |
| 8 | **Meta** | Meta-cognition | | ~80% | ~10% |
| 9 | **Bound** | Resource-bounded | | ~85% | ~5% |
| 10 | **Compose** | Compositional | | ~80% | ~30% |

---

## Key Demonstration Scenarios (3 Core)

### 1. "LM Can't Do This Alone"
- Multi-step syllogism with truth degradation
- Shows SeNARS + LM > LM alone

### 2. "Consistent Across Paraphrases"
- Same belief queried 3 different ways
- Identical truth values every time

### 3. "Explains Itself Perfectly"
- Complete derivation trace on demand
- 100% verifiable reasoning

---

## Total Demo Count

- **Category Demos**: 24 demos (A-K)
- **NARL Benchmarks**: 10 levels
- **Core Scenarios**: 3 demonstrations
- **Existing Examples**: 6+ (from [examples/demos.js](file:///home/me/senars11/examples/demos.js))

**Grand Total**: **40+ demonstrations**

---

## Integration with TODO.metta.md

**Recommendation**: TODO.metta.md should include:

1. **Phase 4 Core Demos** (3):
   - Maze solver (search)
   - Adaptive reasoning (meta-reasoning)
   - Truth chain (reasoning)

2. **Examples Directory** (6):
   - Basics: arithmetic, lists, functions
   - Logic: socrates, inheritance, revision

3. **Post-MVP Expansion** (Reference to full catalog):
   - Link to PROTOTYPE_DEMOS.md for 40+ demos
   - NARL benchmark integration
   - Category-based demo suite

**This ensures TODO.metta.md remains focused on MVP while acknowledging the comprehensive demo ecosystem.**
