import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * VirtualizedList Component for efficiently rendering large lists
 * @param {Array} items - Items to render
 * @param {Function} renderItem - Function to render each item
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {number} overscan - Number of items to render beyond visible area
 */
const VirtualizedList = ({ 
  items = [], 
  renderItem, 
  itemHeight = 50, 
  containerHeight = 400, 
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate visible range
  const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2);
  const endIdx = Math.min(items.length - 1, startIdx + visibleCount);
  
  // Calculate scroll container height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = startIdx * itemHeight;
  
  // Memoize visible items to prevent unnecessary re-renders
  const visibleItems = useMemo(() => {
    const itemsToRender = items.slice(startIdx, endIdx + 1);
    const renderedItems = [];
    
    for (let i = 0; i < itemsToRender.length; i++) {
      const item = itemsToRender[i];
      const actualIndex = startIdx + i;
      renderedItems.push(
        React.createElement('div', { key: item.id || actualIndex }, renderItem(item, actualIndex))
      );
    }
    
    return renderedItems;
  }, [items, startIdx, endIdx, renderItem]);
  
  // Handle scroll event
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return React.createElement('div', {
    style: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative'
    },
    onScroll: handleScroll
  },
  // Spacer element to maintain scroll range
  React.createElement('div', { style: { height: totalHeight, position: 'relative' } },
    // Positioned container for visible items
    React.createElement('div', { 
      style: { 
        position: 'absolute',
        top: offsetY,
        left: 0,
        width: '100%',
        height: visibleItems.length * itemHeight
      }
    }, ...visibleItems)
  )
  );
};

export default VirtualizedList;