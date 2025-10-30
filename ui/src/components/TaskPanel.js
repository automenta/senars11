import React from 'react';
import useUiStore from '../stores/uiStore.js';
import { formatTruth, formatBudget } from '../utils/formatters.js';

const TaskPanel = () => {
  const tasks = useUiStore(state => state.tasks);
  
  return React.createElement('div', { style: { maxHeight: 'calc(100% - 2rem)', overflowY: 'auto' } },
    tasks.map((task, index) => 
      React.createElement('div', { 
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
      )
    )
  );
};

export default TaskPanel;