import React, {memo, useEffect, useMemo, useState} from 'react';
import {TimeDisplay} from './GenericComponents.js';

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
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }
    },
        React.createElement('span', null, title),
        showCount && React.createElement('span', {
            style: {fontSize: '0.8rem', color: '#666'}
        }, `(${displayItems.length})`)
    ) : null;
    
    const contentElement = displayItems.length > 0
        ? displayItems.map((item, index) => React.createElement('div', {key: `item-${index}`}, renderItem(item, index)))
        : React.createElement('div', {
            className: 'emptyState',
            style: {padding: '1rem', textAlign: 'center', color: '#999'}
        }, emptyMessage);
    
    const timestampElement = withTimestamp ? React.createElement('div', {
        style: {
            fontSize: '0.7rem',
            color: '#666',
            textAlign: 'right',
            marginTop: '0.25rem',
            paddingRight: '0.5rem'
        }
    }, React.createElement(TimeDisplay, {timestamp: Date.now(), formatType: 'time'})) : null;
    
    return React.createElement('div', {className: 'genericPanel'},
        titleElement,
        React.createElement('div', containerProps, contentElement),
        timestampElement
    );
});

export default GenericPanel;