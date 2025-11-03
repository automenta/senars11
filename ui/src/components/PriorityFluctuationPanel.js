import React from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const PriorityFluctuationPanel = () => {
    const demoMetrics = useUiStore(state => state.demoMetrics);
    const concepts = useUiStore(state => state.concepts);

    // Extract priority fluctuations from all demo metrics
    const allPriorityFluctuations = [];
    Object.values(demoMetrics).forEach(metrics => {
        if (metrics && metrics.systemMetrics && metrics.systemMetrics.priorityFluctuations) {
            allPriorityFluctuations.push(...metrics.systemMetrics.priorityFluctuations);
        }
    });

    // Sort fluctuations by timestamp (most recent first)
    allPriorityFluctuations.sort((a, b) => b.timestamp - a.timestamp);

    // Get the most recent 10 priority changes for display
    const recentFluctuations = allPriorityFluctuations.slice(0, 20);

    // Extract concept metrics for display
    const conceptMetrics = [];
    Object.values(demoMetrics).forEach(metrics => {
        if (metrics && metrics.systemMetrics && metrics.systemMetrics.conceptMetrics) {
            conceptMetrics.push(...metrics.systemMetrics.conceptMetrics);
        }
    });

    const renderFluctuation = (fluctuation, index) =>
        React.createElement('div',
            {
                key: `${fluctuation.concept}-${fluctuation.timestamp}`,
                style: {
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }
            },
            React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}},
                React.createElement('span', null, fluctuation.concept),
                React.createElement('span', {style: {fontSize: '0.75rem', color: '#666'}},
                    new Date(fluctuation.timestamp).toLocaleTimeString()
                )
            ),
            React.createElement('div', null,
                React.createElement('div', {style: {margin: '0.25rem 0'}},
                    fluctuation.priorityChange !== undefined
                        ? `Priority: ${fluctuation.oldPriority?.toFixed(3)} → ${fluctuation.newPriority?.toFixed(3)} (${fluctuation.priorityChange > 0 ? '+' : ''}${fluctuation.priorityChange?.toFixed(3)})`
                        : `Task Count: ${fluctuation.oldTaskCount} → ${fluctuation.newTaskCount}`
                ),
                React.createElement('div', {
                        style: {
                            height: '8px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginTop: '0.25rem'
                        }
                    },
                    React.createElement('div', {
                        style: {
                            height: '100%',
                            width: `${Math.min(100, fluctuation.newPriority ? fluctuation.newPriority * 100 : 50)}%`,
                            backgroundColor: fluctuation.priorityChange !== undefined
                                ? (fluctuation.priorityChange > 0 ? '#28a745' : '#dc3545')
                                : '#ffc107',
                            transition: 'width 0.3s ease'
                        }
                    })
                )
            )
        );

    // Also show current concept priorities and metrics
    const renderCurrentConcept = (concept, index) =>
        React.createElement('div',
            {
                key: concept.term || index,
                style: {
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }
            },
            React.createElement('div', {style: {fontWeight: 'bold'}}, concept.term),
            React.createElement('div', null,
                `Priority: ${concept.priority?.toFixed(3)} | Activation: ${concept.activation?.toFixed(3)}`
            ),
            React.createElement('div', null,
                `Tasks: ${concept.totalTasks} | Use: ${concept.useCount}`
            ),
            React.createElement('div', {
                    style: {
                        height: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '0.25rem'
                    }
                },
                React.createElement('div', {
                    style: {
                        height: '100%',
                        width: `${Math.min(100, concept.priority * 100)}%`,
                        backgroundColor: '#007bff',
                        transition: 'width 0.3s ease'
                    }
                })
            )
        );

    // Combine both sections
    const items = [
        {type: 'header', content: 'Priority Fluctuations'},
        ...recentFluctuations.map(f => ({type: 'fluctuation', data: f})),
        {type: 'header', content: 'Current Concept Metrics'},
        ...conceptMetrics.map(c => ({type: 'concept', data: c}))
    ];

    const renderPriorityItem = (item, index) => {
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
        } else if (item.type === 'fluctuation') {
            return renderFluctuation(item.data, index);
        } else if (item.type === 'concept') {
            return renderCurrentConcept(item.data, index);
        }
        return null;
    };

    return React.createElement(GenericPanel, {
        title: 'Priority Fluctuations & Metrics',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderPriorityItem,
        emptyMessage: 'No priority fluctuation data available. Run a demo to see metrics.'
    });
};

export default PriorityFluctuationPanel;