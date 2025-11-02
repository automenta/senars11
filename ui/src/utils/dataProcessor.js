/**
 * General data processing utilities following AGENT.md principles
 */

// Type filter predicate function
const createTypeFilter = (typeField, filterType) => {
  if (filterType === 'all') return () => true;
  const lowerFilterType = filterType.toLowerCase();
  return (item) => item[typeField] && item[typeField].toLowerCase() === lowerFilterType;
};

// Text search predicate function
const createTextFilter = (searchFields, filterText) => {
  if (!filterText.trim()) return () => true;
  const searchText = filterText.toLowerCase();
  return (item) => 
    searchFields.some(field => 
      item[field] && item[field].toString().toLowerCase().includes(searchText)
    );
};

// Value comparison helper for sorting
const compareValues = (a, b) => {
  // Handle different data types for comparison
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  } else if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  } else {
    // Convert to string for comparison
    return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
  }
};

// Abstract function for filtering and sorting data with multiple criteria
export const processDataWithFilters = (data, options = {}) => {
  const {
    filterType = 'all',
    filterText = '',
    sortKey = null,
    sortOrder = 'asc',
    typeField = 'type',
    searchFields = ['description', 'term']
  } = options;

  // Create filter functions
  const typeFilter = createTypeFilter(typeField, filterType);
  const textFilter = createTextFilter(searchFields, filterText);

  // Apply filters
  let result = data.filter(typeFilter).filter(textFilter);

  // Apply sorting
  if (sortKey) {
    result.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const comparison = compareValues(aValue, bValue);
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return result;
};

// Abstract function to group related items based on common properties
export const groupRelatedItems = (items, groupingStrategy = 'timestamp') => {
  const groupingStrategies = {
    timestamp: (items) => {
      const groupedByTime = {};
      items.forEach(item => {
        const timestamp = item.timestamp || item.creationTime || Date.now();
        const interval = Math.floor(timestamp / 10000); // 10-second intervals
        if (!groupedByTime[interval]) {
          groupedByTime[interval] = [];
        }
        groupedByTime[interval].push(item);
      });
      return Object.values(groupedByTime).flat(); // For this case, return flattened
    },
    
    type: (items) => {
      const groupedByType = {};
      items.forEach(item => {
        const type = item.type || 'unknown';
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        groupedByType[type].push(item);
      });
      return Object.values(groupedByType).flat(); // Flatten for now
    },
    
    relationship: (items) => items // Placeholder for relationship grouping
  };

  return groupingStrategies[groupingStrategy] ? groupingStrategies[groupingStrategy](items) : items;
};

// Function to extract common properties for display
export const extractDisplayProperties = (item, propertyList = ['id', 'term', 'type', 'timestamp']) => {
  const displayProps = {};
  propertyList.forEach(prop => {
    if (item[prop] !== undefined) {
      displayProps[prop] = item[prop];
    }
  });
  return displayProps;
};

// Style definitions for different display types
const getDisplayStyles = (displayType, isCompact) => {
  const baseStyle = {
    padding: isCompact ? '0.25rem 0.5rem' : '0.5rem',
    margin: '0.25rem 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.85rem'
  };
  
  const compactStyle = {
    padding: '0.25rem',
    fontSize: '0.75rem'
  };
  
  const typeSpecificStyles = {
    reasoningStep: { backgroundColor: '#f8f9ff', border: '1px solid #b8daff' },
    task: { backgroundColor: '#f0f8f0', border: '1px solid #c3e6c3' },
    default: {}
  };

  return {
    ...baseStyle,
    ...(isCompact ? compactStyle : {}),
    ...typeSpecificStyles[displayType] || typeSpecificStyles.default
  };
};

// Factory function for creating display content based on type
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

// Abstract function to create display elements for various data types
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
    key: item.id,
    style: elementStyle,
    onClick
  }, ...content);
};

// Function to create a standardized data summary
export const createDataSummary = (data, summaryFields = ['count', 'types', 'timeRange']) => {
  const summary = {};
  
  if (summaryFields.includes('count')) {
    summary.count = data.length;
  }
  
  if (summaryFields.includes('types') && data.length > 0) {
    const types = [...new Set(data.map(item => item.type || 'unknown'))];
    summary.types = types;
  }
  
  if (summaryFields.includes('timeRange') && data.length > 0) {
    const timestamps = data
      .map(item => item.timestamp || item.creationTime || Date.now())
      .filter(time => time); // Remove undefined/null values
      
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

// Generic function to handle data transformation with error handling
export const safeTransformData = (data, transformFn, errorHandler = null) => {
  try {
    return transformFn(data);
  } catch (error) {
    console.error('Error in data transformation:', error);
    if (errorHandler) {
      return errorHandler(error);
    }
    return data; // Return original data if transformation fails
  }
};