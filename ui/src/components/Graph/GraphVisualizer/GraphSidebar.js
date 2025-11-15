import React from 'react';

const GraphSidebar = ({ 
  nodeCounts, 
  onFilterChange, 
  filters, 
  onLayoutChange,
  statistics 
}) => {
  return React.createElement('div', {
    style: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '250px',
      height: '100%',
      backgroundColor: 'white',
      borderRight: '1px solid #ddd',
      padding: '15px',
      overflowY: 'auto',
      zIndex: 10
    }
  },
  React.createElement('h3', null, 'Graph Controls'),

  React.createElement('div', { style: { marginBottom: '20px' } },
    React.createElement('h4', null, 'Node Counts'),
    React.createElement('ul', { style: { listStyle: 'none', padding: 0 } },
      React.createElement('li', null, `Concepts: ${nodeCounts.concepts}`),
      React.createElement('li', null, `Tasks: ${nodeCounts.tasks}`),
      React.createElement('li', null, `Beliefs: ${nodeCounts.beliefs}`),
      React.createElement('li', null, `Goals: ${nodeCounts.goals}`)
    )
  ),

  React.createElement('div', { style: { marginBottom: '20px' } },
    React.createElement('h4', null, 'Filters'),
    React.createElement('div', null,
      React.createElement('label', null,
        React.createElement('input', {
          type: "checkbox",
          checked: filters.concepts,
          onChange: (e) => onFilterChange('concepts', e.target.checked)
        }),
        ' Concepts'
      )
    ),
    React.createElement('div', null,
      React.createElement('label', null,
        React.createElement('input', {
          type: "checkbox",
          checked: filters.tasks,
          onChange: (e) => onFilterChange('tasks', e.target.checked)
        }),
        ' Tasks'
      )
    ),
    React.createElement('div', null,
      React.createElement('label', null,
        React.createElement('input', {
          type: "checkbox",
          checked: filters.beliefs,
          onChange: (e) => onFilterChange('beliefs', e.target.checked)
        }),
        ' Beliefs'
      )
    ),
    React.createElement('div', null,
      React.createElement('label', null,
        React.createElement('input', {
          type: "checkbox",
          checked: filters.goals,
          onChange: (e) => onFilterChange('goals', e.target.checked)
        }),
        ' Goals'
      )
    )
  ),

  React.createElement('div', { style: { marginBottom: '20px' } },
    React.createElement('h4', null, 'Layout'),
    React.createElement('select', {
      onChange: (e) => onLayoutChange(e.target.value),
      style: { width: '100%', padding: '5px' }
    },
      React.createElement('option', { value: "force" }, 'Force-Directed'),
      React.createElement('option', { value: "hierarchical" }, 'Hierarchical'),
      React.createElement('option', { value: "circular" }, 'Circular')
    )
  ),

  React.createElement('div', null,
    React.createElement('h4', null, 'Statistics'),
    React.createElement('ul', {
      style: { listStyle: 'none', padding: 0, fontSize: '0.9em' }
    },
      statistics && [
        React.createElement('li', { key: 'nodes' }, `Nodes: ${statistics.nodeCount}`),
        React.createElement('li', { key: 'edges' }, `Edges: ${statistics.edgeCount}`),
        React.createElement('li', { key: 'density' },
          `Density: ${statistics.density ? statistics.density.toFixed(3) : 'N/A'}`
        )
      ]
    )
  )
  );
};

export default GraphSidebar;