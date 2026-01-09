import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

export class MacroExpander extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'MacroExpander', eventBus, termFactory);
        this.matchEngine = matchEngine;
        this.macros = new Map();
        this.maxDepth = config.maxMacroDepth ?? 100;
    }

    defineMacro(name, pattern, expansion) {
        this.trackOperation('defineMacro', () => {
            this.macros.set(name, { pattern, expansion });
            this.emitMeTTaEvent('macro-defined', { name });
        });
    }

    hasMacro(name) { return this.macros.has(name); }

    expand(term, depth = 0) {
        return this.trackOperation('expand', () => {
            if (depth >= this.maxDepth) {
                this.logWarn('Max macro expansion depth reached', { term: term.toString() });
                return term;
            }

            const expanded = this._expandOnce(term);
            if (expanded !== term) {
                this.emitMeTTaEvent('macro-expanded', { original: term.toString(), expanded: expanded.toString() });
                return this.expand(expanded, depth + 1);
            }

            if (!term.operator || !term.components?.length) return term;

            const expandedComponents = term.components.map(c => this.expand(c, depth));
            const changed = expandedComponents.some((c, i) => c !== term.components[i]);
            return changed ? this.termFactory.create(term.operator, expandedComponents) : term;
        });
    }

    _expandOnce(term) {
        if (!term.operator || !term.components?.length) return term;
        const macroName = term.components[0]?.name;
        if (!macroName || !this.macros.has(macroName)) return term;

        const { pattern, expansion } = this.macros.get(macroName);
        const bindings = this.matchEngine?.unify(pattern, term);
        return bindings ? this.matchEngine.substitute(expansion, bindings) : term;
    }

    clearMacros() {
        this.macros.clear();
        this.emitMeTTaEvent('macros-cleared', {});
    }

    getMacroCount() { return this.macros.size; }
    getStats() { return { ...super.getStats(), macroCount: this.macros.size }; }
}
