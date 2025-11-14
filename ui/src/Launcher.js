import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import { Button, Card } from './components/GenericComponents.js';
import { themeUtils } from './utils/themeUtils.js';
import useUiStore from './stores/uiStore.js';

/**
 * UI Application definitions with metadata
 */
const UI_APPS = Object.freeze([
  {
    id: 'ide',
    name: 'Cognitive IDE',
    description: 'Main IDE interface with flexible layout panels',
    icon: '🧠',
    color: themeUtils.get('COLORS.PRIMARY'),
    path: '/'
  },
  {
    id: 'repl',
    name: 'REPL Interface',
    description: 'Read-Eval-Print Loop for direct NARS interaction',
    icon: '💻',
    color: themeUtils.get('COLORS.SECONDARY'),
    path: '/repl/'
  },
  {
    id: 'minimal-repl',
    name: 'Minimal REPL (Fallback)',
    description: 'Basic REPL interface that works when main UI fails',
    icon: '🛠️',
    color: themeUtils.get('COLORS.INFO'),
    path: '/minimal-repl/'
  },
  {
    id: 'simple',
    name: 'Simple UI Collection',
    description: 'Minimal interfaces for focused tasks',
    icon: '⚡',
    color: themeUtils.get('COLORS.SUCCESS'),
    path: '/simple-uis/'
  },
  {
    id: 'graph',
    name: 'Graph UI',
    description: 'Visual representation of concepts and relationships',
    icon: '🌐',
    color: themeUtils.get('COLORS.WARNING'),
    path: '/?layout=graph'
  },
  {
    id: 'selfAnalysis',
    name: 'Self Analysis',
    description: 'System introspection and monitoring tools',
    icon: '🔍',
    color: themeUtils.get('COLORS.DANGER'),
    path: '/?layout=self-analysis'
  }
]);

/**
 * Diagnostic Panel - Shows connection status and troubleshooting info
 */
const DiagnosticPanel = () => {
  const wsConnected = useUiStore(state => state.wsConnected);
  const wsService = useUiStore(state => state.wsService);
  const error = useUiStore(state => state.error);

  // Get WebSocket metrics if available
  const wsMetrics = wsService?.getMetrics ? wsService.getMetrics() : null;

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

  return React.createElement(Card, {
    title: 'System Status & Diagnostics',
    style: { marginTop: themeUtils.get('SPACING.MD') }
  },
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
        React.createElement('li', null, 'Verify the WebSocket URL is correct')
      )
    ),

    // Test connection button
    React.createElement(Button, {
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        console.log('Testing WebSocket connection...');
        // Try to send a test message if service is available
        const service = useUiStore.getState().wsService;
        if (service) {
          console.log('WebSocket service found:', service.state);
          service.sendMessage({ type: 'ping', test: true });
        } else {
          console.warn('No WebSocket service available to test');
          // Try to initialize connection
          const { VITE_WS_HOST = 'localhost', VITE_WS_PORT = '8080', VITE_WS_PATH = '/ws' } = import.meta.env;
          const wsUrl = `ws://${VITE_WS_HOST}:${VITE_WS_PORT}${VITE_WS_PATH}`;
          console.log('Expected WebSocket URL:', wsUrl);
        }
      }
    }, 'Test Connection'),

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

/**
 * Application card component using React.createElement
 */
const AppCard = ({ app, onClick }) => {
  const cardStyle = React.useMemo(() => ({
    cursor: 'pointer',
    transform: 'scale(1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: `4px solid ${app.color}`,
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: themeUtils.get('SHADOWS.MD')
    }
  }), [app.color]);

  const contentStyle = React.useMemo(() => ({
    display: 'flex',
    alignItems: 'center'
  }), []);

  const iconStyle = React.useMemo(() => ({
    fontSize: '1.5rem',
    marginRight: '0.5rem'
  }), []);

  const descriptionStyle = React.useMemo(() => ({
    marginBottom: themeUtils.get('SPACING.MD')
  }), []);

  const handleCardClick = React.useCallback(() => onClick(app), [onClick, app]);

  const handleLaunchClick = React.useCallback((e) => {
    e.stopPropagation();
    onClick(app);
  }, [onClick, app]);

  return React.createElement('div', {
    style: cardStyle,
    onClick: handleCardClick,
    onMouseEnter: (e) => e.target.style.transform = 'scale(1.02)',
    onMouseLeave: (e) => e.target.style.transform = 'scale(1',
  },
  React.createElement(Card, {
    title: React.createElement('div', { style: contentStyle },
      React.createElement('span', { style: iconStyle }, app.icon),
      app.name
    )
  },
  React.createElement('p', { style: descriptionStyle }, app.description),
  React.createElement(Button, {
    variant: 'light',
    size: 'sm',
    onClick: handleLaunchClick
  }, 'Launch')
  )
  );
};

/**
 * Launcher: Main launcher component with proper loading and error handling
 */
const Launcher = ({ appId = 'launcher', appConfig = {} }) => {
  // Function to handle app selection
  const handleAppSelect = React.useCallback((app) => {
    // Redirect to the selected application
    if (app.id === 'minimal-repl') {
      // For minimal REPL, we'll add a special case to load it directly
      window.location.href = '/repl/#minimal';
    } else {
      window.location.href = app.path;
    }
  }, []);

  const LauncherContent = () => React.createElement('div', { style: { padding: themeUtils.get('SPACING.LG'), textAlign: 'center' } },
    React.createElement('h2', { style: { marginBottom: themeUtils.get('SPACING.XL') } },
      'Select an Interface to Begin'
    ),
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: themeUtils.get('SPACING.MD'),
        maxWidth: '1200px',
        margin: '0 auto'
      }
    },
    UI_APPS.map(app =>
      React.createElement(AppCard, {
        key: app.id,
        app: app,
        onClick: handleAppSelect
      })
    )
    ),
    // Add diagnostic panel below the app cards
    React.createElement(DiagnosticPanel, null)
  );

  return React.createElement(BaseApp, {
    appId,
    appConfig: { title: 'SeNARS Web UI Launcher', ...appConfig },
    showWebSocketStatus: false, // We're showing our own diagnostic
    layoutComponent: LauncherContent
  });
};

export default Launcher;