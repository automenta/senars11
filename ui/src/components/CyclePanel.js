import React, {useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {createListItem} from '../utils/componentUtils.js';

const CyclePanel = () => {
    const systemMetrics = useUiStore(state => state.systemMetrics);
    const cycles = useUiStore(state => state.cycles);

    const renderCycle = (cycle, index) => createListItem(React, {
        key: index,
        children: [
            React.createElement('div', {style: {fontWeight: 'bold'}}, `Cycle #${cycle.cycle}`),
            React.createElement('div', null,
                `Tasks: ${cycle.tasksProcessed} | Beliefs: ${cycle.beliefsAdded} | Qs: ${cycle.questionsAnswered}`
            ),
            React.createElement('div', {style: {fontSize: '0.8rem', color: '#666'}},
                `${new Date(cycle.timestamp).toLocaleTimeString()}`
            )
        ]
    });

    const recentCycles = useMemo(() => cycles.slice(-10).reverse(), [cycles]);

    return React.createElement('div', null,
        systemMetrics && React.createElement('div', {style: {marginBottom: '1rem'}},
            React.createElement('div', null, `Cycles: ${systemMetrics.cycleCount}`),
            React.createElement('div', null, `Tasks: ${systemMetrics.taskCount}`),
            React.createElement('div', null, `Concepts: ${systemMetrics.conceptCount}`),
            React.createElement('div', null, `Runtime: ${(systemMetrics.runtime / 1000).toFixed(1)}s`),
            React.createElement('div', null, `Clients: ${systemMetrics.connectedClients}`)
        ),
        React.createElement('h4', {style: {margin: '1rem 0 0.5rem 0', fontSize: '1rem'}}, 'Recent Cycles'),
        React.createElement(GenericPanel, {
            title: 'Recent Cycles',
            maxHeight: 'calc(100% - 8rem)',
            items: recentCycles,
            renderItem: renderCycle
        })
    );
};

export default CyclePanel;