export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const normalize = (value, max) => Math.min(value / max, 1);
export const isBetween = (value, min, max) => value >= min && value <= max;

export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch {
        return null;
    }
};

export const freeze = Object.freeze;

export const deepFreeze = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
            deepFreeze(obj[prop]);
        }
    });

    return freeze(obj);
};

export const clampAndFreeze = (obj, min = 0, max = 1) =>
    typeof obj === 'number'
        ? freeze(clamp(obj, min, max))
        : freeze(Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key,
                typeof value === 'number' ? clamp(value, min, max) : value
            ])
        ));

export const mergeConfig = (base, ...overrides) => freeze({...base, ...Object.assign({}, ...overrides)});

export const isNumber = value => typeof value === 'number' && !isNaN(value);
export const round = (value, decimals = 2) => Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);

export const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
export const kebabCase = str => str?.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() ?? '';

export const unique = arr => [...new Set(arr)];
export const isEmpty = arr => !arr?.length;

export const safeGet = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = path?.split('.') ?? [];
    let current = obj;

    for (const key of keys) {
        if (current == null || typeof current !== 'object') return defaultValue;
        current = current[key];
    }

    return current ?? defaultValue;
};

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));

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

export const formatNumber = (num, decimals = 2) =>
    typeof num === 'number' ? num.toFixed(decimals) : String(num ?? '0');

export const safeAsync = async (asyncFn, defaultValue = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        console.error('Error in safeAsync:', error?.message || error);
        return defaultValue;
    }
};
