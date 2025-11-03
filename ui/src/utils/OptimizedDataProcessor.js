// Optimized data processing with filtering, sorting, and custom filters
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

  // Create filter functions with memoization for performance
  const typeFilter = createTypeFilter(typeField, filterType);
  const textFilter = createTextFilter(searchFields, filterText);
  const customFilter = createCustomFilters(customFilters);

  // Apply filters in sequence for efficiency
  let result = data.filter(typeFilter).filter(textFilter).filter(customFilter);

  // Apply sorting if specified
  if (sortKey) {
    result.sort((a, b) => {
      const comparison = compareValues(a[sortKey], b[sortKey]);
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return result;
};

const createTypeFilter = (typeField, filterType) => 
  filterType === 'all' 
    ? () => true 
    : (item) => item[typeField] && item[typeField].toLowerCase() === filterType.toLowerCase();

const createTextFilter = (searchFields, filterText) => {
  if (!filterText.trim()) return () => true;
  const searchText = filterText.toLowerCase();
  const searchRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  
  return (item) => 
    searchFields.some(field => {
      const value = getNestedValue(item, field);
      if (!value) return false;
      const stringValue = String(value).toLowerCase();
      return stringValue.includes(searchText);
    });
};

const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);

const createCustomFilters = (customFilters = []) => {
  if (!customFilters.length) return () => true;
  
  return (item) => customFilters.every(filter => {
    // If filter is a function, call it directly
    if (typeof filter === 'function') {
      return filter(item);
    }
    // If filter is an object with test function
    if (filter && typeof filter.test === 'function') {
      return filter.test(item);
    }
    // If filter is an object with property and value to test
    if (filter && filter.property && filter.value !== undefined) {
      const itemValue = getNestedValue(item, filter.property);
      if (filter.matcher) {
        return filter.matcher(itemValue, filter.value);
      }
      return itemValue === filter.value;
    }
    return true;
  });
};

/**
 * Value comparison helper for sorting
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {number} - Comparison result (-1, 0, 1)
 */
const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const typeA = typeof a;
  const typeB = typeof b;
  
  if (typeA === typeB) {
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeA === 'string') return a.toLowerCase().localeCompare(b.toLowerCase());
    if (typeA === 'number') return a - b;
  }
  
  return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
};

export const createSearchableCollection = (data, fields) => {
  const searchIndex = new Map(data.map((item, index) => {
    const searchableText = fields.map(field => getNestedValue(item, field)).join(' ').toLowerCase();
    return [index, searchableText];
  }));

  return {
    search: (term) => {
      const lowercasedTerm = term.toLowerCase();
      const results = [];
      for (const [index, text] of searchIndex.entries()) {
        if (text.includes(lowercasedTerm)) {
          results.push(data[index]);
        }
      }
      return results;
    }
  };
};

export const process = (data, pipeline) => {
  if (typeof pipeline === 'function') {
    return pipeline(data);
  }
  return data;
};

/**
 * Abstract function to group related items based on common properties
 * @param {Array} items - Items to group
 * @param {string} groupingStrategy - Strategy to use for grouping
 * @returns {Array} - Grouped result array
 */
export const groupRelatedItems = (items, groupingStrategy = 'timestamp') => {
  const groupingStrategies = {
    // Group by time intervals
    timestamp: (items) => {
      const groupedByTime = new Map();
      items.forEach(item => {
        const timestamp = item.timestamp || item.creationTime || Date.now();
        const interval = Math.floor(timestamp / 10000); // 10-second intervals
        if (!groupedByTime.has(interval)) {
          groupedByTime.set(interval, []);
        }
        groupedByTime.get(interval).push(item);
      });
      return Array.from(groupedByTime.values()).flat();
    },
    
    // Group by type
    type: (items) => {
      const groupedByType = new Map();
      items.forEach(item => {
        const type = item.type || 'unknown';
        if (!groupedByType.has(type)) {
          groupedByType.set(type, []);
        }
        groupedByType.get(type).push(item);
      });
      return Array.from(groupedByType.values()).flat();
    },
    
    // Placeholder for relationship grouping
    relationship: (items) => items
  };

  return groupingStrategies[groupingStrategy]?.(items) ?? items;
};

/**
 * Function to extract common properties for display
 * @param {Object} item - Item to extract properties from
 * @param {Array} propertyList - List of properties to extract
 * @returns {Object} - Extracted properties object
 */
export const extractDisplayProperties = (item, propertyList = ['id', 'term', 'type', 'timestamp']) => 
  propertyList.reduce((acc, prop) => {
    if (item[prop] !== undefined) acc[prop] = item[prop];
    return acc;
  }, {});

/**
 * Factory function for creating display elements optimized for different types
 * @param {Object} React - React object
 * @param {Object} item - Item to create display for
 * @param {Object} options - Display options
 * @returns {ReactElement} - Created display element
 */
export const createDataDisplayElement = (React, item, options = {}) => {
  const {
    displayType = 'default',
    onClick = null,
    isCompact = false,
    showDetails = true
  } = options;

  const elementStyle = getDisplayStyles(displayType, isCompact);
  const content = createDisplayContent(React, item, displayType, showDetails);

  return React.createElement('div', {
    key: item.id || item.term || Date.now(),
    style: elementStyle,
    onClick
  }, ...content);
};

/**
 * Get appropriate styles based on display type
 * @param {string} displayType - Type of display
 * @param {boolean} isCompact - Whether to use compact styling
 * @returns {Object} - Style object
 */
const getDisplayStyles = (displayType, isCompact) => {
  const typeSpecificStyles = {
    reasoningStep: { backgroundColor: '#f8f9ff', border: '1px solid #b8daff' },
    task: { backgroundColor: '#f0f8f0', border: '1px solid #c3e6c3' },
    default: {}
  };

  return {
    padding: isCompact ? '0.25rem 0.5rem' : '0.5rem',
    margin: '0.25rem 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.85rem',
    ...(isCompact && { padding: '0.25rem', fontSize: '0.75rem' }),
    ...typeSpecificStyles[displayType] || typeSpecificStyles.default
  };
};

/**
 * Create display content based on item type
 * @param {Object} React - React object
 * @param {Object} item - Item to display
 * @param {string} displayType - Type of display
 * @param {boolean} showDetails - Whether to show details
 * @returns {Array} - Array of React elements
 */
const createDisplayContent = (React, item, displayType, showDetails) => {
  switch(displayType) {
    case 'reasoningStep':
      return [
        React.createElement('div', { style: { fontWeight: 'bold' } }, item.description || 'No description'),
        showDetails && item.result && React.createElement('div', { style: { fontSize: '0.8rem', marginTop: '0.25rem' } }, 
          `Result: ${item.result.substring(0, 100)}${item.result.length > 100 ? '...' : ''}`
        )
      ].filter(Boolean);

    case 'task':
      return [
        React.createElement('div', { style: { fontWeight: 'bold' } }, item.term || 'No term'),
        item.type && React.createElement('div', { style: { fontSize: '0.7rem', color: '#666' } }, `Type: ${item.type}`),
        showDetails && item.truth && React.createElement('div', { style: { fontSize: '0.75rem' } }, 
          `Truth: ${JSON.stringify(item.truth)}`
        )
      ].filter(Boolean);

    default:
      return [React.createElement('div', null, item.description || item.term || 'Item')];
  }
};

/**
 * Function to create a standardized data summary
 * @param {Array} data - Data to summarize
 * @param {Array} summaryFields - Fields to include in summary
 * @returns {Object} - Summary object
 */
export const createDataSummary = (data, summaryFields = ['count', 'types', 'timeRange']) => {
  const summary = {};
  
  if (summaryFields.includes('count')) {
    summary.count = data.length;
  }
  
  if (summaryFields.includes('types') && data.length > 0) {
    summary.types = [...new Set(data.map(item => item.type || 'unknown'))];
  }
  
  if (summaryFields.includes('timeRange') && data.length > 0) {
    const timestamps = data
      .map(item => item.timestamp || item.creationTime || Date.now())
      .filter(time => time !== undefined && time !== null); // Remove undefined/null values
      
    if (timestamps.length > 0) {
      summary.timeRange = {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
        duration: Math.max(...timestamps) - Math.min(...timestamps)
      };
    }
  }
  
  return summary;
};

/**
 * Generic function to handle data transformation with error handling
 * @param {any} data - Input data
 * @param {Function} transformFn - Transformation function
 * @param {Function} errorHandler - Error handler function
 * @returns {any} - Transformed data
 */
export const safeTransformData = (data, transformFn, errorHandler = null) => {
  try {
    return transformFn(data);
  } catch (error) {
    console.error('Error in data transformation:', error);
    return errorHandler?.(error) ?? data; // Return original data if transformation fails
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

/**
 * Debounced function wrapper for expensive operations
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Memoized function wrapper for caching function results
 * @param {Function} func - Function to memoize
 * @returns {Function} - Memoized function
 */
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