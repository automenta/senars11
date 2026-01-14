# MeTTa Implementation: Complete & Perfected

**Vision:** The most powerful, elegant, and truly isomorphic MeTTa implementation—achieving full spec parity while pioneering web-native features.

---

## 🏗️ Isomorphic Architecture

### Environment Detection Pattern

```javascript
// Universal environment detection - use throughout codebase
export const ENV = {
    isBrowser: typeof window !== 'undefined' && typeof window.document !== 'undefined',
    isNode: typeof process !== 'undefined' && process.versions?.node,
    isWorker: typeof self !== 'undefined' && typeof importScripts === 'function',
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasWorkers: typeof Worker !== 'undefined',
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
};
```

### Module Structure

```
metta/src/
├── kernel/           # Pure JS, no env-specific APIs
│   ├── Term.js       # Atom representation (isomorphic)
│   ├── Space.js      # Atomspace (isomorphic)
│   ├── Unify.js      # Pattern matching (isomorphic)
│   ├── Reduce.js     # Reduction engine (isomorphic)
│   ├── Ground.js     # Grounded operations (isomorphic)
│   └── Bindings.js   # Variable bindings (isomorphic)
├── stdlib/           # Pure MeTTa files + loader
│   ├── StdlibLoader.js    # Isomorphic: virtualFiles OR fs
│   ├── core.metta
│   ├── list.metta
│   ├── hof.metta          # [NEW] Higher-order functions
│   ├── sets.metta         # [NEW] Set operations
│   ├── types.metta
│   └── match.metta
├── platform/         # [NEW] Environment-specific adapters
│   ├── node/
│   │   ├── FileLoader.js      # fs-based loading
│   │   ├── WorkerPool.js      # worker_threads
│   │   └── Persistence.js     # SQLite/fs persistence
│   └── browser/
│       ├── VirtualFS.js       # In-memory + IndexedDB
│       ├── WebWorkerPool.js   # Web Workers
│       └── IDBPersistence.js  # IndexedDB storage
├── extensions/       # [NEW] Beyond-parity features
│   ├── ReactiveSpace.js    # Observable atomspace
│   ├── TemporalOps.js      # Time-aware operations
│   ├── Debugger.js         # Step-through debugger
│   └── index.js
├── MeTTaInterpreter.js   # Main entry (isomorphic)
├── Parser.js             # MeTTa parser (isomorphic)
└── TypeSystem.js         # Type checking (isomorphic)
```

---

## 📋 Complete Implementation Phases

### **Phase 1: Minimal MeTTa Instructions** ⭐ CRITICAL

All operations implemented in [Ground.js](file:///home/me/senars10/metta/src/kernel/Ground.js) constructor:

```javascript
_registerMinimalMeTTa() {
    // === eval: single-step evaluation ===
    this.register('eval', (atom) => {
        const {reduced} = step(atom, this.space, this, this.reductionLimit, this.cache);
        return reduced;
    }, {lazy: true});

    // === chain: evaluate $atom, bind to $var, evaluate $template ===
    this.register('chain', (atom, varAtom, template) => {
        const result = reduce(atom, this.space, this, this.reductionLimit, this.cache);
        if (result?.name === 'Empty' || result?.operator?.name === 'Error') return result;
        return Unify.subst(template, {[varAtom.name]: result});
    }, {lazy: true});

    // === unify: pattern match with then/else branches ===
    this.register('unify', (atom, pattern, thenBranch, elseBranch) => {
        const bindings = Unify.unify(atom, pattern);
        return bindings !== null ? Unify.subst(thenBranch, bindings) : elseBranch;
    }, {lazy: true});

    // === function/return: block evaluation ===
    this.register('function', (body) => {
        let current = body;
        let iterations = 0;
        while (iterations++ < this.reductionLimit) {
            const reduced = reduce(current, this.space, this, this.reductionLimit, this.cache);
            if (isExpression(reduced) && reduced.operator?.name === 'return') {
                return reduced.components[0] || sym('()');
            }
            if (reduced === current || reduced?.equals?.(current)) break;
            current = reduced;
        }
        return exp(sym('Error'), [body, sym('NoReturn')]);
    }, {lazy: true});

    this.register('return', (value) => exp(sym('return'), [value]), {lazy: true});

    // === collapse-bind: collect all results ===
    this.register('collapse-bind', (atom) => {
        const results = reduceND(atom, this.space, this, this.reductionLimit);
        return this._listify(results.map(r => exp(sym(':'), [r, sym('{}')])));
    }, {lazy: true});

    // === superpose-bind: expand results ===
    this.register('superpose-bind', (collapsed) => {
        const items = this._flattenExpr(collapsed);
        return items.length === 1 ? items[0] : exp(sym('superpose'), items);
    });

    // === context-space: return current space ===
    this.register('context-space', () => this.space, {lazy: true});

    // === noeval: prevent evaluation ===
    this.register('noeval', (atom) => atom, {lazy: true});
}
```

---

### **Phase 2: Expression Manipulation**

```javascript
_registerExpressionOps() {
    // === cons-atom: construct expression from head + tail ===
    this.register('cons-atom', (head, tail) => {
        if (!isExpression(tail)) return exp(head, [tail]);
        const components = tail.components ? [tail.operator, ...tail.components] : [tail];
        return exp(head, components);
    });

    // === decons-atom: split expression to (head tail) ===
    this.register('decons-atom', (expr) => {
        if (!isExpression(expr)) return exp(sym('Error'), [expr, sym('NotExpression')]);
        const head = expr.operator;
        const tail = expr.components?.length 
            ? (expr.components.length === 1 ? expr.components[0] : exp(expr.components[0], expr.components.slice(1)))
            : sym('()');
        return exp(sym(':'), [head, tail]);
    });

    // === car-atom: first element ===
    this.register('car-atom', (expr) => {
        if (!isExpression(expr)) return exp(sym('Error'), [expr, sym('NotExpression')]);
        return expr.operator || exp(sym('Error'), [expr, sym('EmptyExpression')]);
    });

    // === cdr-atom: tail elements ===
    this.register('cdr-atom', (expr) => {
        if (!isExpression(expr) || !expr.components?.length) return sym('()');
        return expr.components.length === 1 
            ? expr.components[0] 
            : exp(expr.components[0], expr.components.slice(1));
    });

    // === size-atom: count elements ===
    this.register('size-atom', (expr) => {
        if (!isExpression(expr)) return sym('1');
        return sym(String(1 + (expr.components?.length || 0)));
    });

    // === index-atom: get element by index ===
    this.register('index-atom', (expr, idx) => {
        const i = parseInt(idx.name);
        if (isNaN(i)) return exp(sym('Error'), [idx, sym('NotANumber')]);
        if (i === 0) return expr.operator || expr;
        const comp = expr.components?.[i - 1];
        return comp || exp(sym('Error'), [idx, sym('OutOfBounds')]);
    });
}
```

---

### **Phase 3: Complete Math Functions**

```javascript
_registerMathOps() {
    const toNum = (atom) => parseFloat(atom?.name) || 0;
    const toSym = (n) => sym(String(Number.isInteger(n) ? n : n.toFixed(12).replace(/\.?0+$/, '')));
    const unary = (fn) => (x) => toSym(fn(toNum(x)));
    const binary = (fn) => (a, b) => toSym(fn(toNum(a), toNum(b)));

    // Hyperon parity - all 14 functions
    this.register('pow-math', binary(Math.pow));
    this.register('sqrt-math', unary(Math.sqrt));
    this.register('abs-math', unary(Math.abs));
    this.register('log-math', binary((base, x) => Math.log(x) / Math.log(base)));
    this.register('trunc-math', unary(Math.trunc));
    this.register('ceil-math', unary(Math.ceil));
    this.register('floor-math', unary(Math.floor));
    this.register('round-math', unary(Math.round));
    this.register('sin-math', unary(Math.sin));
    this.register('asin-math', unary(Math.asin));
    this.register('cos-math', unary(Math.cos));
    this.register('acos-math', unary(Math.acos));
    this.register('tan-math', unary(Math.tan));
    this.register('atan-math', unary(Math.atan));
    this.register('isnan-math', (x) => this._bool(isNaN(toNum(x))));
    this.register('isinf-math', (x) => this._bool(!isFinite(toNum(x))));

    // Aggregate operations
    this.register('min-atom', (expr) => {
        const nums = this._flattenExpr(expr).map(toNum).filter(n => !isNaN(n));
        return nums.length ? toSym(Math.min(...nums)) : exp(sym('Error'), [expr, sym('EmptyOrNonNumeric')]);
    });
    this.register('max-atom', (expr) => {
        const nums = this._flattenExpr(expr).map(toNum).filter(n => !isNaN(n));
        return nums.length ? toSym(Math.max(...nums)) : exp(sym('Error'), [expr, sym('EmptyOrNonNumeric')]);
    });
    this.register('sum-atom', (expr) => toSym(this._flattenExpr(expr).reduce((s, e) => s + toNum(e), 0)));

    // BEYOND PARITY: Vector math
    this.register('vec-add', (...vecs) => {
        const arrs = vecs.map(v => this._flattenExpr(v).map(toNum));
        const len = Math.max(...arrs.map(a => a.length));
        const result = Array(len).fill(0).map((_, i) => arrs.reduce((sum, arr) => sum + (arr[i] || 0), 0));
        return this._listify(result.map(toSym));
    });
    this.register('vec-dot', (a, b) => {
        const arrA = this._flattenExpr(a).map(toNum);
        const arrB = this._flattenExpr(b).map(toNum);
        return toSym(arrA.reduce((sum, v, i) => sum + v * (arrB[i] || 0), 0));
    });
    this.register('vec-scale', (vec, scalar) => {
        const s = toNum(scalar);
        return this._listify(this._flattenExpr(vec).map(e => toSym(toNum(e) * s)));
    });
}
```

---

### **Phase 4: Higher-Order Functions**

#### Pure MeTTa (`stdlib/hof.metta`):

```metta
; === atom-subst: substitute variable in template ===
(= (atom-subst $value $var $template)
  (function (chain (eval (noeval $value)) $var (return $template))))

; === filter-atom: filter by predicate ===
(= (filter-atom () $var $pred) ())
(= (filter-atom $list $var $pred)
  (function (chain (decons-atom $list) $ht
    (unify $ht ($head $tail)
      (chain (atom-subst $head $var $pred) $result
        (chain (filter-atom $tail $var $pred) $filtered
          (if $result
            (return (cons-atom $head $filtered))
            (return $filtered))))
      (return ())))))

; === map-atom: transform each element ===
(= (map-atom () $var $fn) ())
(= (map-atom $list $var $fn)
  (function (chain (decons-atom $list) $ht
    (unify $ht ($head $tail)
      (chain (atom-subst $head $var $fn) $transformed
        (chain (map-atom $tail $var $fn) $mapped
          (return (cons-atom $transformed $mapped))))
      (return ())))))

; === foldl-atom: left fold ===
(= (foldl-atom () $acc $a $b $op) $acc)
(= (foldl-atom $list $acc $a $b $op)
  (function (chain (decons-atom $list) $ht
    (unify $ht ($head $tail)
      (chain (atom-subst $acc $a (atom-subst $head $b $op)) $newAcc
        (return (foldl-atom $tail $newAcc $a $b $op)))
      (return $acc)))))

; === reduce-atom: like foldl but uses first element as init ===
(= (reduce-atom $list $a $b $op)
  (let ($head $tail) (decons-atom $list)
    (foldl-atom $tail $head $a $b $op)))
```

#### Grounded Fast Versions ([Ground.js](file:///home/me/senars10/metta/src/kernel/Ground.js)):

```javascript
_registerHOFOps() {
    // Fast grounded versions for performance-critical paths
    this.register('filter-atom-fast', (list, varName, predFn) => {
        const elements = this._flattenExpr(list);
        const filtered = elements.filter(el => {
            const result = reduce(Unify.subst(predFn, {[varName.name]: el}), this.space, this, this.reductionLimit, this.cache);
            return this._truthy(result);
        });
        return this._listify(filtered);
    }, {lazy: true});

    this.register('map-atom-fast', (list, varName, transformFn) => {
        const elements = this._flattenExpr(list);
        const mapped = elements.map(el => reduce(Unify.subst(transformFn, {[varName.name]: el}), this.space, this, this.reductionLimit, this.cache));
        return this._listify(mapped);
    }, {lazy: true});

    this.register('foldl-atom-fast', (list, init, aVar, bVar, opFn) => {
        const elements = this._flattenExpr(list);
        return elements.reduce((acc, el) => {
            const substituted = Unify.subst(Unify.subst(opFn, {[aVar.name]: acc}), {[bVar.name]: el});
            return reduce(substituted, this.space, this, this.reductionLimit, this.cache);
        }, init);
    }, {lazy: true});
}
```

---

### **Phase 5: Control Flow & Error Handling**

#### Pure MeTTa ([stdlib/core.metta](file:///home/me/senars10/metta/src/stdlib/core.metta) additions):

```metta
; === quote/unquote: prevent/restore reduction ===
(= (quote $atom) NotReducible)
(= (unquote (quote $atom)) $atom)

; === nop/empty: no-op and branch cut ===
(= (nop) ())
(= (nop $_) ())
(= (empty) Empty)

; === switch: pattern-matching control flow ===
(= (switch $atom ()) Empty)
(= (switch $atom (($pattern $result) . $rest))
  (unify $atom $pattern $result (switch $atom $rest)))

; === if-error: error detection ===
(= (if-error $atom $then $else)
  (function (chain (get-metatype $atom) $meta
    (if (== $meta Expression)
      (chain (car-atom $atom) $head
        (if (== $head Error) (return $then) (return $else)))
      (return $else)))))

; === try-catch: exception handling ===
(= (try $expr $catchVar $handler)
  (function (chain (eval $expr) $result
    (if-error $result
      (return (atom-subst $result $catchVar $handler))
      (return $result)))))

; === return-on-error: early exit on error ===
(= (return-on-error $atom $continuation)
  (function (if-error $atom (return $atom) (return $continuation))))
```

---

### **Phase 6: Set Operations**

```javascript
_registerSetOps() {
    this.register('unique-atom', (expr) => {
        const seen = new Set();
        const result = [];
        for (const el of this._flattenExpr(expr)) {
            const key = el.toString();
            if (!seen.has(key)) { seen.add(key); result.push(el); }
        }
        return this._listify(result);
    });

    this.register('union-atom', (a, b) => {
        const setA = this._flattenExpr(a);
        const setB = this._flattenExpr(b);
        return this._listify([...setA, ...setB]);
    });

    this.register('intersection-atom', (a, b) => {
        const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
        return this._listify(this._flattenExpr(a).filter(x => setB.has(x.toString())));
    });

    this.register('subtraction-atom', (a, b) => {
        const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
        return this._listify(this._flattenExpr(a).filter(x => !setB.has(x.toString())));
    });

    // BEYOND PARITY
    this.register('symmetric-diff-atom', (a, b) => {
        const setA = new Set(this._flattenExpr(a).map(x => x.toString()));
        const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
        const result = [
            ...this._flattenExpr(a).filter(x => !setB.has(x.toString())),
            ...this._flattenExpr(b).filter(x => !setA.has(x.toString()))
        ];
        return this._listify(result);
    });

    this.register('is-subset', (a, b) => {
        const setB = new Set(this._flattenExpr(b).map(x => x.toString()));
        return this._bool(this._flattenExpr(a).every(x => setB.has(x.toString())));
    });

    this.register('set-size', (expr) => sym(String(new Set(this._flattenExpr(expr).map(x => x.toString())).size)));
}
```

---

### **Phase 7: Type System Enhancements**

```javascript
_registerTypeOps() {
    this.register('get-metatype', (atom) => {
        if (!atom) return sym('%Undefined%');
        if (atom.name?.startsWith('$')) return sym('Variable');
        if (isExpression(atom)) return sym('Expression');
        if (typeof atom.execute === 'function') return sym('Grounded');
        return sym('Symbol');
    });

    this.register('get-type', (atom, space) => {
        const typePattern = exp(sym(':'), [atom, Term.var('type')]);
        const results = match(space || this.space, typePattern, Term.var('type'));
        return results.length ? results[0] : sym('%Undefined%');
    }, {lazy: true});

    this.register('is-function', (type) => {
        if (!isExpression(type)) return sym('False');
        return this._bool(type.operator?.name === '->');
    });

    this.register('match-types', (t1, t2, thenBranch, elseBranch) => {
        if (t1.name === '%Undefined%' || t2.name === '%Undefined%' || t1.name === 'Atom' || t2.name === 'Atom') return thenBranch;
        const bindings = Unify.unify(t1, t2);
        return bindings !== null ? thenBranch : elseBranch;
    }, {lazy: true});

    this.register('assert-type', (atom, expectedType, space) => {
        const actualType = this.execute('get-type', atom, space);
        if (actualType.name === '%Undefined%') return atom; // No type info = pass
        const bindings = Unify.unify(actualType, expectedType);
        return bindings !== null ? atom : exp(sym('Error'), [atom, exp(sym('TypeError'), [expectedType, actualType])]);
    }, {lazy: true});
}
```

---

### **Phase 8: Reactive Spaces** (Beyond Parity)

#### `extensions/ReactiveSpace.js`:

```javascript
import {ENV} from '../platform/env.js';
import {Space} from '../kernel/Space.js';
import {Unify} from '../kernel/Unify.js';

export class ReactiveSpace extends Space {
    constructor() {
        super();
        this.observers = new Map();
        this.eventLog = [];
        this.maxEventLogSize = 10000;
    }

    add(atom) {
        super.add(atom);
        this._emit('add', atom);
        return this;
    }

    addRule(pattern, result) {
        super.addRule(pattern, result);
        this._emit('addRule', {pattern, result});
        return this;
    }

    remove(atom) {
        super.remove(atom);
        this._emit('remove', atom);
        return this;
    }

    observe(pattern, callback) {
        const key = pattern.toString();
        if (!this.observers.has(key)) this.observers.set(key, []);
        this.observers.get(key).push({pattern, callback});
        return () => this._unobserve(key, callback);
    }

    _emit(event, data) {
        const entry = {event, data, timestamp: Date.now()};
        this.eventLog.push(entry);
        if (this.eventLog.length > this.maxEventLogSize) this.eventLog.shift();

        for (const [_, observers] of this.observers) {
            for (const {pattern, callback} of observers) {
                if (Unify.unify(pattern, data) !== null) {
                    try { callback(entry); } catch (e) { console.error('Observer error:', e); }
                }
            }
        }
    }

    getEventLog(since = 0) {
        return this.eventLog.filter(e => e.timestamp > since);
    }

    _unobserve(key, callback) {
        const obs = this.observers.get(key);
        if (obs) this.observers.set(key, obs.filter(o => o.callback !== callback));
    }
}
```

---

### **Phase 9: Parallel Evaluation** (Beyond Parity)

#### `platform/browser/WebWorkerPool.js`:

```javascript
import {ENV} from '../env.js';

export class WebWorkerPool {
    constructor(workerScript, poolSize = navigator?.hardwareConcurrency || 4) {
        if (!ENV.hasWorkers) throw new Error('WebWorkers not available');
        this.workers = [];
        this.taskQueue = [];
        this.callbacks = new Map();
        this.nextId = 0;

        for (let i = 0; i < poolSize; i++) {
            const worker = new Worker(workerScript, {type: 'module'});
            worker.onmessage = (e) => this._handleResult(e.data);
            worker.onerror = (e) => console.error('Worker error:', e);
            this.workers.push({worker, busy: false});
        }
    }

    async execute(task) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            this.callbacks.set(id, {resolve, reject});
            this._dispatch({id, ...task});
        });
    }

    async mapParallel(items, taskBuilder) {
        return Promise.all(items.map(item => this.execute(taskBuilder(item))));
    }

    _dispatch(task) {
        const available = this.workers.find(w => !w.busy);
        if (available) {
            available.busy = true;
            available.worker.postMessage(task);
        } else {
            this.taskQueue.push(task);
        }
    }

    _handleResult({id, result, error}) {
        const cb = this.callbacks.get(id);
        if (cb) {
            this.callbacks.delete(id);
            error ? cb.reject(new Error(error)) : cb.resolve(result);
        }
        // Dispatch next task
        const worker = this.workers.find(w => w.busy);
        if (worker && this.taskQueue.length) {
            worker.worker.postMessage(this.taskQueue.shift());
        } else if (worker) {
            worker.busy = false;
        }
    }

    terminate() {
        this.workers.forEach(w => w.worker.terminate());
    }
}
```

#### `platform/node/WorkerPool.js`:

```javascript
import {Worker} from 'worker_threads';
import {ENV} from '../env.js';

export class NodeWorkerPool {
    constructor(workerScript, poolSize = require('os').cpus().length) {
        this.workers = [];
        this.callbacks = new Map();
        this.nextId = 0;
        this.taskQueue = [];

        for (let i = 0; i < poolSize; i++) {
            const worker = new Worker(workerScript);
            worker.on('message', (msg) => this._handleResult(msg));
            worker.on('error', (e) => console.error('Worker error:', e));
            this.workers.push({worker, busy: false});
        }
    }

    // Same API as WebWorkerPool...
}
```

---

### **Phase 10: Debugging & Introspection** (Beyond Parity)

#### `extensions/Debugger.js`:

```javascript
import {step, reduce} from '../kernel/Reduce.js';
import {Unify} from '../kernel/Unify.js';
import {isExpression} from '../kernel/Term.js';

export class MeTTaDebugger {
    constructor(interpreter) {
        this.interpreter = interpreter;
        this.breakpoints = new Set();
        this.stepping = false;
        this.paused = false;
        this.trace = [];
        this.maxTraceSize = 5000;
        this.onPause = null;
        this.onStep = null;
    }

    addBreakpoint(pattern) { this.breakpoints.add(pattern); }
    removeBreakpoint(pattern) { this.breakpoints.delete(pattern); }
    clearBreakpoints() { this.breakpoints.clear(); }

    enableStepping() { this.stepping = true; }
    disableStepping() { this.stepping = false; }

    stepOnce(atom) {
        const result = step(atom, this.interpreter.space, this.interpreter.ground, this.interpreter.reductionLimit, this.interpreter.cache);
        this._recordStep(atom, result);
        return result;
    }

    _recordStep(input, result) {
        const entry = {
            input: input.toString(),
            output: result.reduced?.toString(),
            applied: result.applied,
            timestamp: Date.now(),
            stack: new Error().stack
        };
        this.trace.push(entry);
        if (this.trace.length > this.maxTraceSize) this.trace.shift();
        this.onStep?.(entry);
    }

    _checkBreakpoints(atom) {
        for (const bp of this.breakpoints) {
            if (Unify.unify(bp, atom) !== null) return true;
        }
        return false;
    }

    getTrace() { return [...this.trace]; }
    clearTrace() { this.trace = []; }

    // Export for Chrome DevTools Performance panel
    exportChromeTrace() {
        return JSON.stringify(this.trace.map((t, i) => ({
            name: t.input.slice(0, 50),
            cat: t.applied ? 'reduction' : 'terminal',
            ph: 'X',
            ts: t.timestamp * 1000,
            dur: (this.trace[i+1]?.timestamp - t.timestamp || 1) * 1000,
            pid: 1, tid: 1
        })));
    }
}
```

#### Introspection Grounded Ops:

```javascript
_registerDebugOps() {
    this.register('trace-on', () => { this.debugger?.enableStepping(); return sym('ok'); });
    this.register('trace-off', () => { this.debugger?.disableStepping(); return sym('ok'); });
    this.register('get-trace', () => this._listify((this.debugger?.getTrace() || []).map(t => sym(t.input))));
    this.register('breakpoint', (pattern) => { this.debugger?.addBreakpoint(pattern); return sym('ok'); }, {lazy: true});
    this.register('reduction-count', () => sym(String(this.stats?.reductionSteps || 0)));
    this.register('cache-stats', () => {
        const s = this.cache?.getStats() || {};
        return exp(sym('cache'), [
            exp(sym('hits'), [sym(String(s.hits || 0))]),
            exp(sym('misses'), [sym(String(s.misses || 0))]),
            exp(sym('size'), [sym(String(s.size || 0))])
        ]);
    });
    this.register('hot-replace-rule', (pattern, newResult) => {
        this.space.removeRule(pattern);
        this.space.addRule(pattern, newResult);
        return sym('ok');
    }, {lazy: true});
}
```

---

### **Phase 11: Persistence** (Beyond Parity)

#### `platform/browser/IDBPersistence.js`:

```javascript
import {ENV} from '../env.js';

export class IDBPersistence {
    constructor(dbName = 'metta-space', version = 1) {
        if (!ENV.hasIndexedDB) throw new Error('IndexedDB not available');
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('atoms')) db.createObjectStore('atoms', {keyPath: 'id', autoIncrement: true});
                if (!db.objectStoreNames.contains('rules')) db.createObjectStore('rules', {keyPath: 'id', autoIncrement: true});
                if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', {keyPath: 'key'});
            };
            req.onsuccess = () => { this.db = req.result; resolve(this); };
            req.onerror = () => reject(req.error);
        });
    }

    async saveAtom(atom) {
        return this._put('atoms', {data: atom.toString(), timestamp: Date.now()});
    }

    async saveRule(pattern, result) {
        return this._put('rules', {pattern: pattern.toString(), result: result.toString(), timestamp: Date.now()});
    }

    async loadAll() {
        const atoms = await this._getAll('atoms');
        const rules = await this._getAll('rules');
        return {atoms, rules};
    }

    async clear() {
        await this._clear('atoms');
        await this._clear('rules');
    }

    _put(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    _getAll(store) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    _clear(store) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}
```

#### `platform/node/Persistence.js`:

```javascript
import {promises as fs} from 'fs';
import {join} from 'path';

export class FilePersistence {
    constructor(directory = '.metta-space') {
        this.directory = directory;
    }

    async init() {
        await fs.mkdir(this.directory, {recursive: true});
        return this;
    }

    async saveAtom(atom) {
        const file = join(this.directory, 'atoms.jsonl');
        await fs.appendFile(file, JSON.stringify({data: atom.toString(), ts: Date.now()}) + '\n');
    }

    async saveRule(pattern, result) {
        const file = join(this.directory, 'rules.jsonl');
        await fs.appendFile(file, JSON.stringify({pattern: pattern.toString(), result: result.toString(), ts: Date.now()}) + '\n');
    }

    async loadAll() {
        const atomsFile = join(this.directory, 'atoms.jsonl');
        const rulesFile = join(this.directory, 'rules.jsonl');
        const atoms = await this._loadJsonl(atomsFile);
        const rules = await this._loadJsonl(rulesFile);
        return {atoms, rules};
    }

    async _loadJsonl(file) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            return content.trim().split('\n').filter(Boolean).map(JSON.parse);
        } catch { return []; }
    }

    async clear() {
        await fs.rm(this.directory, {recursive: true, force: true});
        await this.init();
    }
}
```

---

## ✅ Verification Matrix

| Phase | Feature | Unit Test | Integration Test | Example |
|-------|---------|-----------|------------------|---------|
| 1 | Minimal MeTTa | `minimal-metta.test.js` | [MeTTaIntegration.test.js](file:///home/me/senars10/tests/integration/metta/MeTTaIntegration.test.js) | `minimal_metta.metta` |
| 2 | Expression Ops | `expression-ops.test.js` | ✓ | `expression_ops.metta` |
| 3 | Math Functions | `math-ops.test.js` | ✓ | `math_demo.metta` |
| 4 | HOFs | `hof.test.js` | ✓ | `hof_demo.metta` |
| 5 | Control Flow | `control-flow.test.js` | ✓ | `control_flow.metta` |
| 6 | Set Operations | `sets.test.js` | ✓ | `sets_demo.metta` |
| 7 | Type System | `types.test.js` | ✓ | `types_demo.metta` |
| 8 | Reactive | `reactive-space.test.js` | ✓ | Live IDE demo |
| 9 | Parallel | `parallel-eval.test.js` | Browser+Node | benchmark |
| 10 | Debugger | `debugger.test.js` | ✓ | DevTools panel |
| 11 | Persistence | `persistence.test.js` | Browser+Node | Multi-tab demo |

### Test Commands

```bash
# All tests
npm run test:unit -- --testPathPattern="metta"
npm run test:integration -- --testPathPattern="metta"

# Examples
node examples/metta/run_all_isolated.js

# Browser tests (Playwright)
npm run test:e2e -- --testPathPattern="metta"

# Benchmarks
node benchmarks/metta/grounded-vs-pure.js
node benchmarks/metta/parallel-speedup.js
```

---

## 📊 Success Criteria

**Parity:** All 50+ Hyperon stdlib functions implemented
**Performance:** Grounded HOFs 50-100x faster than pure MeTTa
**Isomorphic:** Same API in Browser and Node.js
**Beyond Parity:** 5 pioneering features operational
**Documentation:** Complete JSDoc + usage examples
