import { createTypeFilter, createTextFilter, createCustomFilters, getNestedValue } from './filterUtils';
import { compareValues, sortByKey } from './sortUtils';
import { groupRelatedItems } from './groupUtils';
import { extractDisplayProperties, createDataDisplayElement, createDataSummary } from './displayUtils';
import { safeTransformData, paginateData, debounce, memoize, createSearchableCollection } from './utilityFunctions';

export const processDataWithFilters = (data, options = {}) => {
    const {
        filterType = 'all',
        filterText = '',
        sortKey = null,
        sortOrder = 'asc',
        typeField = 'type',
        searchFields = ['description', 'term'],
        customFilters = []
    } = options;

    const typeFilter = createTypeFilter(typeField, filterType);
    const textFilter = createTextFilter(searchFields, filterText);
    const customFilter = createCustomFilters(customFilters);

    let result = data.filter(typeFilter).filter(textFilter).filter(customFilter);

    if (sortKey) {
        result = sortByKey(result, sortKey, sortOrder);
    }

    return result;
};

export const process = (data, pipeline) => {
    if (typeof pipeline === 'function') {
        return pipeline(data);
    }
    return data;
};

export {
    createTypeFilter,
    createTextFilter,
    createCustomFilters,
    getNestedValue,
    compareValues,
    sortByKey,
    groupRelatedItems,
    extractDisplayProperties,
    createDataDisplayElement,
    createDataSummary,
    safeTransformData,
    paginateData,
    debounce,
    memoize,
    createSearchableCollection
};