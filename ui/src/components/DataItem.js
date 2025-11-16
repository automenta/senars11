import React from 'react';
import {themeUtils} from '../utils/themeUtils.js';

/**
 * Generic data item component for displaying structured data
 * @param {Object} props - Component props
 * @param {string} props.title - Item title
 * @param {Array} props.fields - Array of field objects {label, value, type}
 * @param {Object} props.style - Additional styling
 * @param {string} props.variant - Style variant (default, compact, detailed)
 */
const DataItem = ({title, fields = [], style = {}, variant = 'default'}) => {
    const variantStyles = {
        default: {
            padding: themeUtils.get('SPACING.MD'),
            gap: themeUtils.get('SPACING.SM')
        },
        compact: {
            padding: themeUtils.get('SPACING.SM'),
            gap: themeUtils.get('SPACING.XS')
        },
        detailed: {
            padding: themeUtils.get('SPACING.MD'),
            gap: themeUtils.get('SPACING.SM')
        }
    };

    const baseStyle = {
        borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        marginBottom: themeUtils.get('SPACING.XS'),
        ...variantStyles[variant],
        ...style
    };

    const renderFieldValue = (field) =>
        field.render ? field.render(field.value) : String(field.value);

    return React.createElement('div', {style: baseStyle},
        title && React.createElement('div', {
            style: {
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                color: themeUtils.get('TEXT.PRIMARY'),
                marginBottom: variant === 'compact' ? themeUtils.get('SPACING.XS') : themeUtils.get('SPACING.SM')
            }
        }, title),
        ...fields.map((field, index) =>
            React.createElement('div', {
                    key: index,
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: variant === 'compact' ? themeUtils.get('FONTS.SIZE.SM') : themeUtils.get('FONTS.SIZE.BASE'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                },
                React.createElement('span', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.MEDIUM')}}, field.label),
                React.createElement('span', null, renderFieldValue(field))
            )
        )
    );
};

export default DataItem;