/**
 * App-specific layouts that can use common components
 * These layouts provide different arrangements for various app types
 */

import React from 'react';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import useUiStore from '../stores/uiStore.js';
import WebSocketService from '../utils/websocket.js';
import Panel from '../components/Panel.js';
import { contentMap } from '../components/panelContent.js';
import { themeUtils } from '../utils/themeUtils.js';
import { createLayoutElements, createLayout } from './LayoutUtils.js';

// AppLayout component that uses different layouts based on app type
const AppLayout = ({ layoutType = 'ide', onLayoutChange, children }) => {
  const [model, setModel] = React.useState(null);
  const layoutRef = React.useRef(null);

  React.useEffect(() => {
    const layoutElements = createLayoutElements(React, themeUtils);
    const layout = createLayout(layoutElements, layoutType);
    setModel(Model.fromJson(layout));
  }, [layoutType]);

  // The WebSocket connection is now handled by BaseApp, so we don't need to initialize it here
  // We'll just ensure the connection status is monitored properly
  React.useEffect(() => {
    if (!model) return;

    // Log WebSocket service status for debugging
    const wsService = useUiStore.getState().wsService;
    if (!wsService) {
      console.warn('WebSocket service not available in AppLayout');
    } else {
      console.log('AppLayout: WebSocket service already initialized, connection state:', wsService.state);
    }
  }, [model]);

  const handleLayoutChange = (newModel) => {
    const jsonLayout = newModel.toJson();
    useUiStore.getState().setLayout(jsonLayout);
    onLayoutChange?.(jsonLayout);
  };

  const componentFactory = (node) => {
    const component = node.getComponent();
    const ContentComponent = contentMap[component] || (() => `Content for ${component}`);
    const title = component.replace('Panel', '') || 'Panel';

    return React.createElement(Panel, { title },
      React.createElement(ContentComponent)
    );
  };

  return React.createElement(React.Fragment, null,
    model
      ? React.createElement(Layout, {
          model,
          ref: layoutRef,
          onModelChange: handleLayoutChange,
          factory: componentFactory,
          key: 'flexlayout-root'
        })
      : React.createElement('div', { className: 'loading', style: { padding: '20px' } },
          React.createElement('p', null, 'Loading layout...')
        ),
    children
  );
};

export default AppLayout;