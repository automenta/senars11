import {BaseComponent} from '../util/BaseComponent.js';

/**
 * ComponentManager manages the lifecycle of system components
 * ensuring standardized initialization, startup, and shutdown patterns
 */
export class ComponentManager extends BaseComponent {
    /**
     * Creates a new component manager
     * @param {Object} config - Configuration for the component manager
     * @param {EventBus} [eventBus] - Optional shared event bus
     * @param {NAR} [nar] - Optional NAR instance
     */
    constructor(config = {}, eventBus = null, nar = null) {
        super(config, 'ComponentManager', eventBus);
        this.nar = nar;
        this._components = new Map(); // Map of component names to component instances
        this._dependencyGraph = new Map(); // Map of component dependencies
        this._startupOrder = []; // Order in which components should be started
        this._shutdownOrder = []; // Order in which components should be shut down
    }

    async loadComponentsFromConfig(componentConfigs) {
        for (const [name, config] of Object.entries(componentConfigs)) {
            if (!config.enabled) {
                this.logDebug(`Component ${name} is disabled in config.`);
                continue;
            }

            try {
                const module = await import(`../${config.path}`);
                const ComponentClass = module[config.class];
                if (!ComponentClass) {
                    throw new Error(`Component class ${config.class} not found in ${config.path}`);
                }

                const dependencies = {};
                if (config.dependencies) {
                    for (const dep of config.dependencies) {
                        if (dep === 'nar') {
                            dependencies['nar'] = this.nar;
                        } else if (dep === 'eventBus') {
                            dependencies['eventBus'] = this.eventBus;
                        } else {
                            dependencies[dep] = this.getComponent(dep);
                        }
                    }
                }

                const instance = new ComponentClass(config.config, dependencies.eventBus, dependencies.nar);
                this.registerComponent(name, instance, config.dependencies);
                this.logInfo(`Successfully loaded and registered component: ${name}`);

            } catch (error) {
                this.logError(`Failed to load component ${name}:`, error);
            }
        }
    }

    /**
     * Registers a component with the manager
     * @param {string} name - Component name
     * @param {BaseComponent} component - Component instance
     * @param {string[]} [dependencies] - Names of components this component depends on
     * @returns {boolean} True if registration was successful
     */
    registerComponent(name, component, dependencies = []) {
        if (this._components.has(name)) {
            this.logWarn(`Component ${name} already registered`);
            return false;
        }

        this._components.set(name, component);
        this._dependencyGraph.set(name, dependencies);
        this.logDebug(`Registered component: ${name}`, {
            dependencies,
            totalComponents: this._components.size
        });

        return true;
    }

    /**
     * Gets a registered component by name
     * @param {string} name - Component name
     * @returns {BaseComponent|null} Component instance or null if not found
     */
    getComponent(name) {
        return this._components.get(name) || null;
    }

    /**
     * Gets all registered components
     * @returns {Map<string, BaseComponent>} Map of component names to instances
     */
    getComponents() {
        return new Map(this._components);
    }

    /**
     * Gets the startup order of components
     * @returns {string[]} Array of component names in startup order
     */
    getStartupOrder() {
        if (this._startupOrder.length === 0) {
            this._calculateStartupOrder();
        }
        return [...this._startupOrder];
    }

    /**
     * Gets the shutdown order of components
     * @returns {string[]} Array of component names in shutdown order
     */
    getShutdownOrder() {
        if (this._shutdownOrder.length === 0) {
            this._calculateShutdownOrder();
        }
        return [...this._shutdownOrder];
    }

    /**
     * Calculates the startup order based on dependencies
     * @private
     */
    _calculateStartupOrder() {
        const result = [];
        const visited = new Set();
        const visiting = new Set(); // For cycle detection

        const visit = (node) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                throw new Error(`Circular dependency detected: ${node}`);
            }

            visiting.add(node);

            const dependencies = this._dependencyGraph.get(node) || [];
            for (const dependency of dependencies) {
                if (this._components.has(dependency)) {
                    visit(dependency);
                }
            }

            visiting.delete(node);
            visited.add(node);
            result.push(node);
        };

        for (const componentName of this._components.keys()) {
            if (!visited.has(componentName)) {
                visit(componentName);
            }
        }

        this._startupOrder = result;
    }

    /**
     * Calculates the shutdown order (reverse of startup order)
     * @private
     */
    _calculateShutdownOrder() {
        if (this._startupOrder.length === 0) {
            this._calculateStartupOrder();
        }
        this._shutdownOrder = [...this._startupOrder].reverse();
    }

    /**
     * Internal method to execute a lifecycle operation on all components
     * @param {string} operation - The operation to perform (initialize, start, stop, dispose)
     * @param {string[]} componentOrder - The order in which to execute the operation
     * @param {Object} metricUpdate - Metric update configuration
     * @returns {Promise<boolean>} True if all components were processed successfully
     * @private
     */
    async _executeLifecycleOperation(operation, componentOrder, metricUpdate = null) {
        this.logInfo(`${operation.charAt(0).toUpperCase() + operation.slice(1)}ing ${this._components.size} components...`);

        const failedComponents = [];
        const operationMethod = operation;

        for (const componentName of componentOrder) {
            const component = this._components.get(componentName);
            if (!component) continue;

            this.logDebug(`${operation.charAt(0).toUpperCase() + operation.slice(1)}ing component: ${componentName}`);

            try {
                const success = await component[operationMethod]();
                if (!success) {
                    failedComponents.push(componentName);
                    this.logError(`Failed to ${operation} component: ${componentName}`);
                } else if (metricUpdate) {
                    this.incrementMetric(metricUpdate.metric);
                }
            } catch (error) {
                failedComponents.push(componentName);
                this.logError(`Exception during ${operation} of component ${componentName}:`, error);
            }
        }

        const success = failedComponents.length === 0;
        const total = componentOrder.length;
        const successful = total - failedComponents.length;

        this._logOperationResult(operation, successful, total, failedComponents.length);
        this._emitLifecycleEvent(operation, total, successful, failedComponents, success);

        return success;
    }

    /**
     * Helper method to log operation results
     * @param {string} operation - The operation name
     * @param {number} successful - Number of successful operations
     * @param {number} total - Total number of operations
     * @param {number} failed - Number of failed operations
     * @private
     */
    _logOperationResult(operation, successful, total, failed) {
        if (failed > 0) {
            this.logInfo(`${operation.charAt(0).toUpperCase() + operation.slice(1)}: ${successful}/${total} ${operation === 'init' ? 'OK' : 'successful'}, ${failed} failed`);
        } else {
            this.logInfo(`All ${total} components ${operation === 'init' ? 'OK' : `${operation}ed successfully`}`);
        }
    }

    /**
     * Helper method to emit lifecycle events
     * @param {string} operation - The operation name
     * @param {number} total - Total number of operations
     * @param {number} successful - Number of successful operations
     * @param {string[]} failedComponents - Names of failed components
     * @param {boolean} success - Whether the operation was successful
     * @private
     */
    _emitLifecycleEvent(operation, total, successful, failedComponents, success) {
        this.emitEvent(`components.${operation}ed`, {
            total,
            successful,
            failed: failedComponents.length,
            failedComponents,
            success
        });
    }

    /**
     * Initializes all registered components in dependency order
     * @returns {Promise<boolean>} True if all components were initialized successfully
     */
    async initializeAll() {
        const startupOrder = this.getStartupOrder();
        return await this._executeLifecycleOperation('initialize', startupOrder, {metric: 'initializeCount'});
    }

    /**
     * Starts all registered components in dependency order
     * @returns {Promise<boolean>} True if all components were started successfully
     */
    async startAll() {
        const startupOrder = this.getStartupOrder();
        return await this._executeLifecycleOperation('start', startupOrder, {metric: 'startCount'});
    }

    /**
     * Stops all registered components in reverse dependency order
     * @returns {Promise<boolean>} True if all components were stopped successfully
     */
    async stopAll() {
        const shutdownOrder = this.getShutdownOrder();
        return await this._executeLifecycleOperation('stop', shutdownOrder, {metric: 'stopCount'});
    }

    /**
     * Disposes all registered components
     * @returns {Promise<boolean>} True if all components were disposed successfully
     */
    async disposeAll() {
        const shutdownOrder = this.getShutdownOrder();
        return await this._executeLifecycleOperation('dispose', shutdownOrder);
    }

    /**
     * Gets metrics for all components
     * @returns {Object} Metrics for all components
     */
    getComponentsMetrics() {
        const allMetrics = {};

        for (const [name, component] of this._components) {
            allMetrics[name] = {
                isInitialized: component.isInitialized,
                isStarted: component.isStarted,
                isDisposed: component.isDisposed,
                metrics: component.getMetrics()
            };
        }

        return allMetrics;
    }

    /**
     * Health check for all components
     * @returns {Object} Health status for all components
     */
    async healthCheck() {
        const healthStatus = {};

        for (const [name, component] of this._components) {
            try {
                // Basic health check - verify component is in expected state
                healthStatus[name] = {
                    isInitialized: component.isInitialized,
                    isStarted: component.isStarted,
                    isDisposed: component.isDisposed,
                    reachable: true,
                    error: null
                };
            } catch (error) {
                healthStatus[name] = {
                    isInitialized: false,
                    isStarted: false,
                    isDisposed: true,
                    reachable: false,
                    error: error.message
                };
            }
        }

        return healthStatus;
    }
}