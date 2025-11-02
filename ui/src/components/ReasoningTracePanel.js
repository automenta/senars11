import React, { useState, useCallback, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import { exportReasoningTraces } from '../utils/exportUtils.js';
import { createFilterControls, commonFilterOptions } from '../utils/taskUtils.js';
import { processDataWithFilters } from '../utils/dataProcessor.js';

const ReasoningTracePanel = () => {
  const [expandedTrace, setExpandedTrace] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [annotations, setAnnotations] = useState({});
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const reasoningSteps = useUiStore(state => state.reasoningSteps);
  const tasks = useUiStore(state => state.tasks);
    
  const traceGroups = useMemo(() => {
    const reasoningData = reasoningSteps.map((step, index) => ({
      id: `step-${index}`,
      type: 'reasoningStep',
      data: step,
      timestamp: step.timestamp || 0,
      description: step.description || 'No description'
    }));
    
    const taskData = tasks
      .filter(task => task.creationTime)
      .map((task, index) => ({
        id: `task-${index + reasoningSteps.length}`,
        type: 'task',
        data: task,
        timestamp: task.creationTime,
        description: `Task: ${task.term || 'Unknown'} (${task.type || 'Unknown'})`
      }));
    
    const combinedData = [...reasoningData, ...taskData];
        
    return processDataWithFilters(combinedData, {
      filterType,
      filterText,
      typeField: 'type',
      searchFields: ['description', 'data.term', 'data.type', 'data.result'],
      sortKey: 'timestamp',
      sortOrder: 'asc'
    });
  }, [reasoningSteps, tasks, filterType, filterText]);

  const exportTraceData = useCallback(() => {
    exportReasoningTraces(traceGroups, filterType, filterText, exportFormat);
  }, [traceGroups, filterType, filterText, exportFormat]);

  const highlightText = useCallback((text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? React.createElement('span', { key: i, style: { backgroundColor: '#ffff00', fontWeight: 'bold' } }, part)
        : part
    );
  }, []);

  const updateAnnotation = useCallback((item, value) => {
    setAnnotations(prev => ({ ...prev, [item.id]: value }));
  }, []);

  const saveAnnotation = useCallback(() => setEditingAnnotation(null), []);

  const cancelAnnotation = useCallback((item) => {
    setAnnotations(prev => ({ ...prev, [item.id]: annotations[item.id] || '' }));
    setEditingAnnotation(null);
  }, [annotations]);

  const deleteAnnotation = useCallback((item) => {
    setAnnotations(prev => {
      const newAnnotations = { ...prev };
      delete newAnnotations[item.id];
      return newAnnotations;
    });
  }, []);

  const createReasoningContentElement = useCallback((step, filterText) => 
    React.createElement('div', null,
      step.step !== undefined && React.createElement('div', {style: {fontWeight: 'bold'}}, `Step ${step.step}`),
      step.description && React.createElement('div', null, highlightText(step.description, filterText)),
      step.result && React.createElement('div', {style: {fontWeight: '500', marginTop: '0.5rem'}}, 
        `Result: ${highlightText(step.result, filterText)}`
      ),
      step.metadata && typeof step.metadata === 'object' && Object.keys(step.metadata).length > 0 && 
              React.createElement('div', 
                {style: {fontSize: '0.8rem', marginTop: '0.5rem', color: '#666'}},
                React.createElement('div', {style: {fontWeight: 'bold'}}, 'Metadata:'),
                Object.entries(step.metadata).map(([key, value]) => 
                  React.createElement('div', {key}, `${highlightText(key, filterText)}: ${JSON.stringify(value)}`)
                )
              )
    ), [highlightText]);

  const createTaskContentElement = useCallback((task, filterText) => 
    React.createElement('div', null,
      task.term && React.createElement('div', {style: {fontWeight: 'bold'}}, highlightText(task.term, filterText)),
      task.type && React.createElement('div', {style: {fontSize: '0.8rem', color: '#666'}}, `Type: ${highlightText(task.type, filterText)}`),
      task.truth && React.createElement('div', null, `Truth: ${highlightText(JSON.stringify(task.truth), filterText)}`),
      task.budget && React.createElement('div', {style: {fontSize: '0.8rem'}}, 
        `Priority: ${highlightText((task.budget.priority || 0).toFixed(3), filterText)}`
      )
    ), [highlightText]);

  const createAnnotationEditor = useCallback((item, hasAnnotation) => {
    const handleAnnotationChange = (e) => updateAnnotation(item, e.target.value);
    
    return React.createElement('div', {style: {marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px'}},
      React.createElement('div', {style: {marginBottom: '0.5rem', fontWeight: 'bold', color: '#856404'}}, 'Add Annotation:'),
      React.createElement('textarea', {
        value: annotations[item.id] || '',
        onChange: handleAnnotationChange,
        placeholder: 'Explain this reasoning moment...',
        style: {
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem',
          minHeight: '60px',
          resize: 'vertical'
        }
      }),
      React.createElement('div', {style: {display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}},
        React.createElement('button', {
          onClick: saveAnnotation,
          style: {
            padding: '0.25rem 0.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Save'),
        React.createElement('button', {
          onClick: () => cancelAnnotation(item),
          style: {
            padding: '0.25rem 0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Cancel')
      )
    );
  }, [annotations, updateAnnotation, saveAnnotation, cancelAnnotation]);

  const createAnnotationDisplay = useCallback((item, hasAnnotation) => 
    React.createElement('div', {style: {marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px'}},
      React.createElement('div', {style: {fontWeight: 'bold', color: '#856404', marginBottom: '0.25rem'}}, 'Annotation:'),
      React.createElement('div', {style: {fontSize: '0.9rem'}}, annotations[item.id]),
      React.createElement('div', {style: {display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem'}},
        React.createElement('button', {
          onClick: () => setEditingAnnotation(item.id),
          style: {
            padding: '0.25rem 0.5rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }
        }, 'Edit'),
        React.createElement('button', {
          onClick: () => deleteAnnotation(item),
          style: {
            padding: '0.25rem 0.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }
        }, 'Delete')
      )
    ), [annotations, deleteAnnotation]);

  const renderTraceItem = useCallback((item) => {
    const isExpanded = expandedTrace === item.id;
    const hasAnnotation = annotations[item.id];
    const isAnnotating = editingAnnotation === item.id;
    
    const contentElement = item.type === 'reasoningStep' 
      ? createReasoningContentElement(item.data, filterText) 
      : createTaskContentElement(item.data, filterText);
    
    const annotationEditor = isAnnotating ? createAnnotationEditor(item, hasAnnotation) : null;
    const annotationDisplay = hasAnnotation && !isAnnotating ? createAnnotationDisplay(item, hasAnnotation) : null;
        
    return React.createElement('div',
      {
        key: item.id,
        style: {
          padding: '0.75rem',
          margin: '0.5rem 0',
          backgroundColor: item.type === 'reasoningStep' ? '#f8f9ff' : '#f0f8f0',
          border: `1px solid ${item.type === 'reasoningStep' ? '#b8daff' : '#c3e6c3'}`,
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', 
        {
          style: {display: 'flex', justifyContent: 'space-between', cursor: 'pointer'},
          onClick: () => setExpandedTrace(isExpanded ? null : item.id)
        },
        React.createElement('span', 
          {style: {fontWeight: 'bold', color: item.type === 'reasoningStep' ? '#004085' : '#155724'}},
          `${item.type === 'reasoningStep' ? 'Reasoning Step' : 'Task'} - `
        ),
        React.createElement('span', {style: {fontSize: '0.8rem', color: '#666'}}, 
          new Date(item.timestamp).toLocaleTimeString()
        ),
        React.createElement('div', {style: {display: 'flex', gap: '0.25rem'}},
          React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              setEditingAnnotation(item.id);
            },
            style: {
              padding: '0.25rem',
              backgroundColor: hasAnnotation ? '#ffc107' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }
          }, hasAnnotation ? 'Edit Note' : 'Add Note')
        )
      ),
      isExpanded && contentElement,
      !isExpanded && React.createElement('div', 
        {style: {fontSize: '0.85rem', marginTop: '0.25rem', color: '#495057'}},
        highlightText(item.description, filterText)
      ),
      isExpanded && annotationEditor,
      isExpanded && annotationDisplay
    );
  }, [expandedTrace, filterText, highlightText, annotations, editingAnnotation, createReasoningContentElement, createTaskContentElement, createAnnotationEditor, createAnnotationDisplay]);

  const items = useMemo(() => [
    { type: 'controls', filterType, setFilterType, filterText, setFilterText, exportFormat, setExportFormat, exportTraceData },
    { type: 'header', content: `Reasoning Trace (${traceGroups.length} events)` },
    ...traceGroups.map(item => ({ type: 'traceItem', data: item }))
  ], [traceGroups, filterType, filterText, exportFormat, exportTraceData]);

  const renderControlBar = useCallback((controls) => {
    return createFilterControls(React, {
      filterType: controls.filterType,
      setFilterType: controls.setFilterType,
      filterText: controls.filterText,
      setFilterText: controls.setFilterText,
      exportFormat,
      setExportFormat,
      exportData: exportTraceData,
      filterOptions: commonFilterOptions
    });
  }, [exportFormat, exportTraceData]);

  const renderTrace = useCallback((item, index) => {
    if (item.type === 'controls') {
      return renderControlBar({...item});
    } else if (item.type === 'header') {
      return React.createElement('div', {
        style: {
          fontWeight: 'bold',
          fontSize: '1rem',
          margin: '0 0 1rem 0',
          padding: '0.5rem 0',
          borderBottom: '2px solid #007bff',
          color: '#333'
        }
      }, item.content);
    } else if (item.type === 'traceItem') {
      return renderTraceItem(item.data);
    }
    return null;
  }, [renderTraceItem, renderControlBar]);

  return React.createElement(GenericPanel, {
    title: 'Reasoning Trace',
    maxHeight: 'calc(100% - 2rem)',
    items,
    renderItem: renderTrace,
    emptyMessage: 'Reasoning trace will be populated as the system processes inputs and performs reasoning.'
  });
};

export default ReasoningTracePanel;