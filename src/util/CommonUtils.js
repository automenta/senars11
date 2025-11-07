/**
 * Common utilities for SeNARS Self-Analyzer
 */

/**
 * Safely accesses nested properties of an object
 * @param {Object} obj - The object to access
 * @param {string} path - Dot notation path (e.g., 'a.b.c')
 * @param {*} defaultValue - Value to return if path doesn't exist
 * @returns {*} The value at the path or defaultValue
 */
export function safeGet(obj, path, defaultValue = undefined) {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current == null || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

/**
 * Ensures a value is within specified bounds
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Creates a deep clone of an object
 * @param {*} obj - Object to clone
 * @returns {*} Deep clone of the object
 */
export function deepClone(obj) {
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
}

/**
 * Formats a number to a specified number of decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number as string
 */
export function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number') return num?.toString() || '0';
    return num.toFixed(decimals);
}

/**
 * Safely executes an async function with error handling
 * @param {Function} asyncFn - The async function to execute
 * @param {*} defaultValue - Value to return if the function fails
 * @returns {Promise<*>} Result of the function or default value
 */
export async function safeAsync(asyncFn, defaultValue = null) {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error.message);
        return defaultValue;
    }
}

/**
 * Debounces a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Groups an array of objects by a property
 * @param {Array} array - Array to group
 * @param {string|Function} key - Property name or function to get the key
 * @returns {Object} Object with grouped values
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        (result[group] = result[group] || []).push(item);
        return result;
    }, {});
}

/**
 * Flattens a nested array
 * @param {Array} arr - Array to flatten
 * @returns {Array} Flattened array
 */
export function flatten(arr) {
    return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
}