export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const normalize = (value, max) => Math.min(value / max, 1);
export const isBetween = (value, min, max) => value >= min && value <= max;

export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch {
        return null;
    }
};

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

export const clampAndFreeze = (obj, min = 0, max = 1) =>
    typeof obj === 'number'
        ? freeze(clamp(obj, min, max))
        : freeze(Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key,
                typeof value === 'number' ? clamp(value, min, max) : value
            ])
        ));

export const mergeConfig = (base, ...overrides) => freeze({...base, ...Object.assign({}, ...overrides)});

export const isNumber = value => typeof value === 'number' && !isNaN(value);
export const round = (value, decimals = 2) => {
    if (!isNumber(value)) return 0;
    if (decimals < 0) decimals = 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

export const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
export const kebabCase = str => str ? str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : '';

export const unique = arr => {
    if (!arr || !Array.isArray(arr)) return [];
    return [...new Set(arr)];
};
export const isEmpty = arr => !arr?.length;

export const safeGet = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof obj !== 'object' || !path) return defaultValue;

    // Optimize for common case of single property
    if (!path.includes('.')) {
        return obj[path] ?? defaultValue;
    }

    return path.split('.').reduce((current, key) =>
        current?.[key] ?? defaultValue, obj) ?? defaultValue;
};

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    if (obj instanceof Set) return new Set([...obj].map(item => deepClone(item)));
    if (obj instanceof Map) return new Map([...obj].map(([key, value]) => [key, deepClone(value)]));

    // For regular objects, use a more efficient cloning approach
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};

export const formatNumber = (num, decimals = 2) => {
    if (!isNumber(num)) return String(num ?? '0');
    if (decimals < 0) decimals = 0;
    return num.toFixed(decimals);
};

export const safeAsync = async (asyncFn, defaultValue = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error?.message || error);
        return defaultValue;
    }
};

/**
 * Get process memory usage metrics
 * @returns {Object|null} Memory usage object or null if process.memoryUsage is not available
 */
export const getMemoryUsage = () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage();
    }
    return null;
};

/**
 * Get heap used memory in bytes, with fallback
 * @returns {number} Heap used memory in bytes or 0 if unavailable
 */
export const getHeapUsed = () => {
    const memUsage = getMemoryUsage();
    return memUsage?.heapUsed ?? 0;
};

/**
 * Check if running in a Node.js environment
 * @returns {boolean} True if running in Node.js, false otherwise
 */
export const isNodeEnvironment = () => typeof process !== 'undefined' && process.versions?.node;

/**
 * Check if running in a browser environment
 * @returns {boolean} True if running in browser, false otherwise
 */
export const isBrowserEnvironment = () => typeof window !== 'undefined';
