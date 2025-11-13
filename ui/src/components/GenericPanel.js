import React, {memo, useEffect, useMemo, useState} from 'react';
import {TimeDisplay} from './GenericComponents.js';
import {themeUtils} from '../utils/themeUtils.js';

const GenericPanel = memo(({
  items = [],
  renderItem,
  maxHeight = 'calc(100% - 2rem)',
  emptyMessage = 'No items to display',
  containerStyle = {},
  withTimestamp = false,
  title = null,
  autoScroll = false,
  maxItems = null,
  showCount = false,
  className = ''
}) => {
  const [containerRef, setContainerRef] = useState(null);

  const displayItems = useMemo(() => maxItems ? items.slice(-maxItems) : items, [items, maxItems]);

  useEffect(() => {
    if (autoScroll && containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight;
    }
  }, [displayItems.length, autoScroll, containerRef]);

  const containerStyleComputed = useMemo(() => ({
    maxHeight,
    overflowY: 'auto',
    padding: themeUtils.get('SPACING.SM'),
    ...containerStyle
  }), [maxHeight, containerStyle]);

  const titleStyle = {
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.SM'),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: themeUtils.get('TEXT.PRIMARY')
  };

  const countStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY')
  };

  const emptyStateStyle = {
    padding: themeUtils.get('SPACING.MD'),
    textAlign: 'center',
    color: themeUtils.get('TEXT.MUTED'),
    fontStyle: 'italic',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px'
  };

  const timestampStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    textAlign: 'right',
    marginTop: themeUtils.get('SPACING.XS'),
    paddingRight: themeUtils.get('SPACING.SM')
  };

  return React.createElement('div', {className: `genericPanel ${className}`.trim()},
    title && React.createElement('div', {style: titleStyle},
      React.createElement('span', null, title),
      showCount && React.createElement('span', {style: countStyle}, `(${displayItems.length})`)
    ),
    React.createElement('div', {
      style: containerStyleComputed,
      ref: setContainerRef
    },
    displayItems.length > 0
      ? displayItems.map((item, index) => React.createElement('div', {key: index}, renderItem(item, index)))
      : React.createElement('div', {className: 'emptyState', style: emptyStateStyle},
        React.createElement('div', {style: {fontSize: '2rem', marginBottom: themeUtils.get('SPACING.SM')}}, '🔍'),
        React.createElement('div', null, emptyMessage)
      )
    ),
    withTimestamp && React.createElement('div', {style: timestampStyle},
      React.createElement(TimeDisplay, {timestamp: Date.now(), formatType: 'time'})
    )
  );
});

export default GenericPanel;