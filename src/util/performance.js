export const debounce = (func, wait, immediate = false) => {
    let timeoutId = null;

    const debouncedFunc = (...args) => {
        const callNow = immediate && !timeoutId;
        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            timeoutId = null;
            !immediate && func.apply(this, args);
        }, wait);

        callNow && func.apply(this, args);
    };

    debouncedFunc.cancel = () => {
        timeoutId && clearTimeout(timeoutId);
        timeoutId = null;
    };

    debouncedFunc.flush = (...args) => {
        debouncedFunc.cancel();
        func.apply(this, args);
    };

    return debouncedFunc;
};

export const throttle = (fn, delay, options = {}) => {
    let lastCall = 0;
    let lastResult;

    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return lastResult = fn(...args);
        }

        if (options.trailing) {
            setTimeout(() => {
                const time = Date.now();
                if (time - lastCall >= delay) {
                    lastCall = time;
                    lastResult = fn(...args);
                }
            }, delay - (now - lastCall));
        }

        return lastResult;
    };
};

export const memoize = (fn, resolver = null) => {
    const cache = new Map();
    return (...args) => {
        const key = resolver ? resolver(...args) : JSON.stringify(args);
        return cache.has(key) ? cache.get(key) : (() => {
            const result = fn(...args);
            cache.set(key, result);
            return result;
        })();
    };
};

export const rateLimit = (fn, maxCalls, timeWindow) => {
    const calls = [];

    return (...args) => {
        const now = Date.now();
        while (calls.length > 0 && now - calls[0] > timeWindow) {
            calls.shift();
        }

        if (calls.length < maxCalls) {
            calls.push(now);
            return fn(...args);
        }

        throw new Error(`Rate limit exceeded: ${maxCalls} calls per ${timeWindow}ms`);
    };
};
