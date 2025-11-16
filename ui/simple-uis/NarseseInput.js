import React, {useCallback, useState} from 'react';
import useUiStore from '../src/stores/uiStore.js';

const NarseseInput = ({
                          compact = false,
                          title = 'Narsese Input Interface',
                          showExamples = true,
                          showHistory = true,
                          showNotifications = true
                      }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const wsService = useUiStore(state => state.wsService);
    const notifications = useUiStore(state => state.notifications);

    const handleSubmit = e => {
        e.preventDefault();
        if (!input.trim() || !wsService) return;

        // Send to WebSocket
        wsService.sendMessage({
            type: 'narseseInput',
            payload: {
                input: input.trim(),
            },
        });

        // Add to local history
        const newEntry = {
            id: Date.now(),
            input: input.trim(),
            timestamp: new Date().toLocaleTimeString(),
            status: 'sent',
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 20));

        // Clear input
        setInput('');
    };

    const handleReset = useCallback(() => {
        if (!wsService) {
            useUiStore.getState().addNotification({
                type: 'error',
                title: 'Reset Error',
                message: 'WebSocket service not available'
            });
            return;
        }

        // Show confirmation dialog for reset
        const confirmed = window.confirm('Are you sure you want to reset the NAR memory? This will clear all concepts and tasks.');
        if (confirmed) {
            wsService.sendMessage({
                type: 'control/reset',
                payload: {}
            });

            useUiStore.getState().addNotification({
                type: 'info',
                title: 'Reset Initiated',
                message: 'NAR memory reset command sent'
            });
        }
    }, [wsService]);

    // Style constants
    const containerStyle = compact
        ? {
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
        }
        : {
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '800px',
            margin: '0 auto',
            border: '2px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
        };

    const inputAreaStyle = {
        marginBottom: '15px',
    };

    const textareaStyle = {
        width: '100%',
        padding: compact ? '8px' : '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        minHeight: compact ? '60px' : '100px',
        resize: 'vertical',
        boxSizing: 'border-box',
    };

    const buttonRowStyle = {
        display: 'flex',
        gap: '10px',
        marginTop: '8px',
        flexWrap: 'wrap',
    };

    const buttonStyle = {
        padding: compact ? '6px 12px' : '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: compact ? '12px' : '14px',
    };

    const resetButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#dc3545',
    };

    const exampleButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#28a745',
    };

    const disabledButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
        opacity: 0.6,
    };

    const exampleStyle = {
        marginBottom: '15px',
        fontSize: '0.9em',
        color: '#6c757d',
    };

    const notificationItemStyle = type => ({
        padding: '10px',
        marginBottom: '5px',
        borderRadius: '4px',
        backgroundColor: type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#cce5ff',
        border: `1px solid ${
            type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#b8daff'
        }`,
    });

    const historyItemStyle = {
        padding: '12px',
        marginBottom: '8px',
        borderBottom: '1px solid #eee',
        fontFamily: 'monospace',
        backgroundColor: '#fff',
        borderRadius: '4px',
    };

    const loadExample = (example) => {
        setInput(example);
    };

    return React.createElement('div',
        {
            style: containerStyle,
            'data-testid': 'narsese-input-container'
        },
        React.createElement('h1',
            {
                'data-testid': 'narsese-input-title',
                style: {fontSize: compact ? '1.2em' : '1.5em', margin: '0 0 15px 0'}
            },
            title
        ),
        React.createElement('form',
            {
                onSubmit: handleSubmit,
                style: inputAreaStyle,
                'data-testid': 'input-form'
            },
            React.createElement('div',
                {style: {marginBottom: '8px'}},
                React.createElement('label',
                    {
                        htmlFor: 'narsese-input',
                        style: {
                            display: 'block',
                            marginBottom: compact ? '4px' : '8px',
                            fontWeight: 'bold',
                            fontSize: compact ? '14px' : '16px'
                        },
                        'data-testid': 'input-label'
                    },
                    'Enter Narsese:'
                ),
                React.createElement('textarea',
                    {
                        id: 'narsese-input',
                        value: input,
                        onChange: e => setInput(e.target.value),
                        placeholder: 'Enter Narsese input (e.g., &lt;cat --&gt; animal&gt;., &lt;dog --&gt; mammal&gt;?, &lt;bird --&gt; flyer&gt;!)',
                        style: textareaStyle,
                        disabled: !wsService,
                        'data-testid': 'narsese-textarea'
                    }
                )
            ),
            React.createElement('div', {style: buttonRowStyle},
                React.createElement('button',
                    {
                        type: 'submit',
                        disabled: !input.trim() || !wsService,
                        style: input.trim() && wsService ? buttonStyle : disabledButtonStyle,
                        'data-testid': 'submit-button'
                    },
                    'Submit Input'
                ),
                React.createElement('button',
                    {
                        type: 'button',
                        onClick: handleReset,
                        disabled: !wsService,
                        style: wsService ? resetButtonStyle : disabledButtonStyle,
                        'data-testid': 'reset-button'
                    },
                    'Reset NAR'
                ),
                React.createElement('button',
                    {
                        type: 'button',
                        onClick: () => setInput(''),
                        style: buttonStyle,
                        'data-testid': 'clear-button'
                    },
                    'Clear'
                )
            )
        ),
        showExamples && wsService && React.createElement('div',
            {
                style: exampleStyle,
                'data-testid': 'narsese-examples'
            },
            React.createElement('strong', null, 'Examples:'),
            React.createElement('div',
                {style: {display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'}},
                React.createElement('button',
                    {
                        type: 'button',
                        onClick: () => loadExample('<cat --> animal>.'),
                        style: exampleButtonStyle,
                        'data-testid': 'example-belief'
                    },
                    'Belief: <cat --> animal>.'
                ),
                React.createElement('button',
                    {
                        type: 'button',
                        onClick: () => loadExample('<dog --> mammal>?'),
                        style: exampleButtonStyle,
                        'data-testid': 'example-question'
                    },
                    'Question: <dog --> mammal>?'
                ),
                React.createElement('button',
                    {
                        type: 'button',
                        onClick: () => loadExample('<bird --> flyer>!'),
                        style: exampleButtonStyle,
                        'data-testid': 'example-goal'
                    },
                    'Goal: <bird --> flyer>!'
                )
            )
        ),
        showNotifications && notifications.length > 0 && React.createElement('div',
            {
                style: {marginBottom: '15px'},
                'data-testid': 'notifications-section'
            },
            React.createElement('h2', {style: {fontSize: '1.2em'}}, 'Recent Notifications'),
            React.createElement('div',
                {
                    style: {
                        maxHeight: '150px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
                        backgroundColor: '#fff',
                    }
                },
                notifications.slice(0, 10).map(notification =>
                    React.createElement('div',
                        {
                            key: notification.id || Date.now(),
                            style: notificationItemStyle(notification.type),
                            'data-testid': 'notification-item'
                        },
                        React.createElement('div', null,
                            React.createElement('strong',
                                {'data-testid': 'notification-type'},
                                notification.type?.toUpperCase() + ':'
                            ),
                            ' ',
                            React.createElement('span',
                                {'data-testid': 'notification-message'},
                                notification.message
                            )
                        ),
                        React.createElement('div',
                            {
                                style: {
                                    fontSize: '0.8em',
                                    color: '#6c757d',
                                    marginTop: '4px'
                                },
                                'data-testid': 'notification-timestamp'
                            },
                            new Date(notification.timestamp).toLocaleTimeString()
                        )
                    )
                )
            )
        ),
        showHistory && history.length > 0 && React.createElement('div',
            {'data-testid': 'history-section'},
            React.createElement('h2', {style: {fontSize: '1.2em'}}, 'Input History'),
            React.createElement('div',
                {
                    style: {
                        maxHeight: compact ? '100px' : '200px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px',
                        backgroundColor: '#fff',
                    }
                },
                history.map(entry =>
                    React.createElement('div',
                        {
                            key: entry.id,
                            style: historyItemStyle,
                            'data-testid': `history-item-${entry.id}`
                        },
                        React.createElement('div', null,
                            React.createElement('strong', null, 'Input:'),
                            ' ',
                            React.createElement('span',
                                {'data-testid': 'history-input'},
                                entry.input
                            )
                        ),
                        React.createElement('div',
                            {
                                style: {
                                    fontSize: '0.85em',
                                    color: '#6c757d',
                                    marginTop: '4px'
                                },
                                'data-testid': 'history-meta'
                            },
                            entry.timestamp,
                            ' | Status: ',
                            React.createElement('span',
                                {'data-testid': 'history-status'},
                                entry.status
                            )
                        )
                    )
                )
            )
        )
    );
};

export default NarseseInput;
