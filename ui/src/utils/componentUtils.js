/**
 * Utility functions for common component patterns and reusable UI elements
 * Following DRY principles to consolidate duplicated code
 */

import {listItemStyles, typography} from './styles.js';

/**
 * Creates a standardized list item element with consistent styling
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {string} props.key - React key
 * @param {Object} props.style - Additional styles to apply
 * @param {Array} props.children - Child elements
 * @param {boolean} props.compact - Whether to use compact styling
 * @param {boolean} props.expandable - Whether the item is expandable
 * @returns {ReactElement} - Styled list item element
 */
export const createListItem = (React, props) => {
    const {
        key,
        style = {},
        children = [],
        compact = false,
        expandable = false
    } = props;

    const computedStyle = {
        ...listItemStyles.base,
        ...(compact ? listItemStyles.compact : {}),
        ...(expandable ? listItemStyles.expandable : {}),
        ...style
    };

    return React.createElement('div', {key, style: computedStyle}, ...children);
};

/**
 * Creates a standardized header element
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {string} props.content - Header text content
 * @param {Object} props.style - Additional styles to apply
 * @returns {ReactElement} - Styled header element
 */
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

/**
 * Creates a standardized control bar element
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {Array} props.children - Child elements
 * @param {Object} props.style - Additional styles to apply
 * @returns {ReactElement} - Styled control bar element
 */
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

/**
 * Creates a standardized timeline item element
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {string} props.key - React key
 * @param {Array} props.children - Child elements
 * @param {number} props.index - Index for alternating row colors
 * @param {Object} props.style - Additional styles to apply
 * @returns {ReactElement} - Styled timeline item element
 */
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

/**
 * Creates a standardized metric display element
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {string} props.label - Metric label
 * @param {string|number} props.value - Metric value
 * @param {Object} props.style - Additional styles to apply
 * @returns {ReactElement} - Styled metric element
 */
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

/**
 * Creates a standardized progress bar element
 * @param {Object} React - React object
 * @param {Object} props - Component properties
 * @param {number} props.percentage - Progress percentage (0-100)
 * @param {string} props.color - Bar color
 * @param {Object} props.style - Additional styles to apply
 * @returns {ReactElement} - Styled progress bar element
 */
export const createProgressBar = (React, props) => {
    const {percentage, color = '#007bff', style = {}} = props;

    const containerStyle = {
        height: '8px',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '0.25rem',
        ...style
    };

    const barStyle = {
        height: '100%',
        width: `${Math.min(100, percentage)}%`,
        backgroundColor: color,
        transition: 'width 0.3s ease'
    };

    return React.createElement('div', {style: containerStyle},
        React.createElement('div', {style: barStyle})
    );
};