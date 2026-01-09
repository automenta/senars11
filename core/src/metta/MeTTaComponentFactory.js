/**
 * MeTTaComponentFactory.js - Factory for creating MeTTa components with dependency injection
 */

import { MeTTaInterpreter } from './MeTTaInterpreter.js';
import { MeTTaSpace } from './MeTTaSpace.js';
import { MatchEngine } from './MatchEngine.js';
import { ReductionEngine } from './ReductionEngine.js';
import { TermFactory } from '../term/TermFactory.js';

export class MeTTaComponentFactory {
    /**
     * Create a configured MeTTaInterpreter
     * @param {Object} memory - SeNARS memory reference
     * @param {Object} config - Configuration object
     * @returns {MeTTaInterpreter}
     */
    static createInterpreter(memory, config = {}) {
        const termFactory = config.termFactory ?? new TermFactory();

        // Create or inject dependencies
        const space = config.space ?? new MeTTaSpace(memory, termFactory);
        const matchEngine = config.matchEngine ?? new MatchEngine(config, config.eventBus, termFactory);

        // Interpreter will create other components if not provided, or we can explictly create them here
        // For now, allow Interpreter to handle its internal defaults if not injected

        return new MeTTaInterpreter(memory, {
            ...config,
            termFactory,
            space,
            matchEngine
            // groundedAtoms, etc. can be added as needed
        }, config.eventBus);
    }
}
