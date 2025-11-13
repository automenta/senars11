import React, {memo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

const getConsoleMessageTypeStyle = (type) => {
  const baseStyle = {
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    margin: `${themeUtils.get('SPACING.XS')} 0`,
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    fontFamily: 'monospace',
    wordBreak: 'break-word'
  };

  const typeStyles = {
    error: {
      ...baseStyle,
      backgroundColor: themeUtils.get('COLORS.DANGER') + '20',
      border: `1px solid ${themeUtils.get('COLORS.DANGER')}`,
      color: themeUtils.get('COLORS.DANGER')
    },
    warning: {
      ...baseStyle,
      backgroundColor: themeUtils.get('COLORS.WARNING') + '20',
      border: `1px solid ${themeUtils.get('COLORS.WARNING')}`,
      color: themeUtils.get('COLORS.WARNING')
    },
    success: {
      ...baseStyle,
      backgroundColor: themeUtils.get('COLORS.SUCCESS') + '20',
      border: `1px solid ${themeUtils.get('COLORS.SUCCESS')}`,
      color: themeUtils.get('COLORS.SUCCESS')
    },
    info: {
      ...baseStyle,
      backgroundColor: themeUtils.get('COLORS.INFO') + '20',
      border: `1px solid ${themeUtils.get('COLORS.INFO')}`,
      color: themeUtils.get('COLORS.INFO')
    }
  };

  return typeStyles[type] || baseStyle;
};

const renderConsoleMessage = (message) =>
  React.createElement('div', {style: getConsoleMessageTypeStyle(message.type)},
    React.createElement('span', {
      style: {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        textTransform: 'uppercase',
        marginRight: themeUtils.get('SPACING.XS')
      }
    },
    message.type || 'info'
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