import React, {useMemo} from 'react';
import GenericPanel from './GenericPanel.js';
import {createListItem} from '../utils/componentUtils.js';
import {themeUtils} from '../utils/themeUtils.js';

const MainPanel = () => {
    // Sample data for main panel
    const mainItems = useMemo(() => [
        {id: 1, title: 'Welcome', content: 'This is the main panel'},
        {id: 2, title: 'Status', content: 'System operational'},
    ], []);

    const renderMainItem = (item) => createListItem(React, {
        key: item.id,
        children: [
            React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, item.title),
            React.createElement('div', null, item.content)
        ]
    });

    return React.createElement(GenericPanel, {
        items: mainItems,
        renderItem: renderMainItem,
        emptyMessage: 'No main content to display'
    });
};

export default MainPanel;