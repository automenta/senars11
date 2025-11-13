/**
 * Shared application infrastructure for common UI patterns
 * Following AGENTS.md: DRY, Modular, Organized, Abstract
 */

import React from 'react';
import AppShell from '../components/AppShell.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { GlobalErrorDisplay } from '../components/shared/ErrorBoundary.js';
import { LoadingSpinner } from '../components/shared/LoadingSpinner.js';
import { themeUtils } from '../utils/themeUtils.js';

/**
 * Base application component with common infrastructure
 * @param {Object} props - Component properties
 * @param {string} props.appId - Application ID
 * @param {Object} props.appConfig - Application configuration
 * @param {React.Component} props.children - Child components
 * @param {boolean} props.showWebSocketStatus - Whether to show WebSocket status
 * @param {React.Component} [props.layoutComponent] - Optional layout component to use
 * @returns {React.Component} Base application component
 */
export const BaseApp = ({
  appId = 'base-app',
  appConfig = {},
  children,
  showWebSocketStatus = true,
  layoutComponent: LayoutComponent = null
}) => {
  const { wsConnected, loading } = useWebSocket();

  // Show loading state if still connecting
  if (loading && !wsConnected) {
    return React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')
      }
    },
    React.createElement(LoadingSpinner, { size: themeUtils.get('SPACING.XL') })
    );
  }

  return React.createElement(React.Fragment, null,
    React.createElement(GlobalErrorDisplay, null),
    React.createElement(AppShell,
      {
        appId,
        appConfig: { title: 'Base App', ...appConfig },
        showWebSocketStatus
      },
      LayoutComponent
        ? React.createElement(LayoutComponent, null, children)
        : children,
      !wsConnected && React.createElement('div', {
        style: {
          padding: themeUtils.get('SPACING.SM'),
          backgroundColor: themeUtils.get('COLORS.WARNING') + '20',
          color: themeUtils.get('COLORS.WARNING'),
          border: `1px solid ${themeUtils.get('COLORS.WARNING')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
        }
      }, 'WebSocket Disconnected')
    )
  );
};

/**
 * Application factory for creating consistent application instances
 * @param {Object} config - Application configuration
 * @param {string} config.appId - Application ID
 * @param {Object} config.appConfig - Application configuration
 * @param {React.Component} [config.layoutComponent] - Optional layout component
 * @param {Array} [config.requiredPermissions] - Required permissions
 * @param {Function} [config.onInit] - Initialization function
 * @returns {React.Component} Configured application component
 */
export const createApp = (config) => {
  const {
    appId,
    appConfig = {},
    layoutComponent = null,
    requiredPermissions = [],
    onInit = null
  } = config;

  return (props) => {
    // Run initialization if provided
    React.useEffect(() => {
      if (onInit && typeof onInit === 'function') {
        onInit();
      }
    }, []);

    return React.createElement(BaseApp, {
      appId,
      appConfig,
      layoutComponent,
      ...props
    });
  };
};

/**
 * Shared layout components and utilities
 */
export { 
  AppShell,
  useWebSocket,
  useUiData,
  useDataOperations 
} from '../index.js';

export default BaseApp;