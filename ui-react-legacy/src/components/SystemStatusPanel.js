import React, {memo, useCallback, useMemo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {getStatusColor} from '../utils/dashboardUtils.js';
import {createMetricDisplay, createSection} from '../utils/panelUtils.js';

const SystemStatusPanel = memo(() => {
    const {systemMetrics, demoMetrics, wsConnected, demos, demoStates} = useUiStore(state => ({
        systemMetrics: state.systemMetrics,
        demoMetrics: state.demoMetrics,
        wsConnected: state.wsConnected,
        demos: state.demos,
        demoStates: state.demoStates
    }));

    // Calculate aggregated system metrics from demo metrics in a single pass
    const aggregatedMetrics = useMemo(() => {
        if (!demoMetrics || Object.keys(demoMetrics).length === 0) return null;

        const allMetrics = Object.values(demoMetrics)
            .map(m => m.systemMetrics)
            .filter(m => m);

        if (allMetrics.length === 0) return null;

        // Single pass calculation to avoid multiple array traversals
        const aggregated = allMetrics.reduce((acc, m) => {
            acc.tasksProcessed += m.tasksProcessed || 0;
            acc.conceptsActive += m.conceptsActive || 0;
            acc.cyclesCompleted += m.cyclesCompleted || 0;
            acc.memoryUsage += m.memoryUsage || 0;
            acc.activeDemos += m.activeDemos || 0;
            acc.totalPriorityFluctuations += m.priorityFluctuations?.length || 0;
            return acc;
        }, {
            tasksProcessed: 0,
            conceptsActive: 0,
            cyclesCompleted: 0,
            memoryUsage: 0,
            activeDemos: 0,
            totalPriorityFluctuations: 0
        });

        return aggregated;
    }, [demoMetrics]);

    // Calculate running demos once to avoid repeated filtering
    const runningDemoCount = useMemo(() => {
        if (!demoStates) return 0;
        return Object.values(demoStates).filter(state => state?.state === 'running').length;
    }, [demoStates]);

    // System status display
    const systemStatus = useMemo(() => React.createElement('div', null,
        createMetricDisplay(React, {
            label: 'WebSocket Connection',
            value: wsConnected ? 'Connected' : 'Disconnected',
            color: wsConnected ? '#28a745' : '#dc3545'
        }),
        createMetricDisplay(React, {
            label: 'Active Demos',
            value: demos.length
        }),
        createMetricDisplay(React, {
            label: 'Running Demos',
            value: runningDemoCount,
            color: getStatusColor(runningDemoCount, 1)
        })
    ), [wsConnected, demos.length, runningDemoCount]);

    // Performance metrics display
    const performanceMetrics = useMemo(() => React.createElement('div', null,
        createMetricDisplay(React, {
            label: 'Cycles Completed',
            value: aggregatedMetrics?.cyclesCompleted || 0
        }),
        createMetricDisplay(React, {
            label: 'Tasks Processed',
            value: aggregatedMetrics?.tasksProcessed || 0
        }),
        createMetricDisplay(React, {
            label: 'Active Concepts',
            value: aggregatedMetrics?.conceptsActive || 0
        }),
        createMetricDisplay(React, {
            label: 'Priority Fluctuations',
            value: aggregatedMetrics?.totalPriorityFluctuations || 0,
            color: getStatusColor(aggregatedMetrics?.totalPriorityFluctuations, 10)
        })
    ), [aggregatedMetrics]);

    // Memory usage display
    const memoryUsage = useMemo(() => React.createElement('div', null,
        createMetricDisplay(React, {
            label: 'Memory Usage',
            value: `${aggregatedMetrics?.memoryUsage?.toFixed(2) || 0} units`,
            color: getStatusColor(aggregatedMetrics?.memoryUsage, 500)
        })
    ), [aggregatedMetrics]);

    // Active demo states
    const activeDemoStates = useMemo(() => React.createElement('div', null,
        Object.entries(demoStates).map(([id, state]) => createSection(React, {
            key: id,
            title: id,
            children: [
                createMetricDisplay(React, {
                    label: 'State',
                    value: state.state,
                    color: getStatusColor(state.state === 'running' ? 1 : 0, 0.5)
                }),
                state.progress !== undefined && createMetricDisplay(React, {
                    label: 'Progress',
                    value: `${state.progress}%`
                }),
                state.currentStep && createMetricDisplay(React, {
                    label: 'Current Step',
                    value: state.currentStep
                }),
                state.error && createMetricDisplay(React, {
                    label: 'Error',
                    value: state.error,
                    color: '#dc3545'
                })
            ].filter(Boolean)
        }))
    ), [demoStates]);

    const items = useMemo(() => [
        {type: 'header', content: 'System Status'},
        {type: 'section', title: 'Connection & Demos', content: systemStatus},
        {type: 'section', title: 'Performance Metrics', content: performanceMetrics},
        {type: 'section', title: 'Memory Usage', content: memoryUsage},
        {type: 'section', title: 'Active Demos', content: activeDemoStates}
    ], [systemStatus, performanceMetrics, memoryUsage, activeDemoStates]);

    const renderStatusItemFinal = useCallback((item) => {
        switch (item.type) {
            case 'header':
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
            case 'section':
                return createSection(React, {
                    key: item.title,
                    title: item.title,
                    children: item.content
                });
            default:
                return null;
        }
    }, []);

    return React.createElement(DataPanel, {
        title: 'System Status',
        dataSource: () => items,
        renderItem: renderStatusItemFinal,
        config: {
            itemLabel: 'sections',
            showItemCount: false,
            emptyMessage: 'System status information will be displayed once connected to the reasoning engine.',
            containerHeight: 400
        }
    });
});

export default SystemStatusPanel;