import React from 'react';
import GenericPanel from './GenericPanel.js';
import {createListItem} from '../utils/componentUtils.js';

const MainPanel = () => {
    // Sample data for main panel
    const items = [
        {id: 1, title: 'Welcome', content: 'This is the main panel'},
        {id: 2, title: 'Status', content: 'System operational'},
    ];
const renderMainItem = (item, index) =>
    createListItem(React, {
        key: item.id || index,
        children: [
            React.createElement('div', {style: {fontWeight: 'bold'}}, item.title),
            React.createElement('div', null, item.content)
        ]
    });


    return React.createElement(GenericPanel, {
        items,
        renderItem: renderMainItem,
        emptyMessage: 'No main content to display'
    });
};

export default MainPanel;