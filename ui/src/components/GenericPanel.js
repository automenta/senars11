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

    const titleStyle = {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        marginBottom: themeUtils.get('SPACING.SM'),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const countStyle = {
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        color: themeUtils.get('TEXT.SECONDARY')
    };

    const emptyStateStyle = {
        padding: themeUtils.get('SPACING.MD'),
        textAlign: 'center',
        color: themeUtils.get('TEXT.MUTED')
    };

    const timestampStyle = {
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        color: themeUtils.get('TEXT.SECONDARY'),
        textAlign: 'right',
        marginTop: themeUtils.get('SPACING.XS'),
        paddingRight: themeUtils.get('SPACING.SM')
    };

    return (
        <div className="genericPanel">
            {title && (
                <div style={titleStyle}>
                    <span>{title}</span>
                    {showCount && <span style={countStyle}>({displayItems.length})</span>}
                </div>
            )}
            <div style={containerStyleComputed} ref={(el) => setContainerRef(el)}>
                {displayItems.length > 0
                    ? displayItems.map((item, index) => <div key={`item-${index}`}>{renderItem(item, index)}</div>)
                    : <div className="emptyState" style={emptyStateStyle}>{emptyMessage}</div>
                }
            </div>
            {withTimestamp && (
                <div style={timestampStyle}>
                    <TimeDisplay timestamp={Date.now()} formatType="time" />
                </div>
            )}
        </div>
    );
});

export default GenericPanel;