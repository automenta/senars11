/**
 * LoadingSpinner: Parameterized loading indicator
 * Following AGENTS.md: Abstract, Modular, Parameterized
 */

import React, {memo} from 'react';
import {themeUtils} from '../../utils/themeUtils.js';

export const LoadingSpinner = memo(({
                                        size = themeUtils.get('SPACING.XL'),
                                        color = themeUtils.get('COLORS.PRIMARY'),
                                        style = {},
                                        spinnerStyle = {},
                                        className = '',
                                        ...props
                                    }) => {
    const spinnerContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: themeUtils.get('SPACING.MD'),
        ...style
    };

    const spinnerInnerStyle = {
        width: size,
        height: size,
        border: `2px solid ${themeUtils.get('COLORS.GRAY_400')}`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        ...spinnerStyle
    };

    // Add CSS animation if not already present
    React.useLayoutEffect(() => {
        const styleId = 'loading-spinner-animation';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
            document.head.appendChild(style);
        }
    }, []);

    return React.createElement('div', {
            style: spinnerContainerStyle,
            className: `loading-spinner ${className}`.trim(),
            ...props
        },
        React.createElement('div', {style: spinnerInnerStyle})
    );
});