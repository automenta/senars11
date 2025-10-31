import React, { useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';

/**
 * Priority Histogram Component to visualize priority distributions
 * @param {string} type - Type of items to visualize ('concepts', 'tasks', etc.)
 * @param {number} buckets - Number of histogram buckets (default 10)
 * @param {string} title - Title for the histogram
 */
const PriorityHistogram = ({ type = 'concepts', buckets = 10, title = 'Priority Distribution' }) => {
  const concepts = useUiStore(state => state.concepts);
  const tasks = useUiStore(state => state.tasks);
  
  // Select the appropriate data source based on type
  let items = [];
  if (type === 'concepts') {
    items = concepts;
  } else if (type === 'tasks') {
    items = tasks;
  } else {
    // For other types, just use the array as-is
    items = useUiStore(state => state[type]) || [];
  }
  
  // Calculate histogram data
  const histogramData = useMemo(() => {
    if (!items || items.length === 0) {
      return Array(buckets).fill(0).map((_, index) => ({
        range: `${(index * (100/buckets)).toFixed(0)}-${((index + 1) * (100/buckets)).toFixed(0)}`,
        count: 0,
        percentage: 0
      }));
    }
    
    // Create buckets
    const bucketSize = 1.0 / buckets;
    const bucketCounts = new Array(buckets).fill(0);
    
    // Fill buckets based on priority values
    items.forEach(item => {
      // Try different possible priority field names
      let priority = item.priority || item.budget?.priority || item.truth?.priority;
      if (priority === undefined && type === 'concepts') {
        priority = item.priority; // concepts use priority directly
      } else if (priority === undefined && type === 'tasks') {
        priority = item.budget?.priority || item.priority; // tasks might have priority in budget
      }
      
      if (priority !== undefined && priority !== null) {
        const bucketIndex = Math.min(Math.floor(priority / bucketSize), buckets - 1);
        bucketCounts[bucketIndex]++;
      }
    });
    
    // Calculate percentages and create histogram data
    const totalCount = items.length;
    return bucketCounts.map((count, index) => ({
      range: `${(index * (100/buckets)).toFixed(0)}-${(((index + 1) * (100/buckets))).toFixed(0)}`,
      count: count,
      percentage: totalCount > 0 ? (count / totalCount * 100).toFixed(1) : 0
    }));
  }, [items, buckets, type]);

  // Find the maximum count for scaling the bars
  const maxCount = Math.max(...histogramData.map(d => d.count), 1);

  // Color gradient based on bucket position
  const getBarColor = (index) => {
    const hue = (index / buckets) * 240; // Blue to red spectrum
    return `hsl(${hue}, 70%, 50%)`;
  };

  return React.createElement('div', { 
    style: { 
      padding: '1rem', 
      fontFamily: 'sans-serif', 
      width: '100%',
      height: '100%',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    } 
  },
    React.createElement('h3', { 
      style: { 
        margin: '0 0 1rem 0', 
        textAlign: 'center',
        fontSize: '1.1rem',
        fontWeight: '600'
      }
    }, title),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 3rem)', minHeight: '200px' } },
      // Stats header
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-around', 
          fontSize: '0.9rem', 
          marginBottom: '1rem',
          padding: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px'
        } 
      },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: '1.2rem', fontWeight: 'bold' }}, items.length),
          React.createElement('div', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }}, type)
        ),
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: '1.2rem', fontWeight: 'bold' }}, buckets),
          React.createElement('div', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }}, 'buckets')
        ),
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: '1.2rem', fontWeight: 'bold' }}, 
            (items.length > 0 ? items.reduce((sum, item) => {
              let priority = item.priority || item.budget?.priority || item.truth?.priority;
              if (priority === undefined && type === 'concepts') {
                priority = item.priority;
              } else if (priority === undefined && type === 'tasks') {
                priority = item.budget?.priority || item.priority;
              }
              return sum + (priority || 0);
            }, 0) / items.length : 0).toFixed(2)
          ),
          React.createElement('div', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' }}, 'avg priority')
        )
      ),
      // Histogram chart
      React.createElement('div', { style: { flex: 1, display: 'flex', alignItems: 'flex-end', padding: '1rem 0' } },
        histogramData.map((bucket, index) => 
          React.createElement('div', 
            {
              key: index,
              style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '0 2px',
                position: 'relative',
                minWidth: '20px' // Ensure minimum width for small screens
              }
            },
            // Count label on top of bar
            bucket.count > 0 && React.createElement('div', {
              style: {
                position: 'absolute',
                top: '-1.5rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: '2px',
                padding: '0 2px'
              }
            }, bucket.count),
            // Histogram bar
            React.createElement('div', {
              style: {
                width: '100%',
                height: `${(bucket.count / maxCount) * 90}%`, // Scale to 90% of container height
                backgroundColor: getBarColor(index),
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s ease, background-color 0.3s ease',
                minHeight: '2px'
              }
            }),
            // Range label at bottom
            React.createElement('div', {
              style: {
                fontSize: '0.7rem',
                marginTop: '0.25rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                transform: 'rotate(-45deg)',
                whiteSpace: 'nowrap'
              }
            }, `${bucket.range}%`)
          )
        )
      ),
      // Summary info
      React.createElement('div', { 
        style: { 
          marginTop: '1rem', 
          fontSize: '0.8rem', 
          textAlign: 'center',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '0.5rem'
        } 
      },
        `${items.length} total ${type} showing priority distribution across ${buckets} ranges`
      )
    )
  );
};

export default PriorityHistogram;