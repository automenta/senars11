/**
 * MeTTaInterpreter.js - Complete MeTTa execution environment
 * Integrates all MeTTa subsystems for full interpreter functionality
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TermBuilders } from './helpers/MeTTaHelpers.js';
import { MeTTaParser } from '../parser/MeTTaParser.js';
import { MeTTaSpace } from './MeTTaSpace.js';
import { MatchEngine } from './MatchEngine.js';
import { MacroExpander } from './MacroExpander.js';
import { TypeSystem } from './TypeSystem.js';
import { ReductionEngine } from './ReductionEngine.js';
import { NonDeterminism } from './NonDeterminism.js';
import { GroundedAtoms } from './GroundedAtoms.js';
import { StateManager } from './StateManager.js';

/**
 * Complete stdlib mappings for MeTTa
 */
export const COMPLETE_STDLIB_MAPPINGS = {
    // === Atomspace Operations ===
    'match': (tf, args) => TermBuilders.functor(tf, tf.atomic('match'), ...args),
    'bind!': (tf, args) => TermBuilders.functor(tf, tf.atomic('bind!'), ...args),
    'add-atom': (tf, args) => TermBuilders.functor(tf, tf.atomic('add-atom'), ...args),
    'remove-atom': (tf, args) => TermBuilders.functor(tf, tf.atomic('remove-atom'), ...args),
    'get-atoms': (tf, args) => TermBuilders.functor(tf, tf.atomic('get-atoms'), ...args),

    // === State Management ===
    'new-state': (tf, args) => TermBuilders.functor(tf, tf.atomic('new-state'), ...args),
    'get-state': (tf, args) => TermBuilders.functor(tf, tf.atomic('get-state'), ...args),
    'change-state!': (tf, args) => TermBuilders.functor(tf, tf.atomic('change-state!'), ...args),

    // === Type Operations ===
    ':': (tf, args) => TermBuilders.typed(tf, args[0], args[1]),
    'get-type': (tf, args) => TermBuilders.functor(tf, tf.atomic('get-type'), ...args),
    'get-metatype': (tf, args) => TermBuilders.functor(tf, tf.atomic('get-metatype'), ...args),

    // === Non-Determinism ===
    'superpose': (tf, args) => tf.disjunction(...args),
    'collapse': (tf, args) => TermBuilders.functor(tf, tf.atomic('collapse'), ...args),
    'sequential': (tf, args) => tf.sequence(...args),

    // === Logic ===
    'and': (tf, args) => TermBuilders.and(tf, ...args),
    'or': (tf, args) => TermBuilders.or(tf, ...args),
    'not': (tf, args) => TermBuilders.not(tf, args[0]),
    'implies': (tf, args) => TermBuilders.implies(tf, args[0], args[1]),
    '->': (tf, args) => TermBuilders.implies(tf, args[0], args[1]),

    // === Comparison ===
    '==': (tf, args) => TermBuilders.eq(tf, args[0], args[1]),
    '<': (tf, args) => TermBuilders.functor(tf, tf.atomic('<'), ...args),
    '>': (tf, args) => TermBuilders.functor(tf, tf.atomic('>'), ...args),
    '<=': (tf, args) => TermBuilders.functor(tf, tf.atomic('<='), ...args),
    '>=': (tf, args) => TermBuilders.functor(tf, tf.atomic('>='), ...args),

    // === Arithmetic ===
    '+': (tf, args) => TermBuilders.functor(tf, tf.atomic('+'), ...args),
    '-': (tf, args) => TermBuilders.functor(tf, tf.atomic('-'), ...args),
    '*': (tf, args) => TermBuilders.functor(tf, tf.atomic('*'), ...args),
    '/': (tf, args) => TermBuilders.functor(tf, tf.atomic('/'), ...args),
    '%': (tf, args) => TermBuilders.functor(tf, tf.atomic('%'), ...args),

    // === Control Flow ===
    'if': (tf, args) => TermBuilders.functor(tf, tf.atomic('if'), ...args),
    'let': (tf, args) => TermBuilders.functor(tf, tf.atomic('let'), ...args),
    'let*': (tf, args) => TermBuilders.functor(tf, tf.atomic('let*'), ...args),
    'case': (tf, args) => TermBuilders.functor(tf, tf.atomic('case'), ...args),

    // === Lists ===
    'cons': (tf, args) => TermBuilders.functor(tf, tf.atomic('cons'), ...args),
    'car': (tf, args) => TermBuilders.functor(tf, tf.atomic('car'), ...args),
    'cdr': (tf, args) => TermBuilders.functor(tf, tf.atomic('cdr'), ...args),

    // === Reflection ===
    'quote': (tf, args) => args[0],
    'eval': (tf, args) => TermBuilders.functor(tf, tf.atomic('eval'), ...args),
    'pragma!': (tf, args) => TermBuilders.functor(tf, tf.atomic('pragma!'), ...args)
};

/**
 * MeTTaInterpreter - Complete MeTTa execution environment
 * Provides load, run, evaluate, and query operations
 */
export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(memory, config = {}, eventBus = null) {
        const termFactory = config.termFactory || new (require('../term/TermFactory.js').TermFactory)();
        super(config, 'MeTTaInterpreter', eventBus, termFactory);

        // Initialize subsystems
        this.parser = new MeTTaParser(this.termFactory, {
            mappings: { ...COMPLETE_STDLIB_MAPPINGS, ...config.customMappings }
        });

        this.space = new MeTTaSpace(memory, this.termFactory);
        this.matchEngine = new MatchEngine(config, eventBus, this.termFactory);
        this.macroExpander = new MacroExpander(config, eventBus, this.termFactory, this.matchEngine);
        this.typeSystem = new TypeSystem(config, eventBus, this.termFactory);
        this.reductionEngine = new ReductionEngine(config, eventBus, this.termFactory, this.matchEngine);
        this.nonDeterminism = new NonDeterminism(config, eventBus, this.termFactory);
        this.groundedAtoms = new GroundedAtoms(config.functorRegistry, config, eventBus, this.termFactory);
        this.stateManager = new StateManager(config, eventBus, this.termFactory);

        // Link components
        this.space.groundedAtoms = this.groundedAtoms;
        this.space.stateManager = this.stateManager;
        this.groundedAtoms.setSpace('default', this.space);

        this._registerBuiltinRules();
    }

    async _initialize() {
        this.emitMeTTaEvent('interpreter-initializing', {});
        await super._initialize();
        this.emitMeTTaEvent('interpreter-initialized', {});
    }

    /**
     * Register built-in reduction rules
     * @private
     */
    _registerBuiltinRules() {
        // Arithmetic rules
        this.reductionEngine.addRule(
            TermBuilders.functor(this.termFactory, this.termFactory.atomic('+'),
                this.termFactory.atomic('$a'), this.termFactory.atomic('$b')),
            (bindings) => {
                const a = Number(bindings['$a'].name);
                const b = Number(bindings['$b'].name);
                return this.termFactory.atomic(String(a + b));
            }
        );

        this.reductionEngine.addRule(
            TermBuilders.functor(this.termFactory, this.termFactory.atomic('-'),
                this.termFactory.atomic('$a'), this.termFactory.atomic('$b')),
            (bindings) => {
                const a = Number(bindings['$a'].name);
                const b = Number(bindings['$b'].name);
                return this.termFactory.atomic(String(a - b));
            }
        );

        this.reductionEngine.addRule(
            TermBuilders.functor(this.termFactory, this.termFactory.atomic('*'),
                this.termFactory.atomic('$a'), this.termFactory.atomic('$b')),
            (bindings) => {
                const a = Number(bindings['$a'].name);
                const b = Number(bindings['$b'].name);
                return this.termFactory.atomic(String(a * b));
            }
        );
    }

    /**
     * Load MeTTa program into space
     * @param {string} mettaCode - MeTTa source code
     * @returns {Array<Task>} - Parsed tasks
     */
    load(mettaCode) {
        return this.trackOperation('load', () => {
            const tasks = this.parser.parseMeTTa(mettaCode);

            // Expand macros
            const expanded = tasks.map(task => ({
                ...task,
                term: this.macroExpander.expand(task.term)
            }));

            // Type check if enabled
            if (this.config.typeChecking) {
                expanded.forEach(({ term }) => this._typeCheck(term));
            }

            // Add to space
            expanded.forEach(({ term }) => this.space.addAtom(term));

            this.emitMeTTaEvent('program-loaded', { taskCount: tasks.length });
            return expanded;
        });
    }

    /**
     * Execute ! expressions
     * @param {string} mettaCode - MeTTa source with ! goals
     * @returns {Array} - Evaluation results
     */
    run(mettaCode) {
        return this.trackOperation('run', () => {
            const tasks = this.parser.parseMeTTa(mettaCode);
            const results = tasks
                .filter(t => t.punctuation === '!')
                .map(t => this.evaluate(t.term));

            this.emitMeTTaEvent('program-executed', { resultCount: results.length });
            return results;
        });
    }

    /**
     * Evaluate expression
     * @param {Term} term - Term to evaluate
     * @returns {Term} - Result
     */
    evaluate(term) {
        return this.trackOperation('evaluate', () => {
            // Macro expansion
            const expanded = this.macroExpander.expand(term);

            // Type checking
            if (this.config.typeChecking) {
                this._typeCheck(expanded);
            }

            // Reduction
            const reduced = this.reductionEngine.reduce(expanded, this.space);

            return reduced;
        });
    }

    /**
     * Query with pattern matching
     * @param {Term|string} pattern - Pattern to match
     * @param {Term|string} template - Result template
     * @returns {Array<Term>} - Results
     */
    query(pattern, template) {
        return this.trackOperation('query', () => {
            // Parse if strings
            if (typeof pattern === 'string') {
                pattern = this.parser.parseExpression(pattern);
            }
            if (typeof template === 'string') {
                template = this.parser.parseExpression(template);
            }

            return this.matchEngine.executeMatch(this.space, pattern, template);
        });
    }

    /**
     * Execute match operation
     * @param {Term} pattern - Pattern
     * @param {Term} template - Template
     * @returns {Array<Term>}
     */
    match(pattern, template) {
        return this.query(pattern, template);
    }

    /**
     * Type check term
     * @param {Term} term - Term to check
     * @private
     */
    _typeCheck(term) {
        if (term.operator === '-->') {
            const [subject, type] = term.components;
            this.typeSystem.checkTypeAnnotation(subject, type.name);
        }
    }

    /**
     * Get comprehensive stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            space: this.space.getStats(),
            macroExpander: this.macroExpander.getStats(),
            reductionEngine: this.reductionEngine.getStats(),
            typeSystem: this.typeSystem.getStats(),
            groundedAtoms: this.groundedAtoms.getStats(),
            stateManager: this.stateManager.getStats()
        };
    }
}
