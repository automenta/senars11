import {Logger} from '../util/Logger.js';
import {EventBus} from '../util/EventBus.js';
import {createEventPayload} from './IntrospectionEvents.js';

export class BaseComponent {
    constructor(config = {}, name = 'BaseComponent', eventBus = null, validationSchema = null) {
        this._config = config;
        this._name = name;
        this._logger = Logger;  // Logger is a singleton instance, not a class to instantiate
        this._eventBus = eventBus || new EventBus();
        this._metrics = new Map();
        this._validationSchema = validationSchema;
        this._initialized = false;
        this._started = false;
        this._disposed = false;
        this._startTime = null;

        // Validate configuration if schema provided
        if (this._validationSchema) {
            this._validateConfig(config);
        }

        // Initialize common metrics
        this._initializeMetrics();
    }

    get name() {
        return this._name;
    }

    get config() {
        return this._config;
    }

    get logger() {
        return this._logger;
    }

    get eventBus() {
        return this._eventBus;
    }

    get metrics() {
        return this._metrics;
    }

    get isInitialized() {
        return this._initialized;
    }

    get isStarted() {
        return this._started;
    }

    get isDisposed() {
        return this._disposed;
    }

    get isRunning() {
        return this._started && !this._disposed;
    }

    get uptime() {
        return this._startTime ? Date.now() - this._startTime : 0;
    }

    _validateConfig(config) {
        const schema = typeof this._validationSchema === 'function'
            ? this._validationSchema()
            : this._validationSchema;

        const validationResult = schema.validate(config, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed for ${this._name}: ${validationResult.error.message}`);
        }

        return validationResult.value;
    }

    validateConfig(config = this._config) {
        return this._validationSchema ? this._validateConfig(config) : config;
    }

    async _executeLifecycleOperation(operation, checkCondition, action, conditionMessage, metricName = null) {
        if (checkCondition) {
            if (operation === 'start' && !this._initialized) {
                this._logger.error('Cannot start uninitialized component');
                return false;
            }
            if (operation === 'stop' && !this._started) {
                this.logWarn('Component not started');
                return true;
            }
            if (operation === 'initialize' && this._initialized) {
                this.logWarn('Component already initialized');
                return true;
            }
            if (operation === 'dispose' && this._disposed) {
                this.logWarn('Component already disposed');
                return true;
            }
        }

        try {
            if (operation === 'start') this._startTime = Date.now();
            
            await action();
            
            // Update state after successful operation
            if (operation === 'initialize') this._initialized = true;
            if (operation === 'start') this._started = true;
            if (operation === 'stop') this._started = false;
            if (operation === 'dispose') this._disposed = true;

            // Emit the appropriate event
            this._emitLifecycleEvent(operation);

            // Log and update metrics
            this._logger.info(`${this._name} ${operation}${operation === 'initialize' ? 'd' : operation === 'start' ? 'ed' : operation === 'stop' ? 'ped' : 'd'}`);
            if (metricName) this.incrementMetric(metricName);
            return true;
        } catch (error) {
            this._logger.error(`Failed to ${operation} component`, error);
            return false;
        }
    }

    /**
     * Emits a lifecycle event for the component
     * @param {string} operation - The operation that was performed
     * @private
     */
    _emitLifecycleEvent(operation) {
        const eventPayload = {
            timestamp: Date.now(),
            component: this._name,
            ...(operation !== 'initialize' && operation !== 'dispose' && { uptime: this.uptime })
        };
        this._eventBus.emit(`${this._name}.${operation}d`, eventPayload);
    }

    async initialize() {
        return await this._executeLifecycleOperation(
            'initialize', true, () => this._initialize(), '', 'initializeCount'
        );
    }

    async start() {
        return await this._executeLifecycleOperation(
            'start', true, () => this._start(), '', 'startCount'
        );
    }

    async stop() {
        return await this._executeLifecycleOperation(
            'stop', true, () => this._stop(), '', 'stopCount'
        );
    }

    async dispose() {
        if (this._disposed) {
            this.logWarn('Component already disposed');
            return true;
        }

        try {
            // Stop if running
            if (this._started) await this.stop();

            await this._executeLifecycleOperation(
                'dispose',
                false, // no condition check needed for dispose
                () => this._dispose(),
                ''
            );
            return true;
        } catch (error) {
            this._logger.error('Failed to dispose component', error);
            return false;
        }
    }

    async _initialize() { /* Default implementation - can be overridden */
    }

    async _start() { /* Default implementation - can be overridden */
    }

    async _stop() { /* Default implementation - can be overridden */
    }

    async _dispose() { /* Default implementation - can be overridden */
    }

    _initializeMetrics() {
        this._metrics.set('initializeCount', 0);
        this._metrics.set('startCount', 0);
        this._metrics.set('stopCount', 0);
        this._metrics.set('errorCount', 0);
        this._metrics.set('uptime', 0);
        this._metrics.set('lastActivity', Date.now());
    }

    updateMetric(key, value) {
        this._metrics.set(key, value);
        this._metrics.set('lastActivity', Date.now());
    }

    incrementMetric(key, increment = 1) {
        const currentValue = this._metrics.get(key) || 0;
        this._metrics.set(key, currentValue + increment);
        this._metrics.set('lastActivity', Date.now());
    }

    getMetric(key) {
        return this._metrics.get(key);
    }

    getMetrics() {
        return {
            ...Object.fromEntries(this._metrics),
            uptime: this.uptime,
            isRunning: this.isRunning
        };
    }

    logInfo(message, metadata) {
        this._logger.info(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    logWarn(message, metadata) {
        this._logger.warn(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    logError(message, metadata) {
        this._logger.error(message, metadata);
        this.incrementMetric('errorCount');
    }

    logDebug(message, metadata) {
        this._logger.debug(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    emitEvent(event, data, options = {}) {
        this._eventBus.emit(event, {
            timestamp: Date.now(),
            component: this._name,
            uptime: this.uptime,
            ...data
        }, options);
    }

    _emitIntrospectionEvent(eventName, payload) {
        if (!this._config.introspection?.enabled) {
            return;
        }

        this._eventBus.emit(eventName, createEventPayload(this._name, payload));
    }

    onEvent(event, handler) {
        this._eventBus.on(event, handler);
    }

    offEvent(event, handler) {
        this._eventBus.off(event, handler);
    }
}