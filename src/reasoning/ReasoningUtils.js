/**
 * Common utilities for reasoning operations
 */

export function createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}

export const chunkArray = createBatches;

export function flattenResults(results) {
    return results.flat();
}

export async function safeApply(fn, ...args) {
    try {
        return await fn(...args);
    } catch (error) {
        console.warn('Function application failed:', error);
        return [];
    }
}

export function allSatisfy(array, predicate) {
    return array.every(predicate);
}

export function safeFilter(array, predicate) {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item != null && predicate(item));
}

export function removeDuplicates(items, keyFn) {
    const seen = new Set();
    return items.filter(item => {
        const itemKey = keyFn ? keyFn(item) : (item.term ? item.term.toString() : JSON.stringify(item));
        if (seen.has(itemKey)) return false;
        seen.add(itemKey);
        return true;
    });
}

export function removeDuplicateTasks(tasks) {
    return removeDuplicates(tasks, task => task.term?.toString() || JSON.stringify(task));
}