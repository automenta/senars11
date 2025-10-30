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
    
    wsService.current = new WebSocketService('ws://localhost:8080');
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
    const content = contentMap[component] || `Content for ${component}`;
    
    return React.createElement(Panel, { title: component.replace('Panel', '') || 'Panel' },
      React.createElement('div', null, content)
    );
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
      : React.createElement('div', { style: { padding: '20px' } }, 
        React.createElement('p', null, 'Loading UI...')
      )
  );
}

export default App;