import React, {useState} from 'react';
import useUiStore from '../src/stores/uiStore.js';

const NarseseInput = () => {
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

    // Style constants
    const containerStyle = {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        border: '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    };

    const inputAreaStyle = {
        marginBottom: '20px',
    };

    const textareaStyle = {
        width: '100%',
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        minHeight: '100px',
        resize: 'vertical',
        boxSizing: 'border-box',
    };

    const buttonStyle = {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
    };

    const disabledButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
        opacity: 0.6,
    };

    const exampleStyle = {
        marginBottom: '20px',
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

    return React.createElement('div',
        {
            style: containerStyle,
            'data-testid': 'narsese-input-container'
        },
        React.createElement('h1',
            {'data-testid': 'narsese-input-title'},
            'Narsese Input Interface'
        ),
        React.createElement('form',
            {
                onSubmit: handleSubmit,
                style: inputAreaStyle,
                'data-testid': 'input-form'
            },
            React.createElement('div',
                {style: {marginBottom: '10px'}},
                React.createElement('label',
                    {
                        htmlFor: 'narsese-input',
                        style: {
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold'
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
            React.createElement('button',
                {
                    type: 'submit',
                    disabled: !input.trim() || !wsService,
                    style: input.trim() && wsService ? buttonStyle : disabledButtonStyle,
                    'data-testid': 'submit-button'
                },
                'Submit Input'
            )
        ),
        wsService && React.createElement('div',
            {
                style: exampleStyle,
                'data-testid': 'narsese-examples'
            },
            React.createElement('strong', null, 'Examples:'),
            React.createElement('ul',
                {
                    style: {
                        margin: '8px 0 0 20px',
                        paddingLeft: '15px'
                    }
                },
                React.createElement('li',
                    {'data-testid': 'example-belief'},
                    '&lt;cat --&gt; animal&gt;. (Belief)'
                ),
                React.createElement('li',
                    {'data-testid': 'example-question'},
                    '&lt;dog --&gt; mammal&gt;? (Question)'
                ),
                React.createElement('li',
                    {'data-testid': 'example-goal'},
                    '&lt;bird --&gt; flyer&gt;! (Goal)'
                ),
                React.createElement('li',
                    {'data-testid': 'example-implication'},
                    '&lt;robin --&gt; bird&gt; &amp; &lt;bird --&gt; animal&gt; =&gt; &lt;robin --&gt; animal&gt;. (Implication)'
                )
            )
        ),
        notifications.length > 0 && React.createElement('div',
            {
                style: {marginBottom: '20px'},
                'data-testid': 'notifications-section'
            },
            React.createElement('h2', null, 'Recent Notifications'),
            React.createElement('div',
                {
                    style: {
                        maxHeight: '250px',
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
                            key: notification.timestamp || Date.now(),
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
        history.length > 0 && React.createElement('div',
            {'data-testid': 'history-section'},
            React.createElement('h2', null, 'Input History'),
            React.createElement('div',
                {
                    style: {
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
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
