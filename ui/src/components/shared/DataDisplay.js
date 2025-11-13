/**
 * DataDisplay: Shared data display components
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, { memo } from 'react';
import { format } from 'date-fns';
import { themeUtils } from '../../utils/themeUtils.js';

// Time display component
export const TimeDisplay = memo(({ 
  timestamp, 
  formatType = 'relative', 
  style = {},
  ...props 
}) => {
  if (!timestamp) return React.createElement('span', { style: style }, '-');

  const displayText = React.useMemo(() => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    switch (formatType) {
      case 'relative':
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
      case 'datetime':
        return format(date, 'MM/dd/yyyy HH:mm:ss');
      case 'time':
        return format(date, 'HH:mm:ss');
      case 'date':
        return format(date, 'MM/dd/yyyy');
      default:
        return format(date, 'MM/dd/yyyy HH:mm:ss');
    }
  }, [timestamp, formatType]);

  return React.createElement('span', { style: style, ...props }, displayText);
});

// Status badge component
export const StatusBadge = memo(({ 
  status = 'default', 
  label, 
  style = {},
  ...props 
}) => {
  const statusConfig = React.useMemo(() => {
    const configs = {
      success: { 
        color: themeUtils.get('COLORS.SUCCESS'), 
        bg: themeUtils.get('COLORS.SUCCESS') + '20' 
      },
      warning: { 
        color: themeUtils.get('COLORS.WARNING'), 
        bg: themeUtils.get('COLORS.WARNING') + '20' 
      },
      error: { 
        color: themeUtils.get('COLORS.DANGER'), 
        bg: themeUtils.get('COLORS.DANGER') + '20' 
      },
      info: { 
        color: themeUtils.get('COLORS.INFO'), 
        bg: themeUtils.get('COLORS.INFO') + '20' 
      },
      default: { 
        color: themeUtils.get('COLORS.SECONDARY'), 
        bg: themeUtils.get('COLORS.GRAY_200') 
      }
    };
    return configs[status] ?? configs.default;
  }, [status]);

  const badgeStyle = React.useMemo(() => ({
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    borderRadius: '12px',
    backgroundColor: statusConfig.bg,
    color: statusConfig.color,
    fontSize: themeUtils.get('FONTS.SIZE.XS'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
    display: 'inline-block',
    ...style
  }), [statusConfig, style]);

  return React.createElement('span', { style: badgeStyle, ...props }, label ?? status);
});

// Data list component
export const DataList = memo(({ 
  items = [], 
  renderItem,
  emptyState,
  style = {},
  ...props 
}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: themeUtils.get('SPACING.SM'),
    ...style
  };

  if (items.length === 0) {
    return emptyState || React.createElement('div', { style: containerStyle }, 'No items to display');
  }

  return React.createElement('div', { style: containerStyle, ...props },
    items.map((item, index) => renderItem ? renderItem(item, index) : React.createElement('div', { key: index }, item))
  );
});

// Key-value display component
export const KeyValueDisplay = memo(({ 
  data = {},
  style = {},
  keyStyle = {},
  valueStyle = {},
  ...props 
}) => {
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    gap: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.LG')}`,
    alignItems: 'start',
    ...style
  };

  const keyBaseStyle = {
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    color: themeUtils.get('TEXT.SECONDARY'),
    textAlign: 'right',
    ...keyStyle
  };

  const valueBaseStyle = {
    color: themeUtils.get('TEXT.PRIMARY'),
    ...valueStyle
  };

  const entries = Object.entries(data);

  return React.createElement('div', { style: containerStyle, ...props },
    entries.map(([key, value], index) => [
      React.createElement('div', { 
        key: `key-${index}`, 
        style: keyBaseStyle 
      }, key),
      React.createElement('div', { 
        key: `value-${index}`, 
        style: valueBaseStyle 
      }, typeof value === 'object' ? JSON.stringify(value) : value)
    ])
  );
});