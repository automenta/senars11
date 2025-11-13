import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebSocketStatus, LoadingSpinner, EmptyState, ErrorState, TimeDisplay } from './GenericComponents.js';
import useUiStore from '../stores/uiStore.js';
import { themeUtils } from '../utils/themeUtils.js';

/**
 * BasePanel: A foundational component providing common UI patterns for different panel types.
 * This component consolidates shared functionality across various panel implementations.
 */
const BasePanel = memo(({
  // Basic properties
  title = null,
  children = null,
  className = '',
  style = {},

  // Header properties
  showHeader = true,
  headerExtra = null,
  showWebSocketStatus = true,
  showTitleCount = false,

  // Content properties
  showLoading = false,
  loadingMessage = 'Loading...',
  showEmptyState = false,
  emptyMessage = 'No data to display',
  emptyIcon = '🔍',
  showError = false,
  errorMessage = 'An error occurred',
  onRetry = null,

  // Content container properties
  contentStyle = {},
  maxHeight = '100%',
  autoScroll = false,
  scrollable = true,

  // Data properties
  items = null,
  renderItem = null,
  maxItems = null,
  itemKey = (item, index) => index,

  // Timestamps
  withTimestamp = false,
  timestampFormat = 'time',

  // Event handlers
  onRefresh = null
}) => {
  useUiStore(state => state.wsConnected); // This is used in the WebSocketStatus component
  const containerRef = useRef(null);
  const [itemsCount, setItemsCount] = useState(0);

  // Calculate display items based on maxItems
  const displayItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return maxItems ? items.slice(-maxItems) : items;
  }, [items, maxItems]);

  // Update items count when display items change
  useEffect(() => {
    setItemsCount(displayItems.length);
  }, [displayItems]);

  // Auto-scroll when items change if enabled
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [itemsCount, autoScroll]);

  // Memoized styles
  const panelStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    overflow: 'hidden',
    ...style
  }), [style]);

  const headerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
  }), []);

  const headerContentStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center'
  }), []);

  const contentContainerStyle = useMemo(() => ({
    flex: 1,
    maxHeight,
    overflow: scrollable ? 'auto' : 'hidden',
    padding: themeUtils.get('SPACING.SM'),
    ...contentStyle
  }), [maxHeight, scrollable, contentStyle]);

  const titleStyle = useMemo(() => ({
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    color: themeUtils.get('TEXT.PRIMARY')
  }), []);

  const titleContainerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }), []);

  const countStyle = useMemo(() => ({
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    marginLeft: themeUtils.get('SPACING.SM')
  }), []);

  const timestampStyle = useMemo(() => ({
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    textAlign: 'right',
    marginTop: themeUtils.get('SPACING.XS'),
    paddingRight: themeUtils.get('SPACING.SM')
  }), []);

  // Memoized render function for items
  const renderedItems = useMemo(() => {
    if (!renderItem || !displayItems.length) return null;
    
    return displayItems.map((item, index) => 
      React.createElement('div', { 
        key: itemKey(item, index) 
      }, renderItem(item, index))
    );
  }, [displayItems, renderItem, itemKey]);

  // Get status based on current state
  const status = useMemo(() => {
    if (showError) return 'error';
    if (showLoading) return 'loading';
    if (showEmptyState || (items && items.length === 0)) return 'empty';
    return 'content';
  }, [showError, showLoading, showEmptyState, items]);

  // Render content based on status
  const renderContent = useCallback(() => {
    switch (status) {
    case 'loading':
      return React.createElement(LoadingSpinner, { 
        size: themeUtils.get('SPACING.XL'), 
        message: loadingMessage 
      });
        
    case 'error':
      return React.createElement(ErrorState, { 
        message: errorMessage, 
        onRetry 
      });
        
    case 'empty':
      return React.createElement(EmptyState, { 
        message: emptyMessage, 
        icon: emptyIcon 
      });
        
    case 'content':
      if (items && renderItem) {
        return renderedItems || React.createElement('div', null, children);
      }
      return React.createElement('div', null, children);
        
    default:
      return React.createElement('div', null, children);
    }
  }, [status, loadingMessage, errorMessage, onRetry, emptyMessage, emptyIcon, 
    items, renderItem, renderedItems, children]);

  // Build header actions (WebSocket status, refresh button, etc.)
  const renderHeaderActions = useCallback(() => {
    return React.createElement('div', { style: headerContentStyle },
      showWebSocketStatus && React.createElement(WebSocketStatus, { 
        showLabel: true 
      }),
      onRefresh && React.createElement('button', {
        onClick: onRefresh,
        style: {
          marginLeft: themeUtils.get('SPACING.SM'),
          padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
          cursor: 'pointer'
        }
      }, '🔄'),
      headerExtra
    );
  }, [showWebSocketStatus, headerExtra, onRefresh, headerContentStyle]);

  return React.createElement('div', { 
    className: `base-panel ${className}`.trim(), 
    style: panelStyle 
  },
  // Header section
  showHeader && React.createElement('div', { style: headerStyle },
    title && React.createElement('div', { style: titleContainerStyle },
      React.createElement('div', { style: titleStyle }, title),
      showTitleCount && React.createElement('span', { style: countStyle }, `(${itemsCount})`)
    ),
    renderHeaderActions()
  ),
    
  // Main content area
  React.createElement('div', {
    style: contentContainerStyle,
    ref: containerRef
  }, renderContent()),
    
  // Timestamp if enabled
  withTimestamp && React.createElement('div', { style: timestampStyle },
    React.createElement(TimeDisplay, { 
      timestamp: Date.now(), 
      formatType: timestampFormat 
    })
  )
  );
});

export default BasePanel;