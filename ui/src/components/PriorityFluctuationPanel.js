import React, {useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {createHeader, createListItem, createProgressBar} from '../utils/componentUtils.js';

const PriorityFluctuationPanel = () => {
    const demoMetrics = useUiStore(state => state.demoMetrics);
    const concepts = useUiStore(state => state.concepts);

    const {recentFluctuations, conceptMetrics} = useMemo(() => {
        // Extract priority fluctuations from all demo metrics
        const allPriorityFluctuations = [];
        Object.values(demoMetrics || {}).forEach(metrics => {
            if (metrics?.systemMetrics?.priorityFluctuations) {
                allPriorityFluctuations.push(...metrics.systemMetrics.priorityFluctuations);
            }
        });

        // Sort fluctuations by timestamp (most recent first)
        allPriorityFluctuations.sort((a, b) => b.timestamp - a.timestamp);

        // Get the most recent 20 priority changes for display
        const recentFluctuations = allPriorityFluctuations.slice(0, 20);

        // Extract concept metrics for display
        const conceptMetrics = [];
        Object.values(demoMetrics || {}).forEach(metrics => {
            if (metrics?.systemMetrics?.conceptMetrics) {
                conceptMetrics.push(...metrics.systemMetrics.conceptMetrics);
            }
        });

        return {recentFluctuations, conceptMetrics};
    }, [demoMetrics]);

    const renderFluctuation = (fluctuation, index) => createListItem(React, {
        key: `${fluctuation.concept}-${fluctuation.timestamp}`,
        compact: true,
        children: [
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
                createProgressBar(React, {
                    percentage: fluctuation.newPriority ? fluctuation.newPriority * 100 : 50,
                    color: fluctuation.priorityChange !== undefined
                        ? (fluctuation.priorityChange > 0 ? '#28a745' : '#dc3545')
                        : '#ffc107'
                })
            )
        ]
    });

    // Also show current concept priorities and metrics
    const renderCurrentConcept = (concept, index) => createListItem(React, {
        key: concept.term || index,
        compact: true,
        children: [
            React.createElement('div', {style: {fontWeight: 'bold'}}, concept.term),
            React.createElement('div', null,
                `Priority: ${concept.priority?.toFixed(3)} | Activation: ${concept.activation?.toFixed(3)}`
            ),
            React.createElement('div', null,
                `Tasks: ${concept.totalTasks} | Use: ${concept.useCount}`
            ),
            createProgressBar(React, {
                percentage: Math.min(100, concept.priority * 100),
                color: '#007bff'
            })
        ]
    });

    // Combine both sections
    const items = useMemo(() => [
        {type: 'header', content: 'Priority Fluctuations'},
        ...recentFluctuations.map(f => ({type: 'fluctuation', data: f})),
        {type: 'header', content: 'Current Concept Metrics'},
        ...conceptMetrics.map(c => ({type: 'concept', data: c}))
    ], [recentFluctuations, conceptMetrics]);

    const renderPriorityItem = (item, index) => {
        switch (item.type) {
            case 'header': return createHeader(React, {content: item.content});
            case 'fluctuation': return renderFluctuation(item.data, index);
            case 'concept': return renderCurrentConcept(item.data, index);
            default: return null;
        }
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