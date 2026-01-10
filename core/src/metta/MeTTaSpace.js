import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TaskBuilders } from './helpers/MeTTaHelpers.js';

export class MeTTaSpace extends BaseMeTTaComponent {
    constructor(memory, termFactory) {
        super({}, 'MeTTaSpace', null, termFactory);
        this.memory = memory;
        this.atoms = new Set();
        this.rules = [];
        this.groundedAtoms = null;
        this.stateManager = null;
    }

    addAtom(term) {
        return this.trackOperation('addAtom', () => {
            this.atoms.add(term);
            this.memory?.addTask?.(TaskBuilders.task(term));

            // Auto-register equality/inference rules for the ReductionEngine
            // Pattern: (= pattern result)
            const op = term.operator ?? term.components?.[0]?.name;

            if (op === '=' && term.components.length >= 2) {
                let pattern, result;

                if (term.operator === '=') {
                    // Structurally typed rule
                    pattern = term.components[0];
                    result = term.components[1];
                } else if (term.components[0]?.name === '=' && term.components.length >= 3) {
                    // Expression-based rule: (= pattern result)
                    pattern = term.components[1];
                    result = term.components[2];
                }

                if (pattern && result) {
                    this.rules.push({ pattern, result });
                    if (pattern.toString() === 'True' && result.toString() === 'True') {
                        console.error("[DEBUG] SUSPICIOUS RULE FROM TERM:", term.toString());
                        console.error("Pattern:", pattern);
                        console.error("Result:", result);
                    }
                    console.log("[DEBUG] Registered Rule:", pattern.toString(), "->", result.toString());
                    this.emitMeTTaEvent('rule-registered', { pattern: pattern.toString() });
                }
            }

            this.emitMeTTaEvent('atom-added', { atom: term.toString(), totalAtoms: this.atoms.size });
        });
    }

    removeAtom(term) {
        return this.trackOperation('removeAtom', () => {
            const removed = this.atoms.delete(term);
            if (removed) this.emitMeTTaEvent('atom-removed', { atom: term.toString(), totalAtoms: this.atoms.size });
            return removed;
        });
    }

    getAtoms() { return Array.from(this.atoms); }
    getAtomCount() { return this.atoms.size; }

    clear() {
        this.atoms.clear();
        this.rules = [];
        this.emitMeTTaEvent('space-cleared', {});
    }

    addRule(pattern, result) {
        this.trackOperation('addRule', () => {
            this.rules.push({ pattern, result });
            console.log(`[DEBUG] Explicit Rule Added: ${pattern.toString()}`);
            this.emitMeTTaEvent('rule-added', { pattern: pattern.toString() });
        });
    }

    getRules() { return this.rules; }
    hasAtom(term) { return this.atoms.has(term); }

    getStats() {
        return {
            ...super.getStats(),
            atomCount: this.atoms.size,
            ruleCount: this.rules.length
        };
    }
}

