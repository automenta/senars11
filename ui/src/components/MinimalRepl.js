/**
 * Minimal REPL Component - Provides a basic working interface as fallback
 * This component works even when the full UI system fails
 */
import React, { useState, useEffect, useRef } from 'react';
import useUiStore from '../stores/uiStore.js';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';

const MinimalRepl = ({ onBackToLauncher = null }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check WebSocket connection status
  useEffect(() => {
    const checkConnection = () => {
      const wsService = useUiStore.getState().wsService;
      if (wsService) {
        setIsConnected(wsService.state === 'CONNECTED' || wsService.state === 2); // 2 is CONNECTED in WebSocket constants
        setConnectionStatus(wsService.state === 'CONNECTED' || wsService.state === 2 ? 'Connected' : 'Connecting...');
      } else {
        setConnectionStatus('No WebSocket Service');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add input to history
    const newHistory = [...history, { type: 'input', content: input, timestamp: Date.now() }];
    setHistory(newHistory);
    
    // Clear input
    setInput('');

    // Send message via WebSocket if available
    if (isConnected) {
      const wsService = useUiStore.getState().wsService;
      if (wsService) {
        wsService.sendMessage({
          type: 'narseseInput',
          payload: { input: input }
        });
      } else {
        // Add error message if no WebSocket service
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: 'No WebSocket service available', 
          timestamp: Date.now() 
        }]);
      }
    } else {
      // Add error message if not connected
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'Not connected to backend - try running: npm run web', 
        timestamp: Date.now() 
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const wsConnected = useUiStore(state => state.wsConnected);

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
      fontFamily: themeUtils.get('FONTS.FAMILY.BASE'),
      padding: themeUtils.get('SPACING.MD')
    }
  },
    // Header
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${themeUtils.get('SPACING.SM')} 0`,
        borderBottom: `2px solid ${themeUtils.get('BORDERS.COLOR')}`,
        marginBottom: themeUtils.get('SPACING.MD')
      }
    },
      React.createElement('h2', { style: { margin: 0, color: themeUtils.get('TEXT.PRIMARY') } }, 'Minimal REPL Interface'),
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: themeUtils.get('SPACING.SM')
        }
      },
        // Connection status indicator
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: themeUtils.get('SPACING.XS'),
            padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            backgroundColor: wsConnected 
              ? themeUtils.get('COLORS.SUCCESS') + '20' 
              : themeUtils.get('COLORS.WARNING') + '20'
          }
        },
          React.createElement('div', {
            style: {
              width: '0.75rem',
              height: '0.75rem',
              borderRadius: '50%',
              backgroundColor: wsConnected 
                ? themeUtils.get('COLORS.SUCCESS') 
                : themeUtils.get('COLORS.WARNING')
            }
          }),
          React.createElement('span', { style: { fontSize: themeUtils.get('FONTS.SIZE.SM') } }, 
            wsConnected ? 'Connected' : 'Disconnected'
          )
        ),
        
        // Back button if provided
        onBackToLauncher && React.createElement(Button, {
          onClick: onBackToLauncher,
          variant: 'secondary',
          size: 'sm'
        }, 'Back to Launcher')
      )
    ),

    // History display
    React.createElement('div', {
      style: {
        flex: 1,
        overflowY: 'auto',
        marginBottom: themeUtils.get('SPACING.MD'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
      }
    },
      history.length === 0
        ? React.createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: themeUtils.get('TEXT.MUTED'),
              fontStyle: 'italic'
            }
          }, 'No interactions yet. Type a command and press Enter.')
        : history.map((item, index) => {
            const isInput = item.type === 'input';
            const isError = item.type === 'error';
            
            return React.createElement('div', {
              key: index,
              style: {
                marginBottom: themeUtils.get('SPACING.SM'),
                padding: themeUtils.get('SPACING.SM'),
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                backgroundColor: isInput 
                  ? themeUtils.get('COLORS.PRIMARY') + '10' 
                  : isError 
                    ? themeUtils.get('COLORS.DANGER') + '10' 
                    : themeUtils.get('BACKGROUNDS.TERTIARY'),
                border: `1px solid ${isInput ? themeUtils.get('COLORS.PRIMARY') : isError ? themeUtils.get('COLORS.DANGER') : themeUtils.get('BORDERS.COLOR')}`,
                color: isError ? themeUtils.get('COLORS.DANGER') : themeUtils.get('TEXT.PRIMARY')
              }
            },
              React.createElement('div', {
                style: { 
                  fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                  marginBottom: themeUtils.get('SPACING.XS'),
                  fontSize: themeUtils.get('FONTS.SIZE.XS'),
                  color: isInput ? themeUtils.get('COLORS.PRIMARY') : isError ? themeUtils.get('COLORS.DANGER') : themeUtils.get('TEXT.SECONDARY')
                }
              }, isInput ? 'INPUT' : isError ? 'ERROR' : 'OUTPUT'),
              React.createElement('div', null, item.content)
            );
          }),
      React.createElement('div', { ref: messagesEndRef })
    ),

    // Input form
    React.createElement('form', {
      onSubmit: handleSubmit,
      style: {
        display: 'flex',
        gap: themeUtils.get('SPACING.SM')
      }
    },
      React.createElement('textarea', {
        ref: inputRef,
        value: input,
        onChange: (e) => setInput(e.target.value),
        onKeyPress: handleKeyPress,
        placeholder: 'Enter Narsese command (e.g., <cat --> animal>.)...',
        style: {
          flex: 1,
          padding: themeUtils.get('SPACING.SM'),
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
          resize: 'vertical',
          minHeight: '60px',
          maxHeight: '120px',
          fontSize: themeUtils.get('FONTS.SIZE.BASE'),
          backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
          color: themeUtils.get('TEXT.PRIMARY')
        }
      }),
      React.createElement(Button, {
        type: 'submit',
        variant: 'primary',
        disabled: !input.trim()
      }, 'Send')
    ),

    // Instructions
    React.createElement('div', {
      style: {
        marginTop: themeUtils.get('SPACING.MD'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        fontSize: themeUtils.get('FONTS.SIZE.SM')
      }
    },
      React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: themeUtils.get('SPACING.XS') } }, 'Instructions:'),
      React.createElement('ul', { style: { margin: 0, paddingLeft: themeUtils.get('SPACING.MD') } },
        React.createElement('li', null, 'Type Narsese commands and press Enter to execute'),
        React.createElement('li', null, 'Common commands: <cat --> animal>., <cat --> animal>?'),
        React.createElement('li', null, 'Connection status: ', wsConnected ? 'Connected to backend' : 'Disconnected - run "npm run web" to start backend'),
        React.createElement('li', null, 'This minimal interface works even if the full UI fails')
      )
    )
  );
};

export default MinimalRepl;