/**
 * Index utilities for MemoryIndex operations
 */

export class IndexUtils {
    static addToIndex(indexes, index, key, value) {
        if (!indexes[index].has(key)) {
            indexes[index].set(key, new Set());
        }
        indexes[index].get(key).add(value);
    }

    static removeFromIndex(indexes, index, key, value) {
        if (indexes[index].has(key)) {
            const set = indexes[index].get(key);
            set.delete(value);
            if (set.size === 0) {
                indexes[index].delete(key);
            }
        }
    }

    static addMultipleToIndex(indexes, indexEntries) {
        for (const {index, key, value} of indexEntries) {
            IndexUtils.addToIndex(indexes, index, key, value);
        }
    }

    static removeMultipleFromIndex(indexes, indexEntries) {
        for (const {index, key, value} of indexEntries) {
            IndexUtils.removeFromIndex(indexes, index, key, value);
        }
    }
}