/**
 * MeTTaInterpreter.js - Main MeTTa interpreter
 * Wires kernel components and loads standard library
 */

import { Space } from './kernel/Space.js';
import { Ground } from './kernel/Ground.js';
import { step, reduce, match } from './kernel/Reduce.js';
import { Parser } from './Parser.js';
import { Unify } from './kernel/Unify.js';
import { Term } from './kernel/Term.js';
import { objToBindingsAtom, bindingsAtomToObj } from './BindingsConverter.js';

// Dynamically import StdlibLoader to avoid issues in Jest
let StdlibLoaderModule = null;
async function getStdlibLoader() {
    if (!StdlibLoaderModule) {
        StdlibLoaderModule = await import('./stdlib/StdlibLoader.js');
    }
    return StdlibLoaderModule;
}

export class MeTTaInterpreter {
    constructor(reasoner, options = {}) {
        // Support both constructor(options) and constructor(reasoner, options)
        if (reasoner && typeof reasoner === 'object' && Object.keys(options).length === 0) {
            options = reasoner;
            reasoner = null;
        }

        const actualOptions = options || {};
        this.config = actualOptions;
        this.reasoner = reasoner;
        this.termFactory = actualOptions.termFactory;

        this.space = new Space();
        this.ground = new Ground();
        this.parser = new Parser();

        // Register advanced grounded operations
        this.registerAdvancedOps();

        // Load standard library (unless disabled)
        if (this.config.loadStdlib !== false) {
            // Load stdlib from embedded strings to avoid file system issues in test environments
            this.loadStdlibFromStrings();
        }
    }

    registerAdvancedOps() {
        // &subst: Substitution (variable, value, template) -> result
        this.ground.register('&subst', (a, b, c) => {
            // Case 1: (subst variable value template) - used by let/lambda
            if (c !== undefined) {
                const variable = a;
                const value = b;
                const template = c;
                const bindings = {};
                if (variable.name) {
                    bindings[variable.name] = value;
                }
                return Unify.subst(template, bindings);
            }
            // Case 2: (subst template bindings) - used by match
            else {
                const template = a;
                const bindingsAtom = b;
                // Convert bindings atom back to object
                const bindings = bindingsAtomToObj(bindingsAtom);
                return Unify.subst(template, bindings);
            }
        }, { lazy: true });

        // &unify: Unify (pattern, term) -> bindings or False
        this.ground.register('&unify', (pattern, term) => {
            const bindings = Unify.unify(pattern, term);
            if (bindings === null) {
                return Term.sym('False');
            }
            return objToBindingsAtom(bindings);
        });

        // &match: Match (space, pattern, template)
        this.ground.register('&match', (space, pattern, template) => {
            // If space is &self, use this.space
            // TODO: handle other spaces passed as arguments
            let targetSpace = this.space;

            // If space argument is provided and looks like a space (has query method), use it?
            // For now, we only support implicit &self or ignoring the first arg if it denotes self

            const results = match(targetSpace, pattern, template);

            // Listify results
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(results);
        }, { lazy: true });

        // &query: Query (pattern, template) -> results
        this.ground.register('&query', (pattern, template) => {
            const results = match(this.space, pattern, template);
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(results);
        });

        // &type-of: Get type
        this.ground.register('&type-of', (atom) => {
            // Search for (: atom $type)
            const pattern = Term.exp(':', [atom, Term.var('type')]);
            const template = Term.var('type');
            const results = match(this.space, pattern, template);
            if (results.length > 0) return results[0];
            return Term.sym('Atom'); // Default type
        });

        // &get-atoms: Get all atoms from space
        this.ground.register('&get-atoms', (spaceAtom) => {
            // Assume spaceAtom is &self for now, or resolve it
            // TODO: Support multiple spaces
            const atoms = this.space.all();

            // Convert JS array to MeTTa list (: h (: t ...))
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(atoms);
        });

        // &add-atom: Add atom to space
        this.ground.register('&add-atom', (atom) => {
            this.space.add(atom);
            return atom;
        });

        // &rm-atom: Remove atom from space
        this.ground.register('&rm-atom', (atom) => {
            this.space.remove(atom);
            return atom;
        });
        // &println: Print arguments
        this.ground.register('&println', (...args) => {
            console.log(...args.map(a => a.toString ? a.toString() : a));
            return Term.sym('()');
        });

        // &length: Get list length
        this.ground.register('&length', (list) => {
            if (!list || !list.components) return Term.sym('0');
            // Assuming cons list (: h t)
            const { flattenList, isList } = Term;
            if (isList(list)) {
                return Term.sym(flattenList(list).elements.length.toString());
            }
            return Term.sym('0');
        });
    }

    /**
     * Load the standard library synchronously (for compatibility)
     */
    async loadStdlibSync(options = {}) {
        // Try to load stdlib using dynamic import
        try {
            const StdlibLoaderModule = await import('./stdlib/StdlibLoader.js');
            if (StdlibLoaderModule && typeof StdlibLoaderModule.loadStdlib === 'function') {
                StdlibLoaderModule.loadStdlib(this, options);
            }
        } catch (e) {
            // If dynamic import fails, fall back to embedded strings
            this.loadStdlibFromStrings(); // Load from embedded strings
        }
    }

    /**
     * Load stdlib from embedded strings for test compatibility
     */
    loadStdlibFromStrings() {
        // Embedded stdlib content as strings to avoid import.meta issues in Jest
        // Using actual content from the stdlib files

        // Core module content
        const coreMetta = `
; MeTTa Standard Library - Core Module
; Basic control flow, binding, and lambda functions
; ~60 LOC

; ===== Conditional Branching =====

; if: conditional evaluation
; (if True $then $else) → $then
; (if False $then $else) → $else
(= (if True $then $_) $then)
(= (if False $_ $else) $else)

; ===== Variable Binding =====

; let: bind a value to a variable in a body expression
; (let $x $v $b) → evaluate $b with $x bound to $v
; Implementation: Convert to lambda application
(= (let $x $v $b) ((λ $x $b) $v))

; Sequential let bindings (let*)
; (let* (($x $v1) ($y $v2)) $body) → nested lets
(= (let* () $body) $body)
(= (let* (: ($x $v) $rest) $body)
   (let $x $v (let* $rest $body)))

; ===== Lambda (Anonymous Functions) =====

; Lambda application: ((λ $x $body) $value)
; Use &subst grounded op to perform substitution
(= ((λ $x $body) $v) (^ &subst $x $v $body))
(= ((lambda $x $body) $v) (^ &subst $x $v $body))

; Multiple argument lambda (curried)
; (λ ($x $y) $body) → (λ $x (λ $y $body))
; Rules moved to ReductionEngine.js to avoid variable unification issues
; (= ((λ (: $x ()) $b) $v) ((λ $x $b) $v))
; (= ((λ (: $x $xs) $b) $v) (λ $xs ((λ $x $b) $v)))

; ===== Sequencing =====

; Sequential evaluation - evaluate expressions in order, return last
; (seq $a $b) → evaluate $a, then return $b
(= (seq $a $b) (let $_ $a $b))

; Multiple sequence
(= (seq* $a) $a)
(= (seq* $a $b $rest) (seq $a (seq* $b $rest)))

; ===== Basic Logic =====

; Boolean constants (these are atoms, defined here for reference)
; True - boolean true
; False - boolean false

; not: logical negation
(= (not True) False)
(= (not False) True)

; and: logical conjunction
; (= (and True True) True)
(= (and True False) False)
(= (and False True) False)
; (= (and False False) False)

; or: logical disjunction
(= (or True $_) True)
(= (or False $x) $x)

; ===== Utility Functions =====

; identity: return the value unchanged
(= (id $x) $x)

; const: return first argument, ignore second
(= (const $x $_) $x)

; compose: function composition
; (compose $f $g $x) → ($f ($g $x))
(= (compose $f $g $x) ($f ($g $x)))

; ===== Grounded Operations Mapping =====
; Map standard operators to grounded functions
(= (+ $a $b) (^ &+ $a $b))
(= (+ $a $b $c) (^ &+ $a $b $c))
(= (- $a $b) (^ &- $a $b))
(= (- $a) (^ &- $a))
(= (* $a $b) (^ &* $a $b))
(= (* $a $b $c) (^ &* $a $b $c))
(= (/ $a $b) (^ &/ $a $b))
(= (< $a $b) (^ &< $a $b))
(= (> $a $b) (^ &> $a $b))
(= (== $a $b) (^ &== $a $b))
(= (% $a $b) (^ &% $a $b))
(= (and $a $b) (^ &and $a $b))
(= (or $a $b) (^ &or $a $b))
(= (not $a) (^ &not $a))
(= (empty? $x) (^ &empty? $x))
(= (get-atoms $s) (^ &get-atoms $s))
(= (add-atom $x) (^ &add-atom $x))
(= (rm-atom $x) (^ &rm-atom $x))
`;

        // List module content
        const listMetta = `
; MeTTa Standard Library - List Module
; List manipulation and higher-order functions
; ~50 LOC

; ===== List Construction =====

; Cons-list notation:
; () - empty list
; (: $head $tail) - cons cell (head :: tail)

; List constructor helpers
(= (cons $h $t) (: $h $t))
(= (nil) ())

; ===== List Accessors =====

; car/cdr - traditional Lisp accessors
(= (car (: $h $_)) $h)
(= (cdr (: $_ $t)) $t)

; head/tail - modern names
(= (head (: $h $_)) $h)
(= (tail (: $_ $t)) $t)

; ===== List Predicates =====

; Check if list is empty
(= (empty? ()) True)
(= (empty? (: $h $t)) False)

; Check if atom is a list
(= (list? ()) True)
(= (list? (: $_ $t)) (list? $t))
(= (list? $_) False)

; ===== Map =====

; map: apply function to each element
; (map $f ()) → ()
; (map $f (: $h $t)) → (: ($f $h) (map $f $t))
(= (map $f ()) ())
(= (map $f (: $h $t)) (: ($f $h) (map $f $t)))

; ===== Fold (Reduce) =====

; fold-left: accumulate from left
; (fold $f $z ()) → $z
; (fold $f $z (: $h $t)) → (fold $f ($f $z $h) $t)
(= (fold $f $z ()) $z)
(= (fold $f $z (: $h $t)) (fold $f ($f $z $h) $t))

; fold-right: accumulate from right
(= (fold-right $f $z ()) $z)
(= (fold-right $f $z (: $h $t)) ($f $h (fold-right $f $z $t)))

; ===== Filter =====

; filter: select elements matching predicate
; (filter $p ()) → ()
; (filter $p (: $h $t)) → (: $h (filter $p $t)) if ($p $h) is True
; (filter $p (: $h $t)) → (filter $p $t) otherwise
(= (filter $p ()) ())
(= (filter $p (: $h $t))
   (if ($p $h)
       (: $h (filter $p $t))
       (filter $p $t)))

; ===== List Length =====

; length: count elements
(= (length ()) 0)
(= (length (: $_ $t)) (+ 1 (length $t)))

; ===== List Reverse =====

; reverse: reverse list order
(= (reverse $xs) (reverse-acc $xs ()))
(= (reverse-acc () $acc) $acc)
(= (reverse-acc (: $h $t) $acc) (reverse-acc $t (: $h $acc)))

; ===== List Append =====

; append: concatenate two lists
(= (append () $ys) $ys)
(= (append (: $h $t) $ys) (: $h (append $t $ys)))

; ===== List Utilities =====

; take: take first n elements
(= (take 0 $_) ())
(= (take $n $_) ())
(= (take $n (: $h $t)) (: $h (take (- $n 1) $t)))

; drop: drop first n elements
(= (drop 0 $xs) $xs)
(= (drop $n ()) ())
(= (drop $n (: $_ $t)) (drop (- $n 1) $t))

; nth: get nth element (0-indexed)
(= (nth 0 (: $h $_)) $h)
(= (nth $n (: $_ $t)) (nth (- $n 1) $t))

; zip: combine two lists
(= (zip () $_) ())
(= (zip $_ ()) ())
(= (zip (: $h1 $t1) (: $h2 $t2)) (: (: $h1 $h2) (zip $t1 $t2)))
`;

        // Types module content
        const typesMetta = `
; MeTTa Standard Library - Types Module
; Type annotations and type checking
; ~50 LOC

; ===== Type Declarations =====

; Type annotation syntax: (: $term $type)
; Function types: (-> $argType1 $argType2 ... $returnType)

; Basic types
(: Number Type)
(: String Type)
(: Bool Type)
(: Atom Type)
(: Variable Type)

; ===== Arithmetic Type Signatures =====

; Declare types for arithmetic operations
(: + (-> Number Number Number))
(: - (-> Number Number Number))
(: * (-> Number Number Number))
(: / (-> Number Number Number))

; Comparison operations
(: < (-> Number Number Bool))
(: > (-> Number Number Bool))
(: == (-> $a $a Bool))

; ===== Type Queries =====

; typeof: query the type of a term
; (typeof $x) → searches for (: $x $type) in the space
; Return the first match (or all matches as list if multiple?)
; The tests expect a single Atom if one exists.
; Since match returns a list, we take the head.
(= (typeof $x) (car (match &self (: $x $t) $t)))

; has-type?: check if term has specific type
(= (has-type? $x $type)
   (exists? &self (: $x $type)))

; ===== Type Predicates =====

; is-number?: check if term is a number
(= (is-number? $x)
   (match-first &self (: $x Number) True))

; is-string?: check if term is a string
(= (is-string? $x)
   (match-first &self (: $x String) True))

; is-bool?: check if term is boolean
(= (is-bool? True) True)
(= (is-bool? False) True)
(= (is-bool? $_) False)

; is-var?: check if term is a variable (starts with $)
(= (is-var? $x)
   (match-first &self (: $x Variable) True))

; ===== Type Checking =====

; check-type: verify term has expected type
; Returns term if type matches, error otherwise
(= (check-type $x $expected-type)
   (if (has-type? $x $expected-type)
       $x
       (error type-mismatch $x $expected-type)))

; infer-type: infer type from structure
(= (infer-type $x)
   (let $explicit (typeof $x)
      (if (empty? $explicit)
          (infer-structural-type $x)
          (car $explicit))))

; Helper: infer type from term structure
(= (infer-structural-type True) Bool)
(= (infer-structural-type False) Bool)
(= (infer-structural-type $x)
   (if (starts-with? $x "$") Variable Atom))

; ===== Function Type Checking =====

; check-function-type: verify function application types
; (check-function-type $f $args $expected-return)
(= (check-function-type $f $args $expected-return)
   (let $f-type (typeof $f)
      (if (valid-application? $f-type $args $expected-return)
          True
          (error invalid-application $f $args))))

; ===== Type Utilities =====

; cast: attempt to cast value to type
(= (cast $x $type) $x)  ; Placeholder - real implementation would convert

; typeof-default: get type with default fallback
(= (typeof-default $x $default)
   (let $t (typeof $x)
      (if (empty? $t) $default (car $t))))
`;

        // Match module content
        const matchMetta = `
; MeTTa Standard Library - Match Module
; Non-deterministic pattern matching
; ~40 LOC

; ===== Pattern Matching =====

; match: pattern matching against space
; (match $space $pattern $template)
; Returns: all instances where $pattern matches atoms in $space,
;          with $template instantiated by the bindings

; Use grounded &match for performance and to avoid stack overflow
; (recursion on get-atoms list is too deep without TCO)
(= (match $space $pattern $template) (^ &match $space $pattern $template))

; ===== Unification Wrappers =====

; unify: expose kernel unification
(= (unify $p $t) (^ &unify $p $t))

; subst: expose kernel substitution
(= (subst $t $b) (^ &subst $t $b))

; ok?: check if unification succeeded
(= (ok? $b) (not (== $b False)))

; ===== Match Utilities =====

; match-first: return only first match
(= (match-first $space $pattern $template)
   (car (match $space $pattern $template)))

; match-all: return all matches (alias)
(= (match-all $space $pattern $template)
   (match $space $pattern $template))

; match-count: count number of matches
(= (match-count $space $pattern)
   (length (match $space $pattern $pattern)))

; exists?: check if pattern has any matches
(= (exists? $space $pattern)
   (not (empty? (match $space $pattern $pattern))))

; ===== Advanced Matching =====

; match-where: match with additional constraint
; (match-where $space $pattern $constraint $template)
(= (match-where $space $pattern $constraint $template)
   (filter (λ $x $constraint)
           (match $space $pattern $template)))

; match-bind: match and bind to variable
; (match-bind $var $space $pattern $body)
(= (match-bind $var $space $pattern $body)
   (map (λ $var $body) (match $space $pattern $pattern)))
`;

        // Load all stdlib content
        this.load(coreMetta);
        this.load(listMetta);
        this.load(matchMetta);
        this.load(typesMetta);
    }

    /**
     * Load the standard library
     */
    async loadStdlib(options = {}) {
        try {
            const { loadStdlib } = await getStdlibLoader();
            loadStdlib(this, options);
        } catch (e) {
            console.warn("Failed to load standard library from files:", e.message);
            console.warn("Falling back to internal core definitions if available (legacy).");
            // We could fallback to hardcoded strings here if we kept them,
            // but the goal is to use the files.
        }
    }

    /**
     * Run MeTTa code
     * @param {string} code - MeTTa source code
     * @returns {Array} Results of execution
     */
    run(code) {
        const expressions = this.parser.parseProgram(code);
        const results = [];

        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i];

            // Case 1: Explicit evaluation via !
            if (expr.type === 'atom' && expr.name === '!') {
                if (i + 1 < expressions.length) {
                    const toEval = expressions[++i];
                    results.push(this.evaluate(toEval));
                }
                continue;
            }

            // Check if it's a rule definition BEFORE evaluation
            // Handle both string operator (legacy) and atom operator (new parser)
            const isRule = (expr.operator === '=' || (expr.operator && expr.operator.name === '=')) &&
                expr.components && expr.components.length === 2;

            if (isRule) {
                // Add as rule without evaluation
                this.space.addRule(expr.components[0], expr.components[1]);
                // Return the original expression as result for compatibility
                results.push(expr);
            } else {
                // Evaluate non-rule expressions
                const result = this.evaluate(expr);
                results.push(result);
                // Add the evaluated result to space
                this.space.add(result);
            }
        }

        return results;
    }

    /**
     * Evaluate a single expression
     * @param {Object} expr - Expression to evaluate
     * @returns {*} Result of evaluation
     */
    evaluate(expr) {
        const limit = this.config.maxReductionSteps || 2000000;
        return reduce(expr, this.space, this.ground, limit);
    }

    /**
     * Load MeTTa code without evaluating
     * @param {string} code - MeTTa source code
     */
    load(code) {
        const expressions = this.parser.parseProgram(code);

        for (const expr of expressions) {
            // Check if it's a rule definition (= pattern result)
            // Handle both string operator (legacy) and atom operator (new parser)
            const isRule = (expr.operator === '=' || (expr.operator && expr.operator.name === '=')) &&
                expr.components && expr.components.length === 2;

            if (isRule) {
                this.space.addRule(expr.components[0], expr.components[1]);
            } else {
                this.space.add(expr);
            }
        }
        // Return expressions for compatibility with some tests expecting loaded items
        return expressions.map(e => ({ term: e }));
    }

    /**
     * Query the space with a pattern
     * @param {string|Object} pattern - Pattern to match
     * @param {string|Object} template - Template to instantiate
     * @returns {Array} Matched results
     */
    query(pattern, template) {
        if (typeof pattern === 'string') {
            pattern = this.parser.parse(pattern);
        }

        if (typeof template === 'string') {
            template = this.parser.parse(template);
        }

        return match(this.space, pattern, template);
    }

    /**
     * Get interpreter statistics
     * @returns {Object} Statistics about the interpreter
     */
    getStats() {
        return {
            space: this.space.getStats(),
            groundedAtoms: {
                count: this.ground.getOperations().length
            },
            reductionEngine: {
                maxSteps: this.config.maxReductionSteps || 10000
            },
            typeSystem: {
                count: 0 // Placeholder
            },
            macroExpander: {
                count: 0 // Placeholder
            },
            stateManager: {
                count: 0 // Placeholder
            },
            groundOps: this.ground.getOperations().length
        };
    }
}
