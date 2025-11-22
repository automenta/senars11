import { formatNumberFixed } from './Format.js';

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const normalize = (val, max) => Math.min(val / max, 1);
export const isBetween = (val, min, max) => val >= min && val <= max;

export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch {
        return null;
    }
};

export const freeze = Object.freeze;
export const deepFreeze = obj => {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.getOwnPropertyNames(obj).forEach(prop => {
        obj[prop] !== null && typeof obj[prop] === 'object' && deepFreeze(obj[prop]);
    });
    return freeze(obj);
};

export const clampAndFreeze = (obj, min = 0, max = 1) =>
    typeof obj === 'number' ? freeze(clamp(obj, min, max)) :
        freeze(Object.fromEntries(Object.entries(obj).map(([k, v]) =>
            [k, typeof v === 'number' ? clamp(v, min, max) : v])));

export const mergeConfig = (base, ...overrides) =>
    freeze(Object.assign({}, base, ...overrides));

export const isNumber = val => typeof val === 'number' && !isNaN(val);
export const round = (val, decimals = 2) => Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
export const kebabCase = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const unique = arr => [...new Set(arr)];
export const isEmpty = arr => !arr || arr.length === 0;

export const safeGet = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return defaultValue;
        current = current[key];
    }
    return current !== undefined ? current : defaultValue;
};

export const deepClone = (obj) => {
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
};

export const formatNumber = (num, decimals = 2) => formatNumberFixed(num, decimals);

export const safeAsync = async (asyncFn, defaultValue = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error.message);
        return defaultValue;
    }
};
