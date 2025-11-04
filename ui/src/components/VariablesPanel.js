import React, {memo} from 'react';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createMetricDisplay} from '../utils/panelUtils.js';

const VariablesPanel = memo(() => {
    const renderVariable = (variable) => createMetricDisplay(React, {
        label: variable.name,
        value: variable.value,
        key: variable.name
    });

    return React.createElement(DataPanel, {
        title: 'System Variables',
        dataSource: (state) => {
            const metrics = state.systemMetrics;
            return metrics ? [
                {name: 'Cycles', value: metrics.cycleCount},
                {name: 'Tasks', value: metrics.taskCount},
                {name: 'Concepts', value: metrics.conceptCount},
                {name: 'Runtime (s)', value: (metrics.runtime / 1000).toFixed(1)},
                {name: 'Connected Clients', value: metrics.connectedClients},
            ] : [];
        },
        renderItem: renderVariable,
        config: {
            itemLabel: 'variables',
            showItemCount: false,
            emptyMessage: 'No variables to inspect',
            containerHeight: 200
        }
    });
});

export default VariablesPanel;