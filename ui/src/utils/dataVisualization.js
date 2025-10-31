// Data visualization utilities for charts and graphs
import React from 'react';

/**
 * Common data visualization utilities for the UI components
 */

// Create a reusable chart container with common features like tooltips, legends, etc.
export const ChartContainer = ({ 
  title, 
  children, 
  description = null, 
  width = '100%', 
  height = '300px',
  className = '',
  style = {}
}) => {
  return React.createElement('div', {
    className: `chart-container ${className}`,
    style: { 
      width, 
      height,
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '1rem',
      margin: '0.5rem 0',
      backgroundColor: '#fff',
      ...style
    }
  },
    title && React.createElement('h4', {
      style: { 
        margin: '0 0 0.5rem 0', 
        fontSize: '1rem',
        fontWeight: 'bold'
      }
    }, title),
    description && React.createElement('p', {
      style: { 
        margin: '0 0 0.5rem 0', 
        fontSize: '0.8rem',
        color: '#666'
      }
    }, description),
    children
  );
};

// Generic data visualization component that can render different chart types
export const DataVisualizer = ({ 
  data, 
  type = 'bar', 
  xKey, 
  yKey, 
  title,
  width = '100%',
  height = '300px',
  color = '#3498db',
  maxItems = 20 // Cap on number of items to prevent performance issues
}) => {
  // Cap the data to maxItems to prevent performance issues
  const displayData = Array.isArray(data) ? data.slice(0, maxItems) : [];
  
  if (!Array.isArray(data) || data.length === 0) {
    return React.createElement('div', {
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height,
        backgroundColor: '#f8f9fa',
        border: '1px dashed #ccc',
        borderRadius: '4px',
        color: '#666'
      }
    }, 'No data to display');
  }

  // Select rendering function based on type
  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'bar':
        return renderBarChart(displayData, { xKey, yKey, color, width, height });
      case 'line':
        return renderLineChart(displayData, { xKey, yKey, color, width, height });
      case 'pie':
        return renderPieChart(displayData, { xKey, yKey, color, width, height });
      case 'scatter':
        return renderScatterChart(displayData, { xKey, yKey, color, width, height });
      default:
        return renderBarChart(displayData, { xKey, yKey, color, width, height });
    }
  };

  return React.createElement(ChartContainer, { title, width, height }, renderChart());
};

// Bar chart implementation
const renderBarChart = (data, { xKey, yKey, color, width, height }) => {
  if (data.length === 0) return null;

  // Get the maximum value for scaling
  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  if (maxValue === 0) return React.createElement('div', null, 'No data to visualize');

  const barWidth = (parseFloat(width) * 0.8) / data.length;
  const chartHeight = parseFloat(height.replace('px', '')) - 60; // Account for labels
  const chartWidth = parseFloat(width.replace('px', '')) - 60;

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: `${chartHeight}px`,
      padding: '20px',
      overflowX: 'auto'
    }
  }, 
    data.map((item, index) => {
      const value = item[yKey] || 0;
      const heightPercent = maxValue > 0 ? (value / maxValue) * 90 : 0;
      
      return React.createElement('div', {
        key: index,
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: `${barWidth}px`
        }
      },
        React.createElement('div', {
          style: {
            width: `${barWidth * 0.8}px`,
            height: `${heightPercent}%`,
            backgroundColor: color,
            border: '1px solid #2980b9',
            borderRadius: '2px 2px 0 0'
          }
        }),
        React.createElement('div', {
          style: {
            marginTop: '5px',
            fontSize: '0.7rem',
            textAlign: 'center',
            wordBreak: 'break-word',
            transform: 'rotate(-45deg)',
            width: `${barWidth}px`
          }
        }, item[xKey])
      );
    })
  );
};

// Line chart implementation
const renderLineChart = (data, { xKey, yKey, color, width, height }) => {
  if (data.length < 2) return React.createElement('div', null, 'Need at least 2 data points for line chart');

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  if (maxValue === 0) return React.createElement('div', null, 'No data to visualize');

  const chartHeight = parseFloat(height.replace('px', '')) - 60;
  const chartWidth = parseFloat(width.replace('px', '')) - 60;
  const pointSpacing = chartWidth / (data.length - 1);

  // Create SVG path for the line
  let pathD = '';
  data.forEach((item, index) => {
    const x = index * pointSpacing;
    const y = chartHeight - ((item[yKey] || 0) / maxValue) * chartHeight * 0.9;
    
    if (index === 0) {
      pathD += `M ${x} ${y} `;
    } else {
      pathD += `L ${x} ${y} `;
    }
  });

  return React.createElement('div', {
    style: {
      position: 'relative',
      height: `${chartHeight + 40}px`,
      width: '100%'
    }
  },
    React.createElement('svg', {
      width: chartWidth,
      height: chartHeight,
      style: { position: 'absolute', top: '20px', left: '20px' }
    },
      // Draw the line
      React.createElement('path', {
        d: pathD,
        fill: 'none',
        stroke: color,
        strokeWidth: '2'
      }),
      // Draw data points
      data.map((item, index) => {
        const x = index * pointSpacing;
        const y = chartHeight - ((item[yKey] || 0) / maxValue) * chartHeight * 0.9;
        
        return React.createElement('circle', {
          key: index,
          cx: x,
          cy: y,
          r: 4,
          fill: color
        });
      }),
      // Draw grid lines and labels
      React.createElement('g', null,
        // Y-axis labels
        [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = chartHeight - (ratio * chartHeight * 0.9);
          return React.createElement('g', { key: i },
            React.createElement('line', {
              x1: 0,
              y1: y,
              x2: chartWidth,
              y2: y,
              stroke: '#e0e0e0',
              strokeWidth: 1,
              strokeDasharray: '2,2'
            }),
            React.createElement('text', {
              x: -10,
              y: y + 4,
              fontSize: '10px',
              textAnchor: 'end'
            }, Math.round(maxValue * (1 - ratio)))
          );
        })
      )
    ),
    // X-axis labels
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: chartHeight,
        marginLeft: '20px',
        marginRight: '20px'
      }
    },
      data.map((item, index) => 
        React.createElement('div', {
          key: index,
          style: {
            fontSize: '0.7rem',
            textAlign: 'center',
            transform: 'rotate(-45deg)',
            width: `${pointSpacing}px`
          }
        }, item[xKey])
      )
    )
  );
};

// Simple pie chart implementation
const renderPieChart = (data, { xKey, yKey, color, width, height }) => {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + (d[yKey] || 0), 0);
  if (total === 0) return React.createElement('div', null, 'No data to visualize');

  const centerX = parseFloat(width.replace('px', '')) / 2;
  const centerY = parseFloat(height.replace('px', '')) / 2 - 20;
  const radius = Math.min(centerX, centerY) * 0.8;

  let startAngle = 0;
  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
  ];

  return React.createElement('svg', {
    width: width,
    height: height,
    style: { marginTop: '20px' }
  },
    data.map((item, index) => {
      const value = item[yKey] || 0;
      const sliceAngle = (value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      // Calculate start and end points of the arc
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      // Large arc flag: 1 if angle > π, 0 otherwise
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      const sliceColor = colors[index % colors.length];
      
      const result = React.createElement('path', {
        key: index,
        d: pathData,
        fill: sliceColor,
        stroke: '#fff',
        strokeWidth: 1
      });

      startAngle = endAngle;
      return result;
    }),
    // Add labels
    data.map((item, index) => {
      const value = item[yKey] || 0;
      const sliceAngle = (value / total) * 2 * Math.PI;
      const midAngle = startAngle + sliceAngle / 2;

      const labelX = centerX + (radius * 0.6) * Math.cos(midAngle);
      const labelY = centerY + (radius * 0.6) * Math.sin(midAngle);

      return React.createElement('text', {
        key: `label-${index}`,
        x: labelX,
        y: labelY,
        textAnchor: 'middle',
        fontSize: '12px',
        fill: '#fff',
        fontWeight: 'bold'
      }, `${Math.round((value / total) * 100)}%`);
    })
  );
};

// Scatter plot implementation
const renderScatterChart = (data, { xKey, yKey, color, width, height }) => {
  if (data.length === 0) return null;

  const xValues = data.map(d => d[xKey] || 0);
  const yValues = data.map(d => d[yKey] || 0);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xRange = xMax - xMin || 1; // Avoid division by zero
  const yRange = yMax - yMin || 1;

  const chartHeight = parseFloat(height.replace('px', '')) - 60;
  const chartWidth = parseFloat(width.replace('px', '')) - 60;

  return React.createElement('div', {
    style: {
      position: 'relative',
      height: `${chartHeight + 40}px`,
      width: '100%'
    }
  },
    React.createElement('svg', {
      width: chartWidth,
      height: chartHeight,
      style: { position: 'absolute', top: '20px', left: '20px' }
    },
      // Draw grid
      React.createElement('g', null,
        // X-axis grid
        [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const x = ratio * chartWidth;
          return React.createElement('g', { key: `xgrid-${i}` },
            React.createElement('line', {
              x1: x,
              y1: 0,
              x2: x,
              y2: chartHeight,
              stroke: '#e0e0e0',
              strokeWidth: 1,
              strokeDasharray: '2,2'
            }),
            React.createElement('text', {
              x: x,
              y: chartHeight + 15,
              fontSize: '10px',
              textAnchor: 'middle'
            }, Math.round(xMin + (xRange * ratio)))
          );
        }),
        // Y-axis grid
        [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = chartHeight - (ratio * chartHeight);
          return React.createElement('g', { key: `ygrid-${i}` },
            React.createElement('line', {
              x1: 0,
              y1: y,
              x2: chartWidth,
              y2: y,
              stroke: '#e0e0e0',
              strokeWidth: 1,
              strokeDasharray: '2,2'
            }),
            React.createElement('text', {
              x: -10,
              y: y + 4,
              fontSize: '10px',
              textAnchor: 'end'
            }, Math.round(yMin + (yRange * (1 - ratio))))
          );
        })
      ),
      // Draw points
      data.map((item, index) => {
        const x = ((item[xKey] - xMin) / xRange) * chartWidth;
        const y = chartHeight - ((item[yKey] - yMin) / yRange) * chartHeight;
        
        return React.createElement('circle', {
          key: index,
          cx: x,
          cy: y,
          r: 4,
          fill: color,
          stroke: '#2980b9',
          strokeWidth: 1
        });
      })
    )
  );
};

// Create a common list utility component
export const ListDisplay = ({ 
  items, 
  renderItem, 
  emptyMessage = 'No items to display', 
  maxItems = 100,
  className = '',
  style = {}
}) => {
  const displayItems = Array.isArray(items) ? items.slice(0, maxItems) : [];

  return React.createElement('div', {
    className: `list-display ${className}`,
    style: {
      maxHeight: '100%',
      overflowY: 'auto',
      ...style
    }
  },
    displayItems.length > 0 
      ? displayItems.map((item, index) => renderItem(item, index))
      : React.createElement('div', {
          style: { 
            padding: '1rem', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }
        }, emptyMessage)
  );
};

// Create a common table utility component
export const TableDisplay = ({ 
  data, 
  columns, 
  title = null, 
  emptyMessage = 'No data to display',
  maxRows = 50,
  className = '',
  style = {}
}) => {
  const displayData = Array.isArray(data) ? data.slice(0, maxRows) : [];

  if (!Array.isArray(data) || data.length === 0) {
    return React.createElement('div', {
      className: `table-display ${className}`,
      style
    },
      title && React.createElement('h4', {
        style: { margin: '0 0 0.5rem 0' }
      }, title),
      React.createElement('div', {
        style: { 
          padding: '1rem', 
          textAlign: 'center', 
          color: '#999',
          fontStyle: 'italic'
        }
      }, emptyMessage)
    );
  }

  return React.createElement('div', {
    className: `table-display ${className}`,
    style
  },
    title && React.createElement('h4', {
      style: { margin: '0 0 0.5rem 0' }
    }, title),
    React.createElement('table', {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #ddd',
        fontSize: '0.9rem'
      }
    },
      React.createElement('thead', null,
        React.createElement('tr', null,
          columns.map((col, idx) => 
            React.createElement('th', {
              key: idx,
              style: {
                border: '1px solid #ddd',
                padding: '0.5rem',
                backgroundColor: '#f8f9fa',
                fontWeight: 'bold',
                textAlign: 'left'
              }
            }, col.header || col.key)
          )
        )
      ),
      React.createElement('tbody', null,
        displayData.map((row, rowIndex) => 
          React.createElement('tr', {
            key: row.id || rowIndex,
            style: { 
              backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#f9f9f9' 
            }
          },
            columns.map((col, colIndex) => 
              React.createElement('td', {
                key: colIndex,
                style: {
                  border: '1px solid #ddd',
                  padding: '0.5rem'
                }
              },
                col.render 
                  ? col.render(row[col.key], row, rowIndex) 
                  : row[col.key]
              )
            )
          )
        )
      )
    )
  );
};

// Create a common filter and search utility
export const SearchAndFilter = ({ 
  onFilter, 
  placeholder = 'Search...', 
  filters = [],
  className = '',
  style = {}
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilter && onFilter(value);
  };

  return React.createElement('div', {
    className: `search-filter ${className}`,
    style
  },
    React.createElement('input', {
      type: 'text',
      value: searchTerm,
      onChange: handleChange,
      placeholder: placeholder,
      style: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem'
      }
    }),
    filters.length > 0 && React.createElement('div', {
      style: {
        marginTop: '0.5rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }
    },
      filters.map((filter, index) => 
        React.createElement('button', {
          key: index,
          onClick: () => filter.action && filter.action(),
          style: {
            padding: '0.25rem 0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }
        }, filter.label)
      )
    )
  );
};

// Export the utilities
export default {
  ChartContainer,
  DataVisualizer,
  ListDisplay,
  TableDisplay,
  SearchAndFilter
};