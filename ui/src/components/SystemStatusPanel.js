import React, {useCallback, useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const SystemStatusPanel = () => {
    const systemMetrics = useUiStore(state => state.systemMetrics);
    const demoMetrics = useUiStore(state => state.demoMetrics);
    const wsConnected = useUiStore(state => state.wsConnected);
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);

    // Calculate aggregated system metrics from demo metrics
    const aggregatedMetrics = useMemo(() => {
        if (demoMetrics && Object.keys(demoMetrics).length > 0) {
            const allMetrics = Object.values(demoMetrics).map(m => m.systemMetrics).filter(m => m);

            if (allMetrics.length > 0) {
                return {
                    tasksProcessed: allMetrics.reduce((sum, m) => sum + (m.tasksProcessed || 0), 0),
                    conceptsActive: allMetrics.reduce((sum, m) => sum + (m.conceptsActive || 0), 0),
                    cyclesCompleted: allMetrics.reduce((sum, m) => sum + (m.cyclesCompleted || 0), 0),
                    memoryUsage: allMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0),
                    activeDemos: allMetrics.reduce((sum, m) => sum + (m.activeDemos || 0), 0),
                    totalPriorityFluctuations: allMetrics.reduce((sum, m) => sum + (m.priorityFluctuations?.length || 0), 0),
                };
            }
        }
        return null;
    }, [demoMetrics]);

    const getStatusColor = useCallback((value, threshold) => {
        if (value === undefined || value === null) return '#6c757d';
        return value > threshold ? '#dc3545' : value > threshold * 0.7 ? '#ffc107' : '#28a745';
    }, []);

    // Status item renderer
    const renderStatusItem = useCallback((label, value, unit = '', color = '#000') =>
        React.createElement('div',
            {
                key: label,
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #eee'
                }
            },
            React.createElement('span', {style: {fontWeight: '500'}}, label),
            React.createElement('span', {style: {color, fontWeight: 'bold'}}, `${value} ${unit}`)
        ), []);

    // System status display
    const systemStatus = useMemo(() =>
        React.createElement('div', null,
            renderStatusItem('WebSocket Connection', wsConnected ? 'Connected' : 'Disconnected', '', wsConnected ? '#28a745' : '#dc3545'),
            renderStatusItem('Active Demos', demos.length),
            renderStatusItem('Running Demos', Object.keys(demoStates).filter(id => demoStates[id]?.state === 'running').length, '', getStatusColor(Object.keys(demoStates).filter(id => demoStates[id]?.state === 'running').length, 1))
        ), [wsConnected, demos.length, demoStates, renderStatusItem, getStatusColor]);

    // Performance metrics display
    const performanceMetrics = useMemo(() =>
        React.createElement('div', null,
            renderStatusItem('Cycles Completed', aggregatedMetrics?.cyclesCompleted || 0),
            renderStatusItem('Tasks Processed', aggregatedMetrics?.tasksProcessed || 0),
            renderStatusItem('Active Concepts', aggregatedMetrics?.conceptsActive || 0),
            renderStatusItem('Priority Fluctuations', aggregatedMetrics?.totalPriorityFluctuations || 0, '', getStatusColor(aggregatedMetrics?.totalPriorityFluctuations, 10))
        ), [aggregatedMetrics, renderStatusItem, getStatusColor]);

    // Memory usage display
    const memoryUsage = useMemo(() =>
        React.createElement('div', null,
            renderStatusItem('Memory Usage', aggregatedMetrics?.memoryUsage?.toFixed(2) || 0, 'units', getStatusColor(aggregatedMetrics?.memoryUsage, 500))
        ), [aggregatedMetrics, renderStatusItem, getStatusColor]);

    // Active demo states
    const activeDemoStates = useMemo(() =>
        React.createElement('div', null,
            Object.entries(demoStates).map(([id, state]) =>
                React.createElement('div',
                    {
                        key: id,
                        style: {
                            marginBottom: '0.5rem',
                            padding: '0.25rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #dee2e6',
                            borderRadius: '3px'
                        }
                    },
                    React.createElement('div', {style: {fontWeight: 'bold', fontSize: '0.9rem'}}, id),
                    renderStatusItem('State', state.state, '', getStatusColor(state.state === 'running' ? 1 : 0, 0.5)),
                    state.progress !== undefined && renderStatusItem('Progress', `${state.progress}%`),
                    state.currentStep && renderStatusItem('Current Step', state.currentStep),
                    state.error && renderStatusItem('Error', state.error, '', '#dc3545')
                )
            )
        ), [demoStates, renderStatusItem, getStatusColor]);

    const items = useMemo(() => [
        {type: 'header', content: 'System Status'},
        {type: 'section', title: 'Connection & Demos', content: systemStatus},
        {type: 'section', title: 'Performance Metrics', content: performanceMetrics},
        {type: 'section', title: 'Memory Usage', content: memoryUsage},
        {type: 'section', title: 'Active Demos', content: activeDemoStates}
    ], [systemStatus, performanceMetrics, memoryUsage, activeDemoStates]);

    const renderStatusItemFinal = useCallback((item, index) => {
        if (item.type === 'header') {
            return React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    margin: '0 0 1rem 0',
                    padding: '0.5rem 0',
                    borderBottom: '2px solid #007bff',
                    color: '#333'
                }
            }, item.content);
        } else if (item.type === 'section') {
            return React.createElement('div',
                {
                    key: item.title,
                    style: {
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef'
                    }
                },
                React.createElement('h3',
                    {style: {margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#495057'}},
                    item.title
                ),
                item.content
            );
        }
        return null;
    }, []);

    return React.createElement(GenericPanel, {
        title: 'System Status',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderStatusItemFinal,
        emptyMessage: 'System status information will be displayed once connected to the reasoning engine.'
    });
};

export default SystemStatusPanel;