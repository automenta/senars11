/**
 * Reasoning-specific utility functions.
 */

export const processDerivation = (result, maxDerivationDepth) => {
    if (!result?.stamp) return result;
    if ((result.stamp.depth ?? 0) > maxDerivationDepth) return null;
    return result;
};
