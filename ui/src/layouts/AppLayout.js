import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import useUiStore from '../stores/uiStore.js';
import Panel from '../components/Panel.js';
import { contentMap } from '../components/panelContent.js';
import { themeUtils } from '../utils/themeUtils.js';
import { createLayoutElements, createLayout } from './LayoutUtils.js';

// AppLayout component that uses different layouts based on app type
const AppLayout = ({ layoutType = 'ide', onLayoutChange, children }) => {
  const [model, setModel] = useState(null);
  const layoutRef = useRef(null);

  // Memoized component factory to prevent unnecessary re-creation
  const componentFactory = useCallback((node) => {
    const component = node.getComponent();
    const ContentComponent = contentMap[component] || (() => `Content for ${component}`);
    const title = component.replace('Panel', '') || 'Panel';

    return React.createElement(Panel, { title },
      React.createElement(ContentComponent)
    );
  }, []);

  // Memoize layout initialization parameters to avoid unnecessary re-creation
  const layoutInitialization = useMemo(() => {
    const layoutElements = createLayoutElements(React, themeUtils);
    return createLayout(layoutElements, layoutType);
  }, [layoutType]);

  // Initialize layout model
  useEffect(() => {
    setModel(Model.fromJson(layoutInitialization));
  }, [layoutInitialization]);

  // Monitor WebSocket service status for debugging
  useEffect(() => {
    if (!model) return;

    const wsService = useUiStore.getState().wsService;
    if (!wsService) {
      console.warn('WebSocket service not available in AppLayout');
    } else {
      console.log('AppLayout: WebSocket service already initialized, connection state:', wsService.state);
    }
  }, [model]);

  // Handle layout changes and persist to store
  const handleLayoutChange = useCallback((newModel) => {
    const jsonLayout = newModel.toJson();
    useUiStore.getState().setLayout(jsonLayout);
    onLayoutChange?.(jsonLayout);
  }, [onLayoutChange]);

  // Memoized loading element to avoid recreation
  const loadingElement = useMemo(() => (
    React.createElement('div', { className: 'loading', style: { padding: '20px' } },
      React.createElement('p', null, 'Loading layout...')
    )
  ), []);

  return React.createElement(React.Fragment, null,
    model
      ? React.createElement(Layout, {
          model,
          ref: layoutRef,
          onModelChange: handleLayoutChange,
          factory: componentFactory,
          key: `flexlayout-root-${layoutType}`
        })
      : loadingElement,
    children
  );
};

export default AppLayout;