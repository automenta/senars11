# MeTTa × SeNARS: Minimal Core, Maximum Power

> **Philosophy**: A small set of orthogonal primitives that compose into unbounded capability.
> Everything that *can* be MeTTa *should* be MeTTa.

---

## The Insight: Self-Describing Systems

The power of MeTTa lies in its homoiconicity—code, data, and rules share the same representation. This means:

| Instead of... | We implement... |
|---------------|-----------------|
| ECAN attention module in JS | Attention as MeTTa rules operating on atom metadata |
| Strategy classes in JS | Strategies as MeTTa functions the system calls |
| NAL inference engine in JS | NAL rules as MeTTa rewrite rules |
| Learning algorithms in JS | Learning as MeTTa programs that modify `&self` |
| Search algorithms in JS | Search as MeTTa recursive functions |

**The Minimal JS Core** enables the **Maximal MeTTa Surface**.

---

## Minimal JavaScript Core (The "Kernel")

These are the **only** things that must be JavaScript:

```
┌─────────────────────────────────────────────────────┐
│                   JS KERNEL (5 primitives)          │
├─────────────────────────────────────────────────────┤
│  1. TERM     - Immutable S-expression structures    │
│  2. SPACE    - Add, remove, iterate atoms           │
│  3. UNIFY    - Pattern matching with bindings       │
│  4. REDUCE   - Single-step rewriting               │
│  5. GROUND   - JS function escape hatch             │
└─────────────────────────────────────────────────────┘
         ↑ Everything else is MeTTa ↑
```

### Why These 5?

| Primitive | Why JS? | What it enables |
|-----------|---------|-----------------|
| **Term** | Memory representation, structural sharing | All data |
| **Space** | Mutable collection, memory management | Knowledge base |
| **Unify** | Performance-critical, occurs-check | Pattern matching |
| **Reduce** | Evaluation loop, stack management | Computation |
| **Ground** | JS interop, I/O, system calls | World interface |

---

## Current State → Minimal Core Mapping

| Existing Component | Kernel Primitive | Notes |
|--------------------|------------------|-------|
| `TermFactory` | **TERM** | ✅ Complete |
| `MeTTaSpace` | **SPACE** | ✅ Simplify (remove indexing—do in MeTTa) |
| `MatchEngine` + `MeTTaHelpers` | **UNIFY** | ✅ Keep core unification |
| `ReductionEngine` | **REDUCE** | ✅ Simplify to single-step |
| `GroundedAtoms` | **GROUND** | ✅ Keep as escape hatch |
| `NonDeterminism` | MeTTa `superpose` | ⚡ Move logic to MeTTa |
| `TypeSystem` | MeTTa type rules | ⚡ Express types as constraints |
| `MacroExpander` | MeTTa rewrite rules | ⚡ Macros are just early reduction |
| `SeNARSBridge` | Grounded ops | ⚡ Bridge as grounded functions |

**⚡ = Can be simplified or moved to MeTTa**

---

## The Five Kernel Primitives

### 1. TERM (Already Complete)

```javascript
// Minimal term interface
class Term {
    // Structure
    get operator()   // null for atomic, string for compound
    get components() // children for compound
    get name()       // value for atomic/variable
    get isVariable() // true if $-prefixed
    
    // Equality
    equals(other)    // Structural equality
    
    // Factory (via TermFactory)
    static atomic(name)
    static variable(name)
    static compound(op, children)
}
```

### 2. SPACE (Simplify)

```javascript
// Minimal space - just a set with notifications
class Space {
    add(atom)        // → void, emits 'added'
    remove(atom)     // → boolean, emits 'removed'  
    has(atom)        // → boolean
    *[Symbol.iterator]() // → yields all atoms
    
    // Query is just: filter + unify (done in MeTTa)
}
```

**Indexing moves to MeTTa:**
```metta
; Build index as atoms in space
(= (index-by-functor $space)
   (fold (lambda ($atom $idx)
           (let (($f (head $atom)))
             (add $idx (Index $f $atom))))
         (empty-index)
         (atoms $space)))

; Query via index
(= (match-functor $space $functor)
   (match $space (Index $functor $atom) $atom))
```

### 3. UNIFY (Keep, Optimize)

```javascript
// Core unification - the heart of pattern matching
function unify(pattern, term, bindings = {}) {
    // Variable binding
    if (isVariable(pattern)) {
        const name = pattern.name;
        if (name in bindings) return unify(bindings[name], term, bindings);
        return { ...bindings, [name]: term };
    }
    if (isVariable(term)) return unify(term, pattern, bindings);
    
    // Atomic equality
    if (isAtomic(pattern) && isAtomic(term)) {
        return pattern.equals(term) ? bindings : null;
    }
    
    // Compound: unify children
    if (isCompound(pattern) && isCompound(term)) {
        if (pattern.arity !== term.arity) return null;
        for (let i = 0; i < pattern.arity; i++) {
            bindings = unify(pattern.children[i], term.children[i], bindings);
            if (!bindings) return null;
        }
        return bindings;
    }
    
    return null;
}

function substitute(template, bindings) {
    if (isVariable(template)) {
        return bindings[template.name] ?? template;
    }
    if (isCompound(template)) {
        return compound(template.operator, 
            template.children.map(c => substitute(c, bindings)));
    }
    return template;
}
```

### 4. REDUCE (Simplify to Single-Step)

```javascript
// Single reduction step - that's all we need
function step(atom, space, grounded) {
    // 1. Try grounded operation
    if (isCompound(atom) && grounded.has(atom.operator)) {
        return grounded.execute(atom.operator, ...atom.children);
    }
    
    // 2. Try space rules (= pattern result)
    for (const rule of space) {
        if (rule.operator === '=') {
            const [pattern, result] = rule.children;
            const bindings = unify(pattern, atom);
            if (bindings) return substitute(result, bindings);
        }
    }
    
    // 3. Reduce children
    if (isCompound(atom)) {
        const reduced = atom.children.map(c => step(c, space, grounded));
        if (reduced.some((c, i) => c !== atom.children[i])) {
            return compound(atom.operator, reduced);
        }
    }
    
    // 4. Fixed point
    return atom;
}

// Full reduction is just: step until fixed point
function reduce(atom, space, grounded, maxSteps = 1000) {
    for (let i = 0; i < maxSteps; i++) {
        const next = step(atom, space, grounded);
        if (next === atom) return atom;
        atom = next;
    }
    throw new Error('Max steps exceeded');
}
```

### 5. GROUND (Escape Hatch)

```javascript
// Registry of JS functions callable from MeTTa
class Grounded {
    constructor() {
        this.fns = new Map();
        this._registerBuiltins();
    }
    
    register(name, fn) { this.fns.set(name, fn); }
    has(name) { return this.fns.has(name); }
    execute(name, ...args) { return this.fns.get(name)(...args); }
    
    _registerBuiltins() {
        // Arithmetic
        this.register('+', (a, b) => atomic(Number(a.name) + Number(b.name)));
        this.register('-', (a, b) => atomic(Number(a.name) - Number(b.name)));
        this.register('*', (a, b) => atomic(Number(a.name) * Number(b.name)));
        this.register('/', (a, b) => atomic(Number(a.name) / Number(b.name)));
        
        // Comparison
        this.register('<', (a, b) => atomic(Number(a.name) < Number(b.name) ? 'True' : 'False'));
        this.register('>', (a, b) => atomic(Number(a.name) > Number(b.name) ? 'True' : 'False'));
        this.register('==', (a, b) => atomic(a.equals(b) ? 'True' : 'False'));
        
        // Space operations (the bridge)
        this.register('add-atom', (space, atom) => { space.add(atom); return atom; });
        this.register('remove-atom', (space, atom) => atomic(space.remove(atom) ? 'True' : 'False'));
        this.register('get-atoms', (space) => compound('List', [...space]));
    }
}
```

---

## Everything Else: Pure MeTTa

### The Standard Library (`stdlib.metta`)

This single file bootstraps the entire system:

```metta
; ═══════════════════════════════════════════════════════════════════
; PART 1: CORE CONTROL FLOW
; ═══════════════════════════════════════════════════════════════════

; Boolean operations
(= (if True $then $else) $then)
(= (if False $then $else) $else)
(= (and True True) True)
(= (and $x $y) False)
(= (or False False) False)
(= (or $x $y) True)
(= (not True) False)
(= (not False) True)

; Sequencing
(= (seq $a $b) (let ($_ $a) $b))
(= (do $a) $a)
(= (do $a $rest ...) (seq $a (do $rest ...)))

; ═══════════════════════════════════════════════════════════════════
; PART 2: NON-DETERMINISM (No special JS needed!)
; ═══════════════════════════════════════════════════════════════════

; Superposition: Multiple results from single expression
; This is just multiple rules with same head!
(= (choice) 1)
(= (choice) 2)
(= (choice) 3)
; (choice) reduces to 1, 2, OR 3 non-deterministically

; Collapse: Collect all results
(= (collapse $expr)
   (let (($results (collect (reduce $expr))))
     (List $results ...)))

; Match over space
(= (match $space $pattern $template)
   (let (($atom (element-of $space)))
     (let (($bindings (unify $pattern $atom)))
       (if (some? $bindings)
           (substitute $template $bindings)
           Empty))))

; ═══════════════════════════════════════════════════════════════════  
; PART 3: LISTS & ITERATION
; ═══════════════════════════════════════════════════════════════════

(= (cons $h $t) (Cons $h $t))
(= (head (Cons $h $t)) $h)
(= (tail (Cons $h $t)) $t)
(= (nil) Nil)
(= (nil? Nil) True)
(= (nil? (Cons $h $t)) False)

(= (map $f Nil) Nil)
(= (map $f (Cons $h $t)) (cons ($f $h) (map $f $t)))

(= (filter $p Nil) Nil)
(= (filter $p (Cons $h $t))
   (if ($p $h)
       (cons $h (filter $p $t))
       (filter $p $t)))

(= (fold $f $init Nil) $init)
(= (fold $f $init (Cons $h $t))
   (fold $f ($f $h $init) $t))

(= (range $a $a) (cons $a Nil))
(= (range $a $b) (cons $a (range (+ $a 1) $b)))

; ═══════════════════════════════════════════════════════════════════
; PART 4: TYPES AS CONSTRAINTS (No separate TypeSystem!)
; ═══════════════════════════════════════════════════════════════════

; Type declarations are just atoms
(: + (-> Number Number Number))
(: head (-> (List $a) $a))
(: map (-> (-> $a $b) (List $a) (List $b)))

; Type checking is pattern matching
(= (type-of $expr)
   (match &self (: $expr $type) $type))

(= (well-typed? ($f $arg))
   (let* (($ft (type-of $f))
          ($at (type-of $arg)))
     (match $ft (-> $expected $result)
       (unifies? $expected $at))))

; ═══════════════════════════════════════════════════════════════════
; PART 5: NAL TRUTH FUNCTIONS (Grounded for performance)
; ═══════════════════════════════════════════════════════════════════

; Truth value constructors
(= (tv $f $c) (TruthValue $f $c))
(= (frequency (TruthValue $f $c)) $f)
(= (confidence (TruthValue $f $c)) $c)

; Core truth functions (grounded to JS Truth.js)
(= (truth:deduction $tv1 $tv2) (&truth-deduction $tv1 $tv2))
(= (truth:induction $tv1 $tv2) (&truth-induction $tv1 $tv2))
(= (truth:abduction $tv1 $tv2) (&truth-abduction $tv1 $tv2))
(= (truth:revision $tv1 $tv2) (&truth-revision $tv1 $tv2))
(= (truth:negation $tv) (&truth-negation $tv))

; ═══════════════════════════════════════════════════════════════════
; PART 6: NAL INFERENCE RULES
; ═══════════════════════════════════════════════════════════════════

; Deduction: (A → B), (B → C) ⊢ (A → C)
(= (nal:deduction (Inh $a $b :tv $tv1) (Inh $b $c :tv $tv2))
   (Inh $a $c :tv (truth:deduction $tv1 $tv2)))

; Induction: (B → A), (B → C) ⊢ (A → C)  
(= (nal:induction (Inh $b $a :tv $tv1) (Inh $b $c :tv $tv2))
   (Inh $a $c :tv (truth:induction $tv1 $tv2)))

; Abduction: (A → B), (C → B) ⊢ (A → C)
(= (nal:abduction (Inh $a $b :tv $tv1) (Inh $c $b :tv $tv2))
   (Inh $a $c :tv (truth:abduction $tv1 $tv2)))

; Revision: same statement, different evidence
(= (nal:revision ($s :tv $tv1) ($s :tv $tv2))
   ($s :tv (truth:revision $tv1 $tv2)))

; ═══════════════════════════════════════════════════════════════════
; PART 7: ATTENTION (ECAN) - Just metadata manipulation!
; ═══════════════════════════════════════════════════════════════════

; Attention is metadata on atoms
(= (sti $atom) (match &self (STI $atom $v) $v))
(= (lti $atom) (match &self (LTI $atom $v) $v))

(= (set-sti $atom $v)
   (do (remove-atom &self (STI $atom $_))
       (add-atom &self (STI $atom $v))))

; Spreading activation
(= (spread-from $atom $decay)
   (for-each (neighbors $atom)
     (lambda ($n)
       (set-sti $n (+ (sti $n) (* $decay (sti $atom)))))))

; Rent collection (forgetting)
(= (collect-rent $rate)
   (for-each (all-atoms)
     (lambda ($a)
       (let (($new (- (sti $a) $rate)))
         (if (< $new 0)
             (remove-atom &self $a)
             (set-sti $a $new))))))

; ═══════════════════════════════════════════════════════════════════
; PART 8: SEARCH STRATEGIES
; ═══════════════════════════════════════════════════════════════════

; Depth-first search
(= (dfs $goal? $successors $state)
   (if ($goal? $state)
       $state
       (let (($next (superpose ($successors $state))))
         (dfs $goal? $successors $next))))

; Breadth-first (accumulator-based)
(= (bfs $goal? $successors $frontier)
   (match $frontier (Cons $s $rest)
     (if ($goal? $s)
         $s
         (bfs $goal? $successors 
              (append $rest ($successors $s))))))

; Best-first with heuristic
(= (best-first $goal? $successors $heuristic $frontier)
   (let (($best (min-by $heuristic $frontier))
         ($rest (remove $best $frontier)))
     (if ($goal? $best)
         $best
         (best-first $goal? $successors $heuristic
                     (insert-sorted $heuristic 
                                    ($successors $best) 
                                    $rest)))))

; ═══════════════════════════════════════════════════════════════════
; PART 9: LEARNING (Self-modification!)
; ═══════════════════════════════════════════════════════════════════

; Learn a new rule from observation
(= (learn-rule $pattern $result $confidence)
   (add-atom &self 
     (= $pattern $result :tv (tv 1.0 $confidence) :source learned)))

; Strengthen rule on successful use
(= (reinforce $rule)
   (let (($tv (get-tv $rule))
         ($new-c (min 0.99 (+ (confidence $tv) 0.01))))
     (set-tv $rule (tv (frequency $tv) $new-c))))

; Weaken rule on failure
(= (weaken $rule)
   (let (($tv (get-tv $rule))
         ($new-c (- (confidence $tv) 0.05)))
     (if (< $new-c 0.1)
         (remove-atom &self $rule)
         (set-tv $rule (tv (frequency $tv) $new-c)))))

; ═══════════════════════════════════════════════════════════════════
; PART 10: META-REASONING (Strategies as data)
; ═══════════════════════════════════════════════════════════════════

; Current strategy is an atom in the space
(= (current-strategy)
   (match &self (CurrentStrategy $s) $s))

; Strategy implementations
(= (select-premises:balanced $primary)
   (take 5 (shuffle (related-to $primary))))

(= (select-premises:exploration $primary)
   (take 5 (filter low-confidence? (related-to $primary))))

(= (select-premises:exploitation $primary)
   (take 5 (sort-by confidence (related-to $primary))))

; Dispatch based on current strategy
(= (select-premises $primary)
   (let (($strategy (current-strategy)))
     ((symbol-concat "select-premises:" $strategy) $primary)))

; Switch strategy at runtime
(= (use-strategy $name)
   (do (remove-atom &self (CurrentStrategy $_))
       (add-atom &self (CurrentStrategy $name))))
```

---

## What We Gain

### Minimal JS (< 500 LOC)

```
core/src/metta/
├── kernel/
│   ├── Term.js          (~50 LOC)
│   ├── Space.js         (~30 LOC)  
│   ├── Unify.js         (~60 LOC)
│   ├── Reduce.js        (~80 LOC)
│   └── Grounded.js      (~100 LOC)
├── MeTTaInterpreter.js  (~100 LOC) ; Just wires kernel + loads stdlib
└── stdlib.metta         (~300 LOC) ; Everything else
```

### Maximum Capability

| Capability | Implementation |
|------------|----------------|
| Types | MeTTa constraint rules |
| NAL Inference | MeTTa rewrite rules |
| ECAN Attention | MeTTa metadata ops |
| Search | MeTTa recursive functions |
| Learning | MeTTa self-modification |
| Strategies | MeTTa functions in space |
| Non-determinism | Multiple rules, same head |
| Macros | Early-phase reduction |

### Emergent Properties

1. **Self-Optimizing**: The system can rewrite its own rules to be more efficient
2. **Introspectable**: `(match &self (= $p $r) (Rule $p $r))` returns all rules
3. **Hot-Swappable**: Change any behavior by modifying atoms in `&self`
4. **Composable**: Small rules combine into complex reasoning
5. **Explainable**: Every derivation is a traceable reduction chain

---

## Implementation Roadmap

### Phase 1: The Pure Kernel (Week 1)

**Deliverables:**
- [ ] `kernel/Term.js` - Immutable terms with structural equality
- [ ] `kernel/Space.js` - Minimal set with add/remove/iterate
- [ ] `kernel/Unify.js` - Recursive unification + substitution
- [ ] `kernel/Reduce.js` - Single-step reduction
- [ ] `kernel/Grounded.js` - JS function registry

**Test:** `(+ 1 2)` reduces to `3`

### Phase 2: Bootstrap Standard Library (Week 2)

**Deliverables:**
- [ ] `stdlib/core.metta` - Control flow (if, seq, let)
- [ ] `stdlib/list.metta` - List operations
- [ ] `stdlib/match.metta` - Non-deterministic matching

**Test:** `(map (lambda ($x) (* $x 2)) (list 1 2 3))` → `(list 2 4 6)`

### Phase 3: Logic & Inference (Week 3)

**Deliverables:**
- [ ] `stdlib/types.metta` - Type checking as pattern matching
- [ ] `stdlib/truth.metta` - Truth functions (grounded wrappers)
- [ ] `stdlib/nal.metta` - NAL-1 through NAL-6 rules

**Test:** Deduction chain produces correct truth values

### Phase 4: Intelligence Layer (Week 4)

**Deliverables:**
- [ ] `stdlib/attention.metta` - ECAN operations
- [ ] `stdlib/search.metta` - DFS, BFS, A*
- [ ] `stdlib/learning.metta` - Rule learning/reinforcement
- [ ] `stdlib/strategy.metta` - Strategy selection

**Test:** Self-modifying agent learns to solve a simple task

---

## Grounded Operations (The Only JS Escapes)

These are registered in `Grounded.js` and called from MeTTa:

### Arithmetic (Required)
```javascript
'+', '-', '*', '/', '%', 'pow', 'sqrt', 'abs'
```

### Comparison (Required)
```javascript
'<', '>', '<=', '>=', '==', '!='
```

### Space Primitives (Required)
```javascript
'add-atom', 'remove-atom', 'get-atoms', 'atom-count'
```

### I/O (Optional)
```javascript
'print', 'read-file', 'write-file', 'http-get', 'now'
```

### SeNARS Bridge (Integration)
```javascript
'&nars-derive'     // Invoke NARS reasoner
'&nars-add-task'   // Add task to NARS
'&nars-beliefs'    // Get NARS beliefs
```

### Truth Functions (Performance)
```javascript
'&truth-deduction', '&truth-induction', '&truth-abduction',
'&truth-revision', '&truth-negation', '&truth-analogy'
```

---

## Comparison: Old vs New

| Aspect | Previous Design | Minimal Core |
|--------|-----------------|--------------|
| JS LOC | ~2000+ | ~500 |
| MeTTa LOC | ~100 | ~500 |
| Modules | 15+ | 5 |
| Concepts | Many special cases | 5 primitives |
| Extensibility | Add JS class | Add MeTTa rule |
| Debugging | JS debugger | MeTTa trace |
| Self-modification | Complex API | `add-atom &self` |
| Learning | Separate module | MeTTa rules |

---

## The Composability Insight

Everything builds from 5 primitives:

```
TERM + SPACE = Knowledge Base
     ↓
+ UNIFY = Pattern Matching
     ↓
+ REDUCE = Computation
     ↓
+ GROUND = World Interface
     ↓
+ METTA RULES = Everything Else
```

**NAL Inference** = `reduce` with NAL rules in space
**ECAN Attention** = `reduce` with attention rules + metadata
**Planning** = `reduce` with search rules
**Learning** = `add-atom` of new rules based on experience
**Meta-Reasoning** = `match` over rules, `add-atom` of strategies

---

## The Ultimate Test

If the design is right, we should be able to:

```metta
; Define a meta-interpreter IN MeTTa
(= (eval $expr $space)
   (let (($result (step $expr $space)))
     (if (== $result $expr)
         $result
         (eval $result $space))))

; And it should be equivalent to the JS reduce!
```

The system interprets itself. That's the proof of minimality.

---

## File Structure (Final)

```
core/src/metta/
├── kernel/
│   ├── Term.js           # Atom representation
│   ├── Space.js          # Mutable atom set
│   ├── Unify.js          # Pattern matching
│   ├── Reduce.js         # Evaluation
│   └── Grounded.js       # JS escape hatch
├── MeTTaInterpreter.js   # Wires kernel + loads stdlib
└── stdlib/
    ├── core.metta        # Control flow
    ├── list.metta        # Data structures  
    ├── match.metta       # Non-determinism
    ├── types.metta       # Type checking
    ├── truth.metta       # PLN truth functions
    ├── nal.metta         # NAL inference rules
    ├── attention.metta   # ECAN
    ├── search.metta      # Search algorithms
    ├── learning.metta    # Self-modification
    └── strategy.metta    # Meta-reasoning
```

**Total: 5 JS files + 10 MeTTa files = Complete cognitive architecture**

---

*Last Updated: 2026-01-09*
*Version: 3.0 - Minimal Core*
