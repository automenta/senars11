// Common panel utilities for the UI components
import React, { memo, useState, useEffect, useMemo } from 'react';
import useUiStore from '../stores/uiStore.js';
import ErrorBoundary from '../components/ErrorBoundary.js';
import GenericPanel from '../components/GenericPanel.js';
import Panel from '../components/Panel.js';
import { DataVisualizer } from './dataVisualization.js';

/**
 * Common panel utilities and higher-order components
 */

// Create a memoized panel wrapper that handles common panel patterns
export const createMemoizedPanel = (Component) => {
  return memo((props) => React.createElement(Component, props));
};

// Create a panel with state management built-in
export const createPanelWithState = (config) => {
  const { 
    title, 
    storeSelector, 
    loadingMessage = 'Loading...', 
    emptyMessage = 'No data to display',
    renderItem = null,
    ...otherProps 
  } = config;

  const PanelWithState = () => {
    const data = useUiStore(storeSelector);
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading state for demonstration
    useEffect(() => {
      setIsLoading(false);
    }, [data]);

    if (isLoading) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px' 
          } 
        },
          React.createElement('div', null, loadingMessage)
        )
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            padding: '1rem', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }
        }, emptyMessage)
      );
    }

    // If renderItem is provided, use GenericPanel to display the data
    if (renderItem) {
      return React.createElement(GenericPanel, {
        title,
        items: data,
        renderItem,
        emptyMessage,
        ...otherProps
      });
    }

    // Otherwise just render the data directly
    return React.createElement(Panel, { title },
      React.createElement('div', null, 
        typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
      )
    );
  };

  return memo(PanelWithState);
};

// Create a data fetching panel wrapper
export const createDataFetchingPanel = (config) => {
  const { 
    title, 
    fetchDataAction, 
    loadingMessage = 'Loading...', 
    emptyMessage = 'No data available',
    errorStateKey = 'error',
    ...otherProps 
  } = config;

  const DataFetchingPanel = () => {
    const error = useUiStore(state => state[errorStateKey]);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const result = await fetchDataAction();
          setData(result);
        } catch (err) {
          console.error(`Error fetching data for ${title}:`, err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, []); // Only run on mount

    if (error) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            padding: '1rem', 
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '4px'
          }
        }, 
          React.createElement('strong', null, 'Error: '), 
          error
        )
      );
    }

    if (isLoading) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px' 
          } 
        },
          React.createElement('div', null, loadingMessage)
        )
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            padding: '1rem', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }
        }, emptyMessage)
      );
    }

    // Render the data using the provided configuration
    return React.createElement(Panel, { title, ...otherProps },
      React.createElement('div', null, 
        Array.isArray(data) 
          ? data.map((item, index) => 
              React.createElement('div', { key: item.id || index, style: { marginBottom: '0.5rem' } }, 
                typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
              )
            )
          : typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
      )
    );
  };

  return memo(DataFetchingPanel);
};

// Create a WebSocket-connected panel that automatically subscribes to updates
export const createWebSocketPanel = (config) => {
  const { 
    title, 
    subscriptionTopic,
    loadingMessage = 'Connecting...', 
    emptyMessage = 'No updates received',
    renderContent,
    ...otherProps 
  } = config;

  const WebSocketPanel = () => {
    const wsService = useUiStore(state => state.wsService);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (!wsService) return;

      const handleConnect = () => {
        setIsConnected(true);
        setIsLoading(false);
        // Subscribe to the topic when connected
        if (subscriptionTopic) {
          wsService.subscribe(subscriptionTopic, (data) => {
            setMessages(prev => [data, ...prev.slice(0, 99)]); // Keep only the last 100 messages
          });
        }
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      // Set up connection listeners
      wsService.on('connect', handleConnect);
      wsService.on('disconnect', handleDisconnect);

      // Check initial connection state
      if (wsService.isConnected()) {
        handleConnect();
      } else {
        setIsLoading(false);
      }

      // Cleanup function
      return () => {
        if (subscriptionTopic) {
          wsService.unsubscribe(subscriptionTopic);
        }
        wsService.removeListener('connect', handleConnect);
        wsService.removeListener('disconnect', handleDisconnect);
      };
    }, [wsService]);

    const content = isLoading 
      ? React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px' 
          } 
        },
          React.createElement('div', null, loadingMessage)
        )
      : messages.length === 0
        ? React.createElement('div', { 
            style: { 
              padding: '1rem', 
              textAlign: 'center', 
              color: '#999',
              fontStyle: 'italic'
            }
          }, emptyMessage)
        : renderContent 
          ? renderContent(messages)
          : React.createElement('div', null, 
              messages.map((msg, idx) => 
                React.createElement('div', { 
                  key: idx, 
                  style: { 
                    padding: '0.5rem', 
                    borderBottom: '1px solid #eee',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  } 
                }, JSON.stringify(msg))
              )
            );

    return React.createElement(Panel, { 
      title, 
      showWebSocketStatus: true,
      ...otherProps 
    },
      content
    );
  };

  return memo(WebSocketPanel);
};

// Create a generic time series panel
export const createTimeSeriesPanel = (config) => {
  const { 
    title, 
    dataSelector,
    xKey = 'timestamp', 
    yKey = 'value',
    chartType = 'line',
    color = '#3498db',
    ...otherProps 
  } = config;

  const TimeSeriesPanel = () => {
    const data = useUiStore(dataSelector) || [];
    
    // Sort by timestamp if it exists
    const sortedData = useMemo(() => {
      if (!Array.isArray(data)) return [];
      return [...data].sort((a, b) => new Date(a[xKey]) - new Date(b[xKey]));
    }, [data]);

    if (sortedData.length === 0) {
      return React.createElement(Panel, { title },
        React.createElement('div', { 
          style: { 
            padding: '1rem', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }
        }, 'No time series data to display')
      );
    }
    
    return React.createElement(Panel, { title, ...otherProps },
      React.createElement(DataVisualizer, {
        data: sortedData,
        type: chartType,
        xKey,
        yKey,
        color,
        width: '100%',
        height: '300px'
      })
    );
  };

  return memo(TimeSeriesPanel);
};

// Export the utilities
export default {
  createMemoizedPanel,
  createPanelWithState,
  createDataFetchingPanel,
  createWebSocketPanel,
  createTimeSeriesPanel
};