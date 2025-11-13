import {themeUtils} from './themeUtils.js';

/**
 * Generic component factory for consistent styling
 * @param {React} React - React instance
 * @param {string} element - HTML element type
 * @param {Object} baseStyle - Base style object
 * @param {Object} additionalProps - Additional props to merge
 * @returns {Function} - Component creation function
 */
export const createGenericComponent = (React, element, baseStyle, additionalProps = {}) => (props) => {
    const {key, style = {}, children = [], ...restProps} = props;

    return React.createElement(element, {
        key,
        style: {...baseStyle, ...style},
        ...additionalProps,
        ...restProps
    }, ...Array.isArray(children) ? children : [children]);
};

/**
 * Create a customizable list item with theme-based styling
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - List item element
 */
export const createListItem = (React, props) => {
    const {key, style = {}, children = [], compact = false, expandable = false, className = ''} = props;

    const padding = compact ? themeUtils.get('SPACING.SM') : themeUtils.get('SPACING.MD');
    const computedStyle = {
        display: 'flex',
        flexDirection: 'column',
        padding,
        margin: themeUtils.get('SPACING.XS'),
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        ...(compact && {padding: themeUtils.get('SPACING.XS')}),
        ...(expandable && {cursor: 'pointer', transition: 'all 0.2s'}),
        ...style
    };

    return React.createElement('div', {key, style: computedStyle, className}, ...children);
};

/**
 * Create a customizable header with theme-based styling
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - Header element
 */
export const createHeader = (React, props) => {
    const {content, level = 2, style = {}} = props;
    const Tag = `h${level}`;

    const headerStyle = {
        margin: `${themeUtils.get('SPACING.MD')} 0 ${themeUtils.get('SPACING.SM')} 0`,
        padding: themeUtils.get('SPACING.SM'),
        borderBottom: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
        color: themeUtils.get('TEXT.PRIMARY'),
        fontSize: themeUtils.get(`FONTS.SIZE.${level === 1 ? 'XL' : level === 2 ? 'LG' : 'MD'}`),
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        ...style
    };

    return React.createElement(Tag, {style: headerStyle}, content);
};

/**
 * Create a control bar with theme-based styling
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - Control bar element
 */
export const createControlBar = (React, props) => {
    const {children = [], style = {}} = props;

    const computedStyle = {
        display: 'flex',
        gap: themeUtils.get('SPACING.SM'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        alignItems: 'center',
        flexWrap: 'wrap',
        ...style
    };

    return React.createElement('div', {style: computedStyle}, ...children);
};

/**
 * Create a timeline item with alternating background
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - Timeline item element
 */
export const createTimelineItem = (React, props) => {
    const {key, children = [], index = 0, style = {}} = props;

    const backgroundColor = index % 2 === 0
        ? themeUtils.get('BACKGROUNDS.SECONDARY')
        : themeUtils.get('BACKGROUNDS.TERTIARY');

    const computedStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: themeUtils.get('SPACING.SM'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        backgroundColor,
        ...style
    };

    return React.createElement('div', {key, style: computedStyle}, ...children);
};

/**
 * Create a metric display with theme-based styling
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - Metric display element
 */
export const createMetricDisplay = (React, props) => {
    const {label, value, style = {}} = props;

    const computedStyle = {
        padding: themeUtils.get('SPACING.SM'),
        margin: themeUtils.get('SPACING.XS'),
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        ...style
    };

    const headerStyle = {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        display: 'flex',
        justifyContent: 'space-between',
        color: themeUtils.get('TEXT.PRIMARY')
    };

    const valueStyle = {
        fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
        color: themeUtils.get('TEXT.SECONDARY')
    };

    return React.createElement('div', {style: computedStyle},
        React.createElement('div', {style: headerStyle},
            React.createElement('span', null, label),
            React.createElement('span', {style: valueStyle}, value)
        )
    );
};

/**
 * Create a container with theme-based styling
 * @param {React} React - React instance
 * @param {Object} props - Component properties
 * @returns {ReactElement} - Container element
 */
export const createContainer = (React, props) => {
    const {children = [], style = {}, className = ''} = props;

    const computedStyle = {
        padding: themeUtils.get('SPACING.MD'),
        margin: themeUtils.get('SPACING.XS'),
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        ...style
    };

    return React.createElement('div', {style: computedStyle, className}, ...children);
};
