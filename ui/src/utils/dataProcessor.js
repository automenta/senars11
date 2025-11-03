/**
 * Data processing utilities - using optimized implementations from OptimizedDataProcessor
 * This file maintains backward compatibility while leveraging optimized functions
 */

import {
  processDataWithFilters,
  groupRelatedItems,
  extractDisplayProperties,
  createDataDisplayElement,
  createDataSummary,
  safeTransformData,
  createSearchableCollection,
  process,
  getNestedValue
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