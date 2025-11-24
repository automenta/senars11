/**
 * Common utility functions for the reasoner components
 * Now re-exports from main util/common.js
 */

export * from '../../util/common.js';

/**
 * Process a derivation by checking its depth against the maximum allowed depth
 * @param {object} result - The derivation result to check
 * @param {number} maxDerivationDepth - The maximum allowed derivation depth
 * @returns {object|null} The original result if valid, null if exceeds depth
 */
export function processDerivation(result, maxDerivationDepth) {
    if (!result?.stamp) return result;

    try {
        const derivationDepth = result.stamp.depth ?? 0;

        if (derivationDepth > maxDerivationDepth) {
            console.debug(`Discarding derivation - exceeds max depth (${derivationDepth} > ${maxDerivationDepth})`);
            return null;
        }

        return result;
    } catch (error) {
        console.debug('Error processing derivation:', error.message);
        return null;
    }
}
