/**
 * Event bus subscriber for structured logging
 * Automatically logs events with appropriate formatting and filtering
 */
export class LoggingSubscriber {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = {
            level: options.level || 'info',
            logAllEvents: options.logAllEvents !== false,
            eventFilter: options.eventFilter || null,
            logger: options.logger || console
        };
        
        this.levels = {'debug': 0, 'info': 1, 'warn': 2, 'error': 3};
        this.currentLogLevel = this.levels[this.options.level] || this.levels.info;
        this.stopped = false;
        this.boundMiddleware = this._loggingMiddleware.bind(this);
    }
    
    /**
     * Start listening to events
     */
    start() {
        this.eventBus.use(this.boundMiddleware);
    }
    
    /**
     * Stop listening to events
     */
    stop() {
        this.eventBus.removeMiddleware(this.boundMiddleware);
        this.stopped = true;
    }
    
    /**
     * Middleware function that processes events for logging
     * @param {Object} eventData - Event data to process
     * @returns {Object} Processed event data
     * @private
     */
    _loggingMiddleware(eventData) {
        if (!this.stopped && this._shouldLogEvent(eventData)) {
            const logEntry = this._formatLogEntry(eventData);
            this._outputLog(logEntry);
        }
        return eventData;
    }
    
    /**
     * Determine if an event should be logged based on filters
     * @param {Object} eventData - Event data to evaluate
     * @returns {boolean} Whether the event should be logged
     * @private
     */
    _shouldLogEvent(eventData) {
        if (!this.options.logAllEvents) return false;
        if (this.options.eventFilter && typeof this.options.eventFilter === 'function') {
            return this.options.eventFilter(eventData);
        }
        return true;
    }
    
    /**
     * Format event data into a structured log entry
     * @param {Object} eventData - Raw event data
     * @returns {Object} Formatted log entry
     * @private
     */
    _formatLogEntry(eventData) {
        return {
            timestamp: eventData.timestamp || Date.now(),
            level: this._getLogLevel(eventData.eventName),
            event: eventData.eventName,
            traceId: eventData.traceId,
            component: eventData.component,
            data: this._sanitizeEventData(eventData),
            source: 'eventbus'
        };
    }
    
    /**
     * Determine log level from event name
     * @param {string} eventName - Name of the event
     * @returns {string} Log level
     * @private
     */
    _getLogLevel(eventName) {
        if (eventName.includes('error')) return 'error';
        if (eventName.includes('warn') || eventName.includes('warning')) return 'warn';
        if (eventName.includes('debug')) return 'debug';
        return 'info';
    }
    
    /**
     * Remove internal fields from event data for cleaner logging
     * @param {Object} eventData - Raw event data
     * @returns {Object} Sanitized event data
     * @private
     */
    _sanitizeEventData(eventData) {
        const sanitized = {...eventData};
        delete sanitized.eventName;
        delete sanitized.timestamp;
        delete sanitized.component;
        delete sanitized.traceId;
        return sanitized;
    }
    
    /**
     * Output log entry using configured logger
     * @param {Object} logEntry - Formatted log entry
     * @private
     */
    _outputLog(logEntry) {
        if (this.levels[logEntry.level] >= this.currentLogLevel) {
            this.options.logger.log(JSON.stringify(logEntry));
        }
    }
}