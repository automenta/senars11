import React, {useCallback, useMemo, useState} from 'react';

const VirtualizedList = ({
                             items = [],
                             renderItem,
                             itemHeight = 50,
                             containerHeight = 400,
                             overscan = 5
                         }) => {
    const [scrollTop, setScrollTop] = useState(0);

    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2);
    const endIdx = Math.min(items.length - 1, startIdx + visibleCount);

    const totalHeight = items.length * itemHeight;
    const offsetY = startIdx * itemHeight;

    const visibleItems = useMemo(() => {
        const itemsToRender = items.slice(startIdx, endIdx + 1);
        const renderedItems = [];

        for (let i = 0; i < itemsToRender.length; i++) {
            const item = itemsToRender[i];
            const actualIndex = startIdx + i;
            renderedItems.push(
                React.createElement('div', {key: item.id || actualIndex}, renderItem(item, actualIndex))
            );
        }

        return renderedItems;
    }, [items, startIdx, endIdx, renderItem]);

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    return React.createElement('div', {
            style: {
                height: containerHeight,
                overflow: 'auto',
                position: 'relative'
            },
            onScroll: handleScroll
        },
        React.createElement('div', {style: {height: totalHeight, position: 'relative'}},
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: offsetY,
                    left: 0,
                    width: '100%',
                    height: visibleItems.length * itemHeight
                }
            }, ...visibleItems)
        )
    );
};

export default VirtualizedList;