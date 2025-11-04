
import {listItemStyles, typography} from './styles.js';

export const createListItem = (React, props) => {
    const {key, style = {}, children = [], compact = false, expandable = false} = props;
    
    const computedStyle = {
        ...listItemStyles.base,
        ...(compact ? listItemStyles.compact : {}),
        ...(expandable ? listItemStyles.expandable : {}),
        ...style
    };
    
    return React.createElement('div', {key, style: computedStyle}, ...children);
};

export const createHeader = (React, props) => {
    const {content, style = {}} = props;
    
    const computedStyle = {
        ...typography.title,
        margin: '1rem 0 0.5rem 0',
        padding: '0.5rem 0',
        borderBottom: '2px solid #007bff',
        color: '#333',
        ...style
    };
    
    return React.createElement('div', {style: computedStyle}, content);
};

export const createControlBar = (React, props) => {
    const {children = [], style = {}} = props;
    
    const computedStyle = {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        ...style
    };
    
    return React.createElement('div', {style: computedStyle}, ...children);
};

export const createTimelineItem = (React, props) => {
    const {key, children = [], index = 0, style = {}} = props;
    
    const computedStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
        ...style
    };
    
    return React.createElement('div', {key, style: computedStyle}, ...children);
};

export const createMetricDisplay = (React, props) => {
    const {label, value, style = {}} = props;
    
    const computedStyle = {
        padding: '0.5rem',
        margin: '0.25rem 0',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '0.9rem',
        ...style
    };
    
    return React.createElement('div', {style: computedStyle},
        React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}},
            label,
            React.createElement('span', {style: {fontWeight: 'normal', color: '#666'}}, value)
        )
    );
};
