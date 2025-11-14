/**
 * REPL Console Panel - Interactive command interface
 * Extracted from MergedLauncher for docking framework integration
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BaseComponent, InputComponent, StatusIndicator, DataDisplay } from './shared/SharedComponents.js';
import { Button } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { useWebSocket, useUiData } from '../hooks/useWebSocket.js';

// Narsese input validation with helpful feedback
const validateNarsese = (input) => {
  const trimmed = input.trim();

  if (!trimmed) {
    return { isValid: false, message: 'Input cannot be empty' };
  }

  const isValidSyntax = /^[\w\s<>=\-()&]+[.!?]$/.test(trimmed);

  return {
    isValid: isValidSyntax,
    message: isValidSyntax
      ? 'Valid Narsese syntax'
      : 'Input should follow Narsese format (e.g., <subject --> predicate>.)'
  };
};

// Create message handlers that update the command history
const createMessageHandlers = (historyRef, setHistory) => {
  const updateHistory = (entry) => {
    historyRef.current = [...historyRef.current, entry];
    setHistory(historyRef.current);
  };

  return {
    handleTaskUpdate: (data) => {
      if (data.payload?.task) {
        updateHistory({
          type: 'output',
          content: `Task processed: ${data.payload.task.content}`,
          timestamp: Date.now()
        });
      }
    },

    handleConceptUpdate: (data) => {
      if (data.payload?.concept) {
        updateHistory({
          type: 'concept',
          content: `Concept updated: ${data.payload.concept.term}`,
          timestamp: Date.now()
        });
      }
    },

    handleNarseseResponse: (data) => {
      if (data.type === 'narseseInput') {
        updateHistory({
          type: 'response',
          content: data.payload.message || `Processed: ${data.payload.input}`,
          timestamp: Date.now()
        });
      }
    }
  };
};

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
  const historyRef = useRef(history); // Maintain history reference to prevent stale closures

  // Use the shared WebSocket hook
  const { wsConnected, sendMessage, wsService } = useWebSocket();

  // Use the shared UI data hook
  const { addNotification } = useUiData();

  // Update history reference whenever history changes
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

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

  // Focus input on mount and add keyboard event listener
  useEffect(() => {
    inputRef.current?.focus();

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown);
      return () => inputElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  // Debounced input handling for autocomplete suggestions to improve performance
  const debouncedSuggestionUpdate = useMemo(() => {
    let timeoutId = null;

    return (inputValue, commandHistoryValue) => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        if (inputValue.trim()) {
          // Simple autocomplete based on recent commands and common patterns
          const recentCommands = commandHistoryValue.filter(cmd =>
            cmd.toLowerCase().includes(inputValue.toLowerCase())
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
            pattern.toLowerCase().includes(inputValue.toLowerCase())
          ).slice(0, 3);

          const allSuggestions = [...new Set([...recentCommands, ...patternMatches])];

          setSuggestions(allSuggestions);
          setShowSuggestions(allSuggestions.length > 0);
          setSelectedSuggestion(0);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 150); // 150ms debounce
    };
  }, []);

  // Handle input changes with debounced autocomplete suggestions
  useEffect(() => {
    debouncedSuggestionUpdate(input, commandHistory);
  }, [input, commandHistory, debouncedSuggestionUpdate]);

  // Register and unregister WebSocket message listeners
  useEffect(() => {
    if (!wsService || !wsService.addListener) return;

    const { handleTaskUpdate, handleConceptUpdate, handleNarseseResponse } =
      createMessageHandlers(historyRef, setHistory);

    // Register all event listeners
    const subscriptions = [
      wsService.addListener('taskUpdate', handleTaskUpdate),
      wsService.addListener('conceptUpdate', handleConceptUpdate),
      wsService.addListener('narseseInput', handleNarseseResponse)
    ].filter(Boolean); // Filter out null/undefined subscriptions

    // Clean up all listeners on unmount
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe?.());
    };
  }, [wsService, historyRef, setHistory]);

  // Handle form submission
  const handleSubmit = useCallback(async (inputValue) => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Update command history with new input (avoid duplicates)
    setCommandHistory(prev =>
      prev.includes(trimmedInput)
        ? prev
        : [trimmedInput, ...prev.slice(0, 19)] // Keep last 20 commands
    );
    setHistoryIndex(-1); // Reset history index

    // Add input to history
    const inputEntry = { type: 'input', content: trimmedInput, timestamp: Date.now() };
    setHistory(prev => [...prev, inputEntry]);

    try {
      setLoading(true);

      if (wsConnected) {
        await sendMessage({
          type: 'narseseInput',
          payload: { input: trimmedInput }
        });
      } else {
        // Handle disconnected state
        const errorEntry = {
          type: 'error',
          content: 'Not connected to backend - try running: npm run web',
          timestamp: Date.now()
        };
        setHistory(prev => [...prev, errorEntry]);
        addNotification({
          type: 'error',
          title: 'Not Connected',
          message: 'Cannot send command without backend connection'
        });
      }
    } catch (err) {
      setError(err);
      const errorEntry = {
        type: 'error',
        content: `Error: ${err.message}`,
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, errorEntry]);
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
  }, [wsConnected, sendMessage, addNotification]);

  // Memoize item rendering function to prevent unnecessary re-creation
  const renderItem = useCallback((item, index) => {
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
  }, []);

  // Memoize command history display to prevent re-rendering
  const historyDisplay = useMemo(() => (
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
        renderItem
      }),
      React.createElement('div', { ref: messagesEndRef })
    )
  ), [history, renderItem]);

  // Memoize autocomplete suggestions display to prevent unnecessary re-renders
  const suggestionsDisplay = useMemo(() => (
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
    )
  ), [showSuggestions, suggestions, selectedSuggestion]);

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

    historyDisplay,

    suggestionsDisplay,

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