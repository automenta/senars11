export const sortByProperty = (items, prop, desc = false) =>
    [...items].sort((a, b) => (desc ? (b[prop] || 0) - (a[prop] || 0) : (a[prop] || 0) - (b[prop] || 0)));

export const filterBy = (items, predicate) => items.filter(predicate);
export const findBy = (items, predicate) => items.find(predicate);

export const groupBy = (items, keyFn) =>
    items.reduce((groups, item) => ((groups[keyFn(item) || 'unknown'] ||= []).push(item), groups), {});

export const applyToAll = (items, fn) => items.forEach(fn);

export const createMap = (items, keyFn, valueFn = x => x) =>
    new Map(items.map(item => [keyFn(item), valueFn(item)]));

export const createSet = (items, keyFn = x => x) =>
    new Set(items.map(keyFn));

export const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

export const flatten = arrays => [].concat(...arrays);

export const calculateAverage = values => 
    !values?.length ? 0 : values.reduce((sum, val) => sum + val, 0) / values.length;

export const calculateStatistics = values => {
    if (!values?.length) return {mean: 0, median: 0, std: 0, min: 0, max: 0, count: 0};
    
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
    if (!values?.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(percentile * (sorted.length - 1));
    return sorted[index];
};

export const getOutliers = (values, threshold = 2) => {
    if (!values?.length) return [];
    
    const mean = calculateAverage(values);
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    return values.filter(value => Math.abs(value - mean) > threshold * std);
};

export const correlation = (values1, values2) => {
    if (!values1 || !values2 || values1.length !== values2.length || !values1.length) return 0;
    
    const n = values1.length;
    const avg1 = calculateAverage(values1);
    const avg2 = calculateAverage(values2);
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < n; i++) {
        const diff1 = values1[i] - avg1;
        const diff2 = values2[i] - avg2;
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
};

export const sum = values => values.reduce((acc, val) => acc + val, 0);
export const min = values => Math.min(...values);
export const max = values => Math.max(...values);
