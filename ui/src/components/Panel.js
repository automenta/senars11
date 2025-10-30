import React from 'react';
import styles from './Panel.module.css';

const Panel = ({title, children, content: ContentComponent}) => {
    // If content is a React component, render it; otherwise display as text
    const panelContent = typeof ContentComponent === 'function'
        ? React.createElement(ContentComponent, {})
        : ContentComponent;

    return React.createElement('div', {className: styles.panel},
        React.createElement('h3', {className: styles['panel-title']}, title),
        React.createElement('div', {className: styles['panel-content']}, children || panelContent)
    );
};

export default Panel;