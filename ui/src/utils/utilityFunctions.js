/**
 * Utility Functions for SeNARS UI
 * Contains commonly used utility functions
 */

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
 * Memoize function to cache results
 * @param {Function} func - Function to memoize
 * @param {Function} resolver - Function to resolve cache key (optional)
 * @returns {Function} Memoized function
 */
export const memoize = (func, resolver) => {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function');
    }
    const memoized = function (...args) {
        const key = resolver ? resolver.apply(this, args) : args[0];
        const cache = memoized.cache;

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = func.apply(this, args);
        cache.set(key, result);
        return result;
    };
    memoized.cache = new Map();
    return memoized;
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
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
};

const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);

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