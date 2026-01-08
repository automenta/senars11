/**
 * SeNARSBridge.js - Bidirectional MeTTa ↔ SeNARS interop
 * Enables MeTTa programs to invoke SeNARS reasoning and vice versa
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

/**
 * SeNARSBridge - Bidirectional interoperability layer
 * Converts between MeTTa and SeNARS representations
 */
export class SeNARSBridge extends BaseMeTTaComponent {
    constructor(reasoner, mettaInterpreter, config = {}, eventBus = null) {
        super(config, 'SeNARSBridge', eventBus, mettaInterpreter?.termFactory);
        this.reasoner = reasoner;
        this.mettaInterpreter = mettaInterpreter;
    }

    /**
     * Convert MeTTa term to SeNARS task
     * @param {Term} mettaTerm - MeTTa term
     * @param {string} punctuation - Task punctuation (default '.')
     * @returns {Task} - SeNARS task
     */
    mettaToNars(mettaTerm, punctuation = '.') {
        return this.trackOperation('mettaToNars', () => {
            const { Task } = require('../task/Task.js');
            const { Truth } = require('../truth/Truth.js');

            const task = new Task({
                term: mettaTerm,
                punctuation,
                truth: new Truth(0.9, 0.9)
            });

            this.emitMeTTaEvent('metta-to-nars', {
                term: mettaTerm.toString()
            });

            return task;
        });
    }

    /**
     * Convert SeNARS task to MeTTa expression
     * @param {Task} narsTask - SeNARS task
     * @returns {Term} - MeTTa term
     */
    narsToMetta(narsTask) {
        return this.trackOperation('narsToMetta', () => {
            this.emitMeTTaEvent('nars-to-metta', {
                term: narsTask.term.toString()
            });

            return narsTask.term;
        });
    }

    /**
     * Execute MeTTa query and get SeNARS derivations
     * @param {string|Term} mettaQuery - MeTTa query
     * @returns {Array<Task>} - Derived tasks
     */
    queryWithReasoning(mettaQuery) {
        return this.trackOperation('queryWithReasoning', () => {
            // Parse if string
            if (typeof mettaQuery === 'string') {
                mettaQuery = this.mettaInterpreter.parser.parseExpression(mettaQuery);
            }

            // Convert to NARS task
            const narsTask = this.mettaToNars(mettaQuery, '?');

            // Get derivations from reasoner
            if (this.reasoner && this.reasoner.derive) {
                const derivations = this.reasoner.derive(narsTask);
                this.emitMeTTaEvent('reasoning-complete', {
                    derivationCount: derivations.length
                });
                return derivations;
            }

            return [];
        });
    }

    /**
     * Import MeTTa knowledge to SeNARS knowledge base
     * @param {string} mettaCode - MeTTa source code
     */
    importToSeNARS(mettaCode) {
        return this.trackOperation('importToSeNARS', () => {
            const tasks = this.mettaInterpreter.load(mettaCode);

            if (this.reasoner && this.reasoner.process) {
                tasks.forEach(task => {
                    const narsTask = this.mettaToNars(task.term, task.punctuation);
                    this.reasoner.process(narsTask);
                });
            }

            this.emitMeTTaEvent('knowledge-imported', {
                taskCount: tasks.length
            });
        });
    }

    /**
     * Export SeNARS beliefs as MeTTa code
     * @returns {Array<Term>} - MeTTa terms
     */
    exportFromSeNARS() {
        return this.trackOperation('exportFromSeNARS', () => {
            if (!this.reasoner || !this.reasoner.memory) {
                return [];
            }

            const beliefs = this.reasoner.memory.getBeliefs?.() || [];
            const mettaTerms = beliefs.map(b => this.narsToMetta(b));

            this.emitMeTTaEvent('knowledge-exported', {
                termCount: mettaTerms.length
            });

            return mettaTerms;
        });
    }

    /**
     * Sync knowledge bidirectionally
     * @param {string} mettaCode - MeTTa code to import
     * @returns {Object} - {imported, exported}
     */
    sync(mettaCode) {
        return this.trackOperation('sync', () => {
            this.importToSeNARS(mettaCode);
            const exported = this.exportFromSeNARS();

            return {
                imported: mettaCode,
                exported: exported.map(t => t.toString()).join('\n')
            };
        });
    }
}
