import React, { memo, useState, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import VirtualizedList from './VirtualizedList.js';

/**
 * Generic list panel component with filtering, sorting, and search capabilities
 * @param {Array} items - Array of items to display
 * @param {Function} renderItem - Function to render each item
 * @param {string} title - Panel title
 * @param {string} searchPlaceholder - Placeholder text for search input
 * @param {Array} sortOptions - Options for sorting (e.g., [{key: 'name', label: 'Name'}])
 * @param {string} defaultSort - Default sort option key
 * @param {Function} filterFn - Function to filter items based on search term
 * @param {number} itemHeight - Height of each item for virtualization
 * @param {boolean} useVirtualization - Whether to use virtualized rendering
 */
const ListPanel = memo(({
  items = [],
  renderItem,
  title = 'List',
  searchPlaceholder = 'Search...',
  sortOptions = [],
  defaultSort = null,
  filterFn = null,
  emptyMessage = 'No items to display',
  autoScroll = false,
  maxItems = null,
  itemHeight = 50,
  useVirtualization = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  
  // Filter items based on search term
  let filteredItems = items;
  if (searchTerm) {
    if (filterFn) {
      filteredItems = items.filter(item => filterFn(item, searchTerm));
    } else {
      // Default filter: match any string property containing the search term (case insensitive)
      filteredItems = items.filter(item => {
        if (typeof item === 'string') {
          return item.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (typeof item === 'object') {
          return Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      });
    }
  }
  
  // Sort items
  let sortedItems = [...filteredItems];
  if (sortBy) {
    sortedItems.sort((a, b) => {
      let valueA = a;
      let valueB = b;
      
      // Navigate nested properties if sortBy contains dots (e.g., 'user.name')
      if (typeof sortBy === 'string' && sortBy.includes('.')) {
        const keys = sortBy.split('.');
        for (const key of keys) {
          valueA = valueA?.[key];
          valueB = valueB?.[key];
        }
      } else {
        valueA = a[sortBy];
        valueB = b[sortBy];
      }
      
      // Handle different data types
      let comparison = 0;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        // Fallback comparison
        comparison = String(valueA).localeCompare(String(valueB));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }
  
  // Handle sort change
  const handleSortChange = useCallback((newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle direction if same sort key
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort key, default to ascending
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  }, [sortBy, sortDirection]);

  // Handle search change with useCallback for performance
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Render sort controls if sort options are provided
  const sortControls = sortOptions.length > 0 && React.createElement('div', { 
    style: { 
      display: 'flex', 
      gap: '0.5rem', 
      marginBottom: '0.5rem',
      alignItems: 'center'
    } 
  },
    React.createElement('input', {
      type: 'text',
      placeholder: searchPlaceholder,
      value: searchTerm,
      onChange: handleSearchChange,
      style: {
        padding: '0.25rem 0.5rem',
        border: '1px solid #ccc',
        borderRadius: '3px',
        fontSize: '0.9rem',
        flex: 1
      }
    }),
    sortOptions.map(option => 
      React.createElement('button', {
        key: option.key,
        onClick: () => handleSortChange(option.key),
        style: {
          padding: '0.25rem 0.5rem',
          border: '1px solid #ccc',
          backgroundColor: sortBy === option.key ? '#007bff' : '#f8f9fa',
          color: sortBy === option.key ? 'white' : '#333',
          borderRadius: '3px',
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
    )
  );

  // Render item count
  const itemCount = React.createElement('div', { 
    style: { 
      fontSize: '0.8rem', 
      color: '#666', 
      textAlign: 'right', 
      marginBottom: '0.25rem' 
    } 
  },
    `${sortedItems.length} item${sortedItems.length !== 1 ? 's' : ''} (${items.length} total)`
  );

  // Choose between virtualized and regular rendering based on configuration
  const content = useVirtualization && sortedItems.length > 100
    ? React.createElement(VirtualizedList, {
        items: sortedItems,
        renderItem: renderItem,
        itemHeight: itemHeight,
        containerHeight: 400, // Default height, could be made configurable
        overscan: 5
      })
    : React.createElement(GenericPanel, {
        items: sortedItems,
        renderItem: renderItem,
        maxHeight: 'calc(100% - 4rem)', // Account for title, controls, and count display
        emptyMessage: emptyMessage,
        autoScroll: autoScroll,
        maxItems: maxItems
      });

  return React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '0.5rem' }}, title),
    sortControls,
    sortedItems.length > 0 && itemCount,
    content
  );
});

export default ListPanel;