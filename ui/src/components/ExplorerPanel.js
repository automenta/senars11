import React from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const ExplorerPanel = () => {
  // In a real app, we would get explorer items from the store
  const items = useUiStore(state => state.concepts); // Using concepts as sample data

  const renderExplorerItem = (item, index) =>
    React.createElement('div',
      {
        key: item.term || index,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', {style: {fontWeight: 'bold'}}, item.term || `Item ${index}`),
      React.createElement('div', null, 'Explorer item details')
    );

  return React.createElement(GenericPanel, {
    items,
    renderItem: renderExplorerItem,
    emptyMessage: 'No explorer items to display'
  });
};

export default ExplorerPanel;