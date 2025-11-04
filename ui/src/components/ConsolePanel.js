import React, {memo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

const ConsolePanel = memo(() => {
    // For now, we'll add a simulated console log store to the UI store
    // In the real app, this would be populated by consoleBridge
    const consoleMessages = useUiStore(state => state.notifications); // Reusing notifications as sample data

    const renderConsoleMessage = (message) =>
        React.createElement('div',
            {
                style: {
                    padding: '0.25rem 0.5rem',
                    margin: '0.125rem 0',
                    backgroundColor: message.type === 'error' ? '#ffe6e6' : message.type === 'warning' ? '#fff3e6' : message.type === 'success' ? '#e6ffe6' : themeUtils.get('BACKGROUNDS.SECONDARY'),
                    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.XS'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM'),
                    fontFamily: 'monospace'
                }
            },
            React.createElement('span', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}},
                message.type ? `${(message.type).toUpperCase()}: ` : ''),
            React.createElement('span', null, message.message || message.title || 'Console message')
        );

    return React.createElement(DataPanel, {
        title: 'Console',
        dataSource: () => consoleMessages,
        renderItem: renderConsoleMessage,
        config: {
            itemLabel: 'messages',
            showItemCount: true,
            emptyMessage: 'Console is empty',
            autoScroll: true,
            maxItems: 100
        }
    });
});

export default ConsolePanel;