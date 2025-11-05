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
    freeze(overrides.reduce((acc, cfg) => ({...acc, ...cfg}), {...base}));

export const isNumber = val => typeof val === 'number' && !isNaN(val);
export const round = (val, decimals = 2) => Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);

export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
export const kebabCase = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const unique = arr => [...new Set(arr)];
export const isEmpty = arr => !arr || arr.length === 0;
