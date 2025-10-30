import React, { useCallback, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const DashboardPanel = () => {
    const systemMetrics = useUiStore(state => state.systemMetrics);
    const demoMetrics = useUiStore(state => state.demoMetrics);
    const concepts = useUiStore(state => state.concepts);
    const tasks = useUiStore(state => state.tasks);
    const wsConnected = useUiStore(state => state.wsConnected);
    const demos = useUiStore(state => state.demos);
    const demoStates = useUiStore(state => state.demoStates);
    
    // Calculate summary metrics
    const metrics = useMemo(() => {
        // System metrics from demo metrics
        let systemStats = { tasksProcessed: 0, conceptsActive: 0, cyclesCompleted: 0, memoryUsage: 0 };
        
        if (demoMetrics && Object.keys(demoMetrics).length > 0) {
            const allMetrics = Object.values(demoMetrics).map(m => m.systemMetrics).filter(m => m);
            
            if (allMetrics.length > 0) {
                systemStats = {
                    tasksProcessed: allMetrics.reduce((sum, m) => sum + (m.tasksProcessed || 0), 0),
                    conceptsActive: allMetrics.reduce((sum, m) => sum + (m.conceptsActive || 0), 0),
                    cyclesCompleted: allMetrics.reduce((sum, m) => sum + (m.cyclesCompleted || 0), 0),
                    memoryUsage: allMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0),
                };
            }
        }
        
        // Calculate demo stats
        const runningDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'running').length;
        const completedDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'completed').length;
        const errorDemos = Object.keys(demoStates).filter(id => demoStates[id]?.state === 'error').length;
        
        // Calculate task stats
        const beliefs = tasks.filter(t => t.type === 'belief').length;
        const questions = tasks.filter(t => t.type === 'question').length;
        const goals = tasks.filter(t => t.type === 'goal').length;
        
        return {
            systemStats,
            runningDemos,
            completedDemos,
            errorDemos,
            beliefs,
            questions,
            goals,
            totalConcepts: concepts.length,
            totalTasks: tasks.length,
            wsConnected
        };
    }, [demoMetrics, concepts, tasks, wsConnected, demos, demoStates]);
    
    // Render metric card
    const renderMetricCard = useCallback((title, value, description, color = '#007bff') => 
        React.createElement('div', 
            {
                key: title, // Add key for React performance
                style: {
                    padding: '1rem',
                    margin: '0.5rem',
                    backgroundColor: 'white',
                    border: `2px solid ${color}`,
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                }
            },
            React.createElement('div', 
                {style: {fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '0.25rem'}}, 
                value
            ),
            React.createElement('div', 
                {style: {fontSize: '0.9rem', fontWeight: '500', color: '#495057'}}, 
                title
            ),
            description && React.createElement('div', 
                {style: {fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem'}}, 
                description
            )
        ), []);
    
    const renderStatusIndicator = useCallback((status, label) => {
        let color, bgColor;
        if (status === true || status === 'Connected') {
            color = '#28a745';
            bgColor = '#d4edda';
        } else if (status === false || status === 'Disconnected' || status === 'error') {
            color = '#dc3545';
            bgColor = '#f8d7da';
        } else {
            color = '#007bff';
            bgColor = '#d1ecf1';
        }
        
        return React.createElement('div',
            {
                key: label, // Add key for React performance
                style: {
                    padding: '0.25rem 0.5rem',
                    margin: '0.25rem',
                    backgroundColor: bgColor,
                    color: color,
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    display: 'inline-block'
                }
            },
            label
        );
    }, []);

    // Create metric cards
    const metricCards = useMemo(() => 
        React.createElement('div', 
            {style: {display: 'flex', flexWrap: 'wrap', marginBottom: '1rem'}},
            renderMetricCard('System Status', metrics.wsConnected ? 'Operational' : 'Offline', 'WebSocket Connection', metrics.wsConnected ? '#28a745' : '#dc3545'),
            renderMetricCard('Active Concepts', metrics.totalConcepts, 'Current concept count'),
            renderMetricCard('Active Tasks', metrics.totalTasks, 'Total tasks in system'),
            renderMetricCard('Running Demos', metrics.runningDemos, 'Currently executing demos')
        ), [metrics, renderMetricCard]);
    
    // Task distribution chart (simple visualization)
    const taskDistribution = useMemo(() => 
        React.createElement('div', 
            {style: {marginBottom: '1rem'}},
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'Task Distribution'),
            React.createElement('div', 
                {style: {display: 'flex', height: '2rem', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ced4da'}},
                React.createElement('div', 
                    {
                        style: {
                            width: `${(metrics.beliefs / Math.max(metrics.totalTasks, 1)) * 100}%`,
                            backgroundColor: '#28a745',
                            minWidth: metrics.beliefs > 0 ? '10px' : '0'
                        }
                    },
                    metrics.beliefs > 0 && React.createElement('span', 
                        {style: {color: 'white', fontSize: '0.7rem', padding: '0 0.5rem'}}, 
                        `Beliefs: ${metrics.beliefs}`
                    )
                ),
                React.createElement('div', 
                    {
                        style: {
                            width: `${(metrics.questions / Math.max(metrics.totalTasks, 1)) * 100}%`,
                            backgroundColor: '#007bff',
                            minWidth: metrics.questions > 0 ? '10px' : '0'
                        }
                    },
                    metrics.questions > 0 && React.createElement('span', 
                        {style: {color: 'white', fontSize: '0.7rem', padding: '0 0.5rem'}}, 
                        `Questions: ${metrics.questions}`
                    )
                ),
                React.createElement('div', 
                    {
                        style: {
                            width: `${(metrics.goals / Math.max(metrics.totalTasks, 1)) * 100}%`,
                            backgroundColor: '#ffc107',
                            minWidth: metrics.goals > 0 ? '10px' : '0'
                        }
                    },
                    metrics.goals > 0 && React.createElement('span', 
                        {style: {color: 'white', fontSize: '0.7rem', padding: '0 0.5rem'}}, 
                        `Goals: ${metrics.goals}`
                    )
                )
            )
        ), [metrics]);
    
    // Demo status summary
    const demoSummary = useMemo(() => 
        React.createElement('div', 
            {style: {marginBottom: '1rem'}},
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'Demo Status'),
            React.createElement('div', 
                {style: {display: 'flex', alignItems: 'center', gap: '1rem'}},
                renderStatusIndicator(metrics.runningDemos > 0, `${metrics.runningDemos} Running`),
                renderStatusIndicator(metrics.completedDemos > 0, `${metrics.completedDemos} Completed`),
                renderStatusIndicator(metrics.errorDemos > 0, `${metrics.errorDemos} Errors`)
            )
        ), [metrics, renderStatusIndicator]);
    
    // System stats
    const systemStats = useMemo(() => 
        React.createElement('div', 
            {style: {marginBottom: '1rem'}},
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', fontSize: '1rem'}}, 'System Stats'),
            React.createElement('div', 
                {style: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}},
                renderMetricCard('Tasks Processed', metrics.systemStats.tasksProcessed, 'Total tasks processed'),
                renderMetricCard('Cycles Completed', metrics.systemStats.cyclesCompleted, 'Reasoning cycles'),
                renderMetricCard('Memory Usage', metrics.systemStats.memoryUsage.toFixed(2), 'System memory units')
            )
        ), [metrics, renderMetricCard]);
    
    const items = useMemo(() => [
        { type: 'header', content: 'System Dashboard' },
        { type: 'metrics', content: metricCards },
        { type: 'taskDistribution', content: taskDistribution },
        { type: 'demoSummary', content: demoSummary },
        { type: 'systemStats', content: systemStats }
    ], [metricCards, taskDistribution, demoSummary, systemStats]);

    const renderDashboardItem = useCallback((item, index) => {
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
        } else {
            return item.content;
        }
    }, []);

    return React.createElement(GenericPanel, {
        title: 'Dashboard',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderDashboardItem,
        emptyMessage: 'System dashboard will display metrics once the reasoning engine is active.'
    });
};

export default DashboardPanel;