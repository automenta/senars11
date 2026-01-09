# MeTTa × SeNARS: Implementation Roadmap

> **Philosophy**: Evolutionary refactor toward minimal core. Everything that can be MeTTa should be MeTTa.

---

## Executive Summary

**Goal**: Refactor existing MeTTa implementation (~2000 LOC) into a minimal kernel (~600 LOC JS) + expressive standard library (~400 LOC MeTTa).

**Approach**: Extract, don't rewrite. Preserve working code and tests while migrating logic to MeTTa.

**Timeline**: 4 phases over 2-3 weeks.

**Result**: 
- 50% code reduction
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

### Standard Library (~400 LOC MeTTa)

```
stdlib/
├── core.metta       (~60 LOC)  # Logic, binding, sequencing
├── list.metta       (~50 LOC)  # map, filter, fold, etc
├── match.metta      (~40 LOC)  # Non-deterministic pattern matching
├── types.metta      (~50 LOC)  # Type constraints and checking
├── truth.metta      (~40 LOC)  # Truth value operations
├── nal.metta        (~50 LOC)  # NAL inference rules
├── attention.metta  (~40 LOC)  # ECAN (STI, spreading, decay)
├── search.metta     (~40 LOC)  # DFS, BFS, A*, etc
└── learn.metta      (~30 LOC)  # Rule learning, reinforcement
```

**Total: ~1000 LOC** (vs current ~2000 LOC)

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
- [ ] Kernel tests pass
- [ ] `(+ (* 2 3) 4)` → `10`
- [ ] Pattern matching works: `(= (fib $n) ...)` rules match

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

**Time**: 4 days

---

### Phase 3: Reasoning & Integration (Days 8-11)

**Goal**: NAL rules in MeTTa, deep SeNARS integration.

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

- [ ] **`SeNARSBridge.js`**
  - Register `&derive`, `&truth-ded`, `&truth-ind`, etc
  - `mettaToNars()` / `narsToMetta()` converters
  - Sync STI atoms ↔ NARS Budget (optional enhancement)

**Success Criteria**:
- [ ] Deduction chain: `Socrates → Human → Mortal` with truth propagation
- [ ] Can call `(&derive (Inh cat animal))` from MeTTa
- [ ] Attention spreading works
- [ ] All `examples/metta/logic/` work

**Time**: 4 days

---

### Phase 4: Intelligence & Optimization (Days 12-14)

**Goal**: Self-modification, search, learning.

#### Tasks

- [ ] **`stdlib/search.metta`**
  ```metta
  (= (dfs $g $x $s) (if ($g $s) $s (dfs $g $x ...)))
  (= (bfs $g $x $q) ...)
  ```

- [ ] **`stdlib/learn.metta`**
  ```metta
  (= (learn-rule $p $r $c) (add-atom (= $p $r :conf $c)))
  (= (reinforce $r $δ) ...)
  ```

- [ ] **Performance Enhancements**
  - Measure reduction overhead
  - Add memoization for expensive rules
  - Consider tail-call optimization

- [ ] **Integration Tests**
  - Full reasoning cycles
  - Self-modifying agent demos
  - Hybrid MeTTa + NARS queries

**Success Criteria**:
- [ ] Maze solver using `dfs` or `a*`
- [ ] Agent learns new rules and applies them
- [ ] All tests green
- [ ] Performance acceptable (< 1ms per reduction step)

**Time**: 3 days

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
- [ ] All examples work unchanged
- [ ] New capabilities: introspection, self-modification

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

### Short Term (Week 3)
- [ ] Unify MeTTa STI with SeNARS Budget
- [ ] Add temporal atoms: `(at $t $statement)`
- [ ] Memoization decorator for expensive rules
- [ ] Tail-call optimization

### Medium Term (Month 2)
- [ ] Parallel non-determinism (Promise-based)
- [ ] Probabilistic programming primitives
- [ ] Neural grounding (embeddings as atoms)
- [ ] Distributed Space (multi-machine)

### Long Term (Month 3+)
- [ ] Full temporal reasoning (NAL-7)
- [ ] Procedural knowledge (operations/goals)
- [ ] Multi-agent protocols
- [ ] Visual programming interface

---

## Getting Started

### Day 1: Setup

```bash
# Create kernel directory
mkdir -p core/src/metta/kernel

# Start with Term extraction
# Open core/src/term/TermFactory.js
# Extract core functionality to kernel/Term.js
```

### Validation Loop

After each file:
```bash
# Run tests
npm test tests/unit/metta/

# Run examples  
node examples/metta/basics/arithmetic.metta

# Benchmark
node benchmarks/reduction-speed.js
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

*Version 7.0 — Validated via Simulation*
*Last Updated: 2026-01-09*
