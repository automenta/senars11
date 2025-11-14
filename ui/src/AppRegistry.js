/**
 * App Registry: Parameterized app creation with common infrastructure
 * Following AGENTS.md: Modular, Abstract, DRY
 */

import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { LoadingSpinner } from './components/shared/index.js';
import { themeUtils } from './utils/themeUtils.js';

/**
 * Create an application factory with common infrastructure
 * @param {Object} config - Application configuration
 * @returns {Function} Application factory function
 */
export const createApp = (config) => {
  const {
    appId = 'base-app',
    appConfig = {},
    layoutComponent: LayoutComponent = null,
    requiresWebSocket = true,
    onInit = null,
    onError = null,
    LoadingComponent = null,
    ErrorComponent = null
  } = config;

  return (props = {}) => {
    // Run initialization if provided
    React.useEffect(() => {
      if (onInit && typeof onInit === 'function') {
        onInit();
      }
    }, []);

    if (requiresWebSocket) {
      const { wsConnected, loading } = useWebSocket();

      // Show loading state if still connecting to WebSocket
      if (loading && !wsConnected) {
        const LoadingComp = LoadingComponent || (() =>
          React.createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')
            }
          },
          React.createElement(LoadingSpinner, { size: themeUtils.get('SPACING.XL') })
        ));

        return React.createElement(LoadingComp);
      }

      // Show error if WebSocket is disconnected and error component provided
      if (!wsConnected && ErrorComponent) {
        return React.createElement(ErrorComponent, { 
          message: 'WebSocket Disconnected',
          wsConnected 
        });
      }
    }

    return React.createElement(BaseApp, {
      appId,
      appConfig: { title: 'Base App', ...appConfig },
      layoutComponent: LayoutComponent,
      ...props
    });
  };
};

/**
 * Application launcher with path-based routing
 */
export const createAppLauncher = (registry) => {
  return ({ path = window.location.pathname, defaultApp = 'launcher' } = {}) => {
    const appMatch = registry.getByPath(path);
    const appId = appMatch ? appMatch.id : defaultApp;

    if (!registry.has(appId)) {
      console.warn(`App ${appId} not found, falling back to ${defaultApp}`);
      return registry.createAppInstance(defaultApp);
    }

    return registry.createAppInstance(appId);
  };
};

export {
  BaseApp,
  useWebSocket,
  useUiData,
  useDataOperations
} from './index.js';

// Default export for the createApp function
export default createApp;