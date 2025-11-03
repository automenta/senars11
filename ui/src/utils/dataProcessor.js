/**
 * Data processing utilities - using optimized implementations from OptimizedDataProcessor
 * This file maintains backward compatibility while leveraging optimized functions
 */

import {
    createDataDisplayElement,
    createDataSummary,
    createSearchableCollection,
    extractDisplayProperties,
    getNestedValue,
    groupRelatedItems,
    process,
    processDataWithFilters,
    safeTransformData
} from './OptimizedDataProcessor.js';

export {
    processDataWithFilters,
    groupRelatedItems,
    extractDisplayProperties,
    createDataDisplayElement,
    createDataSummary,
    safeTransformData,
    createSearchableCollection,
    process,
    getNestedValue
};