/**
 * Utility functions for task handling and visualization
 */

// Get background color based on task type
export const getTaskColor = (taskType) => {
  if (!taskType) return '#ffffff';
  const lowerType = taskType.toLowerCase();
  
  switch(lowerType) {
    case 'question':
    case 'QUESTION':
      return '#e7f3ff';
    case 'goal':
    case 'GOAL':
      return '#fff3cd';
    case 'belief':
    case 'BELIEF':
      return '#e8f5e8';
    default:
      return '#ffffff';
  }
};

// Get border color based on task type
export const getTaskBorderColor = (taskType) => {
  if (!taskType) return '#ddd';
  const lowerType = taskType.toLowerCase();
  
  switch(lowerType) {
    case 'question':
    case 'QUESTION':
      return '#b8daff';
    case 'goal':
    case 'GOAL':
      return '#ffeaa7';
    case 'belief':
    case 'BELIEF':
      return '#a3d9a5';
    default:
      return '#ddd';
  }
};

export const getRelationshipColor = (relationshipType) => {
  switch (relationshipType) {
    case 'dependency':
      return '#28a745'; // Green for dependencies
    case 'influences':
      return '#007bff'; // Blue for influences
    default: // term-related
      return '#ffc107'; // Yellow for term related
  }
};

export const getTaskText = (taskTerm, maxLength = 10) => {
  return taskTerm && taskTerm.length > maxLength 
    ? taskTerm.substring(0, maxLength) + '...' 
    : taskTerm || 'Task';
};

// Create consistent task display element
export const createTaskDisplayElement = (React, task, options = {}) => {
  const {
    showTruth = true,
    showBudget = true,
    showTime = true,
    onClick = null,
    isExpanded = false,
    className = '',
    includeExpandToggle = true
  } = options;
  
  const taskColor = getTaskColor(task.type);
  const taskBorderColor = getTaskBorderColor(task.type);
  
  const content = [
    React.createElement('div', {
      style: {
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default'
      },
      onClick: onClick
    },
      React.createElement('span', null, task.term || 'No term'),
      React.createElement('div', {style: {display: 'flex', gap: '0.5rem'}},
        React.createElement('span', {style: {fontSize: '0.75rem', color: '#666'}}, task.type || 'Unknown')
      )
    )
  ];
  
  if (isExpanded) {
    const expandedContent = [];
    if (showTruth && task.truth) {
      expandedContent.push(
        React.createElement('div', {style: {fontSize: '0.8rem', marginTop: '0.25rem'}},
          `Truth: ${JSON.stringify(task.truth)}`
        )
      );
    }
    if (showBudget && task.budget) {
      expandedContent.push(
        React.createElement('div', {style: {fontSize: '0.8rem'}},
          `Budget: Priority ${task.budget.priority?.toFixed(3) || 0}, Durability ${task.budget.durability?.toFixed(3) || 0}`
        )
      );
    }
    if (showTime && task.occurrenceTime) {
      expandedContent.push(
        React.createElement('div', {style: {fontSize: '0.7rem', color: '#666', marginTop: '0.25rem'}},
          `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
        )
      );
    }
    content.push(...expandedContent);
  }
  
  return React.createElement('div',
    {
      className: className,
      style: {
        padding: '0.5rem',
        margin: '0.25rem 0',
        backgroundColor: taskColor,
        border: `1px solid ${taskBorderColor}`,
        borderRadius: '4px',
        fontSize: '0.85rem'
      }
    },
    ...content
  );
};

// Common filter options for different components
export const commonFilterOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'reasoningStep', label: 'Reasoning Steps' },
  { value: 'task', label: 'Tasks' }
];

// Create a standard filter control component
export const createFilterControls = (React, props) => {
  const {
    filterType,
    setFilterType,
    filterText,
    setFilterText,
    exportFormat,
    setExportFormat,
    exportData,
    filterOptions = commonFilterOptions,
    showExport = true
  } = props;
  
  return React.createElement('div',
    {
      style: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        flexWrap: 'wrap'
      }
    },
    React.createElement('div', { style: { flex: 1, minWidth: '150px' } },
      React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' } }, 'Filter by Type:'),
      React.createElement('select', {
        value: filterType,
        onChange: (e) => setFilterType(e.target.value),
        style: {
          width: '100%',
          padding: '0.25rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
        filterOptions.map(opt => 
          React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
        )
      )
    ),
    React.createElement('div', { style: { flex: 1, minWidth: '150px' } },
      React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' } }, 'Search:'),
      React.createElement('input', {
        type: 'text',
        value: filterText,
        onChange: (e) => setFilterText(e.target.value),
        placeholder: 'Search in events...',
        style: {
          width: '100%',
          padding: '0.25rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      })
    ),
    showExport && React.createElement('div', { style: { flex: 1, minWidth: '150px' } },
      React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' } }, 'Export Format:'),
      React.createElement('select', {
        value: exportFormat,
        onChange: (e) => setExportFormat(e.target.value),
        style: {
          width: '100%',
          padding: '0.25rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
        React.createElement('option', { value: 'json' }, 'JSON'),
        React.createElement('option', { value: 'csv' }, 'CSV'),
        React.createElement('option', { value: 'text' }, 'Text')
      )
    ),
    showExport && React.createElement('div', { style: { flex: 0.5, minWidth: '100px', display: 'flex', alignItems: 'flex-end' } },
      React.createElement('button', {
        onClick: exportData,
        style: {
          width: '100%',
          padding: '0.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
          cursor: 'pointer'
        }
      }, 'Export')
    )
  );
};