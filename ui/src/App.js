import React, {useEffect, useRef, useState} from 'react';
import {Layout, Model} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import useUiStore from './stores/uiStore';
import WebSocketService from './utils/websocket';
import defaultLayout from './layouts/defaultLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Panel from './components/Panel';
import {contentMap} from './components/panelContent';
import interactionTracker from './utils/interactionTracker';
import adaptiveDemoEngine from './utils/adaptiveDemoEngine';

function App() {
    const layoutRef = useRef(null);
    const [model, setModel] = useState(null);
    const wsService = useRef(null);

    useEffect(() => {
        const savedLayout = localStorage.getItem('layout');
        const initialLayout = savedLayout ? JSON.parse(savedLayout) : defaultLayout;
        setModel(Model.fromJson(initialLayout));
    }, []);

    useEffect(() => {
        if (!model) return;

        // Construct WebSocket URL using Vite environment variables, with defaults
        const {VITE_WS_HOST = 'localhost', VITE_WS_PORT = '8080', VITE_WS_PATH = '/ws'} = import.meta.env;
        const wsUrl = `ws://${VITE_WS_HOST}:${VITE_WS_PORT}${VITE_WS_PATH}`;

        wsService.current = new WebSocketService(wsUrl);
        
        // Make the WebSocket service available globally and in the store for components that need to send messages
        window.wsService = wsService.current;
        useUiStore.getState().setWsService(wsService.current);
        
        wsService.current.connect();

        import('./utils/consoleBridge').then(module => {
            if (wsService.current?.ws) module.setConsoleBridge(wsService.current.ws);
        });

        return () => {
            // Clean up global reference and store
            if (window.wsService === wsService.current) {
                window.wsService = null;
            }
            useUiStore.getState().setWsService(null);
            wsService.current?.disconnect();
        };
    }, [model]);

    // Initialize viewer-aware systems after WebSocket connection is established
    useEffect(() => {
        if (!model) return;

        const wsServiceInstance = wsService.current;
        if (!wsServiceInstance) return;

        // Wait for WebSocket to be connected before initializing viewer systems
        const initViewerSystems = () => {
            if (useUiStore.getState().wsConnected) {
                // Initialize interaction tracking
                interactionTracker.initialize();
                
                // Initialize adaptive demo engine
                adaptiveDemoEngine.initialize().then(() => {
                    console.log('Adaptive Demo Engine initialized');
                });
            } else {
                // Wait a bit and try again
                setTimeout(initViewerSystems, 500);
            }
        };

        // Start initialization after a small delay to ensure WebSocket is ready
        setTimeout(initViewerSystems, 1000);

        // Set up WebSocket connection status tracking
        const connectionHandler = () => {
            useUiStore.getState().setWsConnected(true);
        };
        
        const disconnectionHandler = () => {
            useUiStore.getState().setWsConnected(false);
        };

        if (wsServiceInstance.ws) {
            wsServiceInstance.ws.addEventListener('open', connectionHandler);
            wsServiceInstance.ws.addEventListener('close', disconnectionHandler);
        }

        return () => {
            if (wsServiceInstance?.ws) {
                wsServiceInstance.ws.removeEventListener('open', connectionHandler);
                wsServiceInstance.ws.removeEventListener('close', disconnectionHandler);
            }
        };
    }, [model]);

    const handleLayoutChange = (newModel) => {
        const jsonLayout = newModel.toJson();
        localStorage.setItem('layout', JSON.stringify(jsonLayout));
        useUiStore.getState().setLayout(jsonLayout);
    };

    const componentFactory = (node) => {
        const component = node.getComponent();
        const ContentComponent = contentMap[component];

        return React.createElement(Panel, {
            title: component.replace('Panel', '') || 'Panel'
        }, 
            ContentComponent 
                ? React.createElement(ContentComponent) 
                : `Content for ${component}`
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
            : React.createElement('div', {className: 'loading', style: {padding: '20px'}},
                React.createElement('p', null, 'Loading UI...')
            )
    );
}

export default App;