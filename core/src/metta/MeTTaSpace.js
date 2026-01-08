/**
 * MeTTaSpace.js - Atomspace adapter for SeNARS
 * Maps MeTTa space operations to SeNARS Memory/Bag
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

/**
 * MeTTaSpace - Atomspace-compatible interface for SeNARS
 * Provides space operations for MeTTa programs
 */
export class MeTTaSpace extends BaseMeTTaComponent {
    constructor(memory, termFactory) {
        super({}, 'MeTTaSpace', null, termFactory);
        this.memory = memory;
        this.atoms = new Set(); // Atom storage
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

            // Also add to SeNARS memory if available
            if (this.memory) {
                // Convert to task and add
                const { Task } = require('../task/Task.js');
                const { Truth } = require('../truth/Truth.js');
                const task = new Task({
                    term,
                    punctuation: '.',
                    truth: new Truth(0.9, 0.9)
                });
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
        this.emitMeTTaEvent('space-cleared', {});
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
            atomCount: this.atoms.size
        };
    }
}
