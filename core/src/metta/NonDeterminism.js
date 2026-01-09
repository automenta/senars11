/**
 * NonDeterminism.js - MeTTa non-deterministic evaluation
 * Supports superpose, collapse, and multi-value returns
 */

import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

/**
 * NonDeterminism - Handles non-deterministic computations
 * Implements superpose (multi-value) and collapse (choice)
 */
export class NonDeterminism extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'NonDeterminism', eventBus, termFactory);
        this.rng = config.rng ?? Math.random;
    }

    /**
     * Create a superposition (all possible values)
     * @param {...any} values - Values to superpose
     * @returns {Object} Superposition object
     */
    superpose(...values) {
        return this.trackOperation('superpose', () => {
            const result = {
                type: 'superposition',
                values: values.flat(), // Flatten nested arrays
                toString: function () {
                    return `(superpose ${this.values.map(v => v.toString ? v.toString() : v).join(' ')})`;
                }
            };

            this.emitMeTTaEvent('superposition-created', {
                count: result.values.length
            });

            return result;
        });
    }

    /**
     * Check if value is a superposition
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isSuperposition(value) {
        return value?.type === 'superposition';
    }

    /**
     * Get values array from superposition or single value
     * @param {*} value - Superposition or regular value
     * @returns {Array} Values array
     * @private
     */
    _getValues(value) {
        return this.isSuperposition(value) ? value.values : [value];
    }

    /**
     * Collapse superposition to single value (non-deterministic choice)
     * @param {Object|*} superposition - Superposition or regular value
     * @returns {*} Single value
     */
    collapse(superposition) {
        return this.trackOperation('collapse', () => {
            if (!this.isSuperposition(superposition)) {
                return superposition;
            }

            const idx = Math.floor(this.rng() * superposition.values.length);
            const selected = superposition.values[idx];

            this.emitMeTTaEvent('superposition-collapsed', {
                totalValues: superposition.values.length,
                selectedIndex: idx
            });

            return selected;
        });
    }

    /**
     * Collapse all superpositions (deterministic - returns first)
     * @param {Object|*} superposition - Superposition or regular value
     * @returns {*} First value
     */
    collapseFirst(superposition) {
        return this._getValues(superposition)[0];
    }

    /**
     * Collapse all superpositions (deterministic - returns all)
     * @param {Object|*} superposition - Superposition or regular value
     * @returns {Array} All values
     */
    collapseAll(superposition) {
        return this._getValues(superposition);
    }

    /**
     * Map function over superposition
     * @param {Object|*} superposition - Superposition or regular value
     * @param {Function} fn - Function to apply
     * @returns {Object|*} Mapped superposition or value
     */
    mapSuperpose(superposition, fn) {
        return this.trackOperation('mapSuperpose', () => {
            const mappedValues = this._getValues(superposition).flatMap(v => {
                const result = fn(v);
                return this._getValues(result);
            });

            if (mappedValues.length === 1) return mappedValues[0];
            return this.superpose(...mappedValues);
        });
    }

    /**
     * Filter superposition values
     * @param {Object|*} superposition - Superposition or regular value
     * @param {Function} predicate - Filter predicate
     * @returns {Object|*} Filtered superposition
     */
    filterSuperpose(superposition, predicate) {
        return this.trackOperation('filterSuperpose', () => {
            if (!this.isSuperposition(superposition)) {
                return predicate(superposition) ? superposition : null;
            }

            const filtered = superposition.values.filter(predicate);

            return filtered.length === 0 ? null :
                filtered.length === 1 ? filtered[0] :
                    this.superpose(...filtered);
        });
    }

    /**
     * Bind operation: evaluate pattern for each value
     * Used for pattern matching over superpositions
     * @param {Object|*} superposition - Superposition or regular value
     * @param {Function} bindFn - Function returning results for each value
     * @returns {Object|*} Result superposition
     */
    bind(superposition, bindFn) {
        return this.trackOperation('bind', () => {
            const results = this._getValues(superposition).flatMap(val => {
                const result = bindFn(val);
                return this._getValues(result);
            });

            if (results.length === 0) return null;
            return results.length === 1 ? results[0] : this.superpose(...results);
        });
    }

    /**
     * Combine two superpositions (cartesian product)
     * @param {Object|*} s1 - First superposition
     * @param {Object|*} s2 - Second superposition
     * @param {Function} combineFn - Function to combine values
     * @returns {Object|*} Combined superposition
     */
    combine(s1, s2, combineFn) {
        return this.trackOperation('combine', () => {
            const vals1 = this._getValues(s1);
            const vals2 = this._getValues(s2);

            const results = vals1.flatMap(v1 => vals2.map(v2 => combineFn(v1, v2)));
            return results.length === 1 ? results[0] : this.superpose(...results);
        });
    }
}
