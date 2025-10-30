import React from 'react';
import styles from './Panel.module.css';

const Panel = ({ title, children, className = '', type = 'default' }) => 
  React.createElement(
    'div',
    { 
      className: `${styles.panel} ${styles[`panel--${type}`] || ''} ${className}`.trim() 
    },
    React.createElement('h3', { className: styles.panelTitle }, title),
    React.createElement('div', { className: styles.panelContent }, children)
  );

export default Panel;