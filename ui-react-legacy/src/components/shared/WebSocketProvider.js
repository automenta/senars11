/**
 * WebSocket Provider: Context provider for WebSocket management
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import WebSocketService from '../../utils/websocket.js';

const WebSocketContext = createContext();

export const WebSocketProvider = ({
                                      children,
                                      wsUrl = null,
                                      autoConnect = true,
                                      onConnect = null,
                                      onDisconnect = null,
                                      onMessage = null,
                                      ...props
                                  }) => {
    const [wsService, setWsService] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Determine WebSocket URL from environment or prop
        const url = wsUrl || `ws://${import.meta.env.VITE_WS_HOST || 'localhost'}:${import.meta.env.VITE_WS_PORT || '8080'}${import.meta.env.VITE_WS_PATH || '/ws'}`;

        const service = new WebSocketService(url);
        setWsService(service);

        if (autoConnect) {
            service.connect();
        }

        // Set up connection listeners
        const handleOpen = () => {
            setWsConnected(true);
            setLoading(false);
            onConnect?.();
        };

        const handleClose = () => {
            setWsConnected(false);
            onDisconnect?.();
        };

        const handleMessage = (message) => {
            onMessage?.(message);
        };

        service.on('open', handleOpen);
        service.on('close', handleClose);
        service.on('message', handleMessage);

        // Store reference globally for easy access
        window.wsService = service;

        // Cleanup
        return () => {
            service.off('open', handleOpen);
            service.off('close', handleClose);
            service.off('message', handleMessage);
            service.disconnect();
            if (window.wsService === service) window.wsService = null;
        };
    }, [wsUrl, autoConnect, onConnect, onDisconnect, onMessage]);

    const value = useMemo(() => ({
        wsService,
        wsConnected,
        loading,
        sendMessage: (message) => wsService?.sendMessage(message),
        registerHandler: (type, handler) => wsService?.registerHandler(type, handler),
        unregisterHandler: (type, handler) => wsService?.unregisterHandler(type, handler),
        subscribeTo: (type, handler) => {
            wsService?.registerHandler(type, handler);
            return () => wsService?.unregisterHandler(type, handler);
        }
    }), [wsService, wsConnected, loading]);

    return React.createElement(
        WebSocketContext.Provider,
        {value, ...props},
        children
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};