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

const renderConsoleMessage = (message) =>
  React.createElement('div', {style: getMessageStyle(message.type)},
    React.createElement('span', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}},
      message.type ? `${message.type.toUpperCase()}: ` : ''
    ),
    React.createElement('span', null, message.message || message.title || 'Console message')
  );

const ConsolePanel = memo(() => {
  const consoleMessages = useUiStore(state => state.notifications);

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