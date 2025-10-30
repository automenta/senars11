import React from 'react';
import GenericPanel from './GenericPanel.js';

const MainPanel = () => {
  // Sample data for main panel
  const items = [
    { id: 1, title: 'Welcome', content: 'This is the main panel' },
    { id: 2, title: 'Status', content: 'System operational' },
  ];
  
  const renderMainItem = (item, index) => 
    React.createElement('div', 
      { 
        key: item.id || index,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', { style: { fontWeight: 'bold' } }, item.title),
      React.createElement('div', null, item.content)
    );

  return React.createElement(GenericPanel, { 
    items,
    renderItem: renderMainItem,
    emptyMessage: 'No main content to display'
  });
};

export default MainPanel;