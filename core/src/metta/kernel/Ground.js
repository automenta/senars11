import { Term } from '../../term/Term.js';
import { Truth } from '../../Truth.js';

export class Ground {
    /**
     * @param {object} registry - Optional external registry
     * @param {object} config - Configuration
     * @param {object} senarsBridge - SeNARS Bridge instance (Phase 3)
     */
    constructor(registry = new Map(), config = {}, senarsBridge = null) {
        this.registry = registry;
        this.config = config;
        this.senarsBridge = senarsBridge;
    }

    /**
     * Register a grounded operation
     * @param {string} name - Operation name (e.g. "&+")
     * @param {function} fn - Implementation function
     */
    register(name, fn) {
        this.registry.set(name, fn);
    }

    /**
     * Execute a grounded operation
     * @param {string} name - Operation name
     * @param {...any} args - Arguments
     * @returns {any} Result
     */
    execute(name, ...args) {
        const fn = this.registry.get(name);
        if (!fn) {
            throw new Error(`Unknown grounded operation: ${name}`);
        }
        return fn(...args);
    }

    has(name) {
        return this.registry.has(name);
    }

    clear() {
        this.registry.clear();
    }

    /**
     * Register built-in operations
     */
    registerBuiltins() {
        this._registerArithmetic();
        this._registerLogic();
        this._registerIO();
        this._registerTruthValues();
        this._registerAttention();
        this._registerIntrospection();
    }

    _registerArithmetic() {
        this.register('&+', (...args) => {
            const sum = args.reduce((acc, a) => acc + extractNumber(a), 0);
            return Term.sym(String(sum));
        });

        this.register('&-', (...args) => {
            if (args.length === 0) return Term.sym('0');
            if (args.length === 1) return Term.sym(String(-extractNumber(args[0])));
            const first = extractNumber(args[0]);
            const rest = args.slice(1).reduce((acc, a) => acc + extractNumber(a), 0);
            return Term.sym(String(first - rest));
        });

        this.register('&*', (...args) => {
            const prod = args.reduce((acc, a) => acc * extractNumber(a), 1);
            return Term.sym(String(prod));
        });

        this.register('&/', (...args) => {
            if (args.length < 2) throw new Error('Division requires at least 2 arguments');
            const output = args.slice(1).reduce((acc, a) => acc / extractNumber(a), extractNumber(args[0]));
            return Term.sym(String(output));
        });

        this.register('&>', (a, b) => {
            return extractNumber(a) > extractNumber(b) ? Term.sym('True') : Term.sym('False');
        });

        this.register('&<', (a, b) => {
            return extractNumber(a) < extractNumber(b) ? Term.sym('True') : Term.sym('False');
        });

        this.register('&==', (a, b) => {
            const name1 = a?.name ?? String(a);
            const name2 = b?.name ?? String(b);
            return name1 === name2 ? Term.sym('True') : Term.sym('False');
        });
    }

    _registerLogic() {
        this.register('&not', (a) => {
            const isTrue = (a?.name ?? String(a)) === 'True';
            return isTrue ? Term.sym('False') : Term.sym('True');
        });

        this.register('&and', (...args) => {
            const allTrue = args.every(a => (a?.name ?? String(a)) === 'True');
            return allTrue ? Term.sym('True') : Term.sym('False');
        });

        this.register('&or', (...args) => {
            const anyTrue = args.some(a => (a?.name ?? String(a)) === 'True');
            return anyTrue ? Term.sym('True') : Term.sym('False');
        });
    }

    _registerIO() {
        this.register('&print', (...args) => {
            const output = args.map(a => a?.toString?.() ?? String(a)).join(' ');
            console.log(output);
            return Term.sym('Null');
        });

        this.register('&now', () => {
            return Term.sym(String(Date.now()));
        });
    }

    _registerTruthValues() {
        this.register('&truth-ded', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.deduction(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-ind', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.induction(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-abd', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.abduction(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-rev', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.revision(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-neg', (tv) => {
            const t = extractTruthValue(tv);
            const result = Truth.negation(t);
            return makeTruthTerm(result);
        });

        this.register('&truth-conv', (tv) => {
            const t = extractTruthValue(tv);
            const result = Truth.conversion(t);
            return makeTruthTerm(result);
        });

        this.register('&truth-comp', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.comparison(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-ana', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.analogy(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-int', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.intersection(t1, t2);
            return makeTruthTerm(result);
        });

        this.register('&truth-union', (tv1, tv2) => {
            const t1 = extractTruthValue(tv1);
            const t2 = extractTruthValue(tv2);
            const result = Truth.union(t1, t2);
            return makeTruthTerm(result);
        });
    }

    _registerAttention() {
        this.register('&get-sti', (atom) => {
            if (this.senarsBridge) {
                const sti = this.senarsBridge.getConceptSTI(atom);
                return Term.sym(String(sti ?? 0));
            }
            return Term.sym('0');
        });

        this.register('&set-sti', (atom, value) => {
            if (this.senarsBridge) {
                const val = extractNumber(value);
                this.senarsBridge.setConceptSTI(atom, val);
                return Term.sym('Ok');
            }
            return Term.sym('Error');
        });

        this.register('&get-lti', (atom) => {
            if (this.senarsBridge) {
                const lti = this.senarsBridge.getConceptLTI(atom);
                return Term.sym(String(lti ?? 0));
            }
            return Term.sym('0');
        });

        this.register('&set-lti', (atom, value) => {
            if (this.senarsBridge) {
                const val = extractNumber(value);
                this.senarsBridge.setConceptLTI(atom, val);
                return Term.sym('Ok');
            }
            return Term.sym('Error');
        });

        this.register('&get-related', (atom) => {
            if (this.senarsBridge) {
                const related = this.senarsBridge.getRelatedConcepts(atom);
                return Term.exp(related);
            }
            return Term.exp([]);
        });

        this.register('&top-by-sti', (n) => {
            if (this.senarsBridge) {
                const num = extractNumber(n);
                const top = this.senarsBridge.getTopBySTI(num);
                return Term.exp(top);
            }
            return Term.exp([]);
        });
    }

    _registerIntrospection() {
        this.register('&system-stats', () => {
            if (!this.senarsBridge) return Term.exp([Term.sym('stats'), Term.sym('unavailable')]);

            const stats = this.senarsBridge.getSystemStats();
            return Term.exp([
                Term.sym('stats'),
                Term.exp([Term.sym('atoms'), Term.sym(String(stats.atomCount ?? 0))]),
                Term.exp([Term.sym('avg-sti'), Term.sym(String(stats.avgSTI ?? 0))]),
                Term.exp([Term.sym('memory-mb'), Term.sym(String(stats.memoryMB ?? 0))])
            ]);
        });

        this.register('&nars-derive', (task, premise) => {
            if (!this.senarsBridge) return Term.sym('Error');
            return this.senarsBridge.executeNARSDerivation(task, premise) ?? Term.sym('Empty');
        });
    }
}

/**
 * Extract numeric value from a term
 */
function extractNumber(term) {
    const value = term?.name ?? String(term);
    const num = Number(value);
    if (isNaN(num)) throw new Error(`Expected number, got: ${value}`);
    return num;
}

/**
 * Extract Truth object from MeTTa term
 */
function extractTruthValue(term) {
    if (term instanceof Truth) return term;
    if (term?.operator === 'TV' && term?.components?.length === 2) {
        const f = extractNumber(term.components[0]);
        const c = extractNumber(term.components[1]);
        return new Truth(f, c);
    }
    if (term?.f !== undefined && term?.c !== undefined) return new Truth(term.f, term.c);
    return new Truth(1.0, 0.9);
}

/**
 * Convert Truth object to MeTTa term
 */
function makeTruthTerm(truth) {
    if (!truth) return Term.sym('Empty');
    return Term.exp([
        Term.sym('TV'),
        Term.sym(String(truth.frequency.toFixed(2))),
        Term.sym(String(truth.confidence.toFixed(2)))
    ]);
}
