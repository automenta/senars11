/**
 * Common utility functions for the reasoner components
 */

/**
 * Safely execute a function and return default value on error
 * @param {Function} fn - Function to execute
 * @param {*} defaultValue - Default value to return if error occurs
 * @param {*} args - Arguments to pass to the function
 * @returns {*} Result of function execution or default value
 */
export function safeExecute(fn, defaultValue, ...args) {
  try {
    return typeof fn === 'function' ? fn(...args) : defaultValue;
  } catch (error) {
    console.error('Error in safeExecute:', error);
    return defaultValue;
  }
}

/**
 * Create a deep clone of an object
 * @param {object} obj - Object to clone
 * @returns {object} Deep cloned object
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
 * Get nested property using dot notation
 * @param {object} obj - Object to get property from
 * @param {string} path - Path to property (e.g. 'a.b.c')
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or default
 */
export function getNestedProperty(obj, path, defaultValue = undefined) {
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
}

/**
 * Set nested property using dot notation
 * @param {object} obj - Object to set property on
 * @param {string} path - Path to property (e.g. 'a.b.c')
 * @param {*} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
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
}

/**
 * Asynchronous sleep function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create an async iterator that yields items with a delay
 * @param {Array} items - Items to iterate
 * @param {number} delay - Delay in ms between items
 * @returns {AsyncGenerator}
 */
export async function* asyncIteratorWithDelay(items, delay = 0) {
  for (const item of items) {
    if (delay > 0) await sleep(delay);
    yield item;
  }
}

/**
 * Merge configuration objects with defaults
 * @param {object} defaults - Default configuration
 * @param {object} overrides - Configuration overrides
 * @returns {object} Merged configuration
 */
export function mergeConfig(defaults, overrides = {}) {
  const result = { ...defaults };
  
  for (const [key, value] of Object.entries(overrides)) {
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
  
  return result;
}

/**
 * Generate a unique identifier
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a timestamp to a readable string
 * @param {number} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp = Date.now()) {
  return new Date(timestamp).toISOString();
}

/**
 * Check if an object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
export function isEmpty(obj) {
  return obj == null || 
         (typeof obj === 'object' && Object.keys(obj).length === 0) ||
         (Array.isArray(obj) && obj.length === 0);
}

/**
 * Create a promise-based timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Timeout message
 * @returns {Promise} Promise that rejects on timeout
 */
export function timeout(ms, message = 'Operation timed out') {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Race a promise against a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Timeout message
 * @returns {Promise} Promise that resolves or rejects based on race
 */
export async function withTimeout(promise, ms, message = 'Operation timed out') {
  return Promise.race([
    promise,
    timeout(ms, message)
  ]);
}