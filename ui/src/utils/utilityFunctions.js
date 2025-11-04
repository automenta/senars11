export const safeTransformData = (data, transformFn, errorHandler = null) => {
    try {
        return transformFn(data);
    } catch (error) {
        console.error('Error in data transformation:', error);
        return errorHandler?.(error) ?? data;
    }
};

export const paginateData = (data, page = 1, pageSize = 20) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize),
        hasNext: endIndex < data.length,
        hasPrev: startIndex > 0
    };
};

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

export const memoize = (func) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = func(...args);
        cache.set(key, result);
        return result;
    };
};

const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);

export const createSearchableCollection = (data, fields) => {
    // Ensure data is an array before calling map
    if (!Array.isArray(data)) {
        console.debug('createSearchableCollection: data is not an array, using empty array instead', data);
        data = [];
    }
    
    const searchIndex = new Map(data.map((item, index) => {
        const searchableText = fields.map(field => getNestedValue(item, field)).join(' ').toLowerCase();
        return [index, searchableText];
    }));

    return {
        search: (term) => {
            if (!term) return [...data]; // Return a copy of original data if no search term
            const lowercasedTerm = term.toLowerCase();
            const results = [];
            for (const [index, text] of searchIndex.entries()) {
                if (text.includes(lowercasedTerm)) {
                    results.push(data[index]);
                }
            }
            return results; // Always return an array
        }
    };
};