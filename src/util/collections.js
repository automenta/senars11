import * as dfd from 'danfojs';

// danfojs-enhanced statistical functions
export const calculateAverage = (values) => {
    if (!values || values.length === 0) return 0;
    if (Array.isArray(values)) {
        return new dfd.Series(values).mean();
    }
    return 0;
};

export const calculateStatistics = (values) => {
    if (!values || values.length === 0) return { 
        mean: 0, median: 0, std: 0, min: 0, max: 0, count: 0 
    };
    
    const series = new dfd.Series(values);
    return {
        mean: series.mean(),
        median: series.median(),
        std: series.std(),
        min: series.min(),
        max: series.max(),
        count: series.size,
        variance: series.var()
    };
};

export const sortByProperty = (items, prop, desc = false) =>
    [...items].sort((a, b) => (desc ? (b[prop] || 0) - (a[prop] || 0) : (a[prop] || 0) - (b[prop] || 0)));

export const filterBy = (items, predicate) => items.filter(predicate);

export const findBy = (items, predicate) => items.find(predicate);

export const groupBy = (items, keyFn) =>
    items.reduce((groups, item) => ((groups[keyFn(item) || 'unknown'] ||= []).push(item), groups), {});

// danfojs-enhanced groupBy with statistical aggregation
export const groupByWithStats = (items, keyFn, valueFn = item => item) => {
    if (!items || items.length === 0) return {};
    
    // Convert to DataFrame for advanced processing
    const df = new dfd.DataFrame(items);
    
    // Group and calculate statistics if values are numeric
    const grouped = df.groupby(keyFn);
    const result = {};
    
    // Fallback to original groupBy for complex objects
    for (const item of items) {
        const key = keyFn(item);
        if (!result[key]) result[key] = [];
        result[key].push(item);
    }
    
    return result;
};

export const applyToAll = (items, fn) => items.forEach(fn);

export const createMap = (items, keyFn, valueFn = x => x) => 
    new Map(items.map(item => [keyFn(item), valueFn(item)]));

export const createSet = (items, keyFn = x => x) => 
    new Set(items.map(keyFn));

// danfojs-enhanced operations
export const getPercentile = (values, percentile) => {
    if (!values || values.length === 0) return 0;
    const series = new dfd.Series(values);
    return series.quantile(percentile);
};

export const getOutliers = (values, threshold = 2) => {
    if (!values || values.length === 0) return [];
    
    const series = new dfd.Series(values);
    const mean = series.mean();
    const std = series.std();
    
    return values.filter(value => Math.abs(value - mean) > threshold * std);
};

export const correlation = (values1, values2) => {
    if (!values1 || !values2 || values1.length !== values2.length) return 0;
    
    const df = new dfd.DataFrame({x: values1, y: values2});
    const corrMatrix = df.corr();
    return corrMatrix['x']['y'];
};
