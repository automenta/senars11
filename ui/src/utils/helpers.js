export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const isEmpty = (value) => (
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
);