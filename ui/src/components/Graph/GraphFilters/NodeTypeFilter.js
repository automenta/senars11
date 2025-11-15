import React from 'react';

const NodeTypeFilter = ({ 
  filters, 
  onFilterChange 
}) => {
  return React.createElement('div', {
    style: {
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '4px',
      border: '1px solid #ddd',
      marginBottom: '10px'
    }
  },
  React.createElement('h4', null, 'Node Type Filter'),
  React.createElement('div', null,
    React.createElement('label', { style: { display: 'block', marginBottom: '5px' } },
      React.createElement('input', {
        type: "checkbox",
        checked: filters.concepts,
        onChange: (e) => onFilterChange('concepts', e.target.checked)
      }),
      ' Concepts'
    ),
    React.createElement('label', { style: { display: 'block', marginBottom: '5px' } },
      React.createElement('input', {
        type: "checkbox",
        checked: filters.tasks,
        onChange: (e) => onFilterChange('tasks', e.target.checked)
      }),
      ' Tasks'
    ),
    React.createElement('label', { style: { display: 'block', marginBottom: '5px' } },
      React.createElement('input', {
        type: "checkbox",
        checked: filters.beliefs,
        onChange: (e) => onFilterChange('beliefs', e.target.checked)
      }),
      ' Beliefs'
    ),
    React.createElement('label', { style: { display: 'block', marginBottom: '5px' } },
      React.createElement('input', {
        type: "checkbox",
        checked: filters.goals,
        onChange: (e) => onFilterChange('goals', e.target.checked)
      }),
      ' Goals'
    ),
    React.createElement('label', { style: { display: 'block', marginBottom: '5px' } },
      React.createElement('input', {
        type: "checkbox",
        checked: filters.questions,
        onChange: (e) => onFilterChange('questions', e.target.checked)
      }),
      ' Questions'
    )
  )
  );
};

export default NodeTypeFilter;