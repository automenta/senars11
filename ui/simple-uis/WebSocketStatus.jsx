import React from 'react';
import useUiStore from '../src/stores/uiStore';

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

  return (
    <div style={containerStyle} data-testid="websocket-status-container">
      <h1 data-testid="websocket-status-title">WebSocket Connection Status</h1>

      <div style={statusStyle} data-testid="connection-status">
        <span data-testid="status-text">
          <strong>Status:</strong> {wsConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {wsConnected && systemMetrics && (
        <div data-testid="system-metrics">
          <h2>System Metrics</h2>
          <div style={metricsGridStyle}>
            <div style={metricCardStyle} data-testid="cpu-metric">
              <strong>CPU Usage:</strong> {systemMetrics.cpu?.toFixed(2) || 'N/A'}%
            </div>
            <div style={metricCardStyle} data-testid="memory-metric">
              <strong>Memory:</strong> {systemMetrics.memory?.toFixed(2) || 'N/A'} units
            </div>
            <div style={metricCardStyle} data-testid="tasks-metric">
              <strong>Active Tasks:</strong> {systemMetrics.activeTasks || 0}
            </div>
            <div style={metricCardStyle} data-testid="speed-metric">
              <strong>Reasoning Speed:</strong> {systemMetrics.reasoningSpeed || 0} cycles/sec
            </div>
          </div>
        </div>
      )}

      {!wsConnected && (
        <div
          style={{ marginTop: '20px', fontStyle: 'italic', color: '#6c757d' }}
          data-testid="connection-waiting"
        >
          Waiting for WebSocket connection...
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;
