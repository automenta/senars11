/**
 * Theme Manager - handles theme management and customization
 */
export class ThemeManager {
    constructor() {
        this.themes = new Map();
        this.currentTheme = 'default';
        this.config = {
            default: this.getDefaultTheme(),
            custom: {}
        };
    }

    /**
     * Get default theme configuration
     * @returns {Object} Default theme
     */
    getDefaultTheme() {
        return {
            name: 'default',
            colors: {
                primary: 'white',
                secondary: 'gray',
                success: 'green',
                warning: 'yellow',
                error: 'red',
                info: 'cyan',
                highlight: 'magenta',
                background: 'black',
                border: 'green'
            },
            styles: {
                taskEditor: {
                    borderStyle: 'round',
                    padding: 1,
                    width: '40%'
                },
                logViewer: {
                    borderStyle: 'round',
                    padding: 1,
                    width: '60%'
                },
                statusBar: {
                    backgroundColor: 'blue',
                    color: 'white'
                },
                taskInput: {
                    borderStyle: 'round',
                    padding: 1
                }
            },
            components: {
                taskEditor: {
                    showPriority: true,
                    showStatus: true,
                    showTimestamp: true
                },
                logViewer: {
                    showTimestamp: true,
                    maxScrollback: 1000,
                    showFilters: true
                }
            }
        };
    }

    /**
     * Register a new theme
     * @param {string} name - Theme name
     * @param {Object} theme - Theme configuration
     */
    registerTheme(name, theme) {
        this.themes.set(name, {
            ...this.getDefaultTheme(),
            ...theme,
            name
        });
        return this;
    }

    /**
     * Apply a theme
     * @param {string} name - Theme name
     * @returns {boolean} True if theme was applied
     */
    applyTheme(name) {
        if (!this.themes.has(name)) {
            console.warn(`Theme ${name} not found, using default`);
            name = 'default';
        }

        this.currentTheme = name;
        this.config.current = this.themes.get(name) || this.getDefaultTheme();
        return true;
    }

    /**
     * Get current theme
     * @returns {Object} Current theme configuration
     */
    getCurrentTheme() {
        return this.config.current || this.getDefaultTheme();
    }

    /**
     * Get a specific theme
     * @param {string} name - Theme name
     * @returns {Object|null} Theme or null if not found
     */
    getTheme(name) {
        return this.themes.get(name) || null;
    }

    /**
     * Get theme color
     * @param {string} type - Color type (primary, secondary, etc.)
     * @returns {string} Color name
     */
    getColor(type) {
        const theme = this.getCurrentTheme();
        return theme.colors[type] || theme.colors.primary;
    }

    /**
     * Get component style
     * @param {string} component - Component name
     * @param {string} style - Style property
     * @returns {any} Style value
     */
    getStyle(component, style) {
        const theme = this.getCurrentTheme();
        return theme.styles[component]?.[style];
    }

    /**
     * Get component configuration
     * @param {string} component - Component name
     * @returns {Object} Component configuration
     */
    getComponentConfig(component) {
        const theme = this.getCurrentTheme();
        return theme.components[component] || {};
    }

    /**
     * Update theme configuration
     * @param {Object} updates - Theme updates
     * @param {string} themeName - Theme name to update (defaults to current)
     */
    updateTheme(updates, themeName = null) {
        const name = themeName || this.currentTheme;
        const existing = this.themes.get(name) || this.getDefaultTheme();

        const updatedTheme = {
            ...existing,
            ...updates,
            name
        };

        this.themes.set(name, updatedTheme);

        if (name === this.currentTheme) {
            this.config.current = updatedTheme;
        }

        return this;
    }

    /**
     * Get all registered themes
     * @returns {Array} Array of theme names
     */
    getAvailableThemes() {
        return Array.from(this.themes.keys());
    }

    /**
     * Create a custom theme based on existing one
     * @param {string} newThemeName - New theme name
     * @param {string} baseThemeName - Base theme name
     * @param {Object} customizations - Customizations to apply
     */
    createCustomTheme(newThemeName, baseThemeName = 'default', customizations = {}) {
        const baseTheme = this.themes.get(baseThemeName) || this.getDefaultTheme();
        const newTheme = {
            ...baseTheme,
            ...customizations,
            name: newThemeName
        };

        this.registerTheme(newThemeName, newTheme);
        return this;
    }

    /**
     * Import theme from JSON
     * @param {string|Object} themeData - Theme JSON string or object
     * @param {string} name - Theme name
     */
    importTheme(themeData, name) {
        const theme = typeof themeData === 'string'
            ? JSON.parse(themeData)
            : themeData;

        this.registerTheme(name, theme);
        return this;
    }

    /**
     * Export current theme as JSON
     * @returns {string} Theme JSON
     */
    exportCurrentTheme() {
        return JSON.stringify(this.getCurrentTheme(), null, 2);
    }
}