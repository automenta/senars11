/**
 * Consolidated Utility Functions: Core utilities following AGENTS.md guidelines
 * - DRY: Eliminates duplication across multiple files
 * - Organized: Well-structured and categorized functions
 * - Modular: Each section serves a specific purpose
 * - Terse: Uses efficient modern JavaScript patterns
 */

// ===== TIMING UTILITIES =====

/**
 * Debounce function to limit execution frequency
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately on first call
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
};

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function () {
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
 * Delay function for async operations
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== FORMATTING UTILITIES =====

/**
 * Format timestamp to time string
 * @param {number|string} timestamp - Unix timestamp or date string
 * @returns {string} Formatted time string
 */
export const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});

/**
 * Format timestamp to date-time string
 * @param {number|string} timestamp - Unix timestamp or date string
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (timestamp) =>
    new Date(timestamp).toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

/**
 * Format truth values for display
 * @param {Object} truth - Truth object with frequency and confidence
 * @returns {string} Formatted truth string
 */
export const formatTruth = (truth) => {
    if (!truth) return 'N/A';
    const frequency = (truth.frequency || 0) * 100;
    const confidence = (truth.confidence || 0) * 100;
    return `${frequency.toFixed(1)}% @ ${confidence.toFixed(1)}%`;
};

/**
 * Format budget values for display
 * @param {Object} budget - Budget object with priority, durability, quality
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
 * Format number with specified decimals
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimals = 2) =>
    num != null ? Number(num).toFixed(decimals) : 'N/A';

/**
 * Add commas to number for readability
 * @param {number} num - Number to format
 * @returns {string} Formatted number with commas
 */
export const formatNumberWithCommas = (num) =>
    num == null ? 'N/A' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Format large numbers with units (K, M, B)
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number with units
 */
export const formatNumberWithUnits = (num, decimals = 2) => {
    if (num == null) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
};

/**
 * Format value as percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
    if (value == null) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format duration in milliseconds to human-readable string
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

// ===== DATA UTILITIES =====

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    // Handle Date
    if (obj instanceof Date) {
        const copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }

    // Handle Object
    if (typeof obj === 'object') {
        const copy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = deepClone(obj[key]);
            }
        }
        return copy;
    }

    return obj;
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} Whether value is empty
 */
export const isEmpty = (value) =>
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0);

/**
 * Perform deep equality check between objects
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean} Whether objects are deeply equal
 */
export const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return false;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

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
 * Get nested property from object using dot notation
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or default
 */
export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
};

/**
 * Set nested property in object using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path to property
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
export const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (!(key in current) || current[key] === null || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
    return obj;
};

/**
 * Memoize function to cache results
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
 * Safe data transformation with error handling
 * @param {*} data - Input data to transform
 * @param {Function} transformFn - Transformation function
 * @param {Function} errorHandler - Error handler function
 * @returns {*} Transformed data or original data if error
 */
export const safeTransformData = (data, transformFn, errorHandler = null) => {
    try {
        return transformFn(data);
    } catch (error) {
        console.error('Error in data transformation:', error);
        return errorHandler?.(error) ?? data;
    }
};

/**
 * Create a searchable collection from data
 * @param {Array} data - Data array to index
 * @param {Array} fields - Fields to search in
 * @returns {Object} Searchable collection object with search method
 */
export const createSearchableCollection = (data, fields) => {
    // Ensure data is an array before calling map
    if (!Array.isArray(data)) {
        console.debug('createSearchableCollection: data is not an array, using empty array instead', data);
        data = [];
    }

    const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);

    const searchIndex = new Map(data.map((item, index) => {
        const searchableText = fields.map(field => getNestedValue(item, field)).join(' ').toLowerCase();
        return [index, searchableText];
    }));

    return {
        search: (term) => {
            if (!term) return [...data]; // Return a copy of original data if no search term
            const lowercasedTerm = term.toLowerCase();
            const results = [];
            for (const [index, text] of searchIndex.entries()) {
                if (text.includes(lowercasedTerm)) {
                    results.push(data[index]);
                }
            }
            return results; // Always return an array
        }
    };
};

/**
 * Paginate data array
 * @param {Array} data - Array to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Paginated data with metadata
 */
export const paginateData = (data, page = 1, pageSize = 20) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize),
        hasNext: endIndex < data.length,
        hasPrev: startIndex > 0
    };
};

/**
 * Generate unique ID
 * @returns {string} Unique identifier string
 */
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;