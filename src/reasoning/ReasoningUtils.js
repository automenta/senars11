/**
 * Common utilities for reasoning operations
 */

/**
 * Create batches of items
 */
export function createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}

/**
 * Split array into chunks
 */
export function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Flatten results from Promise.all operations
 */
export function flattenResults(results) {
    return results.flat();
}

/**
 * Safely apply a function that might throw an error
 */
export async function safeApply(fn, ...args) {
    try {
        return await fn(...args);
    } catch (error) {
        console.warn('Function application failed:', error);
        return [];
    }
}

/**
 * Check if all elements in an array satisfy a condition
 */
export function allSatisfy(array, predicate) {
    return array.every(predicate);
}

/**
 * Filter results, handling potential null/undefined values
 */
export function safeFilter(array, predicate) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.filter(item => item != null && predicate(item));
}

/**
 * Remove duplicate items from an array based on a key function
 */
export function removeDuplicates(items, keyFn) {
    const seen = new Set();
    const uniqueItems = [];

    for (const item of items) {
        const itemKey = keyFn ? keyFn(item) : (item.term ? item.term.toString() : JSON.stringify(item));
        if (!seen.has(itemKey)) {
            seen.add(itemKey);
            uniqueItems.push(item);
        }
    }

    return uniqueItems;
}

/**
 * Remove duplicates from task array based on task term representation
 */
export function removeDuplicateTasks(tasks) {
    return removeDuplicates(tasks, task => task.term ? task.term.toString() : JSON.stringify(task));
}