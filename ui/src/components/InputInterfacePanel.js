import React, { useState, useEffect } from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const InputInterfacePanel = () => {
    const [inputText, setInputText] = useState('');
    const [history, setHistory] = useState([]);
    const wsService = useUiStore(state => state.wsService);
    
    const sendInput = () => {
        if (!inputText.trim() || !wsService) return;
        
        const narseseInput = {
            type: 'narseseInput',
            payload: {
                input: inputText.trim()
            }
        };
        
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
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendInput();
        }
    };
    
    const renderHistoryItem = (item, index) => 
        React.createElement('div',
            {
                key: item.id,
                style: {
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    backgroundColor: item.status === 'error' ? '#f8d7da' : '#f8f9fa',
                    border: `1px solid ${item.status === 'error' ? '#f5c6cb' : '#dee2e6'}`,
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                }
            },
            React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}},
                React.createElement('span', null, item.input),
                React.createElement('span', {style: {fontSize: '0.7rem', color: '#666'}}, 
                    new Date(item.timestamp).toLocaleTimeString()
                )
            )
        );

    // Input form
    const inputForm = React.createElement('div', 
        {style: {marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px'}},
        React.createElement('div', {style: {marginBottom: '0.5rem', fontWeight: 'bold'}}, 'Input Narsese:'),
        React.createElement('textarea', {
            value: inputText,
            onChange: (e) => setInputText(e.target.value),
            onKeyPress: handleKeyPress,
            placeholder: 'Enter Narsese input (e.g., <cat --> animal>. or <dog --> mammal>? or <bird --> flyer>!)',
            style: {
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                resize: 'vertical',
                minHeight: '60px',
                fontSize: '0.9rem'
            }
        }),
        React.createElement('div', {style: {display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem'}},
            React.createElement('button', {
                onClick: sendInput,
                disabled: !inputText.trim() || !wsService,
                style: {
                    padding: '0.5rem 1rem',
                    backgroundColor: wsService ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: inputText.trim() && wsService ? 'pointer' : 'not-allowed'
                }
            }, 'Submit')
        )
    );

    // Examples of valid Narsese
    const examples = React.createElement('div', 
        {style: {marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e9ecef', borderRadius: '4px'}},
        React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.5rem'}}, 'Narsese Examples:'),
        React.createElement('ul', {style: {margin: 0, paddingLeft: '1rem', fontSize: '0.85rem'}},
            React.createElement('li', null, '<cat --> animal>. (Belief)'),
            React.createElement('li', null, '<dog --> mammal>? (Question)'),
            React.createElement('li', null, '<bird --> flyer>! (Goal)'),
            React.createElement('li', null, '<robin --> bird> & <bird --> animal> => <robin --> animal>. (Implication)')
        )
    );

    // History section
    const historySection = React.createElement('div', null,
        React.createElement('div', {style: {fontWeight: 'bold', marginBottom: '0.5rem'}}, 'Input History:'),
        ...history.map(item => renderHistoryItem(item, item.id))
    );

    const items = [
        { type: 'header', content: 'Direct Input Interface' },
        { type: 'inputForm', content: inputForm },
        { type: 'examples', content: examples },
        { type: 'header', content: 'Input History' },
        { type: 'history', content: historySection }
    ];

    const renderInputItem = (item, index) => {
        if (item.type === 'header') {
            return React.createElement('div', {
                style: {
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    margin: '1rem 0 0.5rem 0',
                    padding: '0.5rem 0',
                    borderBottom: '2px solid #007bff',
                    color: '#333'
                }
            }, item.content);
        } else if (item.type === 'inputForm' || item.type === 'examples') {
            return item.content;
        } else if (item.type === 'history') {
            return item.content;
        }
        return null;
    };

    return React.createElement(GenericPanel, {
        title: 'Input Interface',
        maxHeight: 'calc(100% - 2rem)',
        items,
        renderItem: renderInputItem,
        emptyMessage: 'Enter Narsese commands to interact directly with the reasoning engine.'
    });
};

export default InputInterfacePanel;