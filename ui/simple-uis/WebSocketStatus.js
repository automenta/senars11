import React from 'react';
import useUiStore from '../src/stores/uiStore.js';

const WebSocketStatus = () => {
    const wsConnected = useUiStore(state => state.wsConnected);
    const systemMetrics = useUiStore(state => state.systemMetrics);

    // Style constants for consistency
    const containerStyle = {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        border: '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    };

    const statusStyle = {
        padding: '15px',
        margin: '10px 0',
        borderRadius: '4px',
        backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
        border: `1px solid ${wsConnected ? '#c3e6cb' : '#f5c6cb'}`,
        color: wsConnected ? '#155724' : '#721c24',
        fontWeight: 'bold',
    };

    const metricsGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginTop: '15px',
    };

    const metricCardStyle = {
        padding: '12px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
    };

    return React.createElement('div',
        {
            style: containerStyle,
            'data-testid': 'websocket-status-container'
        },
        React.createElement('h1',
            {'data-testid': 'websocket-status-title'},
            'WebSocket Connection Status'
        ),
        React.createElement('div',
            {
                style: statusStyle,
                'data-testid': 'connection-status'
            },
            React.createElement('span',
                {'data-testid': 'status-text'},
                React.createElement('strong', null, 'Status:'),
                ' ',
                wsConnected ? 'Connected' : 'Disconnected'
            )
        ),
        wsConnected && systemMetrics && React.createElement('div',
            {'data-testid': 'system-metrics'},
            React.createElement('h2', null, 'System Metrics'),
            React.createElement('div',
                {style: metricsGridStyle},
                React.createElement('div',
                    {
                        style: metricCardStyle,
                        'data-testid': 'cpu-metric'
                    },
                    React.createElement('strong', null, 'CPU Usage:'),
                    ' ',
                    (systemMetrics.cpu?.toFixed(2) || 'N/A') + '%'
                ),
                React.createElement('div',
                    {
                        style: metricCardStyle,
                        'data-testid': 'memory-metric'
                    },
                    React.createElement('strong', null, 'Memory:'),
                    ' ',
                    (systemMetrics.memory?.toFixed(2) || 'N/A') + ' units'
                ),
                React.createElement('div',
                    {
                        style: metricCardStyle,
                        'data-testid': 'tasks-metric'
                    },
                    React.createElement('strong', null, 'Active Tasks:'),
                    ' ',
                    systemMetrics.activeTasks || 0
                ),
                React.createElement('div',
                    {
                        style: metricCardStyle,
                        'data-testid': 'speed-metric'
                    },
                    React.createElement('strong', null, 'Reasoning Speed:'),
                    ' ',
                    (systemMetrics.reasoningSpeed || 0) + ' cycles/sec'
                )
            )
        ),
        !wsConnected && React.createElement('div',
            {
                style: {marginTop: '20px', fontStyle: 'italic', color: '#6c757d'},
                'data-testid': 'connection-waiting'
            },
            'Waiting for WebSocket connection...'
        )
    );
};

export default WebSocketStatus;
