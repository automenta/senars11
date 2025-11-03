import React, {useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import {createMetricDisplay} from '../utils/componentUtils.js';

const VariablesPanel = () => {
    const systemMetrics = useUiStore(state => state.systemMetrics);

    const variables = useMemo(() => systemMetrics ? [
        {name: 'Cycles', value: systemMetrics.cycleCount},
        {name: 'Tasks', value: systemMetrics.taskCount},
        {name: 'Concepts', value: systemMetrics.conceptCount},
        {name: 'Runtime (s)', value: (systemMetrics.runtime / 1000).toFixed(1)},
        {name: 'Connected Clients', value: systemMetrics.connectedClients},
    ] : [], [systemMetrics]);

    const renderVariable = (variable, index) => createMetricDisplay(React, {
        label: variable.name,
        value: variable.value,
        key: variable.name || index
    });

    return React.createElement(GenericPanel, {
        title: 'System Variables',
        items: variables,
        renderItem: renderVariable,
        emptyMessage: 'No variables to inspect'
    });
};

export default VariablesPanel;