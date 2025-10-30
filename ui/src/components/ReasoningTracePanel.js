import React, { useState, useCallback, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const ReasoningTracePanel = () => {
    const [expandedTrace, setExpandedTrace] = useState(null);
    const reasoningSteps = useUiStore(state => state.reasoningSteps);
    const tasks = useUiStore(state => state.tasks);
    
    // Group related reasoning steps and tasks
    const traceGroups = useMemo(() => {
        const traceGroups = [];
        
        // Process reasoning steps
        reasoningSteps.forEach((step, index) => {
            traceGroups.push({
                id: `step-${index}`,
                type: 'reasoningStep',
                data: step,
                timestamp: step.timestamp || 0,
                description: step.description || 'No description'
            });
        });
        
        // Process tasks that might represent reasoning results
        tasks.forEach((task, index) => {
            if (task.creationTime) { // Only include tasks with creation time
                traceGroups.push({
                    id: `task-${index}`,
                    type: 'task',
                    data: task,
                    timestamp: task.creationTime,
                    description: `Task: ${task.term || 'Unknown'} (${task.type || 'Unknown'})`
                });
            }
        });
        
        // Sort by timestamp
        traceGroups.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        return traceGroups;
    }, [reasoningSteps, tasks]);
    
    const renderTraceItem = useCallback((item, index) => {
        const isExpanded = expandedTrace === item.id;
        
        let contentElement = null;
        if (item.type === 'reasoningStep') {
            const step = item.data;
            contentElement = React.createElement('div', null,
                step.step !== undefined && React.createElement('div', {style: {fontWeight: 'bold'}}, `Step ${step.step}`),
                step.description && React.createElement('div', null, step.description),
                step.result && React.createElement('div', {style: {fontWeight: '500', marginTop: '0.5rem'}}, 
                    `Result: ${step.result}`
                ),
                step.metadata && typeof step.metadata === 'object' && Object.keys(step.metadata).length > 0 && 
                React.createElement('div', 
                    {style: {fontSize: '0.8rem', marginTop: '0.5rem', color: '#666'}},
                    React.createElement('div', {style: {fontWeight: 'bold'}}, 'Metadata:'),
                    Object.entries(step.metadata).map(([key, value]) => 
                        React.createElement('div', {key}, `${key}: ${JSON.stringify(value)}`)
                    )
                )
            );
        } else if (item.type === 'task') {
            const task = item.data;
            contentElement = React.createElement('div', null,
                task.term && React.createElement('div', {style: {fontWeight: 'bold'}}, task.term),
                task.type && React.createElement('div', {style: {fontSize: '0.8rem', color: '#666'}}, `Type: ${task.type}`),
                task.truth && React.createElement('div', null, `Truth: ${JSON.stringify(task.truth)}`),
                task.budget && React.createElement('div', {style: {fontSize: '0.8rem'}}, 
                    `Priority: ${(task.budget.priority || 0).toFixed(3)}`
                )
            );
        }
        
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
                )
            ),
            isExpanded && contentElement,
            !isExpanded && React.createElement('div', 
                {style: {fontSize: '0.85rem', marginTop: '0.25rem', color: '#495057'}},
                item.description
            )
        );
    }, [expandedTrace]);

    const items = useMemo(() => [
        { type: 'header', content: `Reasoning Trace (${traceGroups.length} events)` },
        ...traceGroups.map(item => ({ type: 'traceItem', data: item }))
    ], [traceGroups]);

    const renderTrace = useCallback((item, index) => {
        if (item.type === 'header') {
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
            return renderTraceItem(item.data, index);
        }
        return null;
    }, [renderTraceItem]);

    return React.createElement(GenericPanel, {
        title: 'Reasoning Trace',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderTrace,
        emptyMessage: 'Reasoning trace will be populated as the system processes inputs and performs reasoning.'
    });
};

export default ReasoningTracePanel;