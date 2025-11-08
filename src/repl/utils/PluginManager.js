import { ComponentRegistry } from './ComponentRegistry.js';
import { EventEmitter } from 'events';

/**
 * Plugin Manager - handles plugin loading, unloading, and lifecycle management
 */
export class PluginManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.plugins = new Map();
        this.componentRegistry = new ComponentRegistry();
        this.config = config;
        this.isEnabled = true;
    }

    /**
     * Load a plugin
     * @param {Object} plugin - Plugin object with install method
     * @param {string} name - Plugin name
     * @param {Object} options - Plugin options
     */
    async loadPlugin(plugin, name, options = {}) {
        if (!this.isEnabled) {
            throw new Error('Plugin manager is disabled');
        }

        if (this.plugins.has(name)) {
            throw new Error(`Plugin ${name} is already loaded`);
        }

        try {
            // Create plugin instance
            const pluginInstance = typeof plugin === 'function' 
                ? new plugin(this, options) 
                : plugin;

            // Validate plugin interface
            if (!pluginInstance.install || typeof pluginInstance.install !== 'function') {
                throw new Error(`Plugin ${name} does not have a valid install method`);
            }

            // Install the plugin
            await pluginInstance.install(this.componentRegistry);

            // Store the plugin
            this.plugins.set(name, {
                instance: pluginInstance,
                name,
                options,
                loaded: true,
                metadata: pluginInstance.metadata || {}
            });

            this.emit('plugin-loaded', { name, metadata: pluginInstance.metadata });
            console.log(`Plugin ${name} loaded successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to load plugin ${name}:`, error);
            this.emit('plugin-error', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Unload a plugin
     * @param {string} name - Plugin name
     */
    async unloadPlugin(name) {
        if (!this.plugins.has(name)) {
            throw new Error(`Plugin ${name} is not loaded`);
        }

        try {
            const plugin = this.plugins.get(name);
            
            // Call plugin's uninstall method if it exists
            if (plugin.instance.uninstall && typeof plugin.instance.uninstall === 'function') {
                await plugin.instance.uninstall(this.componentRegistry);
            }

            // Remove plugin
            this.plugins.delete(name);
            this.emit('plugin-unloaded', { name });
            console.log(`Plugin ${name} unloaded successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to unload plugin ${name}:`, error);
            this.emit('plugin-error', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Get a loaded plugin
     * @param {string} name - Plugin name
     * @returns {Object|null} Plugin instance
     */
    getPlugin(name) {
        const plugin = this.plugins.get(name);
        return plugin ? plugin.instance : null;
    }

    /**
     * Get all loaded plugins
     * @returns {Array} Array of plugin information
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Check if a plugin is loaded
     * @param {string} name - Plugin name
     * @returns {boolean} True if plugin is loaded
     */
    isPluginLoaded(name) {
        return this.plugins.has(name);
    }

    /**
     * Enable plugin manager
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable plugin manager
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * Get the component registry
     * @returns {ComponentRegistry} The component registry
     */
    getComponentRegistry() {
        return this.componentRegistry;
    }

    /**
     * Execute a hook across all plugins
     * @param {string} hookName - Hook name
     * @param {...any} args - Arguments to pass
     * @returns {Array} Results from all hook callbacks
     */
    executeHook(hookName, ...args) {
        return this.componentRegistry.executeHook(hookName, ...args);
    }

    /**
     * Load plugins from a directory
     * @param {string} directory - Directory path
     */
    async loadPluginsFromDirectory(directory) {
        // This would require dynamic import which is environment-specific
        // For now, we'll just provide the method signature
        console.warn('loadPluginsFromDirectory not implemented for this environment');
        return [];
    }

    /**
     * Reload a plugin
     * @param {string} name - Plugin name
     */
    async reloadPlugin(name) {
        if (!this.plugins.has(name)) {
            throw new Error(`Plugin ${name} is not loaded`);
        }

        const plugin = this.plugins.get(name);
        await this.unloadPlugin(name);
        return await this.loadPlugin(plugin.instance, name, plugin.options);
    }

    /**
     * Get plugin metadata
     * @param {string} name - Plugin name
     * @returns {Object|null} Plugin metadata
     */
    getPluginMetadata(name) {
        const plugin = this.plugins.get(name);
        return plugin ? plugin.metadata : null;
    }
}