/**
 * Diagnostics Panel - Shows connection status and troubleshooting info
 * Extracted from Launcher for docking framework integration
 */

import React from 'react';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import useUiStore from '../stores/uiStore.js';

// Check WebSocket service status
const checkConnection = () => {
  const service = useUiStore.getState().wsService;
  if (service) {
    return {
      status: service.state || 'unknown',
      url: service.url,
      connected: service.state === 'CONNECTED' || service.state === 2 // WebSocket.OPEN
    };
  }
  return { status: 'disconnected', url: null, connected: false };
};

// Check connectivity from page context
const checkConnectivity = () => {
  const { VITE_WS_PORT = '8080' } = import.meta.env;
  const expectedWsUrl = `ws://${window.location.hostname}:${VITE_WS_PORT}/ws`;
  const wsService = useUiStore.getState().wsService;

  return {
    pageHost: window.location.hostname,
    pagePort: window.location.port,
    expectedWsUrl,
    actualWsUrl: wsService?.url || 'Not connected',
    hostsMatch: (wsService?.url || '').includes(window.location.hostname)
  };
};

const DiagnosticsPanel = () => {
  const wsConnected = useUiStore(state => state.wsConnected);
  const wsService = useUiStore(state => state.wsService);
  const error = useUiStore(state => state.error);

  // Get WebSocket metrics if available
  const wsMetrics = wsService?.getMetrics ? wsService.getMetrics() : null;

  const [connectionHistory, setConnectionHistory] = React.useState([]);
  const [connectionTestResult, setConnectionTestResult] = React.useState(null);
  const connectionTestResultRef = React.useRef(connectionTestResult);
  const [backendInfo, setBackendInfo] = React.useState(null);

  const connectionInfo = React.useMemo(checkConnection, [wsConnected]);
  const connectivityInfo = React.useMemo(checkConnectivity, []);

  // Sync ref with state
  React.useEffect(() => {
    connectionTestResultRef.current = connectionTestResult;
  }, [connectionTestResult]);

  // Add connection to history
  React.useEffect(() => {
    setConnectionHistory(prev => [
      ...prev.slice(-4), // Keep last 5 entries
      {
        timestamp: Date.now(),
        connected: wsConnected,
        status: connectionInfo.status,
        url: connectionInfo.url
      }
    ]);
  }, [wsConnected, connectionInfo.status, connectionInfo.url]);

  // Create test connection message handler
  const createTestMessageHandler = (startTime, setResult) => {
    let hasResponded = false; // Flag to prevent multiple responses

    return (data) => {
      if (!hasResponded) {
        hasResponded = true;
        setResult({
          success: true,
          message: `Connection test successful! Received NAR info.`,
          timestamp: Date.now(),
          responseTime: `${Date.now() - startTime}ms`
        });
      }
    };
  };

  // Create backend info request handler
  const createBackendInfoHandler = (startTime, setResult) => {
    let hasReceived = false; // Prevent duplicate responses

    return (data) => {
      if (!hasReceived) {
        hasReceived = true;
        setResult({
          data: data.payload,
          timestamp: Date.now()
        });
      }
    };
  };

  // Test connection functionality
  const testConnection = async () => {
    console.log('Testing WebSocket connection...');
    const service = useUiStore.getState().wsService;

    if (!service) {
      console.warn('No WebSocket service available to test');
      setConnectionTestResult({
        success: false,
        message: 'No WebSocket service initialized',
        timestamp: Date.now()
      });
      return;
    }

    console.log('WebSocket service found:', service.state, 'URL:', service.url);

    const testMessage = {
      type: 'requestNAR',
      id: `test_${Date.now()}`,
      timestamp: Date.now()
    };

    try {
      const startTime = Date.now();
      const handler = createTestMessageHandler(startTime, setConnectionTestResult);

      const unsubscribe = service.addListener('narInstance', handler);
      service.sendMessage(testMessage);

      setConnectionTestResult({
        success: true,
        message: `Test message sent to: ${service.url}`,
        timestamp: Date.now(),
        responseTime: 'Pending...'
      });

      // Timeout after 3 seconds if no response
      setTimeout(() => {
        if (!hasResponded && connectionTestResultRef.current?.message === 'Pending...') {
          setConnectionTestResult(prev => ({
            ...prev,
            message: `Test timed out after 3 seconds - no response received`
          }));
        }
      }, 3000);

    } catch (err) {
      console.error('Error sending test message:', err);
      setConnectionTestResult({
        success: false,
        message: `Error sending test message: ${err.message}`,
        timestamp: Date.now()
      });
    }
  };

  // Request backend status info
  const requestBackendInfo = async () => {
    const service = useUiStore.getState().wsService;
    if (service) {
      try {
        const startTime = Date.now();
        const handler = createBackendInfoHandler(startTime, setBackendInfo);

        const unsubscribe = service.addListener('narInstance', handler);
        service.sendMessage({
          type: 'requestNAR',
          timestamp: Date.now()
        });

        console.log('NAR info requested');
      } catch (err) {
        console.error('Error requesting backend info:', err);
      }
    }
  };

  // Helper function to render connection status
  const renderConnectionStatus = React.useCallback(() => {
    return React.createElement('div', { style: { marginBottom: themeUtils.get('SPACING.MD') } },
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: themeUtils.get('SPACING.SM'),
          padding: themeUtils.get('SPACING.SM'),
          backgroundColor: connectionInfo.connected
            ? themeUtils.get('COLORS.SUCCESS') + '20'
            : themeUtils.get('COLORS.WARNING') + '20',
          borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
          border: `1px solid ${connectionInfo.connected ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.WARNING')}`
        }
      },
        React.createElement('div', {
          style: {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connectionInfo.connected
              ? themeUtils.get('COLORS.SUCCESS')
              : themeUtils.get('COLORS.WARNING')
          }
        }),
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD') } },
            connectionInfo.connected ? 'Connected' : 'Disconnected'
          ),
          connectionInfo.url && React.createElement('div', {
            style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), color: themeUtils.get('TEXT.SECONDARY') }
          }, `To: ${connectionInfo.url}`)
        )
      )
    );
  }, [connectionInfo]);

  // Helper function to render connection history
  const renderConnectionHistory = React.useCallback(() => {
    if (connectionHistory.length === 0) return null;

    return React.createElement('div', {
      style: {
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Connection History:'),
      ...connectionHistory.slice().reverse().map((entry, index) =>
        React.createElement('div', {
          key: entry.timestamp,
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            marginBottom: index < connectionHistory.length - 1 ? themeUtils.get('SPACING.XS') : 0,
            color: entry.connected ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.WARNING')
          }
        },
          `${new Date(entry.timestamp).toLocaleTimeString()} - ${entry.connected ? '✓ Connected' : '✗ Disconnected'}`
        )
      )
    );
  }, [connectionHistory]);

  return React.createElement('div', { style: { padding: themeUtils.get('SPACING.MD') } },
    renderConnectionStatus(),

    // Connectivity Check
    React.createElement('div', {
      style: {
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: connectivityInfo.hostsMatch
          ? themeUtils.get('COLORS.SUCCESS') + '10'
          : themeUtils.get('COLORS.WARNING') + '10',
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${connectivityInfo.hostsMatch ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.WARNING')}`,
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Connectivity Check:'),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Page Host: ${connectivityInfo.pageHost}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Expected WS: ${connectivityInfo.expectedWsUrl}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } },
        `Actual WS: ${connectivityInfo.actualWsUrl}`
      ),
      React.createElement('div', {
        style: {
          fontSize: themeUtils.get('FONTS.SIZE.SM'),
          color: connectivityInfo.hostsMatch ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.WARNING'),
          fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
          marginTop: themeUtils.get('SPACING.XS')
        }
      },
        connectivityInfo.hostsMatch ? '✓ Hosts Match (Good!)' : '⚠ Hosts Don\'t Match (Potential Issue!)'
      )
    ),

    // Connection details
    React.createElement('div', {
      style: {
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Connection Details:'),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Status: ${connectionInfo.status}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Service Available: ${!!wsService ? 'Yes' : 'No'}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Store Connected: ${wsConnected ? 'Yes' : 'No'}`
      ),
      wsMetrics && React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } },
        `Clients: ${wsMetrics.currentClientCount || 0}, Messages: ${wsMetrics.messagesReceived || 0} received, ${wsMetrics.messagesSent || 0} sent`
      )
    ),

    renderConnectionHistory(),

    // Test connection result
    connectionTestResult && React.createElement('div', {
      style: {
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: connectionTestResult.success
          ? themeUtils.get('COLORS.SUCCESS') + '10'
          : themeUtils.get('COLORS.DANGER') + '10',
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${connectionTestResult.success ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.DANGER')}`,
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Last Test:'),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } },
        connectionTestResult.message
      ),
      connectionTestResult.responseTime && React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } },
        `Response Time: ${connectionTestResult.responseTime}`
      )
    ),

    // Backend info
    backendInfo && React.createElement('div', {
      style: {
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Backend Info:'),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Cycle Count: ${backendInfo.data.cycleCount || 'N/A'}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM'), marginBottom: themeUtils.get('SPACING.XS') } },
        `Running: ${backendInfo.data.isRunning ? 'Yes' : 'No'}`
      ),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } },
        `Last Updated: ${new Date(backendInfo.timestamp).toLocaleTimeString()}`
      )
    ),

    // Troubleshooting steps
    React.createElement('div', { style: { marginBottom: themeUtils.get('SPACING.MD') } },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Troubleshooting:'),
      React.createElement('ol', {
        style: {
          margin: 0,
          paddingLeft: themeUtils.get('SPACING.MD'),
          fontSize: themeUtils.get('FONTS.SIZE.SM')
        }
      },
        React.createElement('li', null, 'Make sure the backend server is running:'),
        React.createElement('li', null, 'Run "npm run web" in the project root, or'),
        React.createElement('li', null, 'Run "node scripts/ui/launcher.js" directly'),
        React.createElement('li', null, 'Check if port 8080 is available'),
        React.createElement('li', null, 'Verify the WebSocket URL matches the page host'),
        React.createElement('li', null, `Expected: ws://${window.location.hostname || 'localhost'}:8080/ws`)
      )
    ),

    // Diagnostic buttons
    React.createElement('div', {
      style: {
        display: 'flex',
        gap: themeUtils.get('SPACING.SM'),
        flexWrap: 'wrap'
      }
    },
      React.createElement(Button, {
        variant: 'secondary',
        size: 'sm',
        onClick: testConnection
      }, 'Test Connection'),

      React.createElement(Button, {
        variant: 'info',
        size: 'sm',
        onClick: requestBackendInfo
      }, 'Get Backend Info'),

      React.createElement(Button, {
        variant: 'warning',
        size: 'sm',
        onClick: () => {
          // Force reconnect by disconnecting and reconnecting
          const service = useUiStore.getState().wsService;
          if (service) {
            console.log('Force reconnecting WebSocket...');
            service.disconnect();
            setTimeout(() => service.connect(), 1000);
          }
        }
      }, 'Force Reconnect')
    ),

    error && React.createElement('div', {
      style: {
        marginTop: themeUtils.get('SPACING.MD'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('COLORS.DANGER') + '20',
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${themeUtils.get('COLORS.DANGER')}`
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), color: themeUtils.get('COLORS.DANGER') } }, 'Last Error:'),
      React.createElement('div', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } }, error.message || 'Unknown error')
    )
  );
};

export default DiagnosticsPanel;