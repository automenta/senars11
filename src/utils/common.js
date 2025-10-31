/**
 * Shared utility functions for SeNARS application
 * Used by both UI and server-side scripts
 */

/**
 * Format truth values (frequency and confidence)
 * @param {Object} truth - Truth object with frequency and confidence properties
 * @returns {string} Formatted truth string
 */
export const formatTruth = (truth) => {
    if (!truth) return 'N/A';
    const frequency = (truth.frequency || 0) * 100;
    const confidence = (truth.confidence || 0) * 100;
    return `${frequency.toFixed(1)}% @ ${confidence.toFixed(1)}%`;
};

/**
 * Format budget values (priority, durability, quality)
 * @param {Object} budget - Budget object with priority, durability, and quality properties
 * @returns {string} Formatted budget string
 */
export const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    const priority = budget.priority || 0;
    const durability = budget.durability || 0;
    const quality = budget.quality || 0;
    return `P:${priority.toFixed(2)} D:${durability.toFixed(2)} Q:${quality.toFixed(2)}`;
};

/**
 * Format a timestamp to a readable time string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
export const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleTimeString();

/**
 * Format a timestamp in a more readable way
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatDateLong = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
};

/**
 * Format a duration in milliseconds to a human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (ms) => {
    if (ms < 0) ms = 0;
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days) return `${days}d ${hours % 24}h`;
    if (hours) return `${hours}h ${minutes % 60}m`;
    if (minutes) return `${minutes}m ${seconds % 60}s`;
    if (seconds) return `${seconds}s`;
    return `${ms}ms`;
};

/**
 * Truncate a string to a specified length with an ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length of the string
 * @param {string} suffix - Suffix to add to truncated string
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength, suffix = '...') => {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength) + suffix;
};

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
};

/**
 * Check if an object is empty
 * @param {any} obj - Object to check
 * @returns {boolean} True if empty, false otherwise
 */
export const isEmpty = (obj) => {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.trim().length === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
};

/**
 * Deep equality check between two values
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} True if objects are deeply equal
 */
export const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return obj1 === obj2;
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
};

/**
 * Get a nested property from an object using a path string (e.g. 'user.profile.name')
 * @param {Object} obj - Object to get property from
 * @param {string} path - Path to the property
 * @param {any} defaultValue - Default value if property doesn't exist
 * @returns {any} Property value or default
 */
export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
};

/**
 * Set a nested property on an object using a path string (e.g. 'user.profile.name')
 * @param {Object} obj - Object to set property on
 * @param {string} path - Path to the property
 * @param {any} value - Value to set
 */
export const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || current[key] === null || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
};

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Delay execution for a specified time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Memoize a function to cache results
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * Validate if a string is valid Narsese syntax
 * @param {string} str - String to validate
 * @returns {boolean} True if valid Narsese, false otherwise
 */
export const isValidNarsese = (str) => {
    if (typeof str !== 'string') return false;
    
    // Simple validation for common Narsese patterns
    // This is a basic check, a full parser would be more complex
    const narsesePattern = /^[\w\s<>().!?<->=]+$/;
    
    // Check for balanced brackets and valid operators
    const openAngleCount = (str.match(/</g) || []).length;
    const closeAngleCount = (str.match(/>/g) || []).length;
    const hasValidOperator = /-->/.test(str) || /<->/.test(str) || /=>/.test(str) || /<=/.test(str);
    
    return narsesePattern.test(str) && 
           openAngleCount === closeAngleCount && 
           (hasValidOperator || str.match(/[.!?]$/));
};

/**
 * Extract term from a Narsese statement
 * @param {string} narsese - Narsese statement
 * @returns {string} Extracted term or empty string
 */
export const extractTerm = (narsese) => {
    if (!narsese || typeof narsese !== 'string') return '';
    
    // Match terms inside angle brackets
    const matches = narsese.match(/<([^>]+)>/);
    if (matches && matches[1]) {
        // Extract the first term (before any operator)
        return matches[1].split(' ')[0].trim();
    }
    
    // If no angle brackets, return the whole string without punctuation
    return narsese.replace(/[.!?]+$/, '').trim();
};

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed object or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON parsing error:', error.message, 'Input:', jsonString);
        return defaultValue;
    }
};

/**
 * Format a number with specified decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimals = 2) =>
    num?.toFixed(decimals) || 'N/A';

/**
 * Format a percentage value
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
    if (value == null) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
};