# MeTTa JavaScript Implementation Specification

> A pure JavaScript MeTTa implementation: unified, integrated, and free from legacy complexity.

---

## 1. Design Principles

### 1.1 Core Philosophy

| Principle | Rationale |
|-----------|-----------|
| **Unified Language** | Single language (JS) eliminates FFI complexity and impedance mismatch |
| **Functional Essence** | Categorize by *what* things do, not *how* original was structured |
| **Defer Optimization** | Working proof-of-concept before any performance work |
| **Modern JS** | ES modules, async/await, iterators, functional patterns |
| **Composable** | Small, focused modules that combine cleanly |

### 1.2 Departures from OpenCog

| OpenCog Issue | Our Approach |
|---------------|--------------|
| Multi-language stack (Rust/C++/Python) | Pure JavaScript |
| Separate triemap/WAM/ZAM backends | Single unified interpreter |
| Atomspace as separate component | Space integrated with interpreter |
| Complex FFI grounding | Native JS function registry |
| Scattered inference algorithms | Single inference module |
| Premature optimization (MORK) | Simple first, optimize later |

---

## 2. Core Abstractions

### 2.1 Unified Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Interpreter                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Parser  │→│  Space  │→│ Reducer │→│ Result │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
│       ↓            ↓            ↓                   │
│  ┌─────────────────────────────────────────────┐   │
│  │              Unification Engine              │   │
│  └─────────────────────────────────────────────┘   │
│       ↓            ↓            ↓                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐     │
│  │  Types  │  │ Nondet  │  │    Grounded     │     │
│  └─────────┘  └─────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
core/src/metta/
├── Atom.js           # Unified atom representation
├── Space.js          # Knowledge storage
├── Unify.js          # Pattern matching & substitution
├── Reduce.js         # Evaluation engine
├── Nondet.js         # Superposition/collapse
├── Types.js          # Gradual typing
├── Grounded.js       # Native function registry
├── Parser.js         # S-expression parser
├── Interpreter.js    # Orchestration
└── index.js          # Public API
```

---

## 3. Atom Representation

### 3.1 Single Unified Atom Class

All atoms share one representation with discriminated variants:

```javascript
class Atom {
  constructor(kind, value, children = null) {
    this.kind = kind;       // 'symbol' | 'variable' | 'expression' | 'grounded'
    this.value = value;     // string (name) or function (grounded)
    this.children = children; // Array<Atom> | null
  }
  
  // Factory methods
  static symbol(name)     { return new Atom('symbol', name); }
  static variable(name)   { return new Atom('variable', name); }
  static expr(...atoms)   { return new Atom('expression', null, atoms); }
  static grounded(fn)     { return new Atom('grounded', fn); }
  
  // Predicates
  get isSymbol()     { return this.kind === 'symbol'; }
  get isVariable()   { return this.kind === 'variable'; }
  get isExpression() { return this.kind === 'expression'; }
  get isGrounded()   { return this.kind === 'grounded'; }
  get isAtomic()     { return !this.isExpression; }
  
  // Expression accessors
  get head()  { return this.children?.[0] ?? null; }
  get tail()  { return this.children?.slice(1) ?? []; }
  get arity() { return this.children?.length ?? 0; }
  
  // Structural equality
  equals(other) { /* deep equality check */ }
  
  // Pretty printing
  toString() { /* S-expression format */ }
}
```

### 3.2 Atom Factories

```javascript
// Convenient creation
const A = {
  sym: Atom.symbol,
  var: Atom.variable,
  expr: Atom.expr,
  fn: Atom.grounded,
  
  // Common atoms
  True:  Atom.symbol('True'),
  False: Atom.symbol('False'),
  Empty: Atom.symbol('Empty'),
  Type:  Atom.symbol('Type')
};
```

---

## 4. Space (Atomspace)

### 4.1 Interface

```javascript
class Space {
  constructor() {
    this.atoms = new Set();
    this.rules = [];  // (= pattern result) pairs
  }
  
  // Core operations
  add(atom)        { this.atoms.add(atom); }
  remove(atom)     { this.atoms.delete(atom); }
  has(atom)        { return this.atoms.has(atom); }
  all()            { return [...this.atoms]; }
  clear()          { this.atoms.clear(); this.rules = []; }
  
  // Rule management
  addRule(pattern, result) { this.rules.push({ pattern, result }); }
  getRules()               { return this.rules; }
  
  // Query
  *match(pattern)  { /* yield matching atoms with bindings */ }
}
```

### 4.2 Notes

- No separate "truth values" — use atoms like `(tv 0.9 0.8)` if needed
- Rules stored in-space (self-modifying by design)
- Simple `Set` for atoms; optimize later with indices if needed

---

## 5. Unification Engine

### 5.1 Core Algorithm

```javascript
// Unify two atoms, return bindings or null
function unify(pattern, term, bindings = {}) {
  // Variable in pattern
  if (pattern.isVariable) {
    const name = pattern.value;
    if (name in bindings) {
      return unify(bindings[name], term, bindings);
    }
    return { ...bindings, [name]: term };
  }
  
  // Variable in term (bidirectional)
  if (term.isVariable) {
    return unify(term, pattern, bindings);
  }
  
  // Both atomic
  if (pattern.isAtomic && term.isAtomic) {
    return pattern.equals(term) ? bindings : null;
  }
  
  // Both expressions
  if (pattern.isExpression && term.isExpression) {
    if (pattern.arity !== term.arity) return null;
    for (let i = 0; i < pattern.arity; i++) {
      bindings = unify(pattern.children[i], term.children[i], bindings);
      if (bindings === null) return null;
    }
    return bindings;
  }
  
  return null;
}
```

### 5.2 Substitution

```javascript
function substitute(template, bindings) {
  if (template.isVariable) {
    const bound = bindings[template.value];
    return bound ? substitute(bound, bindings) : template;
  }
  if (template.isExpression) {
    return Atom.expr(...template.children.map(c => substitute(c, bindings)));
  }
  return template;
}
```

---

## 6. Reduction Engine

### 6.1 Evaluation Model

```javascript
class Reducer {
  constructor(space, grounded, nondet) {
    this.space = space;
    this.grounded = grounded;
    this.nondet = nondet;
    this.maxSteps = 1000;
  }
  
  // Reduce to normal form
  reduce(atom) {
    let current = atom;
    for (let step = 0; step < this.maxSteps; step++) {
      const next = this.step(current);
      if (next === current) return current;  // Fixed point
      current = next;
    }
    throw new Error('Max reduction steps exceeded');
  }
  
  // Single reduction step
  step(atom) {
    // Try user rules first
    for (const { pattern, result } of this.space.getRules()) {
      const bindings = unify(pattern, atom);
      if (bindings) {
        return typeof result === 'function'
          ? result(bindings)
          : substitute(result, bindings);
      }
    }
    
    // Try built-in operations
    if (atom.isExpression) {
      return this.evaluateBuiltin(atom) ?? atom;
    }
    
    return atom;
  }
  
  evaluateBuiltin(expr) {
    const [head, ...args] = expr.children;
    if (!head?.isSymbol) return null;
    
    switch (head.value) {
      case '!': return this.reduce(args[0]);
      case 'match': return this.evalMatch(args);
      case 'superpose': return this.nondet.superpose(args);
      case 'collapse': return this.nondet.collapse(args[0]);
      case 'if': return this.evalIf(args);
      case 'addAtom': return this.evalAddAtom(args);
      case 'remAtom': return this.evalRemAtom(args);
      default: return this.grounded.call(head.value, args);
    }
  }
}
```

---

## 7. Nondeterminism

### 7.1 Clean Generator-Based Design

```javascript
class Nondet {
  // Create superposition (yields all values)
  *superpose(atoms) {
    for (const atom of atoms) {
      yield atom;
    }
  }
  
  // Collapse to array of all results
  collapseAll(generator) {
    return [...generator];
  }
  
  // Collapse to first result
  collapseFirst(generator) {
    return generator.next().value;
  }
  
  // Collapse to random result
  collapseRandom(generator) {
    const all = this.collapseAll(generator);
    return all[Math.floor(Math.random() * all.length)];
  }
  
  // Bind: flatMap over nondeterministic results
  *bind(generator, fn) {
    for (const value of generator) {
      yield* fn(value);
    }
  }
  
  // Combine: cartesian product
  *combine(gen1, gen2, combineFn) {
    const vals2 = [...gen2];
    for (const v1 of gen1) {
      for (const v2 of vals2) {
        yield combineFn(v1, v2);
      }
    }
  }
}
```

### 7.2 Lazy by Default

Using generators means nondeterminism is lazy:
- Only compute values when needed
- Memory efficient for large superpositions
- Natural fit with JavaScript iteration

---

## 8. Type System

### 8.1 Gradual Typing

```javascript
class Types {
  constructor() {
    this.declarations = new Map();  // symbol -> type
    this.predicates = new Map();    // typeName -> (atom) => boolean
    this.registerBuiltins();
  }
  
  registerBuiltins() {
    this.predicates.set('Symbol', a => a.isSymbol);
    this.predicates.set('Variable', a => a.isVariable);
    this.predicates.set('Expression', a => a.isExpression);
    this.predicates.set('Number', a => a.isSymbol && !isNaN(Number(a.value)));
    this.predicates.set('Atom', () => true);
  }
  
  declare(symbol, type) {
    this.declarations.set(symbol.value, type);
  }
  
  infer(atom) {
    // Check declarations first
    if (atom.isSymbol && this.declarations.has(atom.value)) {
      return this.declarations.get(atom.value);
    }
    // Fall back to structural inference
    for (const [name, pred] of this.predicates) {
      if (pred(atom)) return name;
    }
    return 'Atom';
  }
  
  check(atom, expected) {
    const actual = this.infer(atom);
    return actual === expected || this.isSubtype(actual, expected);
  }
}
```

### 8.2 No Mandatory Type Checking

Types are opt-in:
- Declare types with `(: x Type)`
- Check fails silently unless configured to throw
- Enables gradual adoption

---

## 9. Grounded Functions

### 9.1 Native JS Integration

```javascript
class Grounded {
  constructor() {
    this.functions = new Map();
    this.registerBuiltins();
  }
  
  registerBuiltins() {
    // Arithmetic
    this.register('+', (a, b) => A.sym(String(num(a) + num(b))));
    this.register('-', (a, b) => A.sym(String(num(a) - num(b))));
    this.register('*', (a, b) => A.sym(String(num(a) * num(b))));
    this.register('/', (a, b) => A.sym(String(num(a) / num(b))));
    
    // Comparison
    this.register('<', (a, b) => num(a) < num(b) ? A.True : A.False);
    this.register('>', (a, b) => num(a) > num(b) ? A.True : A.False);
    this.register('==', (a, b) => a.equals(b) ? A.True : A.False);
    
    // Logic
    this.register('and', (...args) => 
      args.every(a => a.equals(A.True)) ? A.True : A.False);
    this.register('or', (...args) => 
      args.some(a => a.equals(A.True)) ? A.True : A.False);
    this.register('not', (a) => 
      a.equals(A.True) ? A.False : A.True);
  }
  
  register(name, fn) {
    this.functions.set(name, fn);
  }
  
  call(name, args) {
    const fn = this.functions.get(name);
    if (!fn) return null;  // Not a grounded function
    return fn(...args);
  }
}

const num = (atom) => Number(atom.value);
```

### 9.2 Easy Extension

```javascript
// Add custom grounded function
metta.grounded.register('sqrt', (a) => 
  A.sym(String(Math.sqrt(num(a))))
);

// Add async grounded function (for I/O)
metta.grounded.register('fetch-url', async (url) => {
  const response = await fetch(url.value);
  return A.sym(await response.text());
});
```

---

## 10. Parser

### 10.1 S-Expression Parser

```javascript
function parse(input) {
  const tokens = tokenize(input);
  return parseTokens(tokens);
}

function tokenize(input) {
  // Handle: ( ) whitespace symbols strings comments
  return input
    .replace(/;[^\n]*/g, '')       // Remove comments
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function parseTokens(tokens) {
  const results = [];
  while (tokens.length > 0) {
    results.push(parseOne(tokens));
  }
  return results;
}

function parseOne(tokens) {
  const token = tokens.shift();
  
  if (token === '(') {
    const children = [];
    while (tokens[0] !== ')') {
      children.push(parseOne(tokens));
    }
    tokens.shift();  // consume ')'
    return Atom.expr(...children);
  }
  
  if (token.startsWith('$')) {
    return Atom.variable(token);
  }
  
  return Atom.symbol(token);
}
```

---

## 11. Interpreter (Orchestration)

### 11.1 Public API

```javascript
class MeTTa {
  constructor() {
    this.space = new Space();
    this.types = new Types();
    this.grounded = new Grounded();
    this.nondet = new Nondet();
    this.reducer = new Reducer(this.space, this.grounded, this.nondet);
  }
  
  // Load definitions
  load(code) {
    const atoms = parse(code);
    for (const atom of atoms) {
      this.processTopLevel(atom);
    }
  }
  
  // Run ! expressions
  run(code) {
    const atoms = parse(code);
    return atoms
      .filter(a => a.head?.value === '!')
      .map(a => this.reducer.reduce(a));
  }
  
  // Evaluate single expression
  eval(atom) {
    return this.reducer.reduce(atom);
  }
  
  // Query with pattern matching
  query(patternCode) {
    const pattern = parse(patternCode)[0];
    return [...this.space.match(pattern)];
  }
  
  processTopLevel(atom) {
    if (!atom.isExpression) {
      this.space.add(atom);
      return;
    }
    
    const head = atom.head?.value;
    
    switch (head) {
      case '=':  // Rule definition
        this.space.addRule(atom.children[1], atom.children[2]);
        break;
      case ':':  // Type declaration
        this.types.declare(atom.children[1], atom.children[2]);
        break;
      case '!':  // Evaluation (handled in run)
        break;
      default:
        this.space.add(atom);
    }
  }
}
```

### 11.2 Usage

```javascript
const metta = new MeTTa();

metta.load(`
  (= (greet $name) (Hello $name))
  (= (double $x) (+ $x $x))
  (: Person Type)
`);

const result = metta.run('!(greet World)');
// => [Atom: (Hello World)]

const doubled = metta.run('!(double 5)');
// => [Atom: 10]
```

---

## 12. Inference (Unified)

### 12.1 Single Inference Module

Instead of separate chaining/PLN/MOSES repos:

```javascript
class Inference {
  constructor(metta) {
    this.metta = metta;
  }
  
  // Forward chaining: apply all matching rules once
  *forwardStep() {
    for (const atom of this.metta.space.all()) {
      for (const { pattern, result } of this.metta.space.getRules()) {
        const bindings = unify(pattern, atom);
        if (bindings) {
          yield substitute(result, bindings);
        }
      }
    }
  }
  
  // Forward chain until fixpoint
  forwardChain(maxSteps = 100) {
    for (let i = 0; i < maxSteps; i++) {
      const newAtoms = [...this.forwardStep()];
      if (newAtoms.length === 0) break;
      for (const atom of newAtoms) {
        this.metta.space.add(atom);
      }
    }
  }
  
  // Backward chaining: prove goal by finding matching rules
  *backwardChain(goal, depth = 10) {
    if (depth === 0) return;
    
    // Direct match in space?
    for (const atom of this.metta.space.all()) {
      const bindings = unify(goal, atom);
      if (bindings) yield bindings;
    }
    
    // Match rule conclusions
    for (const { pattern, result } of this.metta.space.getRules()) {
      const bindings = unify(result, goal);
      if (bindings) {
        const subgoal = substitute(pattern, bindings);
        yield* this.backwardChain(subgoal, depth - 1);
      }
    }
  }
}
```

### 12.2 Pattern Mining (Future)

```javascript
class PatternMiner {
  constructor(metta) { this.metta = metta; }
  
  // Find frequent patterns in space
  *frequentPatterns(minSupport = 2) {
    // Simple frequency counting with generalization
    // Implement when needed
  }
}
```

---

## 13. Implementation Phases

### Phase 1: Core (Week 1-2)
- [x] `Atom.js` — Atom representation
- [ ] `Space.js` — Knowledge storage
- [ ] `Unify.js` — Pattern matching
- [ ] `Parser.js` — S-expression parsing
- [ ] `Reduce.js` — Basic evaluation

### Phase 2: Features (Week 3-4)
- [ ] `Nondet.js` — Superposition/collapse
- [ ] `Types.js` — Gradual typing
- [ ] `Grounded.js` — Native functions
- [ ] `Interpreter.js` — Orchestration

### Phase 3: Inference (Week 5-6)
- [ ] Forward chaining
- [ ] Backward chaining
- [ ] Self-modification examples

### Phase 4: Integration (Week 7-8)
- [ ] REPL interface
- [ ] Test suite
- [ ] Documentation
- [ ] Example programs

---

## 14. Built-in Operations

### 14.1 Core

| Operation | Syntax | Description |
|-----------|--------|-------------|
| **Define** | `(= pattern result)` | Add rewrite rule |
| **Type** | `(: symbol Type)` | Declare type |
| **Eval** | `(! expr)` | Force evaluation |
| **Match** | `(match &space pattern template)` | Pattern query |

### 14.2 Space

| Operation | Description |
|-----------|-------------|
| `(addAtom &space atom)` | Add atom |
| `(remAtom &space atom)` | Remove atom |
| `(get-atoms &space)` | Get all atoms |
| `&self` | Current space reference |

### 14.3 Control

| Operation | Description |
|-----------|-------------|
| `(if cond then else)` | Conditional |
| `(superpose (a b c))` | All values |
| `(collapse expr)` | One value |

### 14.4 Arithmetic

| Op | Description |
|----|-------------|
| `+`, `-`, `*`, `/`, `%` | Math |
| `<`, `>`, `==`, `!=` | Comparison |
| `and`, `or`, `not` | Logic |

---

## 15. Example Programs

### Hello World
```metta
(= (greet $name) (Hello $name))
!(greet World)
```

### Factorial
```metta
(= (fact 0) 1)
(= (fact $n) (* $n (fact (- $n 1))))
!(fact 5)
```

### Pattern Matching
```metta
(parent Alice Bob)
(parent Bob Charlie)
(= (grandparent $gp $gc)
   (match &self (parent $gp $p)
     (match &self (parent $p $gc)
       $gp)))
!(grandparent $x Charlie)
```

### Nondeterminism
```metta
(= (color) (superpose (red green blue)))
!(collapse (color))
```

### Self-Modification
```metta
(= (learn $fact) (addAtom &self $fact))
!(learn (knows Alice math))
```

---

## 16. API Summary

```javascript
// Create interpreter
const metta = new MeTTa();

// Load code
metta.load(`(= (double $x) (+ $x $x))`);

// Run evaluations
metta.run('!(double 5)');  // => [Atom(10)]

// Query space
metta.query('(parent $x $y)');  // => [{$x: Alice, $y: Bob}, ...]

// Direct eval
metta.eval(Atom.expr(A.sym('+'), A.sym('1'), A.sym('2')));

// Register custom grounded function
metta.grounded.register('random', () => 
  Atom.symbol(String(Math.random()))
);

// Access components
metta.space     // Space instance
metta.types     // Types instance
metta.grounded  // Grounded instance
metta.reducer   // Reducer instance
```

---

## 17. Files & Structure

```
core/src/metta/
├── Atom.js          ~100 LOC   Atom representation
├── Space.js         ~80 LOC    Knowledge storage  
├── Unify.js         ~60 LOC    Pattern matching
├── Reduce.js        ~120 LOC   Evaluation engine
├── Nondet.js        ~50 LOC    Nondeterminism
├── Types.js         ~80 LOC    Gradual typing
├── Grounded.js      ~60 LOC    Native functions
├── Parser.js        ~50 LOC    S-expression parser
├── Interpreter.js   ~100 LOC   Orchestration
├── Inference.js     ~100 LOC   Chaining algorithms
└── index.js         ~20 LOC    Public exports

Total: ~820 LOC for complete implementation
```

---

## 18. Non-Goals (For Now)

| Feature | Why Deferred |
|---------|--------------|
| Distributed atomspace | Premature; single-process first |
| Persistent storage | Use JSON serialization if needed |
| JVM/WASM backends | JS is the backend |
| PLN truth values | Add as atoms when needed |
| Pattern mining | After core is stable |
| Performance optimization | After proof-of-concept |
| IDE integration | After REPL works |

---

## 19. Error Handling

### 19.1 Error Hierarchy

```javascript
class MeTTaError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'MeTTaError';
    this.context = context;
  }
}

class ParseError extends MeTTaError {
  constructor(message, token, position) {
    super(message, { token, position });
    this.name = 'ParseError';
  }
}

class UnificationError extends MeTTaError {
  constructor(pattern, term) {
    super('Unification failed', { pattern: pattern.toString(), term: term.toString() });
    this.name = 'UnificationError';
  }
}

class ReductionError extends MeTTaError {
  constructor(message, atom) {
    super(message, { atom: atom.toString() });
    this.name = 'ReductionError';
  }
}

class TypeError extends MeTTaError {
  constructor(expected, actual, atom) {
    super(`Type mismatch: expected ${expected}, got ${actual}`, 
          { expected, actual, atom: atom.toString() });
    this.name = 'TypeError';
  }
}
```

### 19.2 Error Handling Strategy

| Scenario | Strategy |
|----------|----------|
| **Parse errors** | Throw immediately with position |
| **Unification failures** | Return `null` (normal flow) |
| **Type mismatches** | Warn or throw based on config |
| **Reduction loops** | Throw after max steps |
| **Grounded function errors** | Propagate or wrap |
| **Resource exhaustion** | Throw with context |

### 19.3 Graceful Degradation

```javascript
class MeTTa {
  constructor(config = {}) {
    this.config = {
      strictTypes: false,      // Throw on type errors
      maxReductionSteps: 1000,
      errorHandler: null,      // Custom error handler
      ...config
    };
  }
  
  handleError(error) {
    if (this.config.errorHandler) {
      this.config.errorHandler(error);
    }
    if (this.config.strictTypes && error instanceof TypeError) {
      throw error;
    }
    // Log and continue
    console.warn('MeTTa warning:', error.message);
  }
}
```

---

## 20. Testing

### 20.1 Test Structure

```javascript
// tests/metta.test.js
import { describe, it, expect } from 'vitest';
import { MeTTa } from '../core/src/metta/index.js';

describe('MeTTa Core', () => {
  const metta = new MeTTa();
  
  describe('Atoms', () => {
    it('should create symbols', () => {
      const atom = Atom.symbol('foo');
      expect(atom.isSymbol).toBe(true);
      expect(atom.value).toBe('foo');
    });
    
    it('should create expressions', () => {
      const expr = Atom.expr(Atom.symbol('f'), Atom.symbol('x'));
      expect(expr.isExpression).toBe(true);
      expect(expr.arity).toBe(2);
    });
  });
  
  describe('Unification', () => {
    it('should unify variables', () => {
      const pattern = Atom.variable('$x');
      const term = Atom.symbol('foo');
      const bindings = unify(pattern, term);
      expect(bindings).toEqual({ '$x': term });
    });
    
    it('should fail mismatched arity', () => {
      const p1 = Atom.expr(Atom.symbol('f'), Atom.symbol('a'));
      const p2 = Atom.expr(Atom.symbol('f'), Atom.symbol('a'), Atom.symbol('b'));
      expect(unify(p1, p2)).toBeNull();
    });
  });
  
  describe('Reduction', () => {
    it('should evaluate arithmetic', () => {
      metta.load('(= (double $x) (+ $x $x))');
      const result = metta.run('!(double 5)');
      expect(result[0].value).toBe('10');
    });
    
    it('should handle recursion', () => {
      metta.load(`
        (= (fact 0) 1)
        (= (fact $n) (* $n (fact (- $n 1))))
      `);
      const result = metta.run('!(fact 5)');
      expect(result[0].value).toBe('120');
    });
  });
});
```

### 20.2 Test Categories

| Category | Focus | Tools |
|----------|-------|-------|
| **Unit** | Individual functions | Vitest |
| **Integration** | Component interaction | Vitest |
| **End-to-end** | Full programs | Example suite |
| **Property** | Invariants (unification idempotence) | fast-check |
| **Performance** | Benchmarks (later) | hyperfine |

### 20.3 Coverage Goals

- Core: 90%+
- Inference: 80%+
- Examples: All working

---

## 21. REPL

### 21.1 Interactive Shell

```javascript
// tools/repl.js
import { createInterface } from 'readline';
import { MeTTa } from '../core/src/metta/index.js';

export class MeTTaREPL {
  constructor() {
    this.metta = new MeTTa();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'metta> '
    });
  }
  
  start() {
    console.log('MeTTa v0.1.0 - Type :help for commands');
    this.rl.prompt();
    
    this.rl.on('line', (line) => {
      try {
        this.handleInput(line.trim());
      } catch (error) {
        console.error('Error:', error.message);
      }
      this.rl.prompt();
    });
  }
  
  handleInput(line) {
    // Commands
    if (line.startsWith(':')) {
      return this.handleCommand(line.slice(1));
    }
    
    // Evaluation
    if (line.startsWith('!')) {
      const results = this.metta.run(line);
      results.forEach(r => console.log(r.toString()));
      return;
    }
    
    // Loading
    this.metta.load(line);
    console.log('Loaded.');
  }
  
  handleCommand(cmd) {
    const [command, ...args] = cmd.split(/\s+/);
    
    switch (command) {
      case 'help':
        console.log(`
Commands:
  :help           Show this help
  :quit           Exit REPL
  :clear          Clear space
  :atoms          Show all atoms
  :rules          Show all rules
  :stats          Show statistics
  :load <file>    Load file
        `);
        break;
      case 'quit':
        process.exit(0);
      case 'clear':
        this.metta.space.clear();
        console.log('Space cleared.');
        break;
      case 'atoms':
        this.metta.space.all().forEach(a => console.log(a.toString()));
        break;
      case 'rules':
        this.metta.space.getRules().forEach(({ pattern, result }) => {
          console.log(`(= ${pattern.toString()} ${result.toString()})`);
        });
        break;
      case 'stats':
        console.log(JSON.stringify(this.metta.getStats(), null, 2));
        break;
      case 'load':
        const fs = require('fs');
        const code = fs.readFileSync(args[0], 'utf-8');
        this.metta.load(code);
        console.log(`Loaded ${args[0]}`);
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
  }
}

// Run if main
if (import.meta.url === `file://${process.argv[1]}`) {
  new MeTTaREPL().start();
}
```

---

## 22. Module System

### 22.1 Import Mechanism

```javascript
class ModuleLoader {
  constructor(metta) {
    this.metta = metta;
    this.loaded = new Map();  // path -> atoms
    this.resolvers = [
      this.resolveLocal,
      this.resolveHttp,
      this.resolvePackage
    ];
  }
  
  async import(path) {
    // Check cache
    if (this.loaded.has(path)) {
      return this.loaded.get(path);
    }
    
    // Try resolvers
    for (const resolver of this.resolvers) {
      const code = await resolver(path);
      if (code) {
        this.metta.load(code);
        this.loaded.set(path, true);
        return;
      }
    }
    
    throw new Error(`Module not found: ${path}`);
  }
  
  async resolveLocal(path) {
    if (!path.startsWith('./') && !path.startsWith('/')) return null;
    const fs = await import('fs/promises');
    try {
      return await fs.readFile(path, 'utf-8');
    } catch {
      return null;
    }
  }
  
  async resolveHttp(path) {
    if (!path.startsWith('http://') && !path.startsWith('https://')) return null;
    const response = await fetch(path);
    return response.ok ? await response.text() : null;
  }
  
  async resolvePackage(path) {
    // Look in node_modules/.metta/
    return this.resolveLocal(`./node_modules/.metta/${path}.metta`);
  }
}

// Built-in import operation
class Grounded {
  registerBuiltins() {
    // ... existing builtins
    
    this.register('import!', async (pathAtom) => {
      await this.moduleLoader.import(pathAtom.value);
      return A.Empty;
    });
    
    this.register('include!', async (pathAtom) => {
      // Same as import but no caching
      const code = await fs.readFile(pathAtom.value, 'utf-8');
      this.metta.load(code);
      return A.Empty;
    });
  }
}
```

### 22.2 Usage

```metta
; Import standard library
!(import! "https://metta-lang.dev/stdlib/math.metta")

; Import local file
!(import! "./my-rules.metta")

; Include (re-execute every time)
!(include! "./config.metta")
```

---

## 23. Macro Expansion

### 23.1 Simple Macro System

```javascript
class MacroExpander {
  constructor(metta) {
    this.metta = metta;
    this.macros = new Map();
  }
  
  // Define macro: transforms code before evaluation
  defineMacro(name, transformer) {
    this.macros.set(name, transformer);
  }
  
  // Expand macros in atom
  expand(atom) {
    if (!atom.isExpression) return atom;
    
    const head = atom.head;
    if (head?.isSymbol && this.macros.has(head.value)) {
      const transformer = this.macros.get(head.value);
      return this.expand(transformer(atom.tail));
    }
    
    // Recursively expand children
    return Atom.expr(...atom.children.map(c => this.expand(c)));
  }
}

// Example: let macro
metta.macros.defineMacro('let', (args) => {
  // (let (($x 1) ($y 2)) (+ $x $y))
  // => ((lambda ($x $y) (+ $x $y)) 1 2)
  const [bindings, body] = args;
  const vars = bindings.children.map(b => b.children[0]);
  const vals = bindings.children.map(b => b.children[1]);
  return Atom.expr(
    Atom.expr(Atom.symbol('lambda'), Atom.expr(...vars), body),
    ...vals
  );
});
```

---

## 24. State & Context Management

### 24.1 Execution Context

```javascript
class Context {
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = new Map();
    this.space = null;  // Current space reference
  }
  
  // Scoped binding lookup
  get(name) {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    return this.parent?.get(name) ?? null;
  }
  
  set(name, value) {
    this.bindings.set(name, value);
  }
  
  // Create child context
  child() {
    return new Context(this);
  }
}

class Reducer {
  constructor(space, grounded, nondet) {
    this.space = space;
    this.grounded = grounded;
    this.nondet = nondet;
    this.context = new Context();  // Global context
  }
  
  // Reduce with context
  reduce(atom, context = this.context) {
    // Pass context through reduction
    // ...
  }
}
```

### 24.2 Multiple Spaces

```javascript
class MeTTa {
  constructor() {
    this.spaces = new Map();
    this.spaces.set('default', new Space());
    this.currentSpace = 'default';
  }
  
  createSpace(name) {
    this.spaces.set(name, new Space());
  }
  
  switchSpace(name) {
    if (!this.spaces.has(name)) {
      throw new Error(`Space not found: ${name}`);
    }
    this.currentSpace = name;
  }
  
  get space() {
    return this.spaces.get(this.currentSpace);
  }
}
```

---

## 25. Debugging Tools

### 25.1 Trace Mode

```javascript
class Reducer {
  constructor(space, grounded, nondet, config = {}) {
    // ...
    this.trace = config.trace || false;
    this.traceLog = [];
  }
  
  step(atom) {
    if (this.trace) {
      this.traceLog.push({
        step: this.traceLog.length,
        input: atom.toString(),
        rules: this.space.getRules().length
      });
    }
    
    // ... normal step logic
    
    if (this.trace && result !== atom) {
      this.traceLog[this.traceLog.length - 1].output = result.toString();
    }
    
    return result;
  }
  
  getTrace() {
    return this.traceLog;
  }
  
  clearTrace() {
    this.traceLog = [];
  }
}

// Usage
const metta = new MeTTa({ trace: true });
metta.run('!(fact 5)');
console.table(metta.reducer.getTrace());
```

### 25.2 Breakpoints

```javascript
class Reducer {
  constructor(space, grounded, nondet, config = {}) {
    this.breakpoints = new Set();  // Atom patterns to break on
    this.breakCallback = config.onBreak || null;
  }
  
  step(atom) {
    // Check breakpoints
    for (const bp of this.breakpoints) {
      if (unify(bp, atom)) {
        if (this.breakCallback) {
          this.breakCallback(atom, this);
        } else {
          debugger;  // Built-in JS debugger
        }
      }
    }
    
    // ... continue normally
  }
  
  addBreakpoint(pattern) {
    this.breakpoints.add(pattern);
  }
}
```

---

## 26. Async & Promises

### 26.1 Async Grounded Functions

```javascript
class Grounded {
  async callAsync(name, args) {
    const fn = this.functions.get(name);
    if (!fn) return null;
    
    // Support both sync and async functions
    const result = fn(...args);
    return result instanceof Promise ? await result : result;
  }
}

class Reducer {
  async reduceAsync(atom) {
    let current = atom;
    for (let step = 0; step < this.maxSteps; step++) {
      const next = await this.stepAsync(current);
      if (next === current) return current;
      current = next;
    }
    throw new Error('Max reduction steps exceeded');
  }
  
  async stepAsync(atom) {
    // Try built-in operations (may be async)
    if (atom.isExpression) {
      const result = await this.evaluateBuiltinAsync(atom);
      if (result) return result;
    }
    
    // ... rest of step logic
  }
}

// Usage
metta.grounded.register('fetch', async (url) => {
  const response = await fetch(url.value);
  return Atom.symbol(await response.text());
});

const result = await metta.evalAsync(parse('!(fetch "https://example.com")')[0]);
```

### 26.2 Parallel Evaluation

```javascript
class Nondet {
  // Evaluate all branches in parallel
  async *parallelSuperpose(atoms) {
    const promises = atoms.map(a => this.metta.evalAsync(a));
    const results = await Promise.all(promises);
    for (const result of results) {
      yield result;
    }
  }
}
```

---

## 27. Memory Management

### 27.1 Concerns

| Issue | Mitigation |
|-------|------------|
| **Atom duplication** | Interning/atom table for deduplication |
| **Large spaces** | Weak references for unused atoms |
| **Deep recursion** | Tail call optimization (limited in JS) |
| **Generator memory** | Consume generators eagerly or in chunks |

### 27.2 Atom Interning

```javascript
class AtomTable {
  constructor() {
    this.symbols = new Map();      // string -> Atom
    this.expressions = new WeakMap(); // children -> Atom
  }
  
  internSymbol(name) {
    if (!this.symbols.has(name)) {
      this.symbols.set(name, new Atom('symbol', name));
    }
    return this.symbols.get(name);
  }
  
  internExpression(children) {
    const key = children.map(c => c.id).join(',');
    // Use WeakMap for expressions (GC eligible)
    // Return existing or create new
  }
}
```

---

## 28. Serialization

### 28.1 JSON Export/Import

```javascript
class MeTTa {
  // Serialize space to JSON
  toJSON() {
    return {
      atoms: this.space.all().map(a => atomToJSON(a)),
      rules: this.space.getRules().map(({ pattern, result }) => ({
        pattern: atomToJSON(pattern),
        result: atomToJSON(result)
      })),
      types: [...this.types.declarations.entries()]
    };
  }
  
  // Restore from JSON
  fromJSON(json) {
    this.space.clear();
    json.atoms.forEach(a => this.space.add(atomFromJSON(a)));
    json.rules.forEach(({ pattern, result }) => {
      this.space.addRule(atomFromJSON(pattern), atomFromJSON(result));
    });
    json.types.forEach(([sym, type]) => {
      this.types.declare(Atom.symbol(sym), type);
    });
  }
}

function atomToJSON(atom) {
  if (atom.isExpression) {
    return { kind: 'expr', children: atom.children.map(atomToJSON) };
  }
  return { kind: atom.kind, value: atom.value };
}

function atomFromJSON(json) {
  if (json.kind === 'expr') {
    return Atom.expr(...json.children.map(atomFromJSON));
  }
  return Atom[json.kind](json.value);
}
```

### 28.2 S-Expression Export

```javascript
class MeTTa {
  // Export space as MeTTa code
  toCode() {
    const lines = [];
    
    // Export type declarations
    for (const [sym, type] of this.types.declarations) {
      lines.push(`(: ${sym} ${type})`);
    }
    
    // Export rules
    for (const { pattern, result } of this.space.getRules()) {
      lines.push(`(= ${pattern.toString()} ${result.toString()})`);
    }
    
    // Export atoms
    for (const atom of this.space.all()) {
      if (!atom.isExpression || atom.head?.value !== '=') {
        lines.push(atom.toString());
      }
    }
    
    return lines.join('\n');
  }
}
```

---

## 29. CLI Tool

### 29.1 Command-Line Interface

```javascript
#!/usr/bin/env node
// bin/metta.js

import { program } from 'commander';
import { MeTTa } from '../core/src/metta/index.js';
import { MeTTaREPL } from '../tools/repl.js';
import fs from 'fs/promises';

program
  .name('metta')
  .description('MeTTa interpreter')
  .version('0.1.0');

program
  .command('repl')
  .description('Start interactive REPL')
  .action(() => {
    new MeTTaREPL().start();
  });

program
  .command('run <file>')
  .description('Run MeTTa file')
  .option('-t, --trace', 'Enable trace mode')
  .option('-o, --output <file>', 'Output results to file')
  .action(async (file, options) => {
    const metta = new MeTTa({ trace: options.trace });
    const code = await fs.readFile(file, 'utf-8');
    
    metta.load(code);
    const results = metta.run(code);
    
    const output = results.map(r => r.toString()).join('\n');
    
    if (options.output) {
      await fs.writeFile(options.output, output);
    } else {
      console.log(output);
    }
    
    if (options.trace) {
      console.error('\n--- Trace ---');
      console.table(metta.reducer.getTrace());
    }
  });

program
  .command('check <file>')
  .description('Type-check MeTTa file')
  .action(async (file) => {
    const metta = new MeTTa({ strictTypes: true });
    const code = await fs.readFile(file, 'utf-8');
    
    try {
      metta.load(code);
      console.log('✓ Type check passed');
    } catch (error) {
      console.error('✗ Type error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

---

## 30. Browser vs Node Compatibility

### 30.1 Universal Module

```javascript
// core/src/metta/index.js
export { Atom } from './Atom.js';
export { Space } from './Space.js';
export { unify, substitute } from './Unify.js';
export { Reducer } from './Reduce.js';
export { Nondet } from './Nondet.js';
export { Types } from './Types.js';
export { Grounded } from './Grounded.js';
export { parse } from './Parser.js';
export { MeTTa } from './Interpreter.js';

// Default export for convenience
export default MeTTa;
```

### 30.2 Platform Detection

```javascript
// utils/platform.js
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// Use appropriate APIs
export const readFile = isBrowser 
  ? (url) => fetch(url).then(r => r.text())
  : (path) => import('fs/promises').then(fs => fs.readFile(path, 'utf-8'));
```

---

## 31. SeNARS Integration

### 31.1 Bridge to SeNARS Memory

```javascript
// Integration with existing SeNARS system
class SeNARSBridge {
  constructor(metta, senarsMemory) {
    this.metta = metta;
    this.memory = senarsMemory;
  }
  
  // Convert MeTTa atom to NARS term
  toNARSTerm(atom) {
    if (atom.isSymbol) {
      return this.termFactory.atomic(atom.value);
    }
    if (atom.isExpression) {
      const [head, ...args] = atom.children;
      return this.termFactory.compound(
        head.value,
        args.map(a => this.toNARSTerm(a))
      );
    }
    return null;
  }
  
  // Convert NARS task to MeTTa atom
  toMeTTaAtom(task) {
    // Convert task.term to Atom representation
    return this.convertTerm(task.term);
  }
  
  // Sync: push MeTTa atoms to NARS
  syncToNARS() {
    for (const atom of this.metta.space.all()) {
      const term = this.toNARSTerm(atom);
      if (term) {
        this.memory.addTask({
          term,
          punctuation: '.',
          truth: { frequency: 0.9, confidence: 0.9 }
        });
      }
    }
  }
  
  // Sync: pull NARS beliefs to MeTTa
  syncFromNARS() {
    const beliefs = this.memory.getHighestPriorityTasks(100);
    for (const task of beliefs) {
      const atom = this.toMeTTaAtom(task);
      if (atom) {
        this.metta.space.add(atom);
      }
    }
  }
}
```

### 31.2 Hybrid Reasoning

```javascript
// Use MeTTa for pattern matching, NARS for temporal reasoning
class HybridReasoner {
  constructor(metta, nars) {
    this.metta = metta;
    this.nars = nars;
  }
  
  // Query both systems
  query(pattern) {
    // Try MeTTa pattern matching first
    const mettaResults = this.metta.query(pattern);
    
    // Fall back to NARS inference
    if (mettaResults.length === 0) {
      const narsResults = this.nars.query(pattern);
      return narsResults.map(r => this.bridge.toMeTTaAtom(r));
    }
    
    return mettaResults;
  }
}
```

---

## 32. Concerns & Tradeoffs

### 32.1 Design Tradeoffs

| Choice | Benefit | Cost |
|--------|---------|------|
| **Single Atom class** | Simpler, unified | No type safety |
| **Generator-based nondet** | Lazy, memory efficient | More complex flow |
| **No mandatory types** | Easier adoption | Runtime errors |
| **Simple Set for space** | Easy to implement | O(n) queries |
| **Defer optimization** | Faster development | Slower execution |

### 32.2 Known Limitations

| Limitation | Workaround | Future Fix |
|------------|------------|------------|
| **Deep recursion** | Iterative rewrites | Trampoline/CPS |
| **Large spaces** | Limit atom count | Indices/pagination |
| **No tail-call optimization** | JS limitation | Worker threads |
| **Synchronous by default** | Use `*Async` methods | Full async core |
| **No distributed atomspace** | Single process | ZMQ/WebSocket sync |

### 32.3 Security Concerns

| Concern | Mitigation |
|---------|------------|
| **Code injection** | Parse untrusted input carefully |
| **Resource exhaustion** | Limits on space size, reduction steps |
| **Grounded function safety** | Whitelist/sandbox grounded functions |
| **Module imports** | Validate URLs, use CSP in browser |

---

## 33. Edge Cases & Gotchas

### 33.1 Unification Edge Cases

```javascript
// Occurs check: prevent infinite structures
function unify(pattern, term, bindings = {}) {
  if (pattern.isVariable) {
    if (occursIn(pattern, term)) {
      return null;  // Infinite structure
    }
    // ... rest of unification
  }
}

function occursIn(variable, term) {
  if (term.equals(variable)) return true;
  if (term.isExpression) {
    return term.children.some(c => occursIn(variable, c));
  }
  return false;
}
```

### 33.2 Nondeterminism Gotchas

```javascript
// Generators are consumed once!
const gen = nondet.superpose([1, 2, 3]);
for (const val of gen) {
  console.log(val);  // Works
}
for (const val of gen) {
  console.log(val);  // Empty! Generator exhausted
}

// Solution: collapseAll or recreate generator
const values = nondet.collapseAll(nondet.superpose([1, 2, 3]));
```

### 33.3 Equality vs Identity

```javascript
// Structural equality
const a1 = Atom.symbol('foo');
const a2 = Atom.symbol('foo');
a1 === a2;        // false (different objects)
a1.equals(a2);    // true (same structure)

// Use atom interning for identity
const table = new AtomTable();
const a3 = table.internSymbol('foo');
const a4 = table.internSymbol('foo');
a3 === a4;        // true (same object)
```

---

## 34. Performance Considerations (Future)

### 34.1 When to Optimize

**Don't optimize until:**
- Core functionality works
- Test suite passes
- Real benchmarks show bottlenecks

**Then consider:**

| Optimization | Impact | Complexity |
|--------------|--------|------------|
| Atom interning | High (reduce memory) | Medium |
| Space indices | High (faster queries) | Medium |
| Compiled patterns | Medium (faster matching) | High |
| Worker threads | Medium (parallelism) | High |
| WASM core | Low (marginal speedup) | Very High |

### 34.2 Profiling Hooks

```javascript
class MeTTa {
  constructor(config = {}) {
    this.profiling = config.profile || false;
    this.stats = {
      reductions: 0,
      unifications: 0,
      queries: 0
    };
  }
  
  getStats() {
    return {
      ...this.stats,
      atomCount: this.space.all().length,
      ruleCount: this.space.getRules().length
    };
  }
}
```

---

## 35. References & Resources

### 35.1 Theoretical Foundations

| Resource | Topic |
|----------|-------|
| [arXiv:2112.08272](https://arxiv.org/abs/2112.08272) | Reflective metagraph rewriting |
| [arXiv:2310.18318](https://arxiv.org/abs/2310.18318) | OpenCog Hyperon framework |
| [MeTTa Language](https://metta-lang.dev) | Official documentation |

### 35.2 Implementation References

| Project | Relevance |
|---------|-----------|
| OpenCog Hyperon | Original Rust/C++ implementation |
| hyperon-experimental | Reference interpreter |
| metta-wam | Prolog WAM backend |

### 35.3 Related Systems

| System | Similarity |
|--------|------------|
| Prolog | Unification, pattern matching |
| miniKanren | Relational programming, nondet |
| Scheme | S-expressions, macros |
| Datalog | Logic programming, fixed-point |

---

## 36. Migration Guide

### 36.1 From Existing Core

Current `core/src/metta/` already has:
- ✓ `MeTTaInterpreter.js` → Becomes `Interpreter.js`
- ✓ `MeTTaSpace.js` → Becomes `Space.js`  
- ✓ `MatchEngine.js` → Absorbed into `Unify.js`
- ✓ `ReductionEngine.js` → Becomes `Reduce.js`
- ✓ `NonDeterminism.js` → Becomes `Nondet.js`
- ✓ `TypeSystem.js` → Becomes `Types.js`
- ✓ `GroundedAtoms.js` → Becomes `Grounded.js`

### 36.2 Changes Required

| File | Changes |
|------|---------|
| All | Remove `BaseMeTTaComponent` dependency |
| `MeTTaSpace` | Simplify to pure `Space` (remove SeNARS coupling) |
| `MatchEngine` | Extract to standalone `unify()`/`substitute()` |
| Types | Remove `TypeChecker.js` duplicate |
| Parser | Extract from interpreter to `Parser.js` |

### 36.3 Backward Compatibility

```javascript
// Adapter for existing code
export class MeTTaInterpreter extends MeTTa {
  constructor(memory, config, eventBus) {
    super(config);
    // Ignore memory/eventBus in new design
    console.warn('MeTTaInterpreter is deprecated, use MeTTa');
  }
}
```

---

## 37. Roadmap

### Week 1-2: Core Foundation
- [x] Review existing implementation
- [ ] Refactor `Atom.js` (unified class)
- [ ] Extract `Unify.js` from `MatchEngine`
- [ ] Simplify `Space.js`
- [ ] Extract `Parser.js`

### Week 3-4: Integration
- [ ] Unify `Reduce.js`
- [ ] Simplify `Nondet.js` (generators)
- [ ] Simplify `Types.js`
- [ ] Simplify `Grounded.js`
- [ ] Create `Interpreter.js` orchestration

### Week 5-6: Features
- [ ] `Inference.js` module
- [ ] Module system (`import!`)
- [ ] Macro expansion
- [ ] Error handling

### Week 7-8: Tooling
- [ ] REPL
- [ ] CLI tool
- [ ] Test suite
- [ ] Documentation
- [ ] Example programs

### Week 9+: Polish
- [ ] SeNARS integration
- [ ] Performance profiling
- [ ] Optimization (if needed)
- [ ] Advanced inference algorithms
