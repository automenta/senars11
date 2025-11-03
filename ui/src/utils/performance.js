/**
 * Performance utility functions for optimizing component rendering
 */

/**
 * Deep equality check for objects
 * @param {*} obj1 - First object to compare
 * @param {*} obj2 - Second object to compare
 * @returns {boolean} True if objects are deeply equal, false otherwise
 */
const deepEqual = (obj1, obj2) => {
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
 * Memoized selector creator to prevent unnecessary re-renders
 * @param {Function} selector - Function to extract data from state
 * @returns {Function} Memoized selector function
 */
export const createMemoizedSelector = (selector) => {
    let lastArgs = null;
    let lastResult = null;

    return (...args) => {
        if (!lastArgs || !deepEqual(lastArgs, args)) {
            lastArgs = args;
            lastResult = selector(...args);
        }
        return lastResult;
    };
};

/**
 * Virtualized list rendering helper
 * @param {Array} items - Items to render
 * @param {Function} renderItem - Function to render each item
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {number} startIndex - Index to start rendering from
 * @param {number} endIndex - Index to stop rendering at
 * @returns {Object} Virtualized list configuration
 */
export const virtualizeList = (items, renderItem, itemHeight, containerHeight, startIndex, endIndex) => {
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const translateY = startIndex * itemHeight;

    return {
        visibleItems,
        translateY,
        containerHeight,
        itemHeight,
        startIndex,
        endIndex
    };
};

/**
 * Measure render performance of a component
 * @param {string} componentName - Name of the component
 * @param {Function} renderFn - Function that renders the component
 * @returns {any} Rendered component with performance metrics
 */
export const withPerformanceMonitoring = (componentName, renderFn) => {
    return (...args) => {
        const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const result = renderFn(...args);
        const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

        if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
            (typeof import.meta !== 'undefined' && import.meta.env.VITE_TEST_MODE === 'true')) {
            console.debug(`Render time for ${componentName}: ${endTime - startTime}ms`);
        }

        return result;
    };
};