/**
 * Generic data panel with advanced data processing capabilities
 * Implements elegant architectural patterns for data display
 */
import React, { memo, useState, useMemo, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import VirtualizedList from './VirtualizedList.js';
import { themeUtils } from '../utils/themeUtils.js';
import { createSearchableCollection, process, getNestedValue } from '../utils/dataProcessor.js';

/**
 * Advanced data panel with processing, filtering, sorting, and visualization capabilities
 */
const DataPanel = memo(({
  title = 'Data',
  // Data source can be a store selector function, static data, or a state variable
  dataSource,
  // Rendering function for individual items
  renderItem,
  // Configuration options
  config = {},
  // Custom processing pipeline
  processPipeline = null,
  // Search and filter options
  search = {
    enabled: true,
    placeholder: 'Search...',
    fields: []  // fields to search in (for objects)
  },
  sort = {
    enabled: true,
    options: [],  // [{key: 'field', label: 'Field Name'}]
    defaultField: null,
    defaultDirection: 'asc'
  },
  pagination = {
    enabled: true,
    itemsPerPage: 20
  },
  virtualization = {
    enabled: false,
    itemHeight: 50
  },
  visualization = {
    enabled: false,
    type: 'list',  // 'list', 'grid', 'table', etc.
    options: {}
  },
  // Styling overrides
  style = {},
  className = ''
}) => {
  // Get data based on source type
  const rawData = typeof dataSource === 'function' 
    ? useUiStore(dataSource) 
    : Array.isArray(dataSource) 
      ? dataSource 
      : [];

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(sort.defaultField);
  const [sortDirection, setSortDirection] = useState(sort.defaultDirection);
  const [currentPage, setCurrentPage] = useState(1);

  // Process data with advanced pipeline
  const processedData = useMemo(() => {
    let processor = createSearchableCollection(rawData, search.fields || []);
    
    // Apply search filtering
    let filteredData = searchTerm ? processor.search(searchTerm) : rawData;
    
    // Apply custom processing pipeline if provided
    if (processPipeline) {
      filteredData = process(filteredData, processPipeline);
    }
    
    // Apply sorting
    if (sortBy) {
      filteredData = [...filteredData].sort((a, b) => {
        let valueA = getNestedValue(a, sortBy);
        let valueB = getNestedValue(b, sortBy);
        
        let comparison = 0;
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    // Apply pagination
    if (pagination.enabled) {
      const start = (currentPage - 1) * pagination.itemsPerPage;
      const end = start + pagination.itemsPerPage;
      filteredData = filteredData.slice(start, end);
    }
    
    return filteredData;
  }, [rawData, searchTerm, sortBy, sortDirection, currentPage, pagination, processPipeline, search]);

  // Search input handler
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    if (pagination.enabled) setCurrentPage(1); // Reset to first page when searching
  }, [pagination.enabled]);

  // Sort handler
  const handleSortChange = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(sort.defaultDirection);
    }
    if (pagination.enabled) setCurrentPage(1); // Reset to first page when sorting
  }, [sortBy, sortDirection, sort.defaultDirection, pagination.enabled]);

  // Pagination controls
  const totalPages = useMemo(() => {
    if (!pagination.enabled) return 1;
    
    let totalItems = rawData.length;
    if (searchTerm) {
      const processor = createSearchableCollection(rawData, search.fields || []);
      totalItems = processor.search(searchTerm).length;
    }
    return Math.ceil(totalItems / pagination.itemsPerPage);
  }, [rawData, searchTerm, search.fields, pagination]);

  // Render search and sort controls
  const controls = useMemo(() => {
    if (!search.enabled && sort.options.length === 0) return null;
    
    return React.createElement('div', { 
      style: { 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      } 
    },
    search.enabled && React.createElement('input', {
      type: 'text',
      placeholder: search.placeholder,
      value: searchTerm,
      onChange: handleSearchChange,
      style: {
        padding: '0.25rem 0.5rem',
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        fontSize: '0.9rem',
        flex: '1 1 200px'
      }
    }),
    sort.enabled && sort.options.map(option => 
      React.createElement('button', {
        key: option.key,
        onClick: () => handleSortChange(option.key),
        style: {
          padding: '0.25rem 0.5rem',
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          backgroundColor: sortBy === option.key ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('BACKGROUNDS.SECONDARY'),
          color: sortBy === option.key ? themeUtils.get('TEXT.LIGHT') : themeUtils.get('TEXT.PRIMARY'),
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }
      },
      option.label,
      sortBy === option.key && React.createElement('span', { style: { fontSize: '0.7rem' }}, 
        sortDirection === 'asc' ? '↑' : '↓'
      )
      )
    ),
    pagination.enabled && totalPages > 1 && React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginLeft: 'auto'
      }
    },
    React.createElement('button', {
      onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
      disabled: currentPage === 1,
      style: {
        padding: '0.25rem 0.5rem',
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        backgroundColor: currentPage === 1 ? themeUtils.get('COLORS.GRAY_300') : themeUtils.get('BACKGROUNDS.SECONDARY'),
        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
      }
    }, '←'),
    React.createElement('span', { style: { minWidth: '40px', textAlign: 'center' }}, 
      `${currentPage} / ${totalPages}`
    ),
    React.createElement('button', {
      onClick: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
      disabled: currentPage === totalPages,
      style: {
        padding: '0.25rem 0.5rem',
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        backgroundColor: currentPage === totalPages ? themeUtils.get('COLORS.GRAY_300') : themeUtils.get('BACKGROUNDS.SECONDARY'),
        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
      }
    }, '→')
    )
    );
  }, [search, searchTerm, handleSearchChange, sort, sortBy, sortDirection, 
      handleSortChange, pagination, currentPage, totalPages]);

  // Render item count
  const itemCount = useMemo(() => {
    if (!config.showItemCount) return null;
    
    let totalItems = rawData.length;
    if (searchTerm) {
      const processor = dataUtils.createSearchableCollection(rawData, search.fields || []);
      totalItems = processor.search(searchTerm).length;
    }
    
    return React.createElement('div', { 
      style: { 
        fontSize: '0.8rem', 
        color: themeUtils.get('TEXT.MUTED'), 
        textAlign: 'right', 
        marginBottom: '0.25rem' 
      } 
    },
    `${processedData.length} of ${totalItems} ${config.itemLabel || 'items'}`
    );
  }, [rawData, searchTerm, search.fields, processedData.length, config]);

  // Render content based on visualization type
  const content = useMemo(() => {
    if (processedData.length === 0) {
      return React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: themeUtils.get('TEXT.MUTED'),
          textAlign: 'center',
          height: '200px',
          fontStyle: 'italic'
        }
      },
      React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem' }}, '🔍'),
      React.createElement('div', null, config.emptyMessage || 'No items to display')
      );
    }

    if (virtualization.enabled && processedData.length > 100) {
      return React.createElement(VirtualizedList, {
        items: processedData,
        renderItem: renderItem,
        itemHeight: virtualization.itemHeight,
        containerHeight: config.containerHeight || 400,
        overscan: 5
      });
    }

    return React.createElement(GenericPanel, {
      items: processedData,
      renderItem: renderItem,
      maxHeight: 'calc(100% - 4rem)',
      emptyMessage: config.emptyMessage || 'No items to display',
      autoScroll: config.autoScroll || false,
      maxItems: config.maxItems || null
    });
  }, [processedData, virtualization, renderItem, config]);

  return React.createElement('div', { 
    style: { 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      ...style
    },
    className
  },
  React.createElement('div', { 
    style: { 
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), 
      marginBottom: '0.5rem',
      color: themeUtils.get('TEXT.PRIMARY')
    }
  }, title),
  controls,
  itemCount,
  content
  );
});

// Export convenience factory functions
const createTaskDataPanel = (title = 'Tasks', storeSelector) => (props) => 
  React.createElement(DataPanel, {
    title,
    dataSource: storeSelector || (state => state.tasks),
    renderItem: props.renderItem || ((task, index) => 
      React.createElement('div', { key: task.id || index, style: { padding: '0.5rem', borderBottom: '1px solid #eee' } },
        React.createElement('div', { style: { fontWeight: 'bold' }}, task.term || task.id || `Task ${index}`),
        React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' }}, 
          `Type: ${task.type || 'N/A'} | Priority: ${task.budget?.priority?.toFixed(2) || 'N/A'}`
        )
      )
    ),
    search: { 
      enabled: true, 
      placeholder: 'Search tasks...', 
      fields: ['term', 'id', 'type'] 
    },
    sort: { 
      enabled: true, 
      options: [
        { key: 'budget.priority', label: 'Priority' },
        { key: 'creationTime', label: 'Time' },
        { key: 'term', label: 'Term' }
      ],
      defaultField: 'creationTime'
    },
    config: {
      itemLabel: 'tasks',
      showItemCount: true,
      emptyMessage: 'No tasks to display'
    },
    ...props
  });

const createConceptDataPanel = (title = 'Concepts', storeSelector) => (props) => 
  React.createElement(DataPanel, {
    title,
    dataSource: storeSelector || (state => state.concepts),
    renderItem: props.renderItem || ((concept, index) => 
      React.createElement('div', { key: concept.term || index, style: { padding: '0.5rem', borderBottom: '1px solid #eee' } },
        React.createElement('div', { style: { fontWeight: 'bold' }}, concept.term || `Concept ${index}`),
        React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' }}, 
          `Priority: ${(concept.priority || 0).toFixed(2)} | Tasks: ${concept.taskCount || 0}`
        )
      )
    ),
    search: { 
      enabled: true, 
      placeholder: 'Search concepts...', 
      fields: ['term'] 
    },
    sort: { 
      enabled: true, 
      options: [
        { key: 'priority', label: 'Priority' },
        { key: 'taskCount', label: 'Task Count' },
        { key: 'term', label: 'Term' }
      ],
      defaultField: 'priority'
    },
    config: {
      itemLabel: 'concepts',
      showItemCount: true,
      emptyMessage: 'No concepts to display'
    },
    ...props
  });

export {
  DataPanel,
  createTaskDataPanel,
  createConceptDataPanel
};

export default DataPanel;