import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TermBuilders } from './helpers/MeTTaHelpers.js';
import { BUILTIN_OPERATIONS, COMPLETE_STDLIB_MAPPINGS } from './helpers/MeTTaLib.js';

import { GroundedAtoms } from './GroundedAtoms.js';
import { MacroExpander } from './MacroExpander.js';
import { MatchEngine } from './MatchEngine.js';
import { MeTTaSpace } from './MeTTaSpace.js';
import { NonDeterminism } from './NonDeterminism.js';
import { ReductionEngine } from './ReductionEngine.js';
import { StateManager } from './StateManager.js';
import { TypeSystem } from './TypeSystem.js';

import { MeTTaParser } from '../parser/MeTTaParser.js';
import { TermFactory } from '../term/TermFactory.js';


export class MeTTaInterpreter extends BaseMeTTaComponent {
    /**
     * @param {Object} memory - SeNARS memory
     * @param {Object} config - Configuration
     * @param {TermFactory} config.termFactory - Optional injected TermFactory
     * @param {MeTTaSpace} config.space - Optional injected MeTTaSpace
     * @param {MatchEngine} config.matchEngine - Optional injected MatchEngine
     * @param {EventBus} eventBus - Event bus
     */
    constructor(memory, config = {}, eventBus = null) {
        const termFactory = config.termFactory ?? new TermFactory();
        super(config, 'MeTTaInterpreter', eventBus, termFactory);

        // Core dependencies - inject or create default
        this.parser = config.parser ?? new MeTTaParser(this.termFactory, {
            mappings: { ...COMPLETE_STDLIB_MAPPINGS, ...config.customMappings }
        });

        this.space = config.space ?? new MeTTaSpace(memory, this.termFactory);
        this.matchEngine = config.matchEngine ?? new MatchEngine(config, eventBus, this.termFactory);
        this.macroExpander = config.macroExpander ?? new MacroExpander(config, eventBus, this.termFactory, this.matchEngine);
        this.typeSystem = config.typeSystem ?? new TypeSystem(config, eventBus, this.termFactory);
        this.reductionEngine = config.reductionEngine ?? new ReductionEngine(config, eventBus, this.termFactory, this.matchEngine);
        this.nonDeterminism = config.nonDeterminism ?? new NonDeterminism(config, eventBus, this.termFactory);
        this.groundedAtoms = config.groundedAtoms ?? new GroundedAtoms(config.functorRegistry, config, eventBus, this.termFactory);
        this.stateManager = config.stateManager ?? new StateManager(config, eventBus, this.termFactory);

        // Component wiring
        // Note: In a pure DI world, wiring happens in the composition root (Factory),
        // but to maintain backward compatibility and ease of use, we wire here for defaults.
        Object.assign(this.space, { groundedAtoms: this.groundedAtoms, stateManager: this.stateManager });
        this.groundedAtoms.setSpace('default', this.space);

        this._registerStdLib();
    }

    async _initialize() {
        this.emitMeTTaEvent('interpreter-initializing', {});
        await super._initialize();
        this.emitMeTTaEvent('interpreter-initialized', {});
    }

    _registerStdLib() {
        for (const [op, fn] of Object.entries(BUILTIN_OPERATIONS.arithmetic)) {
            this.space.addRule(
                TermBuilders.functor(this.termFactory, this.termFactory.atomic(op), this.termFactory.atomic('$a'), this.termFactory.atomic('$b')),
                (bindings) => {
                    const [a, b] = [Number(bindings['$a'].name), Number(bindings['$b'].name)];
                    return this.termFactory.atomic(String(fn(a, b)));
                }
            );
        }
    }

    load(mettaCode) {
        return this.trackOperation('load', () => {
            const tasks = this.parser.parseMeTTa(mettaCode);
            const expanded = tasks.map(task => ({ ...task, term: this.macroExpander.expand(task.term) }));

            if (this.config.typeChecking) expanded.forEach(({ term }) => this._typeCheck(term));
            expanded.forEach(({ term }) => this.space.addAtom(term));

            this.emitMeTTaEvent('program-loaded', { taskCount: tasks.length });
            return expanded;
        });
    }

    run(mettaCode) {
        return this.trackOperation('run', () => {
            const results = this.parser.parseMeTTa(mettaCode)
                .filter(t => t.punctuation === '!')
                .map(t => this.evaluate(t.term));

            this.emitMeTTaEvent('program-executed', { resultCount: results.length });
            return results;
        });
    }

    evaluate(term) {
        return this.trackOperation('evaluate', () => {
            const expanded = this.macroExpander.expand(term);
            if (this.config.typeChecking) this._typeCheck(expanded);
            return this.reductionEngine.reduce(expanded, this.space);
        });
    }

    query(pattern, template) {
        return this.trackOperation('query', () => {
            const parse = (val) => typeof val === 'string' ? this.parser.parseExpression(val) : val;
            return this.matchEngine.executeMatch(this.space, parse(pattern), parse(template));
        });
    }

    evalOne(program) {
        return this.run(program)[0] ?? null;
    }

    loadAndQuery(program, queryStr, templateStr) {
        this.load(program);
        const queryTerm = this.parser.parseExpression(queryStr);
        const templateTerm = templateStr ? this.parser.parseExpression(templateStr) : queryTerm;
        return this.query(queryTerm, templateTerm);
    }

    match(pattern, template) {
        return this.query(pattern, template);
    }

    _typeCheck(term) {
        if (term.operator === '-->' && term.components.length >= 2) {
            this.typeSystem.checkTypeAnnotation(term.components[0], term.components[1].name);
        }
    }

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
