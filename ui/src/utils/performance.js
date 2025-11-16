/**
 * Performance utility functions for optimizing component rendering
 * Following AGENTS.md: Performance Optimization with proper memoization
 */

/**
 * Fast deep equality check for objects with recursion protection
 * @param {*} obj1 - First object to compare
 * @param {*} obj2 - Second object to compare
 * @param {number} depth - Current recursion depth to prevent infinite loops
 * @param {number} maxDepth - Maximum allowed recursion depth
 * @returns {boolean} True if objects are deeply equal, false otherwise
 */
export const deepEqual = (obj1, obj2, depth = 0, maxDepth = 10) => {
    if (depth > maxDepth) return false;
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return obj1 === obj2;

    // If types are different
    if (typeof obj1 !== typeof obj2) return false;

    // If both are not objects, use direct comparison
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

    // Handle arrays
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key], depth + 1, maxDepth)) return false;
    }

    return true;
};

/**
 * Fast shallow equality check for objects
 * @param {*} obj1 - First object to compare
 * @param {*} obj2 - Second object to compare
 * @returns {boolean} True if objects are shallowly equal, false otherwise
 */
export const shallowEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;

    if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
    }

    return true;
};

/**
 * Memoized selector creator with configurable cache size to prevent unnecessary re-renders
 * @param {Function} selector - Function to extract data from state
 * @param {Function} isEqual - Equality function to compare arguments (default: deepEqual)
 * @param {number} maxCacheSize - Maximum number of cached results (default: 10)
 * @returns {Function} Memoized selector function
 */
export const createMemoizedSelector = (selector, isEqual = deepEqual, maxCacheSize = 10) => {
    let lastArgs = null;
    let lastResult = null;
    // Cache for multiple argument combinations
    const cache = new Map();

    return (...args) => {
        // Check argument cache first
        const argsKey = JSON.stringify(args.map(arg =>
            typeof arg === 'object' && arg !== null ? Object.keys(arg).sort() : arg
        ));

        if (cache.has(argsKey) && cache.size <= maxCacheSize) {
            const cached = cache.get(argsKey);
            if (isEqual(args, cached.args)) {
                return cached.result;
            }
        }

        // If not in cache or args changed, compute new result
        const result = selector(...args);

        // Update cache
        if (cache.size < maxCacheSize) {
            cache.set(argsKey, {args: [...args], result});
        } else {
            // Simple eviction: remove first entry
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
            cache.set(argsKey, {args: [...args], result});
        }

        return result;
    };
};

/**
 * Virtualized list rendering helper with optimized range calculation
 * @param {Array} items - Items to render
 * @param {Function} renderItem - Function to render each item
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {number} scrollTop - Current scroll top position
 * @param {number} overscan - Number of items to render beyond visible area (default: 5)
 * @returns {Object} Virtualized list configuration
 */
export const virtualizeList = (items, renderItem, itemHeight, containerHeight, scrollTop, overscan = 5) => {
    if (!items || !items.length) {
        return {visibleItems: [], translateY: 0, containerHeight, itemHeight, startIndex: 0, endIndex: -1};
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const translateY = startIndex * itemHeight;

    return {
        visibleItems,
        translateY,
        containerHeight,
        itemHeight,
        startIndex,
        endIndex,
        totalHeight: items.length * itemHeight
    };
};

/**
 * Measure render performance of a component with enhanced metrics
 * @param {string} componentName - Name of the component
 * @param {Function} renderFn - Function that renders the component
 * @param {Object} options - Additional options for performance monitoring
 * @param {boolean} options.enabled - Whether to enable monitoring (default: true in development)
 * @param {number} options.threshold - Threshold in ms above which to log (default: 16 for 60fps)
 * @returns {any} Rendered component with performance metrics
 */
export const withPerformanceMonitoring = (componentName, renderFn, options = {}) => {
    const {
        enabled = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
            (typeof import.meta !== 'undefined' && import.meta.env.VITE_TEST_MODE === 'true'),
        threshold = 16 // 60fps threshold
    } = options;

    if (!enabled) {
        return renderFn;
    }

    return (...args) => {
        const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const result = renderFn(...args);
        const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const renderTime = endTime - startTime;

        if (renderTime > threshold) {
            console.debug(`Render time for ${componentName}: ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`);
        }

        return result;
    };
};

/**
 * Debounce function with leading and trailing options
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @param {Object} options - Debounce options
 * @param {boolean} options.leading - Whether to call function on leading edge (default: false)
 * @param {boolean} options.trailing - Whether to call function on trailing edge (default: true)
 * @param {boolean} options.maxWait - Maximum time to wait before calling
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, options = {}) => {
    let timeoutId, lastCallTime;
    const {leading = false, trailing = true, maxWait} = options;
    let lastArgs, lastThis, result;

    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = undefined;
        lastCallTime = Date.now();
        result = func.apply(thisArg, args);
        return result;
    }

    function leadingEdge() {
        lastCallTime = Date.now();
        timeoutId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc() : result;
    }

    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        return wait - timeSinceLastCall;
    }

    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge();
        }
        timeoutId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge() {
        timeoutId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc();
        }
        lastArgs = lastThis = undefined;
        return result;
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        return (
            lastCallTime === undefined ||
            timeSinceLastCall >= wait ||
            (maxWait && timeSinceLastCall >= maxWait)
        );
    }

    const debounced = function (...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;

        if (isInvoking) {
            if (timeoutId === undefined) {
                return leadingEdge();
            }
            if (maxWait) {
                timeoutId = setTimeout(timerExpired, wait);
                return invokeFunc();
            }
        }
        if (timeoutId === undefined) {
            timeoutId = setTimeout(timerExpired, wait);
        }
        return result;
    };

    debounced.cancel = () => {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = lastCallTime = lastArgs = lastThis = undefined;
        }
    };

    return debounced;
};

/**
 * Throttle function with configurable options
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in ms
 * @param {Object} options - Throttle options
 * @param {boolean} options.leading - Whether to call function on leading edge (default: true)
 * @param {boolean} options.trailing - Whether to call function on trailing edge (default: true)
 * @returns {Function} Throttled function
 */
export const throttle = (func, wait, options = {}) => {
    let timeoutId, lastCallTime;
    const {leading = true, trailing = true} = options;
    let lastArgs, lastThis, result;

    function invokeFunc() {
        lastCallTime = Date.now();
        timeoutId = undefined;
        result = func.apply(lastThis, lastArgs);
        lastArgs = lastThis = undefined;
        return result;
    }

    function timerExpired() {
        invokeFunc();
    }

    function throttled(...args) {
        const time = Date.now();
        if (lastCallTime === undefined && !leading) {
            lastCallTime = time;
        }
        const timeSinceLastCall = time - lastCallTime;

        lastArgs = args;
        lastThis = this;

        if (timeSinceLastCall >= wait) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = undefined;
            }
            invokeFunc();
        } else if (trailing && timeoutId === undefined) {
            timeoutId = setTimeout(timerExpired, wait - timeSinceLastCall);
        }
        return result;
    }

    throttled.cancel = () => {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = lastCallTime = lastArgs = lastThis = undefined;
        }
    };

    return throttled;
};