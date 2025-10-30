import React from 'react';

/**
 * Generic panel component for displaying lists of items
 * @param {Array} items - Array of items to display
 * @param {Function} renderItem - Function to render each item
 * @param {string} maxHeight - Max height for the scrolling container
 * @param {string} emptyMessage - Message to show when no items
 * @param {Object} containerStyle - Additional styles for the container
 */
const GenericPanel = ({
                          items = [],
                          renderItem,
                          maxHeight = 'calc(100% - 2rem)',
                          emptyMessage = 'No items to display',
                          containerStyle = {}
                      }) => {
    const style = {maxHeight, overflowY: 'auto', ...containerStyle};

    return React.createElement('div', {style},
        items.length > 0
            ? items.map((item, index) => renderItem(item, index))
            : React.createElement('div', {
                style: {padding: '1rem', textAlign: 'center', color: '#999'}
            }, emptyMessage)
    );
};

export default GenericPanel;