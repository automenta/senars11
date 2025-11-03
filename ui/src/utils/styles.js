/**
 * Common styling utilities and constants for UI components
 * Following AGENTS.md principles: DRY, modular, parameterized
 */

// Common CSS variables for consistent theming
export const themeVariables = {
    // Colors
    '--bg-primary': 'var(--bg-primary, #ffffff)',
    '--bg-secondary': 'var(--bg-secondary, #f8f9fa)',
    '--text-primary': 'var(--text-primary, #212529)',
    '--text-secondary': 'var(--text-secondary, #6c757d)',
    '--border-color': 'var(--border-color, #dee2e6)',
    '--success': 'var(--success, #28a745)',
    '--warning': 'var(--warning, #ffc107)',
    '--error': 'var(--error, #dc3545)',
    '--info': 'var(--info, #17a2b8)',
    
    // Spacing
    '--spacing-xs': 'var(--spacing-xs, 0.25rem)',
    '--spacing-sm': 'var(--spacing-sm, 0.5rem)',
    '--spacing-md': 'var(--spacing-md, 1rem)',
    '--spacing-lg': 'var(--spacing-lg, 1.5rem)',
    
    // Sizing
    '--radius': 'var(--radius, 4px)',
    '--border-width': 'var(--border-width, 1px)',
};

// Common style patterns for list items
export const listItemStyles = {
    base: {
        padding: 'var(--spacing-sm, 0.5rem)',
        margin: 'var(--spacing-xs, 0.25rem) 0',
        backgroundColor: 'var(--bg-primary)',
        border: 'var(--border-width, 1px) solid var(--border-color)',
        borderRadius: 'var(--radius, 4px)',
        fontSize: '0.9rem',
    },
    compact: {
        padding: '0.25rem',
        margin: '0.125rem 0',
        fontSize: '0.8rem',
    },
    expandable: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};

// Common typography styles
export const typography = {
    title: {
        fontWeight: 'bold',
        fontSize: '1rem',
        marginBottom: '0.5rem',
    },
    subtitle: {
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
    },
    body: {
        fontSize: '0.9rem',
    },
    small: {
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
    },
    emphasized: {
        fontWeight: 'bold',
    },
};

// Utility function to merge styles with theme variables
export const mergeStyles = (...styles) => {
    const merged = {};
    for (const style of styles) {
        if (typeof style === 'object' && style !== null) {
            Object.assign(merged, style);
        }
    }
    return merged;
};

// Common style builders
export const buildListItemStyle = (compact = false, expandable = false) => {
    const styles = [listItemStyles.base];
    if (compact) styles.push(listItemStyles.compact);
    if (expandable) styles.push(listItemStyles.expandable);
    return mergeStyles(...styles);
};

export const buildTextStyle = (type = 'body') =>
    mergeStyles(typography[type] || typography.body);