export const getNestedProperty = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof path !== 'string') return defaultValue;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result == null) return defaultValue;
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
};


export const isFunction = (value) => typeof value === 'function';

export const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);


export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        return Object.keys(obj).reduce((cloned, key) => {
            cloned[key] = deepClone(obj[key]);
            return cloned;
        }, {});
    }
    return obj;
};

export const capitalizeFirst = (str) => str ? `${str.charAt(0).toUpperCase()}${str.slice(1)}` : '';


export const safeExecute = (fn, ...args) => {
    if (!isFunction(fn)) return undefined;
    try {
        return fn(...args);
    } catch (error) {
        console.error('Error executing function:', error);
        return undefined;
    }
};


export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};


export const generateId = (prefix = '') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));


export const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};