/**
 * Diagnostics Panel - Shows connection status and troubleshooting info
 * Extracted from Launcher for docking framework integration
 */

import React from 'react';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import useUiStore from '../stores/uiStore.js';

const DiagnosticsPanel = () => {
  const wsConnected = useUiStore(state => state.wsConnected);
  const wsService = useUiStore(state => state.wsService);
  const error = useUiStore(state => state.error);

  // Get WebSocket metrics if available
  const wsMetrics = wsService?.getMetrics ? wsService.getMetrics() : null;

  const [connectionHistory, setConnectionHistory] = React.useState([]);
  const [connectionTestResult, setConnectionTestResult] = React.useState(null);
  const [backendInfo, setBackendInfo] = React.useState(null);

  const checkConnection = () => {
    // Check WebSocket service status
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

  const connectionInfo = checkConnection();

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

    // Try to send a test message and wait for response
    // Use a known message type that the backend supports
    const testMessage = {
      type: 'requestNAR',
      id: `test_${Date.now()}`,
      timestamp: Date.now()
    };

    try {
      // Store the test start time to check for response
      const startTime = Date.now();

      // Add a temporary listener for the narInstance response
      let receivedResponse = false;
      const unsubscribeListener = service.addListener('narInstance', (data) => {
        if (!receivedResponse) {  // Prevent multiple responses from triggering
          receivedResponse = true;
          setConnectionTestResult({
            success: true,
            message: `Connection test successful! Received NAR info.`,
            timestamp: Date.now(),
            responseTime: `${Date.now() - startTime}ms`
          });
          // Remove the listener after receiving the response
          unsubscribeListener();
        }
      });

      service.sendMessage(testMessage);

      setConnectionTestResult({
        success: true,
        message: `Test message sent to: ${service.url}`,
        timestamp: Date.now(),
        responseTime: 'Pending...'
      });

      // Set timeout to report timeout if no response received in 3 seconds
      setTimeout(() => {
        // Check if the listener was already removed (meaning we got a response)
        // If not removed, the response hasn't come yet
        if (connectionTestResult?.message === 'Pending...') {
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
        // Add a temporary listener for the narInstance response
        const startTime = Date.now();
        const unsubscribe = service.addListener('narInstance', (data) => {
          setBackendInfo({
            data: data.payload,
            timestamp: Date.now()
          });
          // Remove the listener after receiving the response
          unsubscribe();
        });

        // Send request for NAR information
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

  // Check connectivity from page context
  const checkConnectivity = () => {
    const { VITE_WS_PORT = '8080' } = import.meta.env;
    const expectedWsUrl = `ws://${window.location.hostname}:${VITE_WS_PORT}/ws`;

    return {
      pageHost: window.location.hostname,
      pagePort: window.location.port,
      expectedWsUrl,
      actualWsUrl: wsService?.url || 'Not connected',
      hostsMatch: (wsService?.url || '').includes(window.location.hostname)
    };
  };

  const connectivityInfo = checkConnectivity();

  return React.createElement('div', { style: { padding: themeUtils.get('SPACING.MD') } },
    // Connection status
    React.createElement('div', { style: { marginBottom: themeUtils.get('SPACING.MD') } },
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
    ),

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

    // Connection history
    connectionHistory.length > 0 && React.createElement('div', {
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
    ),

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