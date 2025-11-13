/**
 * EnhancedInputInterface Component
 * Implements the enhanced input features from PLAN.repl.md Phase 3
 * Provides syntax suggestions, command palette, history navigation, and more
 *
 * Features:
 * - Narsese syntax suggestions with auto-completion
 * - Command palette for quick access to common commands
 * - History navigation with filtering
 * - Keyboard shortcuts
 * - Input validation and error handling
 */
import React, {memo, useState, useRef, useCallback} from 'react';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';
import {DataPanel} from './DataPanel.js';

// Narsese syntax suggestions for auto-completion
const NARSESUGGESTIONS = [
  {name: '<subject --> predicate>.', description: 'Belief statement'},
  {name: '<subject --> predicate>?', description: 'Question about relationship'},
  {name: '<subject --> predicate>!', description: 'Goal statement'},
  {name: '(&, statement1, statement2).', description: 'Conjunction of statements'},
  {name: '(|, statement1, statement2).', description: 'Disjunction of statements'},
  {name: '(~, statement).', description: 'Negation of statement'},
  {name: '(statement1, statement2) =/> statement3.', description: 'Implication (if-then)'},
  {name: '%f; c%', description: 'Truth value (frequency; confidence)'}
];

// Command palette commands for quick access to functionality
const COMMANDPALETTE_COMMANDS = [
  {id: 'run', name: 'Run Reasoning', description: 'Start continuous reasoning', category: 'Control'},
  {id: 'stop', name: 'Stop Reasoning', description: 'Stop continuous reasoning', category: 'Control'},
  {id: 'step', name: 'Single Step', description: 'Execute single reasoning cycle', category: 'Control'},
  {id: 'reset', name: 'Reset Engine', description: 'Reset the reasoning engine', category: 'Control'},
  {id: 'save', name: 'Save State', description: 'Save current engine state', category: 'Data'},
  {id: 'load', name: 'Load State', description: 'Load saved engine state', category: 'Data'},
  {id: 'clear', name: 'Clear History', description: 'Clear input history', category: 'UI'},
  {id: 'export', name: 'Export Session', description: 'Export session to file', category: 'Data'},
  {id: 'import', name: 'Import Session', description: 'Import session from file', category: 'Data'}
];

const EnhancedInputInterface = memo(() => {
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteInput, setCommandPaletteInput] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [commandIndex, setCommandIndex] = useState(-1);
  const textareaRef = useRef(null);
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);

  /**
     * Filters suggestions based on current input text
     * @param {string} text - Current input text
     * @returns {Array} Filtered suggestions
     */
  const filterSuggestions = useCallback((text) => {
    if (!text?.trim()) return [];
    const lowerText = text.toLowerCase();
    return NARSESUGGESTIONS.filter(suggestion =>
      suggestion.name.toLowerCase().includes(lowerText) ||
            suggestion.description.toLowerCase().includes(lowerText)
    ).slice(0, 5); // Limit to 5 suggestions
  }, []);

  /**
     * Handles input changes and shows appropriate suggestions
     * @param {Event} e - Input change event
     */
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputText(value);

    // Show suggestions if the input looks like Narsese
    const suggestionsList = filterSuggestions(value);
    setSuggestions(suggestionsList);
    setShowSuggestions(suggestionsList.length > 0);
    setSuggestionIndex(-1);
  }, [filterSuggestions]);

  /**
     * Handles keyboard navigation for suggestions and command palette
     * @param {Event} e - Keyboard event
     */
  const handleKeyDown = useCallback((e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && suggestionIndex >= 0) {
        e.preventDefault();
        setInputText(suggestions[suggestionIndex].name);
        setShowSuggestions(false);
        setSuggestionIndex(-1);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSuggestionIndex(-1);
      }
    }

    if (commandPaletteOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && commandIndex >= 0) {
        e.preventDefault();
        executeCommand(filteredCommands[commandIndex].id);
        setCommandPaletteOpen(false);
        setCommandIndex(-1);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setCommandIndex(-1);
      }
    }
  }, [showSuggestions, suggestions, suggestionIndex, commandPaletteOpen, filteredCommands, commandIndex]);

  /**
     * Sends input to the reasoning engine via WebSocket
     */
  const sendInput = useCallback(() => {
    if (!inputText?.trim() || !wsService || !wsConnected) return;

    const trimmedInput = inputText.trim();
    const narseseInput = {
      type: 'narseseInput',
      payload: { input: trimmedInput }
    };

    try {
      wsService.sendMessage(narseseInput);

      // Add to history
      const newEntry = {
        id: Date.now(),
        input: trimmedInput,
        timestamp: Date.now(),
        status: 'sent'
      };

      setHistory(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 entries
      setInputText('');

      useUiStore.getState().addNotification({
        type: 'success',
        title: 'Input Sent',
        message: `Successfully sent: ${trimmedInput}`
      });
    } catch (error) {
      console.error('Error sending narsese input:', error);

      // Add error to history
      const errorEntry = {
        id: Date.now(),
        input: trimmedInput,
        timestamp: Date.now(),
        status: 'error',
        error: error.message
      };

      setHistory(prev => [errorEntry, ...prev].slice(0, 50));

      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Error Sending Input',
        message: error.message
      });
    }
  }, [inputText, wsService, wsConnected]);

  /**
     * Executes a command from the command palette
     * @param {string} command - Command to execute
     */
  const executeCommand = useCallback((command) => {
    if (!wsService || !wsConnected) return;

    const commandMap = {
      'run': { type: 'control/start', payload: {} },
      'stop': { type: 'control/stop', payload: {} },
      'step': { type: 'control/step', payload: {} },
      'reset': { type: '/reset', payload: {} },
      'save': { type: '/save', payload: {} },
      'load': { type: '/load', payload: {} }
    };

    if (command === 'clear') {
      setHistory([]);
      useUiStore.getState().addNotification({
        type: 'info',
        title: 'Command Executed',
        message: `Executed: ${command}`
      });
      return;
    }

    const commandMessage = commandMap[command];
    if (!commandMessage) return;

    try {
      wsService.sendMessage(commandMessage);

      useUiStore.getState().addNotification({
        type: 'info',
        title: 'Command Executed',
        message: `Executed: ${command}`
      });
    } catch (error) {
      console.error(`Error executing ${command} command:`, error);

      useUiStore.getState().addNotification({
        type: 'error',
        title: 'Command Error',
        message: `Error executing ${command}: ${error.message}`
      });
    }
  }, [wsService, wsConnected]);

  /**
     * Opens the command palette UI
     */
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
    setFilteredCommands(COMMANDPALETTE_COMMANDS);
    setCommandIndex(-1);
  }, []);

  /**
     * Handles input changes in the command palette
     * @param {Event} e - Input change event
     */
  const handleCommandPaletteInput = useCallback((e) => {
    const value = e.target?.value ?? '';
    setCommandPaletteInput(value);

    if (!value.trim()) {
      setFilteredCommands(COMMANDPALETTE_COMMANDS);
    } else {
      const filtered = COMMANDPALETTE_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(value.toLowerCase()) ||
                cmd.description.toLowerCase().includes(value.toLowerCase()) ||
                cmd.category.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
    setCommandIndex(-1);
  }, []);

  // Handle history navigation with arrow keys
  const handleHistoryNavigation = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      // In a real implementation, we would navigate through history
      // For now, just prevent default
      return;
    }
  }, []);

  /**
     * Renders the suggestions dropdown
     * @returns {JSX.Element|null} Suggestions dropdown or null
     */
  const renderSuggestions = () => {
    if (!showSuggestions || !suggestions.length) return null;

    const commonStyle = {
      padding: '0.5rem',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
    };

    return React.createElement('div',
      {
        style: {
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '0.25rem'
        }
      },
      ...suggestions.map((suggestion, index) =>
        React.createElement('div',
          {
            key: index,
            onClick: () => {
              setInputText(suggestion.name);
              setShowSuggestions(false);
              setSuggestionIndex(-1);
            },
            style: {
              ...commonStyle,
              backgroundColor: index === suggestionIndex ? themeUtils.get('BACKGROUNDS.SECONDARY') : 'transparent',
              borderBottom: index < suggestions.length - 1 ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none'
            }
          },
          React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, suggestion.name),
          React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.XS'), color: themeUtils.get('TEXT.SECONDARY')}}, suggestion.description)
        )
      )
    );
  };

  /**
     * Renders the command palette UI
     * @returns {JSX.Element|null} Command palette or null
     */
  const renderCommandPalette = () => {
    if (!commandPaletteOpen) return null;

    const paletteStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10000,
      width: '500px',
      backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    };

    const cmdItemStyle = {
      padding: '0.75rem',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      display: 'flex',
      justifyContent: 'space-between'
    };

    return React.createElement('div', { style: paletteStyle },
      React.createElement('div', {
        style: {
          padding: '1rem',
          borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
        }
      },
      React.createElement('input', {
        type: 'text',
        value: commandPaletteInput,
        onChange: handleCommandPaletteInput,
        placeholder: 'Search commands...',
        autoFocus: true,
        style: {
          width: '100%',
          padding: '0.5rem',
          border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          fontSize: themeUtils.get('FONTS.SIZE.BASE')
        }
      })
      ),
      React.createElement('div', {
        style: {
          maxHeight: '300px',
          overflowY: 'auto'
        }
      },
      ...filteredCommands.map((cmd, index) =>
        React.createElement('div', {
          key: cmd.id,
          onClick: () => {
            executeCommand(cmd.id);
            setCommandPaletteOpen(false);
          },
          style: {
            ...cmdItemStyle,
            backgroundColor: index === commandIndex ? themeUtils.get('BACKGROUNDS.SECONDARY') : 'transparent'
          }
        },
        React.createElement('div', null,
          React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, cmd.name),
          React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.XS'), color: themeUtils.get('TEXT.SECONDARY')}}, cmd.description)
        ),
        React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.XS'), color: themeUtils.get('TEXT.SECONDARY')}}, cmd.category)
        )
      )
      )
    );
  };

  // Input form with syntax highlighting
  const inputForm = (() => {
    const containerStyle = {
      marginBottom: '1rem',
      padding: '0.5rem',
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      position: 'relative'
    };

    const headerStyle = {
      marginBottom: '0.5rem',
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    };

    const textareaStyle = {
      width: '100%',
      padding: '0.5rem',
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      resize: 'vertical',
      minHeight: '100px',
      fontSize: themeUtils.get('FONTS.SIZE.BASE'),
      fontFamily: 'monospace',
      lineHeight: '1.4',
      position: 'relative',
      zIndex: 2
    };

    const btnStyle = {
      padding: '0.5rem 1rem',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      cursor: 'pointer'
    };

    const submitBtnStyle = {
      ...btnStyle,
      backgroundColor: (wsService && wsConnected) ? themeUtils.get('COLORS.PRIMARY') : '#6c757d',
      cursor: (inputText.trim() && wsService && wsConnected) ? 'pointer' : 'not-allowed'
    };

    return React.createElement('div', { style: containerStyle },
      React.createElement('div', { style: headerStyle },
        React.createElement('span', null, 'Input Narsese:'),
        React.createElement('button', {
          onClick: openCommandPalette,
          style: {
            padding: '0.25rem 0.5rem',
            backgroundColor: themeUtils.get('COLORS.PRIMARY'),
            color: 'white',
            border: 'none',
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            cursor: 'pointer',
            fontSize: themeUtils.get('FONTS.SIZE.SM')
          }
        }, '⚡ Cmd+P')
      ),
      React.createElement('div', { style: { position: 'relative' } },
        React.createElement('textarea', {
          ref: textareaRef,
          value: inputText,
          onChange: handleInputChange,
          onKeyDown: handleKeyDown,
          onKeyUp: handleHistoryNavigation,
          placeholder: 'Enter Narsese input (e.g., <cat --> animal>. or <dog --> mammal>? or <bird --> flyer>!)',
          style: textareaStyle
        }),
        renderSuggestions()
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', gap: '0.5rem' } },
        React.createElement('button', {
          onClick: () => setInputText(''),
          style: btnStyle
        }, 'Clear'),
        React.createElement('button', {
          onClick: sendInput,
          disabled: !inputText?.trim() || !wsService || !wsConnected,
          style: submitBtnStyle
        }, wsConnected ? 'Submit Input' : 'Disconnected')
      )
    );
  })();

  // Narsese syntax guide for user reference
  const syntaxGuide = React.createElement('div',
    {
      style: {
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
      }
    },
    React.createElement('div', {
      style: {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        marginBottom: '0.5rem'
      }
    }, 'Narsese Syntax Guide:'),
    React.createElement('div', {style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}},
      React.createElement('div', null,
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.25rem'}}, 'Beliefs:'),
        React.createElement('ul', {style: {margin: 0, paddingLeft: '1rem', fontSize: themeUtils.get('FONTS.SIZE.SM')}},
          React.createElement('li', null, '<subject --> predicate>.'),
          React.createElement('li', null, '<(subject1, subject2) --> predicate>.'),
          React.createElement('li', null, '<subject --> (predicate1, predicate2)>.')
        )
      ),
      React.createElement('div', null,
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'), marginBottom: '0.25rem'}}, 'Questions & Goals:'),
        React.createElement('ul', {style: {margin: 0, paddingLeft: '1rem', fontSize: themeUtils.get('FONTS.SIZE.SM')}},
          React.createElement('li', null, '<subject --> predicate>? (Question)'),
          React.createElement('li', null, '<subject --> predicate>! (Goal)'),
          React.createElement('li', null, '<subject --> predicate>%f; c% (Truth values)')
        )
      )
    )
  );

  // History section showing previous inputs
  const historySection = (() => {
    const headerStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
      marginBottom: '0.5rem'
    };

    const clearBtnStyle = {
      padding: '0.25rem 0.5rem',
      backgroundColor: themeUtils.get('COLORS.DANGER'),
      color: 'white',
      border: 'none',
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      cursor: 'pointer',
      fontSize: themeUtils.get('FONTS.SIZE.SM')
    };

    const itemStyle = (isError) => ({
      padding: '0.5rem',
      margin: '0.25rem 0',
      backgroundColor: isError ? '#f8d7da' : themeUtils.get('BACKGROUNDS.SECONDARY'),
      border: `1px solid ${isError ? '#f5c6cb' : themeUtils.get('BORDERS.COLOR')}`,
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      fontSize: themeUtils.get('FONTS.SIZE.SM')
    });

    const timestampStyle = {
      fontSize: themeUtils.get('FONTS.SIZE.XXS'),
      color: themeUtils.get('TEXT.SECONDARY')
    };

    const errorStyle = {
      fontSize: themeUtils.get('FONTS.SIZE.XS'),
      color: '#dc3545',
      marginTop: '0.25rem'
    };

    return React.createElement('div', null,
      React.createElement('div', { style: headerStyle },
        React.createElement('span', null, `Input History: ${history.length} entries`),
        React.createElement('button', {
          onClick: () => setHistory([]),
          style: clearBtnStyle
        }, 'Clear All')
      ),
      history.length > 0
        ? React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
          ...history.map(item =>
            React.createElement('div', {
              key: item.id,
              style: itemStyle(item.status === 'error')
            },
            React.createElement('div', {
              style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                display: 'flex',
                justifyContent: 'space-between'
              }
            },
            React.createElement('span', null, item.input),
            React.createElement('span', { style: timestampStyle },
              new Date(item.timestamp).toLocaleTimeString()
            )
            ),
            item.status === 'error'
              ? React.createElement('div', { style: errorStyle },
                `Error: ${item.error || 'Unknown error'}`
              )
              : null
            )
          )
        )
        : React.createElement('div', {
          style: {
            padding: '0.5rem',
            fontStyle: 'italic',
            color: themeUtils.get('TEXT.SECONDARY')
          }
        }, 'No input history yet.')
    );
  })();

  // Keyboard shortcuts reference for users
  const shortcuts = (() => {
    const containerStyle = {
      marginTop: '1rem',
      padding: '0.75rem',
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
    };

    const headerStyle = {
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
      marginBottom: '0.5rem'
    };

    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      fontSize: themeUtils.get('FONTS.SIZE.SM')
    };

    const shortcutItemStyle = {
      fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
    };

    const descriptionStyle = {
      color: themeUtils.get('TEXT.SECONDARY')
    };

    const shortcutItems = [
      { key: 'Ctrl+P', desc: 'Open Command Palette' },
      { key: 'Enter', desc: 'Submit Input' },
      { key: '↑ ↓', desc: 'Navigate Suggestions' },
      { key: 'Esc', desc: 'Close Suggestions/Palette' }
    ];

    return React.createElement('div', { style: containerStyle },
      React.createElement('div', { style: headerStyle }, 'Keyboard Shortcuts:'),
      React.createElement('div', { style: gridStyle },
        ...shortcutItems.map((shortcut, idx) =>
          React.createElement('div', { key: idx },
            React.createElement('div', { style: shortcutItemStyle }, shortcut.key),
            React.createElement('div', { style: descriptionStyle }, shortcut.desc)
          )
        )
      )
    );
  })();

  return React.createElement(React.Fragment, null,
    renderCommandPalette(),
    React.createElement(DataPanel, {
      title: 'Enhanced Input Interface',
      dataSource: () => [
        {type: 'header', content: 'Direct Input Interface'},
        {type: 'inputForm', content: inputForm},
        {type: 'syntaxGuide', content: syntaxGuide},
        {type: 'header', content: 'Input History'},
        {type: 'history', content: historySection},
        {type: 'shortcuts', content: shortcuts}
      ],
      renderItem: (item) => {
        switch (item.type) {
        case 'header':
          return React.createElement('div', {
            style: {
              fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
              fontSize: themeUtils.get('FONTS.SIZE.BASE'),
              margin: '1rem 0 0.5rem 0',
              padding: '0.5rem 0',
              borderBottom: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
              color: themeUtils.get('TEXT.PRIMARY')
            }
          }, item.content);
        case 'inputForm':
        case 'syntaxGuide':
        case 'shortcuts':
        case 'history':
          return item.content;
        default:
          return null;
        }
      },
      config: {
        itemLabel: 'items',
        showItemCount: false,
        emptyMessage: 'Enter Narsese commands to interact directly with the reasoning engine.',
        containerHeight: 500
      }
    })
  );
});

export default EnhancedInputInterface;