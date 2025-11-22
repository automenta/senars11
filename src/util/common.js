import { formatNumberFixed } from './Format.js';

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const normalize = (val, max) => Math.min(val / max, 1);
export const isBetween = (val, min, max) => val >= min && val <= max;

// Reverted to original signature for compatibility
export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch {
        return null;
    }
};

// New version with default value support
export const safeExecuteWithDefault = (fn, defaultValue, ...args) => {
    try {
        return typeof fn === 'function' ? fn(...args) : defaultValue;
    } catch (error) {
        console.error('Error in safeExecuteWithDefault:', error);
        return defaultValue;
    }
};

export const freeze = Object.freeze;
export const deepFreeze = obj => {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.getOwnPropertyNames(obj).forEach(prop => {
        obj[prop] !== null && typeof obj[prop] === 'object' && deepFreeze(obj[prop]);
    });
    return freeze(obj);
};

export const clampAndFreeze = (obj, min = 0, max = 1) =>
    typeof obj === 'number' ? freeze(clamp(obj, min, max)) :
        freeze(Object.fromEntries(Object.entries(obj).map(([k, v]) =>
            [k, typeof v === 'number' ? clamp(v, min, max) : v])));

// Original shallow mergeConfig
export const shallowMergeConfig = (base, ...overrides) =>
    freeze(Object.assign({}, base, ...overrides));

/**
 * Merge configuration objects with defaults
 * Supports both (defaults, overrides) and (defaults, ...overrides) patterns.
 * Uses deep merge for nested objects.
 */
export const mergeConfig = (defaults, ...overrides) => {
    // Handle case where defaults is undefined/null
    if (!defaults) {
        // If multiple overrides, merge them sequentially
        if (overrides.length > 0) {
            return overrides.reduce((acc, curr) => mergeConfig(acc, curr), {});
        }
        return {};
    }

    let result = {...defaults};

    for (const override of overrides) {
        if (!override) continue;

        for (const [key, value] of Object.entries(override)) {
            if (
                typeof result[key] === 'object' &&
                typeof value === 'object' &&
                result[key] !== null &&
                value !== null &&
                !Array.isArray(result[key]) &&
                !Array.isArray(value)
            ) {
                result[key] = mergeConfig(result[key], value);
            } else {
                result[key] = value;
            }
        }
    }

    return result;
};

export const isNumber = val => typeof val === 'number' && !isNaN(val);
export const round = (val, decimals = 2) => Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
export const kebabCase = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const unique = arr => [...new Set(arr)];
export const isEmpty = obj => {
    return obj == null ||
        (typeof obj === 'object' && Object.keys(obj).length === 0) ||
        (Array.isArray(obj) && obj.length === 0);
};

export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof path !== 'string') return defaultValue;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[key];
    }

    return current !== undefined ? current : defaultValue;
};
// Alias for backward compatibility
export const safeGet = getNestedProperty;

export const setNestedProperty = (obj, path, value) => {
    if (!obj || typeof path !== 'string') return;

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] == null) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
};

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};

export const formatNumber = (num, decimals = 2) => formatNumberFixed(num, decimals);

export const safeAsync = async (asyncFn, defaultValue = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error.message);
        return defaultValue;
    }
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function* asyncIteratorWithDelay(items, delay = 0) {
    for (const item of items) {
        if (delay > 0) await sleep(delay);
        yield item;
    }
}

export const generateId = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatTimestamp = (timestamp = Date.now()) => {
    return new Date(timestamp).toISOString();
};

export const timeout = (ms, message = 'Operation timed out') => {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
    });
};

export const withTimeout = async (promise, ms, message = 'Operation timed out') => {
    return Promise.race([
        promise,
        timeout(ms, message)
    ]);
};

export const processDerivation = (result, maxDerivationDepth) => {
    if (!result?.stamp) {
        // console.log('DEBUG: processDerivation - no stamp');
        return result;
    }

    try {
        const derivationDepth = result.stamp.depth ?? 0;

        if (derivationDepth > maxDerivationDepth) {
            // console.log(`DEBUG: processDerivation - depth exceeded: ${derivationDepth} > ${maxDerivationDepth}`);
            console.debug(`Discarding derivation - exceeds max depth (${derivationDepth} > ${maxDerivationDepth})`);
            return null;
        }
        // console.log(`DEBUG: processDerivation - accepted depth ${derivationDepth}`);
        return result;
    } catch (error) {
        console.debug('Error processing derivation:', error.message);
        return null;
    }
};
