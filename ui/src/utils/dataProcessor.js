/**
 * General data processing utilities following AGENT.md principles
 */

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

  let result = [...data];

  // Apply type filter
  if (filterType !== 'all') {
    result = result.filter(item => 
      item[typeField] && item[typeField].toLowerCase() === filterType.toLowerCase()
    );
  }

  // Apply text filter
  if (filterText.trim()) {
    const searchText = filterText.toLowerCase();
    result = result.filter(item =>
      searchFields.some(field =>
        item[field] && item[field].toString().toLowerCase().includes(searchText)
      )
    );
  }

  // Apply sorting
  if (sortKey) {
    result.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      // Handle different data types for comparison
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Convert to string for comparison
        comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return result;
};

// Abstract function to group related items based on common properties
export const groupRelatedItems = (items, groupingStrategy = 'timestamp') => {
  switch(groupingStrategy) {
    case 'timestamp':
      // Group items by time intervals (e.g., 10-second intervals)
      const groupedByTime = {};
      items.forEach(item => {
        const timestamp = item.timestamp || item.creationTime || Date.now();
        const interval = Math.floor(timestamp / 10000); // 10-second intervals
        if (!groupedByTime[interval]) {
          groupedByTime[interval] = [];
        }
        groupedByTime[interval].push(item);
      });
      return Object.values(groupedByTime).flat(); // For this case, return flattened but could return grouped
      
    case 'type':
      // Group by type field
      const groupedByType = {};
      items.forEach(item => {
        const type = item.type || 'unknown';
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        groupedByType[type].push(item);
      });
      return Object.values(groupedByType).flat(); // Flatten for now
      
    case 'relationship':
      // Group items by their relationships
      // This would require more complex logic based on item relationships
      return items;
      
    default:
      return items;
  }
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

// Abstract function to create display elements for various data types
export const createDataDisplayElement = (React, item, options = {}) => {
  const {
    displayType = 'default',
    onClick = null,
    isCompact = false,
    showDetails = true
  } = options;

  const styles = {
    base: {
      padding: isCompact ? '0.25rem 0.5rem' : '0.5rem',
      margin: '0.25rem 0',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '0.85rem'
    },
    compact: {
      padding: '0.25rem',
      fontSize: '0.75rem'
    }
  };

  // Apply compact styling if needed
  const elementStyle = isCompact 
    ? { ...styles.base, ...styles.compact } 
    : styles.base;

  // Enhance element based on type
  switch(displayType) {
    case 'reasoningStep':
      return React.createElement('div', {
        key: item.id,
        style: { ...elementStyle, backgroundColor: '#f8f9ff', border: '1px solid #b8daff' },
        onClick
      },
        React.createElement('div', { style: { fontWeight: 'bold' } }, item.description || 'No description'),
        showDetails && item.result && React.createElement('div', { style: { fontSize: '0.8rem', marginTop: '0.25rem' } }, 
          `Result: ${item.result.substring(0, 100)}${item.result.length > 100 ? '...' : ''}`
        )
      );

    case 'task':
      return React.createElement('div', {
        key: item.id,
        style: { ...elementStyle, backgroundColor: '#f0f8f0', border: '1px solid #c3e6c3' },
        onClick
      },
        React.createElement('div', { style: { fontWeight: 'bold' } }, item.term || 'No term'),
        item.type && React.createElement('div', { style: { fontSize: '0.7rem', color: '#666' } }, `Type: ${item.type}`),
        showDetails && item.truth && React.createElement('div', { style: { fontSize: '0.75rem' } }, 
          `Truth: ${JSON.stringify(item.truth)}`
        )
      );

    default:
      return React.createElement('div', {
        key: item.id,
        style: elementStyle,
        onClick
      },
        React.createElement('div', null, item.description || item.term || 'Item')
      );
  }
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