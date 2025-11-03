/**
 * Theme utilities for consistent theming across the application
 * Following AGENTS.md principles: DRY, modular, parameterized
 */

// Theme constants
const THEME = {
    COLORS: {
        CONNECTED: 'var(--success-color)',
        DISCONNECTED: 'var(--danger-color)',
        CONNECTED_BG: 'var(--success-color)20', // 20% opacity
        DISCONNECTED_BG: 'var(--danger-color)20', // 20% opacity
        PRIMARY: 'var(--primary-color)',
        SECONDARY: 'var(--secondary-color)',
        SUCCESS: 'var(--success-color)',
        WARNING: 'var(--warning-color)',
        DANGER: 'var(--danger-color)',
        INFO: 'var(--info-color)',
        LIGHT: 'var(--light-color)',
        DARK: 'var(--dark-color)',
        GRAY_100: 'var(--gray-100)',
        GRAY_200: 'var(--gray-200)',
        GRAY_300: 'var(--gray-300)',
        GRAY_400: 'var(--gray-400)',
        GRAY_500: 'var(--gray-500)',
        GRAY_600: 'var(--gray-600)',
        GRAY_700: 'var(--gray-700)',
        GRAY_800: 'var(--gray-800)',
        GRAY_900: 'var(--gray-900)',
    },
    SPACING: {
        XS: 'var(--spacing-xs)',
        SM: 'var(--spacing-sm)',
        MD: 'var(--spacing-md)',
        LG: 'var(--spacing-lg)',
        XL: 'var(--spacing-xl)',
    },
    BORDERS: {
        RADIUS: {
            SM: 'var(--border-radius-sm)',
            MD: 'var(--border-radius-md)',
            LG: 'var(--border-radius-lg)',
        },
        COLOR: 'var(--border-color)',
        DARK: 'var(--border-dark)',
    },
    SHADOWS: {
        SM: 'var(--shadow-sm)',
        MD: 'var(--shadow-md)',
        LG: 'var(--shadow-lg)',
    },
    FONTS: {
        SIZE: {
            SM: 'var(--font-size-sm)',
            BASE: 'var(--font-size-base)',
            MD: 'var(--font-size-md)',
            LG: 'var(--font-size-lg)',
            XL: 'var(--font-size-xl)',
        },
        WEIGHT: {
            NORMAL: 'var(--font-weight-normal)',
            MEDIUM: 'var(--font-weight-medium)',
            SEMIBOLD: 'var(--font-weight-semibold)',
            BOLD: 'var(--font-weight-bold)',
        },
    },
    BACKGROUNDS: {
        PRIMARY: 'var(--bg-primary)',
        SECONDARY: 'var(--bg-secondary)',
        TERTIARY: 'var(--bg-tertiary)',
    },
    TEXT: {
        PRIMARY: 'var(--text-primary)',
        SECONDARY: 'var(--text-secondary)',
        MUTED: 'var(--text-muted)',
        LIGHT: 'var(--text-light)',
    },
};

// Theme utility functions
const themeUtils = {
    /**
     * Get theme value by path (e.g., 'COLORS.SUCCESS')
     */
    get: (path) => path.split('.').reduce((obj, key) => obj?.[key], THEME),
    
    /**
     * Get WebSocket status color based on connection state
     */
    getWebSocketStatusColor: (connected) =>
        connected ? THEME.COLORS.CONNECTED : THEME.COLORS.DISCONNECTED,
    
    /**
     * Get WebSocket status background color based on connection state
     */
    getWebSocketStatusBgColor: (connected) =>
        connected ? THEME.COLORS.CONNECTED_BG : THEME.COLORS.DISCONNECTED_BG,
    
    /**
     * Apply opacity to a CSS variable color (by appending hex opacity)
     */
    withOpacity: (cssVar, opacity) => {
        // Convert opacity (0-1) to hex (00-FF)
        const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return `${cssVar}${hexOpacity}`;
    },
    
    /**
     * Get theme object for use in components
     */
    getTheme: () => ({...THEME}),
};

export {THEME, themeUtils};
export default themeUtils;