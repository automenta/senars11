import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TaskBuilders } from './helpers/MeTTaHelpers.js';

export class MeTTaSpace extends BaseMeTTaComponent {
    constructor(memory, termFactory) {
        super({}, 'MeTTaSpace', null, termFactory);
        this.memory = memory;
        this.atoms = new Set();
        this.rules = [];
        this.groundedAtoms = null; // Set externally
        this.stateManager = null; // Set externally
    }

    addAtom(term) {
        return this.trackOperation('addAtom', () => {
            this.atoms.add(term);
            if (this.memory?.addTask) {
                this.memory.addTask(TaskBuilders.task(term));
            }
            this.emitMeTTaEvent('atom-added', { atom: term.toString(), totalAtoms: this.atoms.size });
        });
    }

    removeAtom(term) {
        return this.trackOperation('removeAtom', () => {
            const removed = this.atoms.delete(term);
            if (removed) {
                this.emitMeTTaEvent('atom-removed', { atom: term.toString(), totalAtoms: this.atoms.size });
            }
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
