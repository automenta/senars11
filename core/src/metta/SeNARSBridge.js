/**
 * SeNARSBridge.js - Bidirectional MeTTa ↔ SeNARS interop
 * Enables MeTTa programs to invoke SeNARS reasoning and vice versa
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TaskBuilders } from './helpers/MeTTaHelpers.js';

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
            // Note: Task and Truth classes should be imported at module level if needed frequently
            // For now, using dynamic import pattern if classes are available
            const task = TaskBuilders.task(mettaTerm, punctuation);

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
            const query = typeof mettaQuery === 'string'
                ? this.mettaInterpreter.parser.parseExpression(mettaQuery)
                : mettaQuery;

            const narsTask = this.mettaToNars(query, '?');

            const derivations = this.reasoner?.derive?.(narsTask) ?? [];

            this.emitMeTTaEvent('reasoning-complete', {
                derivationCount: derivations.length
            });

            return derivations;
        });
    }

    /**
     * Import MeTTa knowledge to SeNARS knowledge base
     * @param {string} mettaCode - MeTTa source code
     */
    importToSeNARS(mettaCode) {
        return this.trackOperation('importToSeNARS', () => {
            const tasks = this.mettaInterpreter.load(mettaCode);

            tasks.forEach(task => {
                const narsTask = this.mettaToNars(task.term, task.punctuation);
                this.reasoner?.process?.(narsTask);
            });

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
            const beliefs = this.reasoner?.memory?.getBeliefs?.() ?? [];
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
