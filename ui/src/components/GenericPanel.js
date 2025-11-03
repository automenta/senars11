import React, {memo, useEffect, useMemo, useState} from 'react';
import {TimeDisplay} from './GenericComponents.js';

/**
 * Generic panel component for displaying lists of items
 * @param {Array} items - Array of items to display
 * @param {Function} renderItem - Function to render each item
 * @param {string} maxHeight - Max height for the scrolling container
 * @param {string} emptyMessage - Message to show when no items
 * @param {Object} containerStyle - Additional styles for the container
 * @param {boolean} withTimestamp - Whether to show a timestamp
 * @param {string} title - Panel title
 * @param {boolean} autoScroll - Whether to auto-scroll to the bottom
 * @param {number} maxItems - Maximum number of items to display (for performance)
 */
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

    // Truncate items if maxItems is specified
    const displayItems = useMemo(() => maxItems ? items.slice(-maxItems) : items, [items, maxItems]);

    // Auto-scroll to bottom when items change if autoScroll is enabled
    useEffect(() => {
        if (autoScroll && containerRef) {
            containerRef.scrollTop = containerRef.scrollHeight;
        }
    }, [displayItems.length, autoScroll, containerRef]); // Only check length to avoid unnecessary triggers

    const containerStyleComputed = useMemo(() => ({
        maxHeight,
        overflowY: 'auto',
        ...containerStyle
    }), [maxHeight, containerStyle]);

    const containerProps = useMemo(() => ({
        style: containerStyleComputed,
        ref: (el) => setContainerRef(el) // Set ref for auto-scroll functionality
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
        ? displayItems.map((item, index) => renderItem(item, index))
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