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

    get name() { return this._name; }
    get config() { return this._config; }
    get logger() { return this._logger; }
    get eventBus() { return this._eventBus; }
    get metrics() { return this._metrics; }
    get isInitialized() { return this._initialized; }
    get isStarted() { return this._started; }
    get isDisposed() { return this._disposed; }
    get isRunning() { return this._started && !this._disposed; }
    get uptime() { return this._startTime ? Date.now() - this._startTime : 0; }

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
        if (!this._validationSchema) return config;

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

    async initialize() {
        if (this._initialized) {
            this.logWarn('Component already initialized');
            return true;
        }

        try {
            await this._initialize();
            this._initialized = true;

            // Emit initialization event
            this._eventBus.emit(`${this._name}.initialized`, {
                timestamp: Date.now(),
                component: this._name
            });

            this._logger.info(`${this._name} initialized`);
            this.incrementMetric('initializeCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to initialize component', error);
            return false;
        }
    }

    async start() {
        if (!this._initialized) {
            this._logger.error('Cannot start uninitialized component');
            return false;
        }

        if (this._started) {
            this.logWarn('Component already started');
            return true;
        }

        try {
            this._startTime = Date.now();
            await this._start();
            this._started = true;

            // Emit start event
            this._eventBus.emit(`${this._name}.started`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this._logger.info(`${this._name} started`);
            this.incrementMetric('startCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to start component', error);
            return false;
        }
    }

    async stop() {
        if (!this._started) {
            this.logWarn('Component not started');
            return true;
        }

        try {
            await this._stop();
            this._started = false;

            // Emit stop event
            this._eventBus.emit(`${this._name}.stopped`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this._logger.info(`${this._name} stopped`);
            this.incrementMetric('stopCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to stop component', error);
            return false;
        }
    }

    async dispose() {
        if (this._disposed) {
            this.logWarn('Component already disposed');
            return true;
        }

        try {
            // Stop if running
            if (this._started) await this.stop();

            await this._dispose();
            this._disposed = true;

            // Emit dispose event
            this._eventBus.emit(`${this._name}.disposed`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this._logger.info(`${this._name} disposed`);
            return true;
        } catch (error) {
            this._logger.error('Failed to dispose component', error);
            return false;
        }
    }

    async _initialize() { /* Default implementation - can be overridden */ }
    async _start() { /* Default implementation - can be overridden */ }
    async _stop() { /* Default implementation - can be overridden */ }
    async _dispose() { /* Default implementation - can be overridden */ }

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

    getMetric(key) { return this._metrics.get(key); }

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

    onEvent(event, handler) { this._eventBus.on(event, handler); }
    offEvent(event, handler) { this._eventBus.off(event, handler); }
}