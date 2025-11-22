export class Bag {
    constructor(name, capacity = 100) {
        this.name = name;
        this.capacity = capacity;
        this.items = []; // Array of {key, item, priority}
        this.itemMap = new Map();
    }

    put(key, item, priority) {
        if (this.itemMap.has(key)) {
            // Update priority?
            const existing = this.itemMap.get(key);
            // existing.priority = Math.max(existing.priority, priority);
            // For simplicity in "Lean", we replace or ignore.
            return;
        }

        if (this.items.length >= this.capacity) {
            this._evict();
        }

        const entry = {key, item, priority};
        this.items.push(entry);
        this.itemMap.set(key, entry);
        this._sort();
    }

    take() {
        if (this.items.length === 0) return null;
        // Naive: Return highest priority
        // NARS Bag: Probabilistic.
        // "Hello World" requires Determinism mostly for tests.
        // I'll return highest priority for now (Queue behavior).
        return this.items.shift()?.item;
    }

    select() {
        // Peek highest
        return this.items[0]?.item;
    }

    _sort() {
        this.items.sort((a, b) => b.priority - a.priority);
    }

    _evict() {
        // Remove lowest priority
        const evicted = this.items.pop();
        if (evicted) {
            this.itemMap.delete(evicted.key);
        }
    }

    size() {
        return this.items.length;
    }
}
