/**
 * Common utility functions.
 * Consolidates functionality from various utility files.
 */

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const normalize = (value, max) => Math.min(value / max, 1);

export const freeze = Object.freeze;

export const deepFreeze = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
            deepFreeze(obj[prop]);
        }
    });

    return freeze(obj);
};

export const isNumber = value => typeof value === 'number' && !isNaN(value);

export const round = (value, decimals = 2) => Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);

export const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const kebabCase = str => str?.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() ?? '';

export const unique = arr => [...new Set(arr)];

export const isEmpty = obj =>
    obj == null ||
    (typeof obj === 'object' && Object.keys(obj).length === 0) ||
    (Array.isArray(obj) && obj.length === 0);

export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof path !== 'string') return defaultValue;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current == null) return defaultValue;
        current = current[key];
    }

    return current === undefined ? defaultValue : current;
};

// Alias for backward compatibility (renamed from safeGet)
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
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));

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

export const formatNumber = (num, decimals = 2) =>
    typeof num === 'number' ? num.toFixed(decimals) : String(num ?? '0');

export const safeAsync = async (asyncFn, defaultValue = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error?.message || error);
        return defaultValue;
    }
};

export const safeExecute = (fn, defaultValue = null, ...args) => {
    try {
        return typeof fn === 'function' ? fn(...args) : defaultValue;
    } catch (error) {
        console.error('Error in safeExecute:', error?.message || error);
        return defaultValue;
    }
};

export const sortByProperty = (items, prop, desc = false) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    return [...items].sort((a, b) => {
        const aVal = a[prop] ?? 0;
        const bVal = b[prop] ?? 0;
        return desc ? bVal - aVal : aVal - bVal;
    });
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const timeout = (ms, message = 'Operation timed out') =>
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

export const withTimeout = (promise, ms, message) => Promise.race([promise, timeout(ms, message)]);

export const generateId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const formatTimestamp = (timestamp = Date.now()) => new Date(timestamp).toISOString();

export async function* asyncIteratorWithDelay(items, delay = 0) {
    for (const item of items) {
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        yield item;
    }
}

const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

const deepMergeOne = (target, source) => {
    if (!isObject(target) || !isObject(source)) {
        return source === undefined ? target : source;
    }

    const output = {...target};
    for (const key of Object.keys(source)) {
        if (isObject(source[key]) && key in target) {
            output[key] = deepMergeOne(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
};

export const mergeConfig = (defaults, ...overrides) => {
    let result = deepClone(defaults);
    for (const override of overrides) {
         if (override) {
             result = deepMergeOne(result, override);
         }
    }
    return result;
};
