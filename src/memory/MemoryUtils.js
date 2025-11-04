/**
 * Memory utility functions for common operations
 */

/**
 * Get items from a map, returning a default Set if key doesn't exist
 */
export function getWithDefaultSet(map, key) {
    if (!map.has(key)) {
        map.set(key, new Set());
    }
    return map.get(key);
}

/**
 * Get items from a map, with ability to specify default value
 */
export function getOrDefault(map, key, defaultValue) {
    return map.get(key) || defaultValue;
}

/**
 * Get items from a map, creating and caching the default if needed
 */
export function getOrCreate(map, key, creatorFn) {
    if (!map.has(key)) {
        const value = creatorFn();
        map.set(key, value);
        return value;
    }
    return map.get(key);
}

/**
 * Safely add an item to a set in a map
 */
export function addToMapSet(map, key, item) {
    const set = getWithDefaultSet(map, key);
    set.add(item);
    return set;
}

/**
 * Safely remove an item from a set in a map
 */
export function removeFromMapSet(map, key, item) {
    if (map.has(key)) {
        const set = map.get(key);
        set.delete(item);
        if (set.size === 0) {
            map.delete(key); // Clean up empty sets
        }
    }
}

/**
 * Check if a map set contains an item
 */
export function hasInMapSet(map, key, item) {
    if (!map.has(key)) return false;
    return map.get(key).has(item);
}

/**
 * Get all items from multiple sets in a map
 */
export function getMultipleFromMap(map, keys) {
    const results = [];
    for (const key of keys) {
        if (map.has(key)) {
            results.push(...map.get(key));
        }
    }
    return results;
}