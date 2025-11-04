import React, {memo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

const getMessageStyle = (type) => ({
    padding: '0.25rem 0.5rem',
    margin: '0.125rem 0',
    backgroundColor: type === 'error' ? '#ffe6e6' : type === 'warning' ? '#fff3e6' : type === 'success' ? '#e6ffe6' : themeUtils.get('BACKGROUNDS.SECONDARY'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.XS'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    fontFamily: 'monospace'
});

const ConsolePanel = memo(() => {
    const consoleMessages = useUiStore(state => state.notifications);

    const renderConsoleMessage = (message) => (
        <div style={getMessageStyle(message.type)}>
            <span style={{fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}>
                {message.type ? `${message.type.toUpperCase()}: ` : ''}
            </span>
            <span>{message.message || message.title || 'Console message'}</span>
        </div>
    );

    return (
        <DataPanel
            title="Console"
            dataSource={() => consoleMessages}
            renderItem={renderConsoleMessage}
            config={{
                itemLabel: 'messages',
                showItemCount: true,
                emptyMessage: 'Console is empty',
                autoScroll: true,
                maxItems: 100
            }}
        />
    );
});

export default ConsolePanel;