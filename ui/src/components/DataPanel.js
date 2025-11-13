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

// Helper function to compare values for sorting
const compareValues = (valueA, valueB) => {
  // Determine comparison based on data types
  return typeof valueA === 'string' && typeof valueB === 'string'
    ? valueA.toLowerCase().localeCompare(valueB.toLowerCase())
    : typeof valueA === 'number' && typeof valueB === 'number'
      ? valueA - valueB
      : String(valueA).localeCompare(String(valueB));
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

  const processedData = useMemo(() => {
    let filteredData = rawData;

    // Apply search filter
    if (searchTerm && search.fields?.length > 0) {
      const processor = createSearchableCollection(rawData, search.fields);
      const result = processor.search(searchTerm);
      filteredData = Array.isArray(result) ? result : [];
    }

    // Apply processing pipeline
    if (processPipeline) {
      const result = process(filteredData, processPipeline);
      filteredData = Array.isArray(result) ? result : [];
    }

    // Apply sorting
    if (sortBy) {
      filteredData = [...filteredData].sort((a, b) => {
        const valueA = getNestedValue(a, sortBy);
        const valueB = getNestedValue(b, sortBy);

        const comparison = compareValues(valueA, valueB);
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
  }, [rawData, searchTerm, search.fields, sortBy, sortDirection, currentPage, pagination, processPipeline]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    if (pagination.enabled) setCurrentPage(1);
  }, [pagination.enabled]);

  const handleSortChange = useCallback((field) => {
    setSortDirection(sortBy === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : sort.defaultDirection);
    if (sortBy !== field) setSortBy(field);
    if (pagination.enabled) setCurrentPage(1);
  }, [sortBy, sortDirection, sort.defaultDirection, pagination.enabled]);

  const totalPages = useMemo(() => {
    if (!pagination.enabled) return 1;

    let totalItems = rawData.length;
    if (searchTerm) {
      const processor = createSearchableCollection(rawData, search.fields || []);
      totalItems = processor.search(searchTerm).length;
    }
    return Math.ceil(totalItems / pagination.itemsPerPage);
  }, [rawData, searchTerm, search.fields, pagination]);

  const controls = useMemo(() => {
    const hasControls = search.enabled || (sort.enabled && sort.options.length > 0) || pagination.enabled;
    return hasControls ? React.createElement('div', {
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
    ) : null;
  }, [search, searchTerm, handleSearchChange, sort, sortBy, sortDirection,
    handleSortChange, pagination, currentPage, totalPages]);

  const itemCount = useMemo(() => {
    if (!config.showItemCount) return null;

    let totalItems = rawData.length;
    if (searchTerm) {
      const processor = createSearchableCollection(rawData, search.fields || []);
      totalItems = processor.search(searchTerm).length;
    }

    return createItemCount({
      visibleCount: processedData.length,
      totalCount: totalItems,
      itemLabel: config.itemLabel
    });
  }, [rawData, searchTerm, search.fields, processedData.length, config]);

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

const createTaskDataPanel = (title = 'Tasks', storeSelector) => (props) =>
  React.createElement(DataPanel, {
    title,
    dataSource: storeSelector || (state => state.tasks),
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
    ),
    search: {
      enabled: true,
      placeholder: 'Search tasks...',
      fields: ['term', 'id', 'type']
    },
    sort: {
      enabled: true,
      options: [
        {key: 'budget.priority', label: 'Priority'},
        {key: 'creationTime', label: 'Time'},
        {key: 'term', label: 'Term'}
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
    ),
    search: {
      enabled: true,
      placeholder: 'Search concepts...',
      fields: ['term']
    },
    sort: {
      enabled: true,
      options: [
        {key: 'priority', label: 'Priority'},
        {key: 'taskCount', label: 'Task Count'},
        {key: 'term', label: 'Term'}
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

export {DataPanel, createTaskDataPanel, createConceptDataPanel};
export default DataPanel;