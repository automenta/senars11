/**
 * Console Panel: Modern console panel using shared components
 * Following AGENTS.md: Modular, Abstract, DRY
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Panel } from './shared/Panel.js';
import { EmptyState } from './shared/EmptyState.js';
import { StatusBadge } from './shared/GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { useStore } from './shared/StoreProvider.js';

// Console message renderer using shared components
const ConsoleMessageItem = memo(({ message }) => {
  const getMessageStyle = useCallback(() => {
    const baseStyle = {
      padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
      margin: `${themeUtils.get('SPACING.XS')} 0`,
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
      borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
      fontSize: themeUtils.get('FONTS.SIZE.SM'),
      fontFamily: 'monospace',
      wordBreak: 'break-word',
      backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY')
    };

    const typeStyles = {
      error: {
        ...baseStyle,
        backgroundColor: themeUtils.get('COLORS.DANGER') + '10',
        border: `1px solid ${themeUtils.get('COLORS.DANGER')}80`,
        color: themeUtils.get('COLORS.DANGER')
      },
      warning: {
        ...baseStyle,
        backgroundColor: themeUtils.get('COLORS.WARNING') + '10',
        border: `1px solid ${themeUtils.get('COLORS.WARNING')}80`,
        color: themeUtils.get('COLORS.WARNING')
      },
      success: {
        ...baseStyle,
        backgroundColor: themeUtils.get('COLORS.SUCCESS') + '10',
        border: `1px solid ${themeUtils.get('COLORS.SUCCESS')}80`,
        color: themeUtils.get('COLORS.SUCCESS')
      },
      info: {
        ...baseStyle,
        backgroundColor: themeUtils.get('COLORS.INFO') + '10',
        border: `1px solid ${themeUtils.get('COLORS.INFO')}80`,
        color: themeUtils.get('COLORS.INFO')
      }
    };

    return typeStyles[message.type] || baseStyle;
  }, [message.type]);

  return React.createElement('div', { style: getMessageStyle() },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: themeUtils.get('SPACING.SM') } },
      React.createElement(StatusBadge, { 
        status: message.type || 'info', 
        label: message.type || 'info' 
      }),
      React.createElement('span', { style: { flex: 1 } }, 
        message.message || message.title || 'Console message'
      ),
      message.timestamp && React.createElement('small', { 
        style: { 
          color: themeUtils.get('TEXT.MUTED'),
          fontSize: themeUtils.get('FONTS.SIZE.XS')
        } 
      }, 
        new Date(message.timestamp).toLocaleTimeString()
      )
    )
  );
});

// Auto-scrolling container for console messages
const ConsoleScrollContainer = memo(({ children, autoScroll = true }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [children, autoScroll]);

  const containerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: themeUtils.get('SPACING.SM'),
    maxHeight: '100%',
    minHeight: 0
  };

  return React.createElement('div', { 
    ref: containerRef, 
    style: containerStyle 
  }, children);
});

const ConsolePanel = memo(() => {
  const { notifications, clearNotifications } = useStore();
  
  const handleClear = useCallback(() => {
    clearNotifications();
  }, [clearNotifications]);

  return React.createElement(Panel, {
    title: 'Console',
    actions: React.createElement('button', {
      onClick: handleClear,
      style: {
        background: 'none',
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
        cursor: 'pointer',
        fontSize: themeUtils.get('FONTS.SIZE.SM')
      }
    }, 'Clear')
  },
    notifications.length === 0
      ? React.createElement(EmptyState, {
          message: 'No notifications',
          description: 'Console is empty',
          icon: '📝'
        })
      : React.createElement(ConsoleScrollContainer, null,
          notifications.map((message, index) => 
            React.createElement(ConsoleMessageItem, { 
              key: message.id || `msg-${index}`, 
              message 
            })
          )
        )
  );
});

export default ConsolePanel;