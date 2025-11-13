import React, {memo, useCallback, useMemo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import VirtualizedList from './VirtualizedList.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createSearchableCollection, getNestedValue, process} from '../utils/dataProcessor.js';
import {createPanelHeader} from '../utils/panelUtils.js';
import {
  createEmptyState,
  createItemCount,
  createPaginationControls,
  createSearchInput,
  createSortButton
} from '../utils/dataPanelUtils.js';
import { EmptyState } from './shared/EmptyState.js';
import { ErrorState } from './shared/ErrorState.js';

// Helper function to compare values for sorting
const compareValues = (valueA, valueB) => {
  // Determine comparison based on data types
  return typeof valueA === 'string' && typeof valueB === 'string'
    ? valueA.toLowerCase().localeCompare(valueB.toLowerCase())
    : typeof valueA === 'number' && typeof valueB === 'number'
      ? valueA - valueB
      : String(valueA).localeCompare(String(valueB));
};

// Helper function to apply search filter
const applySearchFilter = (rawData, searchTerm, searchFields) => {
  if (!searchTerm || !searchFields?.length) return rawData;
  const processor = createSearchableCollection(rawData, searchFields);
  const result = processor.search(searchTerm);
  return Array.isArray(result) ? result : [];
};

// Helper function to apply processing pipeline
const applyProcessingPipeline = (filteredData, processPipeline) => {
  if (!processPipeline) return filteredData;
  const result = process(filteredData, processPipeline);
  return Array.isArray(result) ? result : [];
};

// Helper function to apply sorting
const applySorting = (filteredData, sortBy, sortDirection) => {
  if (!sortBy) return filteredData;
  return [...filteredData].sort((a, b) => {
    const valueA = getNestedValue(a, sortBy);
    const valueB = getNestedValue(b, sortBy);
    const comparison = compareValues(valueA, valueB);
    return sortDirection === 'asc' ? comparison : -comparison;
  });
};

// Helper function to apply pagination
const applyPagination = (filteredData, pagination, currentPage) => {
  if (!pagination.enabled) return filteredData;
  const start = (currentPage - 1) * pagination.itemsPerPage;
  const end = start + pagination.itemsPerPage;
  return filteredData.slice(start, end);
};

const DataPanel = memo(({
  title = 'Data',
  dataSource,
  renderItem,
  config = {},
  processPipeline = null,
  search = {
    enabled: true,
    placeholder: 'Search...',
    fields: []
  },
  sort = {
    enabled: true,
    options: [],
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
  style = {},
  className = ''
}) => {
  const rawData = useMemo(() => {
    if (typeof dataSource === 'function') {
      return dataSource(useUiStore.getState()) || [];
    }
    return Array.isArray(dataSource) ? dataSource : [];
  }, [dataSource]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(sort.defaultField);
  const [sortDirection, setSortDirection] = useState(sort.defaultDirection);
  const [currentPage, setCurrentPage] = useState(1);

  // Memoized processed data with optimized pipeline
  const processedData = useMemo(() => {
    let filteredData = rawData;

    // Apply filters in sequence
    filteredData = applySearchFilter(filteredData, searchTerm, search.fields);
    filteredData = applyProcessingPipeline(filteredData, processPipeline);
    filteredData = applySorting(filteredData, sortBy, sortDirection);
    filteredData = applyPagination(filteredData, pagination, currentPage);

    return filteredData;
  }, [rawData, searchTerm, search.fields, processPipeline, sortBy, sortDirection, pagination, currentPage]);

  // Memoized search handler with early return for pagination reset
  const handleSearchChange = useCallback((e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (pagination.enabled) setCurrentPage(1);
  }, [pagination.enabled]);

  // Memoized sort handler
  const handleSortChange = useCallback((field) => {
    setSortDirection(sortBy === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : sort.defaultDirection);
    if (sortBy !== field) setSortBy(field);
    if (pagination.enabled) setCurrentPage(1);
  }, [sortBy, sortDirection, sort.defaultDirection, pagination.enabled]);

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (!pagination.enabled) return 1;

    const totalItems = searchTerm
      ? createSearchableCollection(rawData, search.fields || []).search(searchTerm).length
      : rawData.length;

    return Math.ceil(totalItems / pagination.itemsPerPage);
  }, [rawData, searchTerm, search.fields, pagination]);

  // Memoized controls section
  const controls = useMemo(() => {
    const hasControls = search.enabled || (sort.enabled && sort.options.length > 0) || pagination.enabled;
    if (!hasControls) return null;

    return React.createElement('div', {
      style: {
        display: 'flex',
        gap: themeUtils.get('SPACING.SM'),
        marginBottom: themeUtils.get('SPACING.SM'),
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    },
    search.enabled && createSearchInput({
      searchTerm,
      onSearchChange: handleSearchChange,
      placeholder: search.placeholder
    }),
    sort.enabled && sort.options.map(option =>
      createSortButton({
        option,
        isActive: sortBy === option.key,
        direction: sortDirection,
        onClick: () => handleSortChange(option.key)
      })
    ),
    pagination.enabled && createPaginationControls({
      currentPage,
      totalPages,
      onPageChange: (newPage) => setCurrentPage(newPage)
    })
    );
  }, [search, searchTerm, handleSearchChange, sort, sortBy, sortDirection,
    handleSortChange, pagination, currentPage, totalPages]);

  // Memoized item count display
  const itemCount = useMemo(() => {
    if (!config.showItemCount) return null;

    const totalItems = searchTerm
      ? createSearchableCollection(rawData, search.fields || []).search(searchTerm).length
      : rawData.length;

    return createItemCount({
      visibleCount: processedData.length,
      totalCount: totalItems,
      itemLabel: config.itemLabel
    });
  }, [rawData, searchTerm, search.fields, processedData.length, config]);

  // Memoized content section with virtualization optimization
  const content = useMemo(() => {
    // Show empty state if no data
    if (processedData.length === 0) {
      return createEmptyState({
        message: config.emptyMessage || 'No items to display'
      });
    }

    // Use virtualization for large datasets
    if (virtualization.enabled && processedData.length > 100) {
      return React.createElement(VirtualizedList, {
        items: processedData,
        renderItem: renderItem,
        itemHeight: virtualization.itemHeight,
        containerHeight: config.containerHeight || 400,
        overscan: 5
      });
    }

    // Default to generic panel
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
  createPanelHeader(React, {title}),
  controls,
  itemCount,
  content
  );
});

// Generic function to create data panels for different store selectors
const createGenericDataPanel = (title, storeSelector, defaultItemLabel, defaultEmptyMessage, searchFields, sortOptions, defaultSortField) => (props) =>
  React.createElement(DataPanel, {
    title,
    dataSource: storeSelector,
    renderItem: props.renderItem,
    search: {
      enabled: true,
      placeholder: `Search ${defaultItemLabel || 'items'}...`,
      fields: searchFields
    },
    sort: {
      enabled: true,
      options: sortOptions,
      defaultField: defaultSortField
    },
    config: {
      itemLabel: defaultItemLabel,
      showItemCount: true,
      emptyMessage: defaultEmptyMessage
    },
    ...props
  });

// Specialized task panel creator with optimized rendering
const createTaskDataPanel = (title = 'Tasks', storeSelector) => (props) =>
  createGenericDataPanel(
    title,
    storeSelector || (state => state.tasks),
    'tasks',
    'No tasks to display',
    ['term', 'id', 'type'],
    [
      {key: 'budget.priority', label: 'Priority'},
      {key: 'creationTime', label: 'Time'},
      {key: 'term', label: 'Term'}
    ],
    'creationTime'
  )({
    ...props,
    renderItem: props.renderItem || ((task) =>
      React.createElement('div', {
        key: task.id,
        style: {padding: '0.5rem', borderBottom: '1px solid #eee'}
      },
      React.createElement('div', {style: {fontWeight: 'bold'}}, task.term || task.id),
      React.createElement('div', {style: {fontSize: '0.8rem', color: '#666'}},
        `Type: ${task.type || 'N/A'} | Priority: ${task.budget?.priority?.toFixed(2) || 'N/A'}`
      )
      )
    )
  });

// Specialized concept panel creator with optimized rendering
const createConceptDataPanel = (title = 'Concepts', storeSelector) => (props) =>
  createGenericDataPanel(
    title,
    storeSelector || (state => state.concepts),
    'concepts',
    'No concepts to display',
    ['term'],
    [
      {key: 'priority', label: 'Priority'},
      {key: 'taskCount', label: 'Task Count'},
      {key: 'term', label: 'Term'}
    ],
    'priority'
  )({
    ...props,
    renderItem: props.renderItem || ((concept) =>
      React.createElement('div', {
        key: concept.term,
        style: {padding: '0.5rem', borderBottom: '1px solid #eee'}
      },
      React.createElement('div', {style: {fontWeight: 'bold'}}, concept.term),
      React.createElement('div', {style: {fontSize: '0.8rem', color: '#666'}},
        `Priority: ${(concept.priority || 0).toFixed(2)} | Tasks: ${concept.taskCount || 0}`
      )
      )
    )
  });

export {DataPanel, createTaskDataPanel, createConceptDataPanel};
export default DataPanel;