import React, {memo, useCallback, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';
import {Button} from './GenericComponents.js';

const InputInterfacePanel = memo(() => {
    const [inputText, setInputText] = useState('');
    const [history, setHistory] = useState([]);
    const wsService = useUiStore(state => state.wsService);
    const wsConnected = useUiStore(state => state.wsConnected);

    const sendInput = useCallback(() => {
        if (!inputText.trim() || !wsService || !wsConnected) return;

        const narseseInput = {
            type: 'narseseInput',
            payload: {
                input: inputText.trim()
            }
        };

        try {
            wsService.sendMessage(narseseInput);

            // Add to history
            const newEntry = {
                id: Date.now(),
                input: inputText.trim(),
                timestamp: Date.now(),
                status: 'sent'
            };

            setHistory(prev => [newEntry, ...prev].slice(0, 20)); // Keep last 20 entries
            setInputText('');
        } catch (error) {
            console.error('Error sending narsese input:', error);

            // Add error to history
            const errorEntry = {
                id: Date.now(),
                input: inputText.trim(),
                timestamp: Date.now(),
                status: 'error',
                error: error.message
            };

            setHistory(prev => [errorEntry, ...prev].slice(0, 20));
        }
    }, [inputText, wsService, wsConnected]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendInput();
        }
    }, [sendInput]);

    const renderHistoryItem = (item) =>
        React.createElement('div',
            {
                key: item.id,
                style: {
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    backgroundColor: item.status === 'error' ? '#f8d7da' : themeUtils.get('BACKGROUNDS.SECONDARY'),
                    border: `1px solid ${item.status === 'error' ? '#f5c6cb' : themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM')
                }
            },
            React.createElement('div', {
                    style: {
                        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                        display: 'flex',
                        justifyContent: 'space-between'
                    }
                },
                React.createElement('span', null, item.input),
                React.createElement('span', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.XXS'),
                            color: themeUtils.get('TEXT.SECONDARY')
                        }
                    },
                    new Date(item.timestamp).toLocaleTimeString()
                )
            ),
            item.status === 'error'
                ? React.createElement('div',
                    {style: {fontSize: themeUtils.get('FONTS.SIZE.XS'), color: '#dc3545', marginTop: '0.25rem'}},
                    `Error: ${item.error || 'Unknown error'}`
                )
                : null
        );

    // Input form
    const inputForm = React.createElement('div',
        {
            style: {
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
            }
        },
        React.createElement('div', {
            style: {
                marginBottom: '0.5rem',
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
            }
        }, 'Input Narsese:'),
        React.createElement('textarea', {
            value: inputText,
            onChange: (e) => setInputText(e.target.value),
            onKeyPress: handleKeyPress,
            placeholder: 'Enter Narsese input (e.g., <cat --> animal>. or <dog --> mammal>? or <bird --> flyer>!)',
            style: {
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                resize: 'vertical',
                minHeight: '60px',
                fontSize: themeUtils.get('FONTS.SIZE.BASE'),
                fontFamily: 'monospace'
            }
        }),
        React.createElement('div', {style: {display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem'}},
            React.createElement(Button, {
                onClick: sendInput,
                disabled: !inputText.trim() || !wsService || !wsConnected,
                variant: (wsService && wsConnected) ? 'primary' : 'light',
                size: 'md'
            }, wsConnected ? 'Submit Input' : 'Disconnected')
        )
    );

    // Examples of valid Narsese
    const examples = React.createElement('div',
        {
            style: {
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: '#e9ecef',
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
            }
        },
        React.createElement('div', {
            style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                marginBottom: '0.5rem'
            }
        }, 'Narsese Examples:'),
        React.createElement('ul', {style: {margin: 0, paddingLeft: '1rem', fontSize: themeUtils.get('FONTS.SIZE.SM')}},
            React.createElement('li', null, '<cat --> animal>. (Belief)'),
            React.createElement('li', null, '<dog --> mammal>? (Question)'),
            React.createElement('li', null, '<bird --> flyer>! (Goal)'),
            React.createElement('li', null, '<robin --> bird> & <bird --> animal> => <robin --> animal>. (Implication)')
        )
    );

    // History section
    const historySection = React.createElement('div', null,
        React.createElement('div', {
            style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                marginBottom: '0.5rem'
            }
        }, 'Input History:'),
        history.length > 0
            ? React.createElement('div', null, ...history.map(renderHistoryItem))
            : React.createElement('div', {
                style: {
                    padding: '0.5rem',
                    fontStyle: 'italic',
                    color: themeUtils.get('TEXT.SECONDARY')
                }
            }, 'No input history yet.')
    );

    return React.createElement(DataPanel, {
        title: 'Input Interface',
        dataSource: () => [
            {type: 'header', content: 'Direct Input Interface'},
            {type: 'inputForm', content: inputForm},
            {type: 'examples', content: examples},
            {type: 'header', content: 'Input History'},
            {type: 'history', content: historySection}
        ],
        renderItem: (item) => {
            if (item.type === 'header') {
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
            } else if (item.type === 'inputForm' || item.type === 'examples') {
                return item.content;
            } else if (item.type === 'history') {
                return item.content;
            }
            return null;
        },
        config: {
            itemLabel: 'items',
            showItemCount: false,
            emptyMessage: 'Enter Narsese commands to interact directly with the reasoning engine.',
            containerHeight: 400
        }
    });
});

export default InputInterfacePanel;