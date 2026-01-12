/**
 * MemoizationCache.js
 * 
 * Implements an AIKR-compliant cache (Assumption of Insufficient Knowledge Resources).
 * 
 * Features:
 * 1. WeakMap for Key Lookup: Uses the Term object itself as the key.
 *    - Benefit: If the Term is GC'd by the JS engine (because it's no longer reachable in the Space),
 *      the cache entry automatically disappears. No manual cleanup needed for dead keys.
 * 
 * 2. Fixed Capacity (LRU) for Values:
 *    - To prevent infinite memory growth from *reachable* terms, we enforce a strict capacity limit.
 *    - We use a Doubly Linked List (DLL) to track access order (Least Recently Used).
 * 
 * 3. Lazy Eviction:
 *    - When the cache is full, we remove the LRU node from the DLL and nullify its `value`.
 *    - We do NOT remove the entry from the WeakMap (because we can't iterate it to find the key).
 *    - The WeakMap entry remains as a "ghost" node (isEvicted=true).
 *    - If a "ghost" node is accessed later, it's treated as a cache MISS, but we can reuse the node wrapper.
 */

class CacheNode {
    constructor(value) {
        this.value = value;
        this.prev = null;
        this.next = null;
        this.isEvicted = false;
    }
}

class DoublyLinkedList {
    constructor() {
        this.head = null; // Most Recently Used
        this.tail = null; // Least Recently Used
        this.size = 0;
    }

    addToHead(node) {
        if (this.head === node) return; // Already at head

        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;

        if (this.tail === node) {
            this.tail = node.prev;
        }

        node.prev = null;
        node.next = this.head;

        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }

        // If node was new (not in list), increment size
        if (this.size === 0 && this.head === this.tail) {
            // Logic handled by caller usually, but simplified here:
            // This method assumes node is either new or being moved.
            // If strictly new, caller increments.
        }
    }

    removeNode(node) {
        if (node.prev) node.prev.next = node.next;
        else this.head = node.next;

        if (node.next) node.next.prev = node.prev;
        else this.tail = node.prev;

        node.prev = null;
        node.next = null;
    }

    removeTail() {
        if (!this.tail) return null;
        const node = this.tail;
        this.removeNode(node);
        return node;
    }
}

export class MemoizationCache {
    /**
     * @param {number} capacity - Maximum number of strong references to hold.
     */
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.map = new WeakMap(); // Term -> CacheNode
        this.lru = new DoublyLinkedList(); // Tracks order of *valid* values
        this.size = 0;

        // Metrics
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }

    /**
     * Get a cached value for a Term.
     * @param {object} term - The Term object (must be an object, not primitive).
     * @returns {any|undefined} The cached value, or undefined if missing/evicted.
     */
    get(term) {
        if (!term || typeof term !== 'object') return undefined;

        const node = this.map.get(term);

        if (node && !node.isEvicted) {
            this.hits++;
            this.lru.addToHead(node); // Move to MRU
            return node.value;
        }

        this.misses++;
        return undefined;
    }

    /**
     * Cache a value for a Term.
     * @param {object} term - The Term key.
     * @param {any} value - The value to cache.
     */
    set(term, value) {
        if (!term || typeof term !== 'object') return;

        let node = this.map.get(term);

        if (node) {
            // Update existing (potentially resurrected) node
            if (node.isEvicted) {
                // Resurrecting a ghost node
                node.isEvicted = false;
                node.value = value;
                this.lru.addToHead(node);
                this.size++;
            } else {
                // Updating active node
                node.value = value;
                this.lru.addToHead(node);
            }
        } else {
            // New entry
            node = new CacheNode(value);
            this.map.set(term, node);
            this.lru.addToHead(node);
            this.size++;
        }

        // Enforce Capacity
        if (this.size > this.capacity) {
            this.evict();
        }
    }

    evict() {
        const tail = this.lru.removeTail();
        if (tail) {
            tail.value = null; // Release strong reference
            tail.isEvicted = true; // Mark as ghost
            this.size--;
            this.evictions++;
        }
    }

    /**
     * Clear the cache manually.
     * Note: Cannot clear WeakMap, but can release all values.
     */
    clear() {
        let node = this.lru.head;
        while (node) {
            node.value = null;
            node.isEvicted = true;
            node = node.next;
        }
        this.lru = new DoublyLinkedList();
        this.size = 0;
    }

    getStats() {
        return {
            size: this.size,
            capacity: this.capacity,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions
        };
    }
}
