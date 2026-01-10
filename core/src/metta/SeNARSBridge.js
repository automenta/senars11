import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TaskBuilders } from './helpers/MeTTaHelpers.js';
import { MeTTaRuleAdapter } from './helpers/MeTTaRuleAdapter.js';

export class SeNARSBridge extends BaseMeTTaComponent {
    constructor(reasoner, mettaInterpreter, config = {}, eventBus = null) {
        super(config, 'SeNARSBridge', eventBus, mettaInterpreter?.termFactory);
        this.reasoner = reasoner;
        this.mettaInterpreter = mettaInterpreter;
    }

    mettaToNars(mettaTerm, punctuation = '.') {
        return this.trackOperation('mettaToNars', () => {
            const task = TaskBuilders.task(mettaTerm, punctuation);
            this.emitMeTTaEvent('metta-to-nars', { term: mettaTerm.toString() });
            return task;
        });
    }

    narsToMetta(narsTask) {
        return this.trackOperation('narsToMetta', () => {
            this.emitMeTTaEvent('nars-to-metta', { term: narsTask.term.toString() });
            return narsTask.term;
        });
    }

    queryWithReasoning(mettaQuery) {
        return this.trackOperation('queryWithReasoning', () => {
            const query = typeof mettaQuery === 'string'
                ? this.mettaInterpreter.parser.parseExpression(mettaQuery)
                : mettaQuery;

            const narsTask = this.mettaToNars(query, '?');
            const derivations = this.reasoner?.derive?.(narsTask) ?? [];
            this.emitMeTTaEvent('reasoning-complete', { derivationCount: derivations.length });
            return derivations;
        });
    }

    importToSeNARS(mettaCode) {
        return this.trackOperation('importToSeNARS', () => {
            const tasks = this.mettaInterpreter.load(mettaCode);
            tasks.forEach(t => this.reasoner?.process?.(this.mettaToNars(t.term, t.punctuation)));
            this.emitMeTTaEvent('knowledge-imported', { taskCount: tasks.length });
        });
    }

    exportFromSeNARS() {
        return this.trackOperation('exportFromSeNARS', () => {
            const beliefs = this.reasoner?.memory?.getBeliefs?.() ?? [];
            const terms = beliefs.map(b => this.narsToMetta(b));
            this.emitMeTTaEvent('knowledge-exported', { termCount: terms.length });
            return terms;
        });
    }

    injectRule(mettaRuleTerm) {
        return this.trackOperation('injectRule', () => {
            // Import lazily to avoid circular dependencies if any, or just import at top if clean.
            // Using dynamic import or assuming global/module availability might be tricky in pure JS modules without bundler if not careful.
            // But we can import at top. Let's assume top level import is fine.

            const rule = new MeTTaRuleAdapter(mettaRuleTerm, this.mettaInterpreter);
            this.reasoner.ruleProcessor.ruleExecutor.registerRule(rule);

            this.emitMeTTaEvent('rule-injected', { ruleId: rule.id });
            return rule;
        });
    }

    sync(mettaCode) {
        return this.trackOperation('sync', () => {
            this.importToSeNARS(mettaCode);
            const exported = this.exportFromSeNARS();
            return { imported: mettaCode, exported: exported.map(t => t.toString()).join('\n') };
        });
    }

    // =========================================================================
    // Phase 3: Attention and Introspection Methods
    // =========================================================================

    /**
     * Get STI (Short-Term Importance) for a concept
     * @param {object} atom - MeTTa term representing the concept
     * @returns {number} STI value
     */
    getConceptSTI(atom) {
        return this.trackOperation('getConceptSTI', () => {
            const termStr = atom?.toString?.() ?? String(atom);
            const concept = this.reasoner?.memory?.getConcept?.(termStr);
            return concept?.budget?.sti ?? 0;
        });
    }

    /**
     * Set STI for a concept
     * @param {object} atom - MeTTa term representing the concept
     * @param {number} value - New STI value
     */
    setConceptSTI(atom, value) {
        return this.trackOperation('setConceptSTI', () => {
            const termStr = atom?.toString?.() ?? String(atom);
            const concept = this.reasoner?.memory?.getConcept?.(termStr);
            if (concept && concept.budget) {
                concept.budget.sti = value;
                this.emitMeTTaEvent('sti-updated', { concept: termStr, sti: value });
            }
        });
    }

    /**
     * Get LTI (Long-Term Importance) for a concept
     * @param {object} atom - MeTTa term representing the concept
     * @returns {number} LTI value
     */
    getConceptLTI(atom) {
        return this.trackOperation('getConceptLTI', () => {
            const termStr = atom?.toString?.() ?? String(atom);
            const concept = this.reasoner?.memory?.getConcept?.(termStr);
            return concept?.budget?.lti ?? 0;
        });
    }

    /**
     * Set LTI for a concept
     * @param {object} atom - MeTTa term representing the concept
     * @param {number} value - New LTI value
     */
    setConceptLTI(atom, value) {
        return this.trackOperation('setConceptLTI', () => {
            const termStr = atom?.toString?.() ?? String(atom);
            const concept = this.reasoner?.memory?.getConcept?.(termStr);
            if (concept && concept.budget) {
                concept.budget.lti = value;
                this.emitMeTTaEvent('lti-updated', { concept: termStr, lti: value });
            }
        });
    }

    /**
     * Get concepts related to a given concept via links
     * @param {object} atom - MeTTa term representing the concept
     * @param {number} maxResults - Maximum number of related concepts to return
     * @returns {Array} Array of related concept terms
     */
    getRelatedConcepts(atom, maxResults = 10) {
        return this.trackOperation('getRelatedConcepts', () => {
            const termStr = atom?.toString?.() ?? String(atom);
            const concept = this.reasoner?.memory?.getConcept?.(termStr);

            if (!concept || !concept.links) {
                return [];
            }

            // Get linked concepts sorted by link strength
            const linkedTerms = Array.from(concept.links || [])
                .slice(0, maxResults)
                .map(link => link.target?.term ?? link.target);

            this.emitMeTTaEvent('related-concepts-retrieved', {
                concept: termStr,
                count: linkedTerms.length
            });

            return linkedTerms;
        });
    }

    /**
     * Get top N concepts sorted by STI
     * @param {number} n - Number of concepts to return
     * @returns {Array} Array of concept terms
     */
    getTopBySTI(n = 10) {
        return this.trackOperation('getTopBySTI', () => {
            const concepts = this.reasoner?.memory?.getAllConcepts?.() ?? [];

            return concepts
                .filter(c => c.budget?.sti > 0)
                .sort((a, b) => (b.budget?.sti ?? 0) - (a.budget?.sti ?? 0))
                .slice(0, n)
                .map(c => c.term);
        });
    }

    /**
     * Get system statistics
     * @returns {object} Statistics including atom count, STI distribution, memory
     */
    getSystemStats() {
        return this.trackOperation('getSystemStats', () => {
            const concepts = this.reasoner?.memory?.getAllConcepts?.() ?? [];
            const atomCount = this.mettaInterpreter?.space?.size?.() ?? 0;

            // Calculate STI statistics
            const stiValues = concepts
                .map(c => c.budget?.sti ?? 0)
                .filter(sti => sti > 0);

            const avgSTI = stiValues.length > 0
                ? stiValues.reduce((a, b) => a + b, 0) / stiValues.length
                : 0;

            // Memory usage (approximate)
            const memoryMB = process.memoryUsage ?
                (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) : 0;

            return {
                atomCount,
                conceptCount: concepts.length,
                avgSTI: avgSTI.toFixed(2),
                maxSTI: Math.max(...stiValues, 0).toFixed(2),
                minSTI: stiValues.length > 0 ? Math.min(...stiValues).toFixed(2) : 0,
                memoryMB
            };
        });
    }

    /**
     * Execute a NARS derivation step
     * @param {object} task - Task term
     * @param {object} premise - Premise term (optional)
     * @returns {object} Derived term or null
     */
    executeNARSDerivation(task, premise = null) {
        return this.trackOperation('executeNARSDerivation', () => {
            const narsTask = this.mettaToNars(task, '.');

            if (premise) {
                // Forward to NARS reasoner with specific premise
                const derivations = this.reasoner?.deriveWith?.(narsTask, premise) ??
                    this.reasoner?.derive?.(narsTask) ?? [];

                if (derivations.length > 0) {
                    return this.narsToMetta(derivations[0]);
                }
            } else {
                // General derivation
                const derivations = this.reasoner?.derive?.(narsTask) ?? [];

                if (derivations.length > 0) {
                    return this.narsToMetta(derivations[0]);
                }
            }

            return null;
        });
    }
}

