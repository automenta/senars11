// Performance utilities

// Debounce function execution
export const debounce = (func, wait) => {
    let timeoutId = null;

    const debouncedFunc = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };

    debouncedFunc.cancel = () => {
        timeoutId && clearTimeout(timeoutId);
        timeoutId = null;
    };

    return debouncedFunc;
};

// Throttle function execution
export const throttle = (fn, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
};

// Memoize function results
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};
