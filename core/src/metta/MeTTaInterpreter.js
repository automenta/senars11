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

export class MeTTaInterpreter {
    constructor() {
        this.space = new Space();
        this.ground = new Ground();
        this.parser = new Parser();
        
        // Register advanced grounded operations
        this.registerAdvancedOps();

        // Load standard library
        this.loadStdlib();
    }

    registerAdvancedOps() {
        // &subst: Substitution (variable, value, template) -> result
        // or (template, bindings_map) - but bindings as map is not easy in MeTTa.
        // Let's implement (substitute variable value template)
        this.ground.register('&subst', (variable, value, template) => {
            const bindings = {};
            if (variable.name) {
                bindings[variable.name] = value;
            }
            return Unify.subst(template, bindings);
        });

        // &match: Match (space, pattern, template)
        this.ground.register('&match', (space, pattern, template) => {
            // If space is &self, use this.space
            let targetSpace = this.space;
            // TODO: support other spaces

            const results = match(targetSpace, pattern, template);
            // Listify results
            const listify = (arr) => {
                if (arr.length === 0) return Term.sym('()');
                return Term.exp(':', [arr[0], listify(arr.slice(1))]);
            };
            return listify(results);
        });

        // &query: Query (pattern, template) -> results
        // Similar to match but implicit space (or different semantics?)
        // In MeTTa, `match` is `(match space pattern template)`.
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
    }

    /**
     * Load the standard library
     */
    loadStdlib() {
        // Core operations are already in Ground
        // Load MeTTa-based stdlib files
        this.loadCoreStdlib();
        this.loadListStdlib();
        this.loadMatchStdlib();
        this.loadTypesStdlib();
        this.loadTruthStdlib();
        this.loadNalStdlib();
        this.loadAttentionStdlib();
        this.loadControlStdlib();
        this.loadSearchStdlib();
        this.loadLearnStdlib();
    }

    /**
     * Load core standard library
     */
    loadCoreStdlib() {
        // Basic control structures implemented in MeTTa
        const coreLib = [
            // If-then-else
            '(= (if True $t $e) $t)',
            '(= (if False $t $e) $e)',
            
            // Let binding
            // (= (let $x $v $body) ((lambda $x $body) $v))
            '(= (let $x $v $body) ((lambda $x $body) $v))',
            
            // Lambda (simplified) using &subst
            // (= ((lambda $x $body) $v) (substitute $x $v $body))
            '(= ((lambda $x $body) $v) (^ &subst $x $v $body))',
            
            // Equality
            '(= (equal $x $x) True)',
            '(= (equal $x $y) False :- (not (unifiable $x $y)))',

            // Grounded Operations Mapping
            '(= (+ $a $b) (^ &+ $a $b))',
            '(= (+ $a $b $c) (^ &+ $a $b $c))',
            '(= (- $a $b) (^ &- $a $b))',
            '(= (- $a) (^ &- $a))',
            '(= (* $a $b) (^ &* $a $b))',
            '(= (* $a $b $c) (^ &* $a $b $c))',
            '(= (/ $a $b) (^ &/ $a $b))',
            '(= (< $a $b) (^ &< $a $b))',
            '(= (> $a $b) (^ &> $a $b))',
            '(= (== $a $b) (^ &== $a $b))',
            '(= (% $a $b) (^ &% $a $b))',
            '(= (and $a $b) (^ &and $a $b))',
            '(= (or $a $b) (^ &or $a $b))',
            '(= (not $a) (^ &not $a))'
        ];
        
        for (const rule of coreLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                // Check if it's a rule definition (= pattern result)
                if (parsed.operator === '=' && parsed.components.length === 2) {
                    this.space.addRule(parsed.components[0], parsed.components[1]);
                } else {
                    this.space.add(parsed);
                }
            }
        }
    }

    /**
     * Load list standard library
     */
    loadListStdlib() {
        const listLib = [
            // Empty list
            '(= (empty? ()) True)',
            '(= (empty? (: $h $t)) False)',
            
            // Head and tail
            '(= (head (: $h $t)) $h)',
            '(= (tail (: $h $t)) $t)',
            
            // Map function
            '(= (map $f ()) ())',
            '(= (map $f (: $h $t)) (: ($f $h) (map $f $t)))',
            
            // Length
            '(= (length ()) 0)',
            '(= (length (: $h $t)) (+ 1 (length $t)))',
            
            // Append
            '(= (append () $ys) $ys)',
            '(= (append (: $x $xs) $ys) (: $x (append $xs $ys)))',
            
            // Filter
            '(= (filter $pred ()) ())',
            '(= (filter $pred (: $h $t)) (if ($pred $h) (: $h (filter $pred $t)) (filter $pred $t)))',

            // Reverse
            '(= (reverse $l) (reverse-acc $l ()))',
            '(= (reverse-acc () $acc) $acc)',
            '(= (reverse-acc (: $h $t) $acc) (reverse-acc $t (: $h $acc)))'
        ];
        
        for (const rule of listLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                // Check if it's a rule definition (= pattern result)
                if (parsed.operator === '=' && parsed.components.length === 2) {
                    this.space.addRule(parsed.components[0], parsed.components[1]);
                } else {
                    this.space.add(parsed);
                }
            }
        }
    }

    /**
     * Load match standard library
     */
    loadMatchStdlib() {
        // Pattern matching rules would go here
        const matchLib = [
            // Basic match structure
            // (= (match $space $pattern $template) (query $space $pattern $template))
            '(= (match $space $pattern $template) (^ &match $space $pattern $template))',

            // Exists check
            '(= (exists? $s $p) (not (empty? (match $s $p $p))))'
        ];
        
        for (const rule of matchLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                // Check if it's a rule definition (= pattern result)
                if (parsed.operator === '=' && parsed.components.length === 2) {
                    this.space.addRule(parsed.components[0], parsed.components[1]);
                } else {
                    this.space.add(parsed);
                }
            }
        }
    }

    /**
     * Load types standard library
     */
    loadTypesStdlib() {
        const typesLib = [
            // Type annotations
            '(= (: + (-> Number Number Number)) True)',
            '(= (: * (-> Number Number Number)) True)',
            '(= (: == (-> a a Boolean)) True)',
            
            // Type checking
            // (= (type-of $x) (lookup-type $x))
            '(= (type-of $x) (^ &type-of $x))'
        ];
        
        for (const rule of typesLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                // Check if it's a rule definition (= pattern result)
                if (parsed.operator === '=' && parsed.components.length === 2) {
                    this.space.addRule(parsed.components[0], parsed.components[1]);
                } else {
                    this.space.add(parsed);
                }
            }
        }
    }

    /**
     * Load truth standard library
     */
    loadTruthStdlib() {
        const truthLib = [
            // Truth value construction
            '(= (tv $f $c) (TruthValue $f $c))',
            
            // Truth value operations
            '(= (truth-ded (tv $f1 $c1) (tv $f2 $c2)) (tv (* $f1 $f2) (* $c1 $c2)))',
            '(= (truth-ind (tv $f1 $c1) (tv $f2 $c2)) (tv (* $f1 $f2) (* $c1 $c2 0.5)))',
            '(= (truth-abd (tv $f1 $c1) (tv $f2 $c2)) (tv (min $f1 $f2) (* $c1 $c2 0.3)))'
        ];
        
        for (const rule of truthLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                this.space.add(parsed);
            }
        }
    }

    /**
     * Load NAL standard library
     */
    loadNalStdlib() {
        const nalLib = [
            // Basic NAL inheritance
            '(= (ded (Inh $s $m) (Inh $m $p)) (Inh $s $p))',
            
            // Similarity
            '(= (sim $a $b) (and (inh $a $b) (inh $b $a)))',
            
            // Implication
            '(= (imp $a $b) (Impl $a $b))'
        ];
        
        for (const rule of nalLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                this.space.add(parsed);
            }
        }
    }

    /**
     * Load attention standard library
     */
    loadAttentionStdlib() {
        const attentionLib = [
            // STI (Short Term Importance)
            '(= (sti $atom) (get-sti $atom))',
            '(= (set-sti $atom $value) (update-sti $atom $value))',
            
            // Priority-based selection
            '(= (top-n $atoms $n) (take $n (sort-by-sti $atoms)))'
        ];
        
        for (const rule of attentionLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                this.space.add(parsed);
            }
        }
    }

    /**
     * Load control standard library
     */
    loadControlStdlib() {
        const controlLib = [
            // Strategy selection
            '(= (select-strategy $task) (if (< (confidence $task) 0.5) exploratory conservative))',
            
            // Meta-reasoning
            '(= (reflect-on $process) (analyze-effectiveness $process))'
        ];
        
        for (const rule of controlLib) {
            const parsed = this.parser.parse(rule);
            if (parsed) {
                this.space.add(parsed);
            }
        }
    }

    /**
     * Load search standard library
     */
    loadSearchStdlib() {
        // The search library is loaded from the .metta file
        // This is handled by the StdlibLoader
    }

    /**
     * Load learning standard library
     */
    loadLearnStdlib() {
        // The learning library is loaded from the .metta file
        // This is handled by the StdlibLoader
    }

    /**
     * Run MeTTa code
     * @param {string} code - MeTTa source code
     * @returns {Array} Results of execution
     */
    run(code) {
        const expressions = this.parser.parseProgram(code);
        const results = [];
        
        for (const expr of expressions) {
            const result = this.evaluate(expr);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Evaluate a single expression
     * @param {Object} expr - Expression to evaluate
     * @returns {*} Result of evaluation
     */
    evaluate(expr) {
        return reduce(expr, this.space, this.ground);
    }

    /**
     * Load MeTTa code without evaluating
     * @param {string} code - MeTTa source code
     */
    load(code) {
        const expressions = this.parser.parseProgram(code);
        
        for (const expr of expressions) {
            // Check if it's a rule definition (= pattern result)
            if (expr.operator === '=' && expr.components.length === 2) {
                this.space.addRule(expr.components[0], expr.components[1]);
            } else {
                this.space.add(expr);
            }
        }
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
            groundOps: this.ground.getOperations().length
        };
    }
}
