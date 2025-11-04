/**
 * Memory utility functions for common operations
 */

/**
 * Get items from a map, returning a default Set if key doesn't exist
 */
export function getWithDefaultSet(map, key) {
    return map.get(key) ?? map.set(key, new Set()).get(key);
}

/**
 * Get items from a map, with ability to specify default value
 */
export function getOrDefault(map, key, defaultValue) {
    return map.get(key) ?? defaultValue;
}

/**
 * Get items from a map, creating and caching the default if needed
 */
export function getOrCreate(map, key, creatorFn) {
    return map.get(key) ?? map.set(key, creatorFn()).get(key);
}

/**
 * Safely add an item to a set in a map
 */
export function addToMapSet(map, key, item) {
    return getWithDefaultSet(map, key).add(item);
}

/**
 * Safely remove an item from a set in a map
 */
export function removeFromMapSet(map, key, item) {
    const set = map.get(key);
    if (set) {
        set.delete(item);
        if (set.size === 0) map.delete(key); // Clean up empty sets
    }
}

/**
 * Check if a map set contains an item
 */
export function hasInMapSet(map, key, item) {
    const set = map.get(key);
    return set?.has(item) ?? false;
}

/**
 * Get all items from multiple sets in a map
 */
export function getMultipleFromMap(map, keys) {
    return keys.flatMap(key => map.get(key) ?? []);
}