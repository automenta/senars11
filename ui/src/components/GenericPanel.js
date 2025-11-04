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
    showCount = false
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
        ...containerStyle
    }), [maxHeight, containerStyle]);
    
    const containerProps = useMemo(() => ({
        style: containerStyleComputed,
        ref: (el) => setContainerRef(el)
    }), [containerStyleComputed]);
    
    const titleElement = title ? React.createElement('div', {
        style: {
            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
            marginBottom: themeUtils.get('SPACING.SM'),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }
    },
        React.createElement('span', null, title),
        showCount && React.createElement('span', {
            style: {fontSize: themeUtils.get('FONTS.SIZE.SM'), color: themeUtils.get('TEXT.SECONDARY')}
        }, `(${displayItems.length})`)
    ) : null;
    
    const contentElement = displayItems.length > 0
        ? displayItems.map((item, index) => React.createElement('div', {key: `item-${index}`}, renderItem(item, index)))
        : React.createElement('div', {
            className: 'emptyState',
            style: {padding: themeUtils.get('SPACING.MD'), textAlign: 'center', color: themeUtils.get('TEXT.MUTED')}
        }, emptyMessage);
    
    const timestampElement = withTimestamp ? React.createElement('div', {
        style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            color: themeUtils.get('TEXT.SECONDARY'),
            textAlign: 'right',
            marginTop: themeUtils.get('SPACING.XS'),
            paddingRight: themeUtils.get('SPACING.SM')
        }
    }, React.createElement(TimeDisplay, {timestamp: Date.now(), formatType: 'time'})) : null;
    
    return React.createElement('div', {className: 'genericPanel'},
        titleElement,
        React.createElement('div', containerProps, contentElement),
        timestampElement
    );
});

export default GenericPanel;