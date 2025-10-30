import React from 'react';
import useUiStore from '../stores/uiStore.js';
import { formatTruth, formatBudget } from '../utils/formatters.js';
import GenericPanel from './GenericPanel.js';

const TaskPanel = () => {
  const tasks = useUiStore(state => state.tasks);
  
  const renderTask = (task, index) => 
    React.createElement('div', 
      { 
        key: task.id || index,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', { style: { fontWeight: 'bold' } }, task.term),
      React.createElement('div', null, 
        `Type: ${task.type} | Truth: ${formatTruth(task.truth)} | Budget: ${formatBudget(task.budget)}`
      ),
      task.occurrenceTime && React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } }, 
        `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
      )
    );

  return React.createElement(GenericPanel, { 
    maxHeight: 'calc(100% - 2rem)',
    items: tasks,
    renderItem: renderTask
  });
};

export default TaskPanel;