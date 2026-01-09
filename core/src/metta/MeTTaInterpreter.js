/**
 * MeTTaInterpreter.js - Complete MeTTa execution environment
 * Integrates all MeTTa subsystems for full interpreter functionality
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TermBuilders } from './helpers/MeTTaHelpers.js';
import { COMPLETE_STDLIB_MAPPINGS } from './helpers/MeTTaLib.js';
import { MeTTaParser } from '../parser/MeTTaParser.js';
import { MeTTaSpace } from './MeTTaSpace.js';
import { MatchEngine } from './MatchEngine.js';
import { MacroExpander } from './MacroExpander.js';
import { TypeSystem } from './TypeSystem.js';
import { ReductionEngine } from './ReductionEngine.js';
import { NonDeterminism } from './NonDeterminism.js';
import { GroundedAtoms } from './GroundedAtoms.js';
import { StateManager } from './StateManager.js';
import { TermFactory } from '../term/TermFactory.js';



/**
 * MeTTaInterpreter - Complete MeTTa execution environment
 * Provides load, run, evaluate, and query operations
 */
export class MeTTaInterpreter extends BaseMeTTaComponent {
    constructor(memory, config = {}, eventBus = null) {
        const termFactory = config.termFactory ?? new TermFactory();
        super(config, 'MeTTaInterpreter', eventBus, termFactory);

        const sharedConfig = { config, eventBus, termFactory: this.termFactory };

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
        Object.assign(this.space, {
            groundedAtoms: this.groundedAtoms,
            stateManager: this.stateManager
        });
        this.groundedAtoms.setSpace('default', this.space);

        this._registerBuiltinRules();
    }

    async _initialize() {
        this.emitMeTTaEvent('interpreter-initializing', {});
        await super._initialize();
        this.emitMeTTaEvent('interpreter-initialized', {});
    }

    _registerBuiltinRules() {
        const arithmeticOps = {
            '+': (a, b) => a + b,
            '-': (a, b) => a - b,
            '*': (a, b) => a * b
        };

        for (const [op, fn] of Object.entries(arithmeticOps)) {
            this.space.addRule(
                TermBuilders.functor(this.termFactory, this.termFactory.atomic(op),
                    this.termFactory.atomic('$a'), this.termFactory.atomic('$b')),
                (bindings) => {
                    const a = Number(bindings['$a'].name);
                    const b = Number(bindings['$b'].name);
                    return this.termFactory.atomic(String(fn(a, b)));
                }
            );
        }
    }

    /**
     * Load MeTTa program into space
     * @param {string} mettaCode - MeTTa source code
     * @returns {Array<Task>} - Parsed tasks
     */
    load(mettaCode) {
        return this.trackOperation('load', () => {
            const tasks = this.parser.parseMeTTa(mettaCode);

            // Expand macros and optionally type check
            const expanded = tasks.map(task => ({
                ...task,
                term: this.macroExpander.expand(task.term)
            }));

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
            // Parse strings to terms
            const parseIfString = (val) =>
                typeof val === 'string' ? this.parser.parseExpression(val) : val;

            return this.matchEngine.executeMatch(
                this.space,
                parseIfString(pattern),
                parseIfString(template)
            );
        });
    }

    /**
     * Run a program and return the first result (convenience method)
     * @param {string} program - MeTTa program code
     * @returns {Term|null} - First result term or null
     */
    evalOne(program) {
        const results = this.run(program);
        return results[0] ?? null;
    }

    /**
     * Load a program and then execute a query (convenience method)
     * @param {string} program - MeTTa program code to load
     * @param {string} queryStr - MeTTa query expression
     * @returns {Array<Term>} - Query results
     */
    loadAndQuery(program, queryStr, templateStr) {
        this.load(program);
        const queryTerm = this.parser.parseExpression(queryStr);
        const templateTerm = templateStr ? this.parser.parseExpression(templateStr) : queryTerm;
        return this.query(queryTerm, templateTerm);
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
