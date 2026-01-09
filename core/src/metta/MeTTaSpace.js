/**
 * MeTTaSpace.js - Atomspace adapter for SeNARS
 * Maps MeTTa space operations to SeNARS Memory/Bag
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';
import { TaskBuilders } from './helpers/MeTTaHelpers.js';

/**
 * MeTTaSpace - Atomspace-compatible interface for SeNARS
 * Provides space operations for MeTTa programs
 */
export class MeTTaSpace extends BaseMeTTaComponent {
    constructor(memory, termFactory) {
        super({}, 'MeTTaSpace', null, termFactory);
        this.memory = memory;
        this.atoms = new Set(); // Atom storage
        this.rules = []; // Reduction rules
        this.groundedAtoms = null; // Set externally
        this.stateManager = null; // Set externally
    }

    /**
     * Add atom to space
     * @param {Term} term - Term to add
     */
    addAtom(term) {
        return this.trackOperation('addAtom', () => {
            this.atoms.add(term);

            // Also add to SeNARS memory if available (using simple object pattern)
            if (this.memory?.addTask) {
                const task = TaskBuilders.task(term);
                this.memory.addTask(task);
            }

            this.emitMeTTaEvent('atom-added', {
                atom: term.toString(),
                totalAtoms: this.atoms.size
            });
        });
    }

    /**
     * Remove atom from space
     * @param {Term} term - Term to remove
     * @returns {boolean} - true if removed
     */
    removeAtom(term) {
        return this.trackOperation('removeAtom', () => {
            const removed = this.atoms.delete(term);

            if (removed) {
                this.emitMeTTaEvent('atom-removed', {
                    atom: term.toString(),
                    totalAtoms: this.atoms.size
                });
            }

            return removed;
        });
    }

    /**
     * Get all atoms in space
     * @returns {Array<Term>}
     */
    getAtoms() {
        return Array.from(this.atoms);
    }

    /**
     * Get atom count
     * @returns {number}
     */
    getAtomCount() {
        return this.atoms.size;
    }

    /**
     * Clear all atoms
     */
    clear() {
        this.atoms.clear();
        this.rules = [];
        this.emitMeTTaEvent('space-cleared', {});
    }

    /**
     * Add reduction rule
     * @param {Term} pattern - Pattern to match
     * @param {Term|Function} result - Result
     */
    addRule(pattern, result) {
        this.trackOperation('addRule', () => {
            this.rules.push({ pattern, result });
            this.emitMeTTaEvent('rule-added', { pattern: pattern.toString() });
        });
    }

    /**
     * Get all rules
     * @returns {Array} - Rules
     */
    getRules() {
        return this.rules;
    }

    /**
     * Check if atom exists
     * @param {Term} term - Term to check
     * @returns {boolean}
     */
    hasAtom(term) {
        return this.atoms.has(term);
    }

    /**
     * Get stats
     * @returns {Object}
     */
    getStats() {
        return {
            ...super.getStats(),
            atomCount: this.atoms.size,
            ruleCount: this.rules.length
        };
    }
}
