import React, {memo} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';

// Extract item rendering to a separate component for better modularity
const ExplorerItem = memo(({item}) =>
    React.createElement('div',
        {
            style: {
                padding: '0.5rem',
                margin: '0.25rem 0',
                backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                fontSize: themeUtils.get('FONTS.SIZE.BASE')
            }
        },
        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, item.term),
        React.createElement('div', null, 'Explorer item details')
    )
);

const ExplorerPanel = memo(() => {
    // In a real app, we would get explorer items from the store
    const items = useUiStore(state => state.concepts); // Using concepts as sample data

    return React.createElement(DataPanel, {
        title: 'Explorer',
        dataSource: () => items,
        renderItem: (item) => React.createElement(ExplorerItem, {item}),
        config: {
            itemLabel: 'items',
            showItemCount: true,
            emptyMessage: 'No explorer items to display'
        }
    });
});

export default ExplorerPanel;