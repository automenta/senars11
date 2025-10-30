import React from 'react';

const Panel = ({ title, children, content: ContentComponent }) => {
  // If content is a React component, render it; otherwise display as text
  const panelContent = typeof ContentComponent === 'function' 
    ? React.createElement(ContentComponent, {}) 
    : ContentComponent;

  return React.createElement('div', { 
    className: `panel ${title.toLowerCase()}-panel`,
    style: { 
      padding: '1rem', 
      height: '100%', 
      overflowY: 'auto',
      backgroundColor: '#f8f9fa',
      fontFamily: 'monospace'
    } 
  },
  React.createElement('h3', { style: { margin: '0 0 1rem 0', fontSize: '1.1rem' } }, title),
  children || panelContent
  );
};

export default Panel;