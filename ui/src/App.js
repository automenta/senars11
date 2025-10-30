import React, { useState, useEffect, useRef } from 'react';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import useUiStore from './stores/uiStore';
import WebSocketService from './utils/websocket';
import defaultLayout from './layouts/defaultLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Panel from './components/Panel';
import { contentMap } from './components/panelContent';

function App() {
  const layoutRef = useRef(null);
  const [model, setModel] = useState(null);
  const wsService = useRef(null);
  
  useEffect(() => {
    setModel(Model.fromJson(defaultLayout));
  }, []);

  useEffect(() => {
    if (!model) return;
    
    // Construct WebSocket URL using Vite environment variables, with defaults
    const { VITE_WS_HOST='localhost', VITE_WS_PORT='8080', VITE_WS_PATH='/ws' } = import.meta.env;
    const wsUrl = `ws://${VITE_WS_HOST}:${VITE_WS_PORT}${VITE_WS_PATH}`;
    
    wsService.current = new WebSocketService(wsUrl);
    wsService.current.connect();
    
    import('./utils/consoleBridge').then(module => {
      if (wsService.current?.ws) module.setConsoleBridge(wsService.current.ws);
    });
    
    return () => wsService.current?.disconnect();
  }, [model]);

  const handleLayoutChange = (newModel) => 
    useUiStore.getState().setLayout(newModel.toJson());

  const componentFactory = (node) => {
    const component = node.getComponent();
    const ContentComponent = contentMap[component];
    
    // If ContentComponent is a function/component, render it as children; otherwise show as text
    const content = ContentComponent
      ? React.createElement(ContentComponent)
      : `Content for ${component}`;
    
    return React.createElement(Panel, { 
      title: component.replace('Panel', '') || 'Panel'
    }, content);
  };

  return React.createElement(ErrorBoundary, null,
    model 
      ? React.createElement(Layout, {
        model,
        ref: layoutRef,
        onModelChange: handleLayoutChange,
        factory: componentFactory,
        key: 'flexlayout-root'
      })
      : React.createElement('div', { className: 'loading', style: { padding: '20px' } }, 
        React.createElement('p', null, 'Loading UI...')
      )
  );
}

export default App;