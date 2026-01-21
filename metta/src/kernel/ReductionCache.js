/**
 * Reduction Result Caching
 * Q5: Wraps SeNARS TermCache for reduction memoization
 * 
 * Key optimization: Cache frequently reduced subexpressions
 * Dramatically speeds up repeated computations (e.g., recursive functions)
 */

import { TermCache } from '../../../core/src/term/TermCache.js';
import { METTA_CONFIG } from '../config.js';

// Shared cache for reduction results
let reductionCache = null;

/**
 * Initialize reduction cache
 */
export function initReductionCache() {
    if (METTA_CONFIG.caching && !reductionCache) {
        reductionCache = new TermCache({
            maxSize: METTA_CONFIG.maxCacheSize
        });
    }
}

/**
 * Get cached reduction result
 * @param {object} atom - The atom to lookup
 * @returns {object|null} Cached result or null
 */
export function getCachedReduction(atom) {
    if (!METTA_CONFIG.caching || !reductionCache) {
        return null;
    }

    // Use atom's string representation as cache key
    // (or _hash if available for faster lookup)
    const key = atom._hash || atom.toString();
    return reductionCache.get(key);
}

/**
 * Cache a reduction result
 * @param {object} atom - The original atom
 * @param {object} result - The reduction result
 */
export function cacheReduction(atom, result) {
    if (!METTA_CONFIG.caching || !reductionCache) {
        return;
    }

    const key = atom._hash || atom.toString();
    reductionCache.setWithEviction(key, result);
}

/**
 * Clear reduction cache (for testing)
 */
export function clearReductionCache() {
    if (reductionCache) {
        reductionCache.clear();
    }
}

/**
 * Get reduction cache statistics
 */
export function getReductionCacheStats() {
    if (!reductionCache) {
        return { enabled: false };
    }

    return {
        enabled: METTA_CONFIG.caching,
        size: reductionCache.size,
        ...reductionCache.stats
    };
}

// Initialize on module load
initReductionCache();
