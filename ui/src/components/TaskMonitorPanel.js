import React, { useCallback, useMemo, useState } from 'react';
import useUiStore from '../stores/uiStore.js';
import {formatBudget, formatTruth} from '../utils/formatters.js';
import GenericPanel from './GenericPanel.js';
import TaskRelationshipGraph from './TaskRelationshipGraph.js';
import TaskFlowDiagram from './TaskFlowDiagram.js';
import { createTaskDisplayElement } from '../utils/taskUtils.js';

const TaskMonitorPanel = () => {
  const [expandedTask, setExpandedTask] = useState(null);
  const [showTransformations, setShowTransformations] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showRelationships, setShowRelationships] = useState(false);
  const [showFlowDiagram, setShowFlowDiagram] = useState(false);
  
  const tasks = useUiStore(state => state.tasks);
  const reasoningSteps = useUiStore(state => state.reasoningSteps);
    
  const getTaskTransformations = useCallback((task) => {
    if (!reasoningSteps?.length) return [];
    
    return reasoningSteps.filter(step => {
      const searchTerms = [task.term, task.id].filter(Boolean);
      return searchTerms.some(term => 
        step.input?.includes(term) || 
        step.result?.includes(term) || 
        step.description?.includes(term)
      );
    });
  }, [reasoningSteps]);
    
  const renderTask = useCallback((task, index) => {
    const isExpanded = expandedTask === (task.id || `task-${index}`);
    const transformations = getTaskTransformations(task);
    const hasTransformations = transformations.length > 0;
    
    // If we're filtering and this doesn't match, return null
    if (filterType !== 'all' && filterType !== task.type?.toLowerCase()) {
      return null;
    }
    
    // Create base task display element
    const baseTaskElement = createTaskDisplayElement(React, task, {
      onClick: () => setExpandedTask(isExpanded ? null : (task.id || `task-${index}`)),
      isExpanded: false, // We'll handle expansion separately
      showTruth: false, // We'll show truth details manually when expanded
      showBudget: false, // We'll show budget details manually when expanded
      showTime: false  // We'll show time details manually when expanded
    });
    
    // Build the full element
    return React.createElement('div',
      {
        key: task.id || `task-${index}`,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: task.type === 'question' || task.type === 'QUESTION' ? '#e7f3ff' : 
            task.type === 'goal' || task.type === 'GOAL' ? '#fff3cd' : 
              task.type === 'belief' || task.type === 'BELIEF' ? '#e8f5e8' : 'white',
          border: `1px solid ${task.type === 'question' || task.type === 'QUESTION' ? '#b8daff' : 
            task.type === 'goal' || task.type === 'GOAL' ? '#ffeaa7' : 
              task.type === 'belief' || task.type === 'BELIEF' ? '#a3d9a5' : '#ddd'}`,
          borderRadius: '4px',
          fontSize: '0.85rem'
        }
      },
      React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', cursor: 'pointer'},
        onClick: () => setExpandedTask(isExpanded ? null : (task.id || `task-${index}`))
      },
        React.createElement('span', null, task.term || 'No term'),
        React.createElement('div', {style: {display: 'flex', gap: '0.5rem'}},
          React.createElement('span', {style: {fontSize: '0.75rem', color: '#666'}}, task.type || 'Unknown'),
          hasTransformations && React.createElement('span', {style: {fontSize: '0.75rem', color: '#007bff'}}, `(${transformations.length} transformations)`)
        )
      ),
      isExpanded && React.createElement('div', {style: {marginTop: '0.25rem'}},
        task.truth && React.createElement('div', {style: {fontSize: '0.8rem'}},
          `Truth: ${formatTruth(task.truth)}`
        ),
        task.budget && React.createElement('div', {style: {fontSize: '0.8rem'}},
          `Budget: ${formatBudget(task.budget)}`
        ),
        task.occurrenceTime && React.createElement('div', {style: {fontSize: '0.7rem', color: '#666', marginTop: '0.25rem'}},
          `Time: ${new Date(task.occurrenceTime).toLocaleTimeString()}`
        ),
        // Show transformations if available
        showTransformations && hasTransformations && React.createElement('div', {style: {marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '4px'}},
          React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.25rem', color: '#007bff'}}, 'Transformations:'),
          transformations.map((transform, idx) => 
            React.createElement('div', {key: idx, style: {padding: '0.25rem 0', fontSize: '0.75rem', borderLeft: '2px solid #007bff', paddingLeft: '0.5rem'}},
              React.createElement('div', {style: {fontWeight: '500'}}, transform.description || 'Transformation'),
              transform.result && React.createElement('div', {style: {fontStyle: 'italic', fontSize: '0.7rem'}}, `Result: ${transform.result}`)
            )
          )
        ),
        // Show dependencies if available
        task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0 && 
          React.createElement('div', {style: {marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f0f8f0', border: '1px solid #c3e6c3', borderRadius: '4px'}},
            React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.25rem', color: '#155724'}}, 'Dependencies:'),
            React.createElement('div', {style: {fontSize: '0.75rem'}}, task.dependencies.join(', '))
          )
      )
    );
  }, [expandedTask, showTransformations, getTaskTransformations, formatTruth, formatBudget, filterType]);

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

  const renderControlBar = useCallback(() => 
    React.createElement('div', 
      {style: {display: 'flex', gap: '1rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', flexWrap: 'wrap'}},
      React.createElement('div', {style: { flex: 1, minWidth: '150px' } },
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
          React.createElement('option', { value: 'all' }, 'All Tasks'),
          React.createElement('option', { value: 'question' }, 'Questions'),
          React.createElement('option', { value: 'goal' }, 'Goals'),
          React.createElement('option', { value: 'belief' }, 'Beliefs')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showTransformations,
            onChange: (e) => setShowTransformations(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: '0.9rem'}}, 'Show Transformations')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showRelationships,
            onChange: (e) => setShowRelationships(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: '0.9rem'}}, 'Show Relationships')
        )
      ),
      React.createElement('div', {style: {flex: 1, display: 'flex', alignItems: 'center', minWidth: '150px'}},
        React.createElement('label', {style: {display: 'flex', alignItems: 'center', gap: '0.5rem'}},
          React.createElement('input', {
            type: 'checkbox',
            checked: showFlowDiagram,
            onChange: (e) => setShowFlowDiagram(e.target.checked)
          }),
          React.createElement('span', {style: {fontSize: '0.9rem'}}, 'Show Flow Diagram')
        )
      )
    ), [filterType, showTransformations, showRelationships, showFlowDiagram]);

  // Combine tasks and reasoning steps
  const items = useMemo(() => {
    const result = [
      { type: 'controls', controlBar: renderControlBar() }
    ];
    
    if (showFlowDiagram) {
      result.push({ type: 'flowDiagram', content: React.createElement(TaskFlowDiagram) });
    } else if (showRelationships) {
      result.push({ type: 'relationships', content: React.createElement(TaskRelationshipGraph) });
    } else {
      result.push({ type: 'header', content: 'Recent Tasks' });
      result.push(...tasks.map(t => ({ type: 'task', data: t })));
      result.push({ type: 'header', content: 'Recent Reasoning Steps' });
      result.push(...reasoningSteps.map(s => ({ type: 'reasoningStep', data: s })));
    }
    
    return result;
  }, [tasks, reasoningSteps, renderControlBar, showRelationships, showFlowDiagram]);

  const renderMonitorItem = useCallback((item, index) => {
    if (item.type === 'controls') {
      return item.controlBar;
    } else if (item.type === 'flowDiagram') {
      return React.createElement('div', {style: {marginBottom: '1rem'}}, item.content);
    } else if (item.type === 'relationships') {
      return React.createElement('div', {style: {marginBottom: '1rem'}}, item.content);
    } else if (item.type === 'header') {
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
    emptyMessage: showFlowDiagram 
      ? 'Task flow diagram will be populated as the reasoning engine processes inputs.' 
      : showRelationships 
        ? 'Task relationship graph will be populated as the reasoning engine processes inputs.' 
        : 'Task information will be populated as the reasoning engine processes inputs.'
  });
};

export default TaskMonitorPanel;