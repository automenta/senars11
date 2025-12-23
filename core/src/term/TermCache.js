import {BaseComponent} from '../util/BaseComponent.js';


export class TermCache extends BaseComponent {
    constructor(config = {}) {
        super(config, 'TermCache');
        this._cache = new Map();
        this._maxSize = config.maxSize || 5000;
        this._hits = 0;
        this._misses = 0;
    }

    get size() {
        return this._cache.size;
    }

    get stats() {
        const total = this._hits + this._misses;
        return {
            size: this._cache.size,
            maxSize: this._maxSize,
            hits: this._hits,
            misses: this._misses,
            hitRate: total > 0 ? this._hits / total : 0
        };
    }

    get(key) {
        const item = this._cache.get(key);
        if (item) {
            this._cache.delete(key);
            this._cache.set(key, item);
            this._hits++;
            return item;
        }
        this._misses++;
        return undefined;
    }

    set(key, value) {
        if (this._cache.has(key)) {
            this._cache.delete(key);
        } else if (this._cache.size >= this._maxSize) {
            this._cache.delete(this._cache.keys().next().value);
        }
        this._cache.set(key, value);
    }

    has(key) {
        return this._cache.has(key);
    }

    delete(key) {
        return this._cache.delete(key);
    }

    clear() {
        this._cache.clear();
        this._hits = 0;
        this._misses = 0;
    }

    setMaxSize(size) {
        this._maxSize = size;
        while (this._cache.size > this._maxSize) {
            const oldestKey = this._cache.keys().next().value;
            this._cache.delete(oldestKey);
        }
    }

    getOldestKey() {
        return this._cache.keys().next().value;
    }

    setWithEviction(key, value) {
        let evictedKey = null;
        if (this._cache.has(key)) {
            this._cache.delete(key);
        } else if (this._cache.size >= this._maxSize) {
            evictedKey = this._cache.keys().next().value;
            this._cache.delete(evictedKey);
        }
        this._cache.set(key, value);
        return evictedKey;
    }
}
