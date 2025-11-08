/**
 * Base Plugin Class - provides a foundation for creating TUI plugins
 */
export class BasePlugin {
    /**
     * Constructor for base plugin
     * @param {string} name - Plugin name
     * @param {Object} metadata - Plugin metadata
     */
    constructor(name, metadata = {}) {
        this.name = name;
        this.metadata = {
            version: '1.0.0',
            author: '',
            description: '',
            requires: [],
            ...metadata
        };
        this.isInstalled = false;
    }

    /**
     * Install the plugin - override this method in subclasses
     * @param {ComponentRegistry} registry - Component registry
     */
    async install(registry) {
        this.isInstalled = true;
        console.log(`Plugin ${this.name} installed`);
    }

    /**
     * Uninstall the plugin - override this method in subclasses
     * @param {ComponentRegistry} registry - Component registry
     */
    async uninstall(registry) {
        this.isInstalled = false;
        console.log(`Plugin ${this.name} uninstalled`);
    }

    /**
     * Check if plugin is installed
     * @returns {boolean} True if installed
     */
    isPluginInstalled() {
        return this.isInstalled;
    }

    /**
     * Get plugin metadata
     * @returns {Object} Plugin metadata
     */
    getMetadata() {
        return this.metadata;
    }

    /**
     * Validate plugin installation
     * @returns {boolean} True if valid
     */
    validate() {
        return !!this.name;
    }
}