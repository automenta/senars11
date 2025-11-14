// Memoization cache for theme value lookups
const themeCache = new Map();

/**
 * Comprehensive theme constants with organized structure
 * Following AGENTS.md: Organized, Abstract, Modularized
 */
const THEME = Object.freeze({
  COLORS: Object.freeze({
    CONNECTED: 'var(--success-color)',
    DISCONNECTED: 'var(--danger-color)',
    CONNECTED_BG: 'var(--success-color)20',
    DISCONNECTED_BG: 'var(--danger-color)20',
    PRIMARY: 'var(--primary-color)',
    SECONDARY: 'var(--secondary-color)',
    SUCCESS: 'var(--success-color)',
    WARNING: 'var(--warning-color)',
    DANGER: 'var(--danger-color)',
    INFO: 'var(--info-color)',
    LIGHT: 'var(--light-color)',
    DARK: 'var(--dark-color)',
    GRAY: Object.freeze({
      100: 'var(--gray-100)',
      200: 'var(--gray-200)',
      300: 'var(--gray-300)',
      400: 'var(--gray-400)',
      500: 'var(--gray-500)',
      600: 'var(--gray-600)',
      700: 'var(--gray-700)',
      800: 'var(--gray-800)',
      900: 'var(--gray-900)',
    }),
  }),
  SPACING: Object.freeze({
    XS: 'var(--spacing-xs)',
    SM: 'var(--spacing-sm)',
    MD: 'var(--spacing-md)',
    LG: 'var(--spacing-lg)',
    XL: 'var(--spacing-xl)',
  }),
  BORDERS: Object.freeze({
    RADIUS: Object.freeze({
      SM: 'var(--border-radius-sm)',
      MD: 'var(--border-radius-md)',
      LG: 'var(--border-radius-lg)',
    }),
    COLOR: 'var(--border-color)',
    DARK: 'var(--border-dark)',
  }),
  SHADOWS: Object.freeze({
    SM: 'var(--shadow-sm)',
    MD: 'var(--shadow-md)',
    LG: 'var(--shadow-lg)',
  }),
  FONTS: Object.freeze({
    SIZE: Object.freeze({
      XS: 'var(--font-size-xs)',
      SM: 'var(--font-size-sm)',
      BASE: 'var(--font-size-base)',
      MD: 'var(--font-size-md)',
      LG: 'var(--font-size-lg)',
      XL: 'var(--font-size-xl)',
    }),
    WEIGHT: Object.freeze({
      NORMAL: 'var(--font-weight-normal)',
      MEDIUM: 'var(--font-weight-medium)',
      SEMIBOLD: 'var(--font-weight-semibold)',
      BOLD: 'var(--font-weight-bold)',
    }),
    FAMILY: Object.freeze({
      BASE: 'var(--font-family-base)',
      MONO: 'var(--font-family-mono)',
    }),
  }),
  BACKGROUNDS: Object.freeze({
    PRIMARY: 'var(--bg-primary)',
    SECONDARY: 'var(--bg-secondary)',
    TERTIARY: 'var(--bg-tertiary)',
  }),
  TEXT: Object.freeze({
    PRIMARY: 'var(--text-primary)',
    SECONDARY: 'var(--text-secondary)',
    MUTED: 'var(--text-muted)',
    LIGHT: 'var(--text-light)',
  }),
});

const themeUtils = {
  /**
     * Get theme value by dotted path with memoization
     * @param {string} path - Dot-notation path to theme value (e.g. 'COLORS.PRIMARY')
     * @returns {*} The theme value or undefined if not found
     */
  get: (path) => {
    if (!path) return undefined;

    // Return cached value if available
    if (themeCache.has(path)) {
      return themeCache.get(path);
    }

    // Navigate the theme object using path
    const result = path.split('.').reduce((obj, key) => obj?.[key], THEME);

    // Cache the result
    themeCache.set(path, result);
    return result;
  },

  /**
     * Get a gray color by number with fallback
     * @param {number} number - Gray scale number (100-900)
     * @returns {string} The gray color CSS variable
     */
  getGray: (number) => {
    const path = `COLORS.GRAY.${number}`;
    return themeUtils.get(path) || `var(--gray-${number})`;
  },

  /**
     * Clear the theme cache (useful for testing or theme changes)
     */
  clearCache: () => {
    themeCache.clear();
  },

  getWebSocketStatusColor: (connected) =>
    connected ? themeUtils.get('COLORS.CONNECTED') : themeUtils.get('COLORS.DISCONNECTED'),
  getWebSocketStatusBgColor: (connected) =>
    connected ? themeUtils.get('COLORS.CONNECTED_BG') : themeUtils.get('COLORS.DISCONNECTED_BG'),

  /**
     * Create a color with opacity by appending hex alpha value
     * @param {string} cssVar - CSS variable
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {string} CSS variable with opacity appended
     */
  withOpacity: (cssVar, opacity) => {
    if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
      console.warn(`Invalid opacity value: ${opacity}. Must be between 0 and 1.`);
      return cssVar;
    }

    const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${cssVar}${hexOpacity}`;
  },

  /**
     * Get a copy of the full theme object
     * @returns {object} A copy of the theme object
     */
  getTheme: () => ({...THEME}),

  /**
     * Check if a theme path exists
     * @param {string} path - Dot-notation path to check
     * @returns {boolean} Whether the path exists in the theme
     */
  has: (path) => {
    if (!path) return false;
    return path.split('.').reduce((obj, key) => obj?.[key], THEME) !== undefined;
  }
};

// Initialize theme cache with common values to improve performance
const initializeThemeCache = () => {
  // Pre-populate cache with commonly used theme values
  const commonPaths = [
    'COLORS.PRIMARY',
    'COLORS.SECONDARY',
    'COLORS.SUCCESS',
    'COLORS.WARNING',
    'COLORS.DANGER',
    'COLORS.INFO',
    'SPACING.XS',
    'SPACING.SM',
    'SPACING.MD',
    'SPACING.LG',
    'SPACING.XL',
    'BORDERS.RADIUS.SM',
    'BORDERS.RADIUS.MD',
    'BORDERS.RADIUS.LG',
    'BORDERS.COLOR',
    'FONTS.SIZE.BASE',
    'FONTS.SIZE.SM',
    'FONTS.SIZE.MD',
    'FONTS.SIZE.LG',
    'FONTS.WEIGHT.NORMAL',
    'FONTS.WEIGHT.BOLD',
    'BACKGROUNDS.PRIMARY',
    'BACKGROUNDS.SECONDARY',
    'BACKGROUNDS.TERTIARY',
    'TEXT.PRIMARY',
    'TEXT.SECONDARY',
    'TEXT.MUTED',
    'TEXT.LIGHT'
  ];

  commonPaths.forEach(path => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], THEME);
    themeCache.set(path, value);
  });
};

// Initialize the cache with common values
initializeThemeCache();

export {THEME, themeUtils};
export default themeUtils;