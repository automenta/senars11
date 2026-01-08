/**
 * MacroExpander.js - MeTTa macro expansion system
 * Pattern-based macro expansion before evaluation
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { MeTTaAST } from './helpers/MeTTaHelpers.js';

/**
 * MacroExpander - Macro expansion via pattern matching
 * Expands macros before evaluation
 */
export class MacroExpander extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null, matchEngine = null) {
        super(config, 'MacroExpander', eventBus, termFactory);
        this.matchEngine = matchEngine;
        this.macros = new Map();
        this.maxDepth = config.maxMacroDepth ?? 100;
    }

    /**
     * Define a macro
     * @param {string} name - Macro name
     * @param {Term} pattern - Macro pattern
     * @param {Term} expansion - Macro expansion
     */
    defineMacro(name, pattern, expansion) {
        this.trackOperation('defineMacro', () => {
            this.macros.set(name, { pattern, expansion });
            this.emitMeTTaEvent('macro-defined', { name });
        });
    }

    /**
     * Check if macro is defined
     * @param {string} name - Macro name
     * @returns {boolean}
     */
    hasMacro(name) {
        return this.macros.has(name);
    }

    /**
     * Expand macros in term
     * @param {Term} term - Term to expand
     * @param {number} depth - Current expansion depth
     * @returns {Term} - Expanded term
     */
    expand(term, depth = 0) {
        return this.trackOperation('expand', () => {
            if (depth >= this.maxDepth) {
                this.logWarn('Max macro expansion depth reached', { term: term.toString() });
                return term;
            }

            const expanded = this._expandOnce(term);

            if (expanded !== term) {
                this.emitMeTTaEvent('macro-expanded', {
                    original: term.toString(),
                    expanded: expanded.toString()
                });
                return this.expand(expanded, depth + 1);
            }

            if (!term.components?.length) return term;

            const expandedComponents = term.components.map(c => this.expand(c, depth));
            const changed = expandedComponents.some((c, i) => c !== term.components[i]);

            return changed ? this.termFactory.create(term.operator, expandedComponents) : term;
        });
    }

    /**
     * Single expansion step
     * @param {Term} term - Term to expand
     * @returns {Term} - Expanded term or original if no match
     * @private
     */
    _expandOnce(term) {
        if (!term.operator || !term.components) return term;

        const macroName = term.components[0]?.name;
        if (!macroName || !this.hasMacro(macroName)) return term;

        const { pattern, expansion } = this.macros.get(macroName);
        const bindings = this.matchEngine?.unify(pattern, term);

        return bindings ? this.matchEngine.substitute(expansion, bindings) : term;
    }

    /**
     * Clear all macros
     */
    clearMacros() {
        this.macros.clear();
        this.emitMeTTaEvent('macros-cleared', {});
    }

    /**
     * Get macro count
     * @returns {number}
     */
    getMacroCount() {
        return this.macros.size;
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            macroCount: this.macros.size
        };
    }
}
