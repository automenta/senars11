# MeTTa × SeNARS: Unified Cognitive Architecture

> **Thesis**: Five orthogonal primitives compose into complete cognition.
> The kernel is JavaScript; the mind is MeTTa.

---

## Design Invariants

```
┌────────────────────────────────────────────────────────────────┐
│  ELEGANCE      Orthogonal primitives, no special cases        │
│  CAPABILITY    Any cognitive function expressible             │
│  EFFICIENCY    Indexing, caching, laziness where needed       │
│  UNITY         One representation: atoms all the way down      │
└────────────────────────────────────────────────────────────────┘
```

---

## The Kernel: Five Primitives

| Primitive | Purpose | Interface | Complexity |
|-----------|---------|-----------|------------|
| **Term** | Representation | `atomic`, `variable`, `compound`, `equals` | O(1) create, O(n) equality |
| **Space** | Storage | `add`, `remove`, `has`, `iterate` | O(1) add/remove, O(n) iterate |
| **Unify** | Matching | `unify(pattern, term) → bindings \| null` | O(n) terms |
| **Reduce** | Evaluation | `step(atom, space) → atom` | O(rules) per step |
| **Ground** | Escape | `register(name, fn)`, `execute(name, args)` | O(1) dispatch |

### Term

```javascript
// Immutable, structurally-shared atoms
export const Term = {
    atomic: (name) => ({ kind: 'atomic', name, toString: () => name }),
    variable: (name) => ({ kind: 'variable', name, toString: () => name }),
    compound: (op, children) => ({
        kind: 'compound', operator: op, components: children,
        toString: () => `(${op} ${children.map(c => c.toString()).join(' ')})`
    }),
    equals: (a, b) => {
        if (a.kind !== b.kind) return false;
        if (a.kind === 'compound') {
            return a.operator === b.operator && 
                   a.components.length === b.components.length &&
                   a.components.every((c, i) => Term.equals(c, b.components[i]));
        }
        return a.name === b.name;
    }
};
```

### Space

```javascript
// Minimal mutable container with optional indexing
export class Space {
    constructor() {
        this.atoms = new Set();
        this.index = null; // Lazy: created on first query if enabled
    }
    
    add(atom) { 
        this.atoms.add(atom); 
        this.index?.add(atom);
    }
    
    remove(atom) { 
        const removed = this.atoms.delete(atom);
        if (removed) this.index?.remove(atom);
        return removed;
    }
    
    has(atom) { return this.atoms.has(atom); }
    
    *[Symbol.iterator]() { yield* this.atoms; }
    
    get size() { return this.atoms.size; }
    
    // Efficiency layer: enable indexing
    enableIndex(indexType = 'functor') {
        this.index = new SpaceIndex(indexType);
        for (const atom of this.atoms) this.index.add(atom);
    }
    
    // Indexed query (falls back to iteration if no index)
    *query(pattern) {
        const candidates = this.index?.candidates(pattern) ?? this.atoms;
        for (const atom of candidates) yield atom;
    }
}
```

### Unify

```javascript
// Robinson unification with occurs check
export function unify(pattern, term, bindings = {}) {
    if (pattern.kind === 'variable') {
        if (pattern.name in bindings) return unify(bindings[pattern.name], term, bindings);
        if (occursIn(pattern, term, bindings)) return null; // Occurs check
        return { ...bindings, [pattern.name]: term };
    }
    if (term.kind === 'variable') return unify(term, pattern, bindings);
    if (pattern.kind === 'atomic' && term.kind === 'atomic') {
        return pattern.name === term.name ? bindings : null;
    }
    if (pattern.kind === 'compound' && term.kind === 'compound') {
        if (pattern.operator !== term.operator) return null;
        if (pattern.components.length !== term.components.length) return null;
        for (let i = 0; i < pattern.components.length; i++) {
            bindings = unify(pattern.components[i], term.components[i], bindings);
            if (!bindings) return null;
        }
        return bindings;
    }
    return null;
}

export function substitute(template, bindings) {
    if (template.kind === 'variable') {
        const bound = bindings[template.name];
        return bound ? substitute(bound, bindings) : template;
    }
    if (template.kind === 'compound') {
        return Term.compound(
            template.operator, 
            template.components.map(c => substitute(c, bindings))
        );
    }
    return template;
}
```

### Reduce

```javascript
// Single-step reduction with priority: ground > rules > children
export function step(atom, space, ground) {
    // 1. Grounded operation
    if (atom.kind === 'compound' && ground.has(atom.operator)) {
        return ground.execute(atom.operator, atom.components, space);
    }
    
    // 2. Rule application (first match wins; use indexed query)
    for (const rule of space.query(Term.compound('=', [null, null]))) {
        if (rule.operator !== '=') continue;
        const [pattern, result] = rule.components;
        const bindings = unify(pattern, atom);
        if (bindings) return substitute(result, bindings);
    }
    
    // 3. Reduce children (leftmost-innermost)
    if (atom.kind === 'compound') {
        for (let i = 0; i < atom.components.length; i++) {
            const child = atom.components[i];
            const reduced = step(child, space, ground);
            if (reduced !== child) {
                const newComponents = [...atom.components];
                newComponents[i] = reduced;
                return Term.compound(atom.operator, newComponents);
            }
        }
    }
    
    // 4. Fixed point
    return atom;
}

// Full reduction with step limit
export function reduce(atom, space, ground, maxSteps = 1000) {
    let steps = 0;
    while (steps++ < maxSteps) {
        const next = step(atom, space, ground);
        if (next === atom) return { result: atom, steps };
        atom = next;
    }
    throw new Error(`Reduction exceeded ${maxSteps} steps`);
}
```

### Ground

```javascript
// Native function registry with categories
export class Ground {
    constructor(termFactory = Term) {
        this.term = termFactory;
        this.fns = new Map();
        this._registerCore();
    }
    
    register(name, fn) { this.fns.set(name, fn); }
    has(name) { return this.fns.has(name); }
    execute(name, args, space) { return this.fns.get(name)(args, space, this.term); }
    
    _registerCore() {
        const T = this.term;
        const num = a => Number(a.name);
        const bool = b => T.atomic(b ? 'True' : 'False');
        
        // Arithmetic
        this.register('+', ([a, b]) => T.atomic(String(num(a) + num(b))));
        this.register('-', ([a, b]) => T.atomic(String(num(a) - num(b))));
        this.register('*', ([a, b]) => T.atomic(String(num(a) * num(b))));
        this.register('/', ([a, b]) => T.atomic(String(num(a) / num(b))));
        
        // Comparison
        this.register('<',  ([a, b]) => bool(num(a) < num(b)));
        this.register('>',  ([a, b]) => bool(num(a) > num(b)));
        this.register('==', ([a, b]) => bool(T.equals(a, b)));
        
        // Space ops
        this.register('add-atom',    ([s, a], space) => { space.add(a); return a; });
        this.register('remove-atom', ([s, a], space) => bool(space.remove(a)));
        this.register('get-atoms',   ([s], space) => T.compound('List', [...space]));
        
        // I/O
        this.register('print', ([a]) => { console.log(a.toString()); return a; });
        this.register('now',   () => T.atomic(String(Date.now())));
    }
}
```

---

## Efficiency Layers (Optional, Composable)

These are **not** kernel primitives—they're optimizations that compose with the kernel.

### Layer 1: Indexing

```javascript
class SpaceIndex {
    constructor(type = 'functor') {
        this.type = type;
        this.index = new Map();
    }
    
    add(atom) {
        const key = this._key(atom);
        if (!this.index.has(key)) this.index.set(key, new Set());
        this.index.get(key).add(atom);
    }
    
    remove(atom) {
        const key = this._key(atom);
        this.index.get(key)?.delete(atom);
    }
    
    candidates(pattern) {
        const key = this._key(pattern);
        return this.index.get(key) ?? new Set();
    }
    
    _key(atom) {
        switch (this.type) {
            case 'functor': return atom.kind === 'compound' ? atom.operator : atom.name;
            case 'arity':   return atom.kind === 'compound' ? `${atom.operator}/${atom.components.length}` : atom.name;
            case 'head':    return atom.kind === 'compound' && atom.components[0] 
                                   ? this._key(atom.components[0]) : null;
        }
    }
}
```

### Layer 2: Memoization

```javascript
class MemoizedReduce {
    constructor(space, ground) {
        this.space = space;
        this.ground = ground;
        this.cache = new Map();
    }
    
    reduce(atom) {
        const key = atom.toString();
        if (this.cache.has(key)) return this.cache.get(key);
        const result = reduce(atom, this.space, this.ground);
        this.cache.set(key, result);
        return result;
    }
    
    invalidate(pattern) {
        // Clear cache entries matching pattern
        for (const [key, _] of this.cache) {
            if (this._matches(key, pattern)) this.cache.delete(key);
        }
    }
}
```

### Layer 3: Lazy Evaluation

```javascript
// Lazy sequences for non-determinism
class LazySeq {
    constructor(generator) {
        this.generator = generator;
        this._cache = [];
        this._exhausted = false;
    }
    
    *[Symbol.iterator]() {
        for (const item of this._cache) yield item;
        if (this._exhausted) return;
        
        for (const item of this.generator) {
            this._cache.push(item);
            yield item;
        }
        this._exhausted = true;
    }
    
    take(n) {
        const result = [];
        for (const item of this) {
            result.push(item);
            if (result.length >= n) break;
        }
        return result;
    }
    
    first() { return this.take(1)[0]; }
}

// Usage: lazy match
function* lazyMatch(space, pattern, template) {
    for (const atom of space.query(pattern)) {
        const bindings = unify(pattern, atom);
        if (bindings) yield substitute(template, bindings);
    }
}
```

### Layer 4: Parallel Evaluation (Future)

```javascript
// Parallel non-determinism (conceptual)
async function parallelCollapse(alternatives, predicate) {
    return Promise.race(
        alternatives.map(async alt => {
            const result = await reduce(alt);
            if (predicate(result)) return result;
            throw new NotSatisfied();
        })
    );
}
```

---

## Standard Library: Complete MeTTa

The kernel enables this standard library, which provides all cognitive capabilities.

### Core (~50 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; CONTROL FLOW
; ═══════════════════════════════════════════════════════════════════
(= (if True $then $else) $then)
(= (if False $then $else) $else)
(= (and True True) True)    (= (and $_ $_) False)
(= (or False False) False)  (= (or $_ $_) True)
(= (not True) False)        (= (not False) True)

; ═══════════════════════════════════════════════════════════════════
; LET BINDING  
; ═══════════════════════════════════════════════════════════════════
(= (let $var $val $body) (substitute-var $var $val $body))
(= (let* () $body) $body)
(= (let* (($v $e) $rest ...) $body) (let $v $e (let* ($rest ...) $body)))

; ═══════════════════════════════════════════════════════════════════
; LAMBDA (Closures via substitution)
; ═══════════════════════════════════════════════════════════════════
(= ((lambda ($x) $body) $arg) (let $x $arg $body))
(= ((lambda ($x $y) $body) $a $b) (let $x $a (let $y $b $body)))

; ═══════════════════════════════════════════════════════════════════
; SEQUENCING
; ═══════════════════════════════════════════════════════════════════
(= (seq $a $b) (let $_ $a $b))
(= (do $a) $a)
(= (do $a $b) (seq $a $b))
(= (do $a $b $c ...) (seq $a (do $b $c ...)))
```

### Lists (~30 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; LIST PRIMITIVES
; ═══════════════════════════════════════════════════════════════════
(= (cons $h $t) (Cons $h $t))
(= (head (Cons $h $_)) $h)
(= (tail (Cons $_ $t)) $t)
(= (nil) Nil)
(= (null? Nil) True)
(= (null? (Cons $_ $_)) False)

; ═══════════════════════════════════════════════════════════════════
; HIGHER-ORDER
; ═══════════════════════════════════════════════════════════════════
(= (map $f Nil) Nil)
(= (map $f (Cons $h $t)) (cons ($f $h) (map $f $t)))

(= (filter $p Nil) Nil)
(= (filter $p (Cons $h $t)) (if ($p $h) (cons $h (filter $p $t)) (filter $p $t)))

(= (fold $f $z Nil) $z)
(= (fold $f $z (Cons $h $t)) (fold $f ($f $h $z) $t))

(= (append Nil $ys) $ys)
(= (append (Cons $x $xs) $ys) (cons $x (append $xs $ys)))

(= (length Nil) 0)
(= (length (Cons $_ $t)) (+ 1 (length $t)))

(= (take 0 $_) Nil)
(= (take $n (Cons $h $t)) (cons $h (take (- $n 1) $t)))
```

### Non-Determinism (~20 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; SUPERPOSITION (Multiple rules → multiple results)
; ═══════════════════════════════════════════════════════════════════
; The magic: multiple (=) rules for same pattern creates branching
(= (amb $x $y) $x)
(= (amb $x $y) $y)

; Match: non-deterministic iteration over space
(= (match $space $pattern $template)
   (let (($atom (element-of $space)))     ; non-det
     (let (($bindings (unify $pattern $atom)))
       (if (succeeded? $bindings)
           (substitute $template $bindings)
           (fail)))))

; Collapse: collect all non-det results
(= (collapse $expr) (collect-all (reduce-nondet $expr)))

; First: get first result only (efficiency)
(= (first $expr) (take 1 (collapse $expr)))
```

### Types (~25 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; TYPE DECLARATIONS (Just atoms in space!)
; ═══════════════════════════════════════════════════════════════════
(: True Bool)
(: False Bool)
(: + (-> Number Number Number))
(: cons (-> $a (List $a) (List $a)))
(: head (-> (List $a) $a))
(: map (-> (-> $a $b) (List $a) (List $b)))

; ═══════════════════════════════════════════════════════════════════
; TYPE CHECKING (Pattern matching over type atoms)
; ═══════════════════════════════════════════════════════════════════
(= (type-of $x) (match &self (: $x $t) $t))

(= (check-apply ($f $arg))
   (let* (($ft (type-of $f))
          ($at (type-of $arg)))
     (match $ft (-> $expected $result)
       (if (unifies? $expected $at) $result TypeError))))

(= (well-typed? $expr)
   (not (== (check-apply $expr) TypeError)))
```

### NAL Inference (~40 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; TRUTH VALUES
; ═══════════════════════════════════════════════════════════════════
(= (tv $f $c) (TV $f $c))
(= (f (TV $f $_)) $f)
(= (c (TV $_ $c)) $c)

; Grounded truth functions (call JS for performance)
(= (t:ded $t1 $t2) (&truth-ded (f $t1) (c $t1) (f $t2) (c $t2)))
(= (t:ind $t1 $t2) (&truth-ind (f $t1) (c $t1) (f $t2) (c $t2)))
(= (t:abd $t1 $t2) (&truth-abd (f $t1) (c $t1) (f $t2) (c $t2)))
(= (t:rev $t1 $t2) (&truth-rev (f $t1) (c $t1) (f $t2) (c $t2)))

; ═══════════════════════════════════════════════════════════════════
; INFERENCE RULES
; ═══════════════════════════════════════════════════════════════════
; Deduction: A→B, B→C ⊢ A→C
(= (ded (Inh $a $b) (Inh $b $c)) 
   (Inh $a $c :tv (t:ded (get-tv $1) (get-tv $2))))

; Induction: B→A, B→C ⊢ A→C
(= (ind (Inh $b $a) (Inh $b $c))
   (Inh $a $c :tv (t:ind (get-tv $1) (get-tv $2))))

; Abduction: A→B, C→B ⊢ A→C  
(= (abd (Inh $a $b) (Inh $c $b))
   (Inh $a $c :tv (t:abd (get-tv $1) (get-tv $2))))

; Revision: same content, merge evidence
(= (rev (@ $s :tv $t1) (@ $s :tv $t2))
   (@ $s :tv (t:rev $t1 $t2)))

; ═══════════════════════════════════════════════════════════════════
; INFERENCE ENGINE (Pure MeTTa!)
; ═══════════════════════════════════════════════════════════════════
(= (derive $task)
   (let* (($premises (select-premises $task))
          ($rules (list ded ind abd))
          ($conclusions (flat-map (lambda ($r) 
                          (flat-map (lambda ($p) ($r $task $p)) $premises))
                        $rules)))
     (filter sufficient-confidence? $conclusions)))
```

### Attention (~30 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; ATTENTION VALUES (Metadata atoms)
; ═══════════════════════════════════════════════════════════════════
(= (sti $atom) (first (match &self (STI $atom $v) $v)))
(= (lti $atom) (first (match &self (LTI $atom $v) $v)))

(= (set-sti $atom $v)
   (do (remove-atom &self (STI $atom $_))
       (add-atom &self (STI $atom $v))))

; ═══════════════════════════════════════════════════════════════════
; ATTENTION DYNAMICS  
; ═══════════════════════════════════════════════════════════════════
(= (spread $atom $decay)
   (for-each (neighbors $atom)
     (lambda ($n) (set-sti $n (+ (sti $n) (* $decay (sti $atom)))))))

(= (focus-top $n)
   (take $n (sort-by sti (match &self (STI $a $_) $a))))

(= (forget-low $threshold)
   (for-each (match &self (STI $a $v) (if (< $v $threshold) $a Empty))
     remove-atom))

; ═══════════════════════════════════════════════════════════════════
; ATTENTION CYCLE
; ═══════════════════════════════════════════════════════════════════
(= (attention-step)
   (let (($focus (head (focus-top 1))))
     (do (spread $focus 0.5)
         (forget-low 0.01))))
```

### Search (~25 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; GENERIC SEARCH
; ═══════════════════════════════════════════════════════════════════
(= (search $strategy $goal? $expand $start)
   (($strategy) $goal? $expand (list $start)))

; DFS
(= ((dfs) $goal? $expand (Cons $s $rest))
   (if ($goal? $s) $s
       ((dfs) $goal? $expand (append ($expand $s) $rest))))

; BFS  
(= ((bfs) $goal? $expand (Cons $s $rest))
   (if ($goal? $s) $s
       ((bfs) $goal? $expand (append $rest ($expand $s)))))

; Best-first
(= ((best $h) $goal? $expand $frontier)
   (let (($best (min-by $h $frontier)))
     (if ($goal? $best) $best
         ((best $h) $goal? $expand 
           (insert-sorted $h ($expand $best) (remove $best $frontier))))))

; A* = best-first with f = g + h
(= (astar $h) (best (lambda ($s) (+ (cost $s) ($h $s)))))
```

### Learning (~25 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; RULE LEARNING
; ═══════════════════════════════════════════════════════════════════
(= (learn $pattern $result $conf)
   (add-atom &self (= $pattern $result :tv (tv 1.0 $conf) :learned True)))

(= (reinforce $rule $delta)
   (let (($old-c (c (get-tv $rule))))
     (set-tv $rule (tv 1.0 (min 0.99 (+ $old-c $delta))))))

(= (weaken $rule $delta)
   (let (($new-c (- (c (get-tv $rule)) $delta)))
     (if (< $new-c 0.1)
         (remove-atom &self $rule)
         (set-tv $rule (tv 1.0 $new-c)))))

; ═══════════════════════════════════════════════════════════════════
; EXPERIENCE REPLAY
; ═══════════════════════════════════════════════════════════════════
(= (record $state $action $reward)
   (add-atom &self (Experience $state $action $reward (now))))

(= (replay $n)
   (map learn-from (take $n (shuffle (match &self (Experience $s $a $r $_) 
                                            (Exp $s $a $r))))))
```

### Strategies (~20 lines)

```metta
; ═══════════════════════════════════════════════════════════════════
; STRATEGY DISPATCH
; ═══════════════════════════════════════════════════════════════════
(= (current-strategy) (first (match &self (Strategy $s) $s)))
(= (set-strategy $s) (do (remove-atom &self (Strategy $_)) 
                         (add-atom &self (Strategy $s))))

(= (select-premises $task):balanced
   (take 5 (shuffle (related $task))))

(= (select-premises $task):explore
   (take 5 (sort-by (lambda ($p) (c (get-tv $p))) (related $task))))

(= (select-premises $task):exploit
   (take 5 (sort-by (lambda ($p) (- 1 (c (get-tv $p)))) (related $task))))

(= (select-premises $task)
   ((symbol-concat "select-premises:" (current-strategy)) $task))

; Auto-adapt based on performance
(= (adapt-strategy)
   (cond ((< (novelty) 0.2) (set-strategy explore))
         ((> (goal-progress) 0.8) (set-strategy exploit))
         (else (set-strategy balanced))))
```

---

## SeNARS Integration

The bridge to SeNARS is **grounded operations**, not a separate module:

```javascript
// Register SeNARS integration in Ground
ground.register('&nars-derive', ([task], space) => {
    const narsTask = mettaToNars(task);
    const derivations = reasoner.derive(narsTask);
    return Term.compound('List', derivations.map(narsToMetta));
});

ground.register('&nars-process', ([task], space) => {
    reasoner.process(mettaToNars(task));
    return Term.atomic('Ok');
});

ground.register('&nars-beliefs', ([], space) => {
    const beliefs = reasoner.memory.getBeliefs();
    return Term.compound('List', beliefs.map(narsToMetta));
});

// Truth functions (delegate to Truth.js)
for (const [name, fn] of Object.entries({ ded: Truth.deduction, ind: Truth.induction, 
                                           abd: Truth.abduction, rev: Truth.revision })) {
    ground.register(`&truth-${name}`, ([f1, c1, f2, c2]) => {
        const result = fn({ f: Number(f1.name), c: Number(c1.name) },
                         { f: Number(f2.name), c: Number(c2.name) });
        return Term.compound('TV', [Term.atomic(String(result.f)), 
                                    Term.atomic(String(result.c))]);
    });
}
```

---

## Capability Matrix

Every cognitive capability maps to kernel primitives + MeTTa:

| Capability | Kernel | MeTTa | Notes |
|------------|--------|-------|-------|
| Pattern Matching | `unify` | `match` | Core primitive |
| Rewriting | `reduce`, `step` | `(= lhs rhs)` | Rule-based |
| Non-determinism | - | Multiple `(=)` | Emerges from rules |
| Types | `unify` | `(: x T)`, `check` | Types are atoms |
| NAL Inference | `ground` (truth) | NAL rules | Rules + grounded truth |
| Attention | - | STI/LTI atoms | Pure MeTTa |
| Planning | - | Search functions | Pure MeTTa |
| Learning | `add-atom` | `learn` | Self-modification |
| Strategies | - | Strategy atoms | Hot-swappable |
| SeNARS | `ground` | Bridge ops | Grounded integration |

---

## Implementation: 4 Weeks

### Week 1: Pure Kernel

```
[ ] kernel/Term.js       (50 LOC)
[ ] kernel/Space.js      (40 LOC)
[ ] kernel/Unify.js      (50 LOC)
[ ] kernel/Reduce.js     (60 LOC)
[ ] kernel/Ground.js     (80 LOC)
[ ] MeTTaInterpreter.js  (50 LOC) - Wire kernel + load stdlib
───────────────────────────────────
Total:                  ~330 LOC JS
```

**Milestone**: `(+ (* 2 3) 4)` → `10`

### Week 2: Standard Library

```
[ ] stdlib/core.metta    (50 LOC)
[ ] stdlib/list.metta    (30 LOC)
[ ] stdlib/match.metta   (20 LOC)
[ ] stdlib/types.metta   (25 LOC)
───────────────────────────────────
Total:                  ~125 LOC MeTTa
```

**Milestone**: `(map (lambda ($x) (* $x 2)) (list 1 2 3))` → `(list 2 4 6)`

### Week 3: Reasoning

```
[ ] stdlib/truth.metta   (40 LOC)
[ ] stdlib/nal.metta     (40 LOC)
[ ] stdlib/attention.metta (30 LOC)
[ ] SeNARS grounded ops
───────────────────────────────────
Total:                  ~110 LOC MeTTa + bridge
```

**Milestone**: Deduction chain with truth value propagation

### Week 4: Intelligence

```
[ ] stdlib/search.metta    (25 LOC)
[ ] stdlib/learning.metta  (25 LOC)
[ ] stdlib/strategy.metta  (20 LOC)
[ ] Efficiency layers
[ ] Demos
───────────────────────────────────
```

**Milestone**: Self-modifying agent solves maze

---

## Total: ~330 LOC JS + ~375 LOC MeTTa = Complete Cognitive Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CAPABILITY                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Learning · Planning · Attention · Inference · Types   │ │
│  │                  (~375 lines MeTTa)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↑                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      Term · Space · Unify · Reduce · Ground            │ │
│  │                  (~330 lines JavaScript)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                         KERNEL                               │
└──────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2026-01-09*
*Version: 4.0 - Elegant Minimalism*
</Parameter>
<parameter name="Complexity">9
