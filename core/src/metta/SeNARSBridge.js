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
}
