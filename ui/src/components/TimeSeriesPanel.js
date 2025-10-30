import React, { useState, useEffect, useRef } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const TimeSeriesPanel = () => {
    const [timeRange, setTimeRange] = useState(60); // Last 60 seconds
    const cycles = useUiStore(state => state.cycles);
    const demoMetrics = useUiStore(state => state.demoMetrics);
    const canvasRef = useRef(null);
    
    // Process metrics for time series visualization
    const processTimeSeriesData = () => {
        const now = Date.now();
        const cutoffTime = now - (timeRange * 1000); // Convert seconds to milliseconds
        
        // Extract metrics over time
        const metricsOverTime = [];
        const allMetrics = Object.values(demoMetrics);
        
        // Sort metrics by timestamp
        allMetrics
            .filter(m => m.systemMetrics && m.systemMetrics.timestamp && m.systemMetrics.timestamp > cutoffTime)
            .sort((a, b) => (a.systemMetrics.timestamp || 0) - (b.systemMetrics.timestamp || 0))
            .forEach(m => {
                if (m.systemMetrics) {
                    metricsOverTime.push({
                        timestamp: m.systemMetrics.timestamp,
                        tasksProcessed: m.systemMetrics.tasksProcessed || 0,
                        conceptsActive: m.systemMetrics.conceptsActive || 0,
                        cyclesCompleted: m.systemMetrics.cyclesCompleted || 0,
                        activeDemos: m.systemMetrics.activeDemos || 0
                    });
                }
            });
        
        return metricsOverTime;
    };
    
    // Create a simple SVG chart
    const renderTimeSeriesChart = () => {
        const data = processTimeSeriesData();
        
        if (data.length === 0) {
            return React.createElement('div', 
                {style: {padding: '2rem', textAlign: 'center', color: '#6c757d', fontStyle: 'italic'}},
                'No time series data available for the selected time range.'
            );
        }
        
        // Find min/max values for scaling
        const timestamps = data.map(d => d.timestamp);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeRangeMs = maxTime - minTime || 1;
        
        const tasks = data.map(d => d.tasksProcessed);
        const concepts = data.map(d => d.conceptsActive);
        const cyclesCount = data.map(d => d.cyclesCompleted);
        
        const maxTasks = Math.max(...tasks);
        const maxConcepts = Math.max(...concepts);
        const maxCycles = Math.max(...cyclesCount);
        
        const chartWidth = 500;
        const chartHeight = 200;
        const padding = 40;
        
        // Normalize data to fit in chart
        const normalizeY = (value, max) => max > 0 ? chartHeight - padding - (value / max) * (chartHeight - 2 * padding) : chartHeight - padding;
        const normalizeX = (timestamp) => padding + ((timestamp - minTime) / timeRangeMs) * (chartWidth - 2 * padding);
        
        // Create path for tasks line
        let tasksPath = '';
        data.forEach((d, i) => {
            const x = normalizeX(d.timestamp);
            const y = normalizeY(d.tasksProcessed, maxTasks);
            tasksPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
        
        // Create path for concepts line
        let conceptsPath = '';
        data.forEach((d, i) => {
            const x = normalizeX(d.timestamp);
            const y = normalizeY(d.conceptsActive, maxConcepts);
            conceptsPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
        
        // Create path for cycles line
        let cyclesPath = '';
        data.forEach((d, i) => {
            const x = normalizeX(d.timestamp);
            const y = normalizeY(d.cyclesCompleted, maxCycles);
            cyclesPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
        
        return React.createElement('div', null,
            React.createElement('svg', 
                {
                    width: '100%',
                    height: '300px',
                    viewBox: `0 0 ${chartWidth} ${chartHeight}`,
                    style: {border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#f8f9fa'}
                },
                // X axis
                React.createElement('line', {
                    x1: padding,
                    y1: chartHeight - padding,
                    x2: chartWidth - padding,
                    y2: chartHeight - padding,
                    stroke: '#6c757d',
                    strokeWidth: 1
                }),
                // Y axis
                React.createElement('line', {
                    x1: padding,
                    y1: padding,
                    x2: padding,
                    y2: chartHeight - padding,
                    stroke: '#6c757d',
                    strokeWidth: 1
                }),
                // Tasks line (blue)
                React.createElement('path', {
                    d: tasksPath,
                    fill: 'none',
                    stroke: '#007bff',
                    strokeWidth: 2,
                    opacity: 0.7
                }),
                // Concepts line (green)
                React.createElement('path', {
                    d: conceptsPath,
                    fill: 'none',
                    stroke: '#28a745',
                    strokeWidth: 2,
                    opacity: 0.7
                }),
                // Cycles line (red)
                React.createElement('path', {
                    d: cyclesPath,
                    fill: 'none',
                    stroke: '#dc3545',
                    strokeWidth: 2,
                    opacity: 0.7
                }),
                // Labels
                React.createElement('text', {
                    x: chartWidth / 2,
                    y: chartHeight - 10,
                    textAnchor: 'middle',
                    fontSize: '12px',
                    fill: '#495057'
                }, 'Time'),
                React.createElement('text', {
                    x: 15,
                    y: chartHeight / 2,
                    textAnchor: 'middle',
                    fontSize: '12px',
                    fill: '#495057',
                    transform: `rotate(-90 15,${chartHeight / 2})`
                }, 'Count'),
                // Legend
                React.createElement('g', {transform: `translate(${chartWidth - 150}, ${padding})`},
                    React.createElement('rect', {x: 0, y: 0, width: 140, height: 60, fill: 'white', stroke: '#dee2e6', rx: 4}),
                    React.createElement('line', {x1: 10, y1: 15, x2: 30, y2: 15, stroke: '#007bff', strokeWidth: 2}),
                    React.createElement('text', {x: 35, y: 19, fontSize: '12px', fill: '#495057'}, 'Tasks'),
                    React.createElement('line', {x1: 10, y1: 30, x2: 30, y2: 30, stroke: '#28a745', strokeWidth: 2}),
                    React.createElement('text', {x: 35, y: 34, fontSize: '12px', fill: '#495057'}, 'Concepts'),
                    React.createElement('line', {x1: 10, y1: 45, x2: 30, y2: 45, stroke: '#dc3545', strokeWidth: 2}),
                    React.createElement('text', {x: 35, y: 49, fontSize: '12px', fill: '#495057'}, 'Cycles')
                )
            )
        );
    };
    
    // Render controls
    const renderControls = () => 
        React.createElement('div', 
            {style: {display: 'flex', gap: '1rem', marginBottom: '1rem'}},
            React.createElement('div', null,
                React.createElement('label', {style: {display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem'}}, 'Time Range:'),
                React.createElement('select', 
                    {
                        value: timeRange,
                        onChange: (e) => setTimeRange(Number(e.target.value)),
                        style: {
                            padding: '0.25rem',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }
                    },
                    React.createElement('option', {value: 30}, '30 seconds'),
                    React.createElement('option', {value: 60}, '1 minute'),
                    React.createElement('option', {value: 300}, '5 minutes'),
                    React.createElement('option', {value: 600}, '10 minutes')
                )
            )
        );

    const items = [
        { type: 'header', content: 'Time Series Metrics' },
        { type: 'controls', content: renderControls() },
        { type: 'chart', content: renderTimeSeriesChart() }
    ];

    const renderTimeSeries = (item, index) => {
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
        } else {
            return item.content;
        }
    };

    return React.createElement(GenericPanel, {
        title: 'Time Series Analysis',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderTimeSeries,
        emptyMessage: 'Time series data will be displayed when system metrics are available.'
    });
};

export default TimeSeriesPanel;