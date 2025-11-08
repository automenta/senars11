/**
 * Component Registry - enables dynamic registration and management of UI components
 */
export class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.layouts = new Map();
        this.themes = new Map();
        this.hooks = new Map(); // For extensibility hooks
    }

    /**
     * Register a new component
     * @param {string} name - Component name
     * @param {Function|Object} component - Component constructor/function
     * @param {Object} metadata - Component metadata
     */
    registerComponent(name, component, metadata = {}) {
        this.components.set(name, { component, metadata });
        return this;
    }

    /**
     * Get a registered component
     * @param {string} name - Component name
     * @returns {Object|null} Component and metadata
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Get all registered components
     * @returns {Map} All components
     */
    getAllComponents() {
        return new Map(this.components);
    }

    /**
     * Register a layout configuration
     * @param {string} name - Layout name
     * @param {Function} layoutFn - Layout function that returns component mapping
     */
    registerLayout(name, layoutFn) {
        this.layouts.set(name, layoutFn);
        return this;
    }

    /**
     * Get a registered layout
     * @param {string} name - Layout name
     * @returns {Function|null} Layout function
     */
    getLayout(name) {
        return this.layouts.get(name) || null;
    }

    /**
     * Register a theme
     * @param {string} name - Theme name
     * @param {Object} theme - Theme configuration
     */
    registerTheme(name, theme) {
        this.themes.set(name, theme);
        return this;
    }

    /**
     * Get a registered theme
     * @param {string} name - Theme name
     * @returns {Object|null} Theme configuration
     */
    getTheme(name) {
        return this.themes.get(name) || null;
    }

    /**
     * Register a hook for extensibility
     * @param {string} hookName - Name of the hook
     * @param {Function} callback - Callback function
     */
    registerHook(hookName, callback) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push(callback);
        return this;
    }

    /**
     * Execute all callbacks for a hook
     * @param {string} hookName - Name of the hook
     * @param {...any} args - Arguments to pass to callbacks
     * @returns {Array} Results from all callbacks
     */
    executeHook(hookName, ...args) {
        const callbacks = this.hooks.get(hookName) || [];
        return callbacks.map(callback => callback(...args));
    }

    /**
     * Check if a component is registered
     * @param {string} name - Component name
     * @returns {boolean} True if component exists
     */
    hasComponent(name) {
        return this.components.has(name);
    }

    /**
     * Unregister a component
     * @param {string} name - Component name to unregister
     * @returns {boolean} True if component was unregistered
     */
    unregisterComponent(name) {
        return this.components.delete(name);
    }

    /**
     * Get component names that match a filter
     * @param {Function} filterFn - Filter function
     * @returns {Array} Filtered component names
     */
    filterComponents(filterFn) {
        const result = [];
        for (const [name, { metadata }] of this.components) {
            if (filterFn({ name, metadata })) {
                result.push(name);
            }
        }
        return result;
    }
}