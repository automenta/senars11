import React, { useCallback, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import GenericPanel from './GenericPanel.js';

const TaskMonitorPanel = () => {
  const tasks = useUiStore(state => state.tasks);
  const reasoningSteps = useUiStore(state => state.reasoningSteps);
    
  const renderTask = useCallback((task, index) =>
    React.createElement('div',
      {
        key: task.id || `task-${index}`,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: task.type === 'QUESTION' ? '#e7f3ff' : 
            task.type === 'GOAL' ? '#fff3cd' : 
              task.type === 'BELIEF' ? '#e8f5e8' : 'white',
          border: `1px solid ${task.type === 'QUESTION' ? '#b8daff' : 
            task.type === 'GOAL' ? '#ffeaa7' : 
              task.type === 'BELIEF' ? '#a3d9a5' : '#ddd'}`,
          borderRadius: '4px',
          fontSize: '0.85rem'
        }
      },
      React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}},
        React.createElement('span', null, task.term || 'No term'),
        React.createElement('span', {style: {fontSize: '0.75rem', color: '#666'}}, task.type || 'Unknown')
      ),
      task.truth && React.createElement('div', {style: {fontSize: '0.8rem', marginTop: '0.25rem'}},
        `Truth: ${formatTruth(task.truth)}`
      ),
      task.budget && React.createElement('div', {style: {fontSize: '0.8rem'}},
        `Budget: ${formatBudget(task.budget)}`
      ),
      task.occurrenceTime && React.createElement('div', {style: {fontSize: '0.7rem', color: '#666', marginTop: '0.25rem'}},
        `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
      )
    ), []);

  // Render reasoning steps as well
  const renderReasoningStep = useCallback((step, index) =>
    React.createElement('div',
      {
        key: step.id || `step-${index}`,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '0.85rem'
        }
      },
      step.step && React.createElement('div', {style: {fontWeight: 'bold'}}, `Step ${step.step}`),
      step.description && React.createElement('div', null, step.description),
      step.result && React.createElement('div', {style: {marginTop: '0.25rem', fontStyle: 'italic'}},
        `Result: ${step.result}`
      ),
      step.timestamp && React.createElement('div', {style: {fontSize: '0.7rem', color: '#666', marginTop: '0.25rem'}},
        `Time: ${new Date(step.timestamp).toLocaleTimeString()}`
      )
    ), []);

  // Combine tasks and reasoning steps
  const items = useMemo(() => [
    { type: 'header', content: 'Recent Tasks' },
    ...tasks.map(t => ({ type: 'task', data: t })),
    { type: 'header', content: 'Recent Reasoning Steps' },
    ...reasoningSteps.map(s => ({ type: 'reasoningStep', data: s }))
  ], [tasks, reasoningSteps]);

  const renderMonitorItem = useCallback((item, index) => {
    if (item.type === 'header') {
      return React.createElement('div', {
        style: {
          fontWeight: 'bold',
          fontSize: '1rem',
          margin: '1rem 0 0.5rem 0',
          padding: '0.5rem 0',
          borderBottom: '2px solid #007bff',
          color: '#333'
        }
      }, item.content);
    } else if (item.type === 'task') {
      return renderTask(item.data, index);
    } else if (item.type === 'reasoningStep') {
      return renderReasoningStep(item.data, index);
    }
    return null;
  }, [renderTask, renderReasoningStep]);

  return React.createElement(GenericPanel, {
    title: 'Task Monitor',
    maxHeight: 'calc(100% - 2rem)',
    items,
    renderItem: renderMonitorItem,
    emptyMessage: 'Task information will be populated as the reasoning engine processes inputs.'
  });
};

export default TaskMonitorPanel;