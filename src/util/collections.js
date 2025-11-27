export const sortByProperty = (items, prop, desc = false) => {
    // Handle edge cases
    if (!Array.isArray(items) || items.length === 0) return [];

    return [...items].sort((a, b) => {
        const aVal = a[prop] ?? 0;
        const bVal = b[prop] ?? 0;
        return desc ? bVal - aVal : aVal - bVal;
    });
};

export const filterBy = (items, predicate) => items.filter(predicate);
export const findBy = (items, predicate) => items.find(predicate);

export const groupBy = (items, keyFn) => {
    if (!Array.isArray(items) || items.length === 0) return {};

    return items.reduce((groups, item) => {
        const key = keyFn(item) ?? 'unknown';
        (groups[key] ??= []).push(item);
        return groups;
    }, {});
};

export const applyToAll = (items, fn) => items.forEach(fn);

export const createMap = (items, keyFn, valueFn = x => x) => {
    if (!Array.isArray(items)) return new Map();
    return new Map(items.map(item => [keyFn(item), valueFn(item)]));
};

export const createSet = (items, keyFn = x => x) => {
    if (!Array.isArray(items)) return new Set();
    return new Set(items.map(keyFn));
};

export const chunk = (array, size) => {
    if (!Array.isArray(array) || size <= 0) return [];

    return Array.from(
        { length: Math.ceil(array.length / size) },
        (_, i) => array.slice(i * size, i * size + size)
    );
};

export const flatten = arrays => {
    if (!Array.isArray(arrays)) return [];
    return arrays.flat();
};

export const calculateAverage = values => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStatistics = values => {
    if (!Array.isArray(values) || values.length === 0) {
        return {mean: 0, median: 0, std: 0, min: 0, max: 0, count: 0};
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const mean = calculateAverage(values);
    const min = sorted[0];
    const max = sorted[n - 1];
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {mean, median, std, min, max, count: n, variance};
};

export const getPercentile = (values, percentile) => {
    if (!Array.isArray(values) || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(percentile * (sorted.length - 1));
    return sorted[index];
};

export const getOutliers = (values, threshold = 2) => {
    if (!Array.isArray(values) || values.length === 0) return [];

    const mean = calculateAverage(values);
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    return values.filter(value => Math.abs(value - mean) > threshold * std);
};

export const correlation = (values1, values2) => {
    if (!Array.isArray(values1) || !Array.isArray(values2) ||
        values1.length !== values2.length || values1.length === 0) return 0;

    const avg1 = calculateAverage(values1);
    const avg2 = calculateAverage(values2);

    const diffs = values1.map((val, i) => ({
        diff1: val - avg1,
        diff2: values2[i] - avg2
    }));

    const numerator = diffs.reduce((sum, { diff1, diff2 }) => sum + diff1 * diff2, 0);
    const sumSq1 = diffs.reduce((sum, { diff1 }) => sum + diff1 * diff1, 0);
    const sumSq2 = diffs.reduce((sum, { diff2 }) => sum + diff2 * diff2, 0);

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
};

export const sum = values => {
    if (!Array.isArray(values)) return 0;
    return values.reduce((acc, val) => acc + val, 0);
};

export const min = values => {
    if (!Array.isArray(values) || values.length === 0) return Infinity;
    return Math.min(...values);
};

export const max = values => {
    if (!Array.isArray(values) || values.length === 0) return -Infinity;
    return Math.max(...values);
};
