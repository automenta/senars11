import React, {useMemo} from 'react';
import GenericPanel from './GenericPanel.js';
import {createListItem} from '../utils/componentUtils.js';
import {themeUtils} from '../utils/themeUtils.js';

const MainPanel = () => {
    const mainItems = useMemo(() => [
        {id: 1, title: 'Welcome', content: 'This is the main panel for SeNARS'},
        {id: 2, title: 'Status', content: 'System operational'},
        {id: 3, title: 'Architecture', content: 'Cognitive Architecture for AGI'},
        {id: 4, title: 'NARS', content: 'Non-Axiomatic Reasoning System'},
    ], []);

    const renderMainItem = (item) => createListItem(React, {
        key: item.id,
        compact: true,
        children: [
            React.createElement('div', {
                style: {
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                    color: themeUtils.get('TEXT.PRIMARY'),
                    marginBottom: themeUtils.get('SPACING.XS')
                }
            }, item.title),
            React.createElement('div', {
                style: {
                    fontSize: themeUtils.get('FONTS.SIZE.SM'),
                    color: themeUtils.get('TEXT.SECONDARY')
                }
            }, item.content)
        ]
    });

    return React.createElement(GenericPanel, {
        title: 'Main Panel',
        items: mainItems,
        renderItem: renderMainItem,
        emptyMessage: 'No main content to display',
        maxHeight: '100%',
        containerStyle: {
            padding: themeUtils.get('SPACING.SM')
        }
    });
};

export default MainPanel;