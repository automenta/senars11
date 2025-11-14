/**
 * REPL Console Panel - Interactive command interface
 * Extracted from MergedLauncher for docking framework integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BaseComponent, InputComponent, StatusIndicator, DataDisplay } from './shared/SharedComponents.js';
import { Button } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { useWebSocket, useUiData } from '../hooks/useWebSocket.js';

const ReplConsolePanel = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Use the shared WebSocket hook
  const { wsConnected, sendMessage, wsService } = useWebSocket();

  // Use the shared UI data hook
  const { addNotification } = useUiData();

  // Enhanced history navigation with arrow keys
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        if (historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab' && suggestions.length > 0 && showSuggestions) {
      e.preventDefault();
      setInput(suggestions[selectedSuggestion]);
      setShowSuggestions(false);
      setSuggestions([]);
    } else if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [commandHistory, historyIndex, suggestions, showSuggestions, selectedSuggestion]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on mount and add keyboard event listener
  useEffect(() => {
    inputRef.current?.focus();

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown);
      return () => inputElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  // Handle input changes with autocomplete suggestions
  useEffect(() => {
    if (input.trim()) {
      // Simple autocomplete based on recent commands and common patterns
      const recentCommands = commandHistory.filter(cmd =>
        cmd.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 3);

      // Common Narsese patterns
      const patterns = [
        '<subject --> predicate>.',
        '<subject --> predicate>?',
        '<subject --> predicate>!',
        '<(subject & property) --> predicate>.',
        '<subject =/> predicate>.',
        '<subject =/> predicate>?'
      ];

      const patternMatches = patterns.filter(pattern =>
        pattern.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 3);

      const allSuggestions = [...new Set([...recentCommands, ...patternMatches])];

      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, commandHistory]);

  // Refs to maintain current values in event handlers
  const historyRef = useRef(history);
  const setHistoryRef = useRef(setHistory);

  // Update refs when state changes
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Register message listeners for real-time updates using wsService directly
  useEffect(() => {
    if (!wsService) {
      return; // Exit early if wsService is not available yet
    }

    const handleTaskUpdate = (data) => {
      if (data.payload?.task) {
        setHistoryRef.current(prev => [...prev, {
          type: 'output',
          content: `Task processed: ${data.payload.task.content}`,
          timestamp: Date.now()
        }]);
      }
    };

    const handleConceptUpdate = (data) => {
      if (data.payload?.concept) {
        setHistoryRef.current(prev => [...prev, {
          type: 'concept',
          content: `Concept updated: ${data.payload.concept.term}`,
          timestamp: Date.now()
        }]);
      }
    };

    const handleNarseseResponse = (data) => {
      if (data.type === 'narseseInput') {
        setHistoryRef.current(prev => [...prev, {
          type: 'response',
          content: data.payload.message || `Processed: ${data.payload.input}`,
          timestamp: Date.now()
        }]);
      }
    };

    // Register listeners using wsService.addListener if available
    const taskUnsubscribe = wsService.addListener ? wsService.addListener('taskUpdate', handleTaskUpdate) : null;
    const conceptUnsubscribe = wsService.addListener ? wsService.addListener('conceptUpdate', handleConceptUpdate) : null;
    const narseseUnsubscribe = wsService.addListener ? wsService.addListener('narseseInput', handleNarseseResponse) : null;

    // Clean up handlers on unmount
    return () => {
      if (taskUnsubscribe) taskUnsubscribe();
      if (conceptUnsubscribe) conceptUnsubscribe();
      if (narseseUnsubscribe) narseseUnsubscribe();
    };
  }, [wsService]);

  const handleSubmit = async (inputValue) => {
    if (!inputValue.trim()) return;

    // Add to command history
    if (!commandHistory.includes(inputValue)) {
      setCommandHistory(prev => [inputValue, ...prev.slice(0, 19)]); // Keep last 20 commands
    }
    setHistoryIndex(-1); // Reset history index

    // Add input to history
    const newHistory = [...history, {
      type: 'input',
      content: inputValue,
      timestamp: Date.now()
    }];
    setHistory(newHistory);

    try {
      setLoading(true);
      setError(null);

      // Send message via WebSocket
      if (wsConnected) {
        await sendMessage({
          type: 'narseseInput',
          payload: { input: inputValue }
        });
      } else {
        // Add error message if not connected
        setHistory(prev => [...prev, {
          type: 'error',
          content: 'Not connected to backend - try running: npm run web',
          timestamp: Date.now()
        }]);
        addNotification({
          type: 'error',
          title: 'Not Connected',
          message: 'Cannot send command without backend connection'
        });
      }
    } catch (err) {
      setError(err);
      setHistory(prev => [...prev, {
        type: 'error',
        content: `Error: ${err.message}`,
        timestamp: Date.now()
      }]);
      addNotification({
        type: 'error',
        title: 'Command Failed',
        message: err.message
      });
    } finally {
      setLoading(false);
      setInput(''); // Clear input after submission
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Validation function for Narsese input
  const validateNarsese = (input) => {
    if (!input.trim()) {
      return { isValid: false, message: 'Input cannot be empty' };
    }

    // Simple validation for common Narsese patterns
    const narsesePattern = /^[\w\s<>=\-()&]+[.!?]$/;
    if (!narsesePattern.test(input.trim())) {
      return {
        isValid: false,
        message: 'Input should follow Narsese format (e.g., <subject --> predicate>.)'
      };
    }

    return { isValid: true, message: 'Valid Narsese syntax' };
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
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
      React.createElement('h3', { style: { margin: 0, color: themeUtils.get('TEXT.PRIMARY') } }, 'REPL Console'),
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: themeUtils.get('SPACING.SM')
        }
      },
        // Connection status indicator
        React.createElement(StatusIndicator, {
          connected: wsConnected,
          statusText: wsConnected ? 'Ready' : 'Disconnected'
        })
      )
    ),

    // History display
    React.createElement('div', {
      style: {
        flex: 1,
        overflowY: 'auto',
        marginBottom: themeUtils.get('SPACING.MD'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
      }
    },
      React.createElement(DataDisplay, {
        data: history,
        dataType: 'history',
        emptyMessage: 'No interactions yet. Type a command and submit.',
        renderItem: (item, index) => {
          const isInput = item.type === 'input';
          const isError = item.type === 'error';
          const isResponse = item.type === 'response';
          const isConcept = item.type === 'concept';

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
                  : isConcept
                    ? themeUtils.get('COLORS.INFO') + '10'
                    : themeUtils.get('BACKGROUNDS.TERTIARY'),
              border: `1px solid ${isInput ? themeUtils.get('COLORS.PRIMARY') : isError ? themeUtils.get('COLORS.DANGER') : isConcept ? themeUtils.get('COLORS.INFO') : themeUtils.get('BORDERS.COLOR')}`,
              color: isError ? themeUtils.get('COLORS.DANGER') : themeUtils.get('TEXT.PRIMARY')
            }
          },
            React.createElement('div', {
              style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                marginBottom: themeUtils.get('SPACING.XS'),
                fontSize: themeUtils.get('FONTS.SIZE.XS'),
                color: isInput ? themeUtils.get('COLORS.PRIMARY') :
                       isError ? themeUtils.get('COLORS.DANGER') :
                       themeUtils.get('TEXT.SECONDARY')
              }
            }, isInput ? 'INPUT' : isError ? 'ERROR' : isConcept ? 'CONCEPT' : 'OUTPUT'),
            React.createElement('div', null, item.content)
          );
        }
      }),
      React.createElement('div', { ref: messagesEndRef })
    ),

    // Autocomplete suggestions
    showSuggestions && suggestions.length > 0 && React.createElement('div', {
      ref: suggestionsRef,
      style: {
        position: 'absolute',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        zIndex: 1000,
        width: '400px',
        maxHeight: '200px',
        overflowY: 'auto',
        boxShadow: themeUtils.get('SHADOWS.MD')
      }
    },
      suggestions.map((suggestion, index) =>
        React.createElement('div', {
          key: index,
          onClick: () => {
            setInput(suggestion);
            setShowSuggestions(false);
            setSuggestions([]);
          },
          style: {
            padding: themeUtils.get('SPACING.SM'),
            cursor: 'pointer',
            backgroundColor: index === selectedSuggestion ? themeUtils.get('COLORS.PRIMARY') + '20' : 'transparent',
            borderBottom: index < suggestions.length - 1 ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none'
          },
          onMouseEnter: () => setSelectedSuggestion(index)
        }, suggestion)
      )
    ),

    // Input component using shared component
    React.createElement('div', {
      style: { position: 'relative' }
    },
      React.createElement(InputComponent, {
        value: input,
        onChange: setInput,
        onSubmit: handleSubmit,
        placeholder: 'Enter Narsese command (e.g., <cat --> animal>.)...',
        validation: validateNarsese,
        showValidation: true
      })
    )
  );
};

export default ReplConsolePanel;