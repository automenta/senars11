import { BaseMeTTaComponent } from './helpers/BaseMeTTaComponent.js';

export class NonDeterminism extends BaseMeTTaComponent {
    constructor(config = {}, eventBus = null, termFactory = null) {
        super(config, 'NonDeterminism', eventBus, termFactory);
        this.rng = config.rng ?? Math.random;
    }

    superpose(...values) {
        return this.trackOperation('superpose', () => {
            const vals = values.flat();
            this.emitMeTTaEvent('superposition-created', { count: vals.length });
            return {
                type: 'superposition',
                values: vals,
                toString: () => `(superpose ${vals.map(v => v?.toString?.() ?? v).join(' ')})`
            };
        });
    }

    isSuperposition(value) { return value?.type === 'superposition'; }
    _getValues(value) { return this.isSuperposition(value) ? value.values : [value]; }

    collapse(superposition) {
        return this.trackOperation('collapse', () => {
            if (!this.isSuperposition(superposition)) return superposition;
            const values = superposition.values;
            if (values.length === 0) return null;
            const idx = Math.floor(this.rng() * values.length);
            this.emitMeTTaEvent('superposition-collapsed', { totalValues: values.length, selectedIndex: idx });
            return values[idx];
        });
    }

    collapseFirst(superposition) { return this._getValues(superposition)[0]; }
    collapseAll(superposition) { return this._getValues(superposition); }

    mapSuperpose(superposition, fn) {
        return this.trackOperation('mapSuperpose', () => {
            const mapped = this._getValues(superposition).flatMap(v => this._getValues(fn(v)));
            return mapped.length === 1 ? mapped[0] : this.superpose(...mapped);
        });
    }

    filterSuperpose(superposition, predicate) {
        return this.trackOperation('filterSuperpose', () => {
            const filtered = this._getValues(superposition).filter(predicate);
            return filtered.length === 0 ? null : filtered.length === 1 ? filtered[0] : this.superpose(...filtered);
        });
    }

    bind(superposition, bindFn) {
        return this.trackOperation('bind', () => {
            const results = this._getValues(superposition).flatMap(val => this._getValues(bindFn(val)));
            return results.length === 0 ? null : results.length === 1 ? results[0] : this.superpose(...results);
        });
    }

    combine(s1, s2, combineFn) {
        return this.trackOperation('combine', () => {
            const vals1 = this._getValues(s1);
            const vals2 = this._getValues(s2);
            const results = vals1.flatMap(v1 => vals2.map(v2 => combineFn(v1, v2)));
            return results.length === 1 ? results[0] : this.superpose(...results);
        });
    }
}
