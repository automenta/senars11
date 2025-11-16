/**
 * Panel: Reusable panel component for different layouts
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, {memo} from 'react';
import {themeUtils} from '../../utils/themeUtils.js';

export const Panel = memo(({
                               title,
                               children,
                               actions = null,
                               collapsible = false,
                               initiallyCollapsed = false,
                               onCollapse = null,
                               style = {},
                               headerStyle = {},
                               contentStyle = {},
                               ...props
                           }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(initiallyCollapsed);

    React.useEffect(() => {
        onCollapse?.(isCollapsed);
    }, [isCollapsed, onCollapse]);

    const panelStyle = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        overflow: 'hidden',
        ...style
    };

    const headerContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
        borderBottom: isCollapsed ? 'none' : `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        cursor: collapsible ? 'pointer' : 'default',
        ...headerStyle
    };

    const titleStyle = {
        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
        color: themeUtils.get('TEXT.PRIMARY'),
        margin: 0,
        fontSize: themeUtils.get('FONTS.SIZE.BASE')
    };

    const contentContainerStyle = {
        padding: themeUtils.get('SPACING.MD'),
        overflow: 'auto',
        flex: 1,
        ...contentStyle
    };

    const headerActionsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: themeUtils.get('SPACING.SM')
    };

    const collapseIconStyle = {
        fontSize: themeUtils.get('FONTS.SIZE.LG'),
        color: themeUtils.get('TEXT.SECONDARY')
    };

    const handleHeaderClick = () => {
        if (collapsible) {
            setIsCollapsed(!isCollapsed);
        }
    };

    return React.createElement('div', {style: panelStyle, ...props},
        title && React.createElement('div', {
                style: headerContainerStyle,
                onClick: handleHeaderClick
            },
            React.createElement('h3', {style: titleStyle}, title),
            React.createElement('div', {style: headerActionsStyle},
                actions && actions,
                collapsible && React.createElement('div', {style: collapseIconStyle},
                    isCollapsed ? '▶' : '▼'
                )
            )
        ),
        !isCollapsed && React.createElement('div', {style: contentContainerStyle},
            children
        )
    );
});