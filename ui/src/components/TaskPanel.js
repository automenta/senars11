import React from 'react';
import useUiStore from '../stores/uiStore.js';

const TaskPanel = () => {
  const tasks = useUiStore(state => state.tasks);
  const addTask = useUiStore(state => state.addTask);
  
  const formatTruth = (truth) => {
    if (!truth) return 'N/A';
    return `${(truth.frequency * 100).toFixed(1)}% @ ${(truth.confidence * 100).toFixed(1)}%`;
  };

  const formatBudget = (budget) => {
    if (!budget) return 'N/A';
    return `P:${budget.priority.toFixed(2)} D:${budget.durability.toFixed(2)} Q:${budget.quality.toFixed(2)}`;
  };

  return React.createElement('div', { 
    className: 'task-panel',
    style: { 
      padding: '1rem', 
      height: '100%', 
      overflowY: 'auto',
      backgroundColor: '#f8f9fa',
      fontFamily: 'monospace'
    } 
  },
    React.createElement('h3', { style: { margin: '0 0 1rem 0', fontSize: '1.1rem' } }, 'Tasks'),
    React.createElement('div', { style: { maxHeight: 'calc(100% - 2rem)', overflowY: 'auto' } },
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
    )
  );
};

export default TaskPanel;