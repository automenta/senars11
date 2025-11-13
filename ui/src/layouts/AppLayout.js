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

  React.useEffect(() => {
    if (!model) return;

    // Initialize WebSocket connection with environment-based configuration
    const { VITE_WS_HOST = 'localhost', VITE_WS_PORT = '8080', VITE_WS_PATH = '/ws' } = import.meta.env;
    const wsUrl = `ws://${VITE_WS_HOST}:${VITE_WS_PORT}${VITE_WS_PATH}`;

    const wsService = new WebSocketService(wsUrl);
    window.wsService = wsService;
    useUiStore.getState().setWsService(wsService);

    wsService.connect();

    return () => {
      if (window.wsService === wsService) window.wsService = null;
      useUiStore.getState().setWsService(null);
      wsService.disconnect();
    };
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