export class LoggingSubscriber {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = {
            level: options.level || 'info',
            logAllEvents: options.logAllEvents !== false,
            eventFilter: options.eventFilter || null,
            logger: options.logger || console
        };

        this.levels = {debug: 0, info: 1, warn: 2, error: 3};
        this.currentLogLevel = this.levels[this.options.level] || this.levels.info;
        this.stopped = false;
        this.boundMiddleware = this._loggingMiddleware.bind(this);
    }

    start() {
        this.eventBus.use(this.boundMiddleware);
    }

    stop() {
        this.eventBus.removeMiddleware(this.boundMiddleware);
        this.stopped = true;
    }

    _loggingMiddleware(eventData) {
        if (!this.stopped && this._shouldLogEvent(eventData)) {
            const logEntry = this._formatLogEntry(eventData);
            this._outputLog(logEntry);
        }
        return eventData;
    }

    _shouldLogEvent(eventData) {
        return this.options.logAllEvents &&
            (!this.options.eventFilter || this.options.eventFilter(eventData));
    }

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

    _getLogLevel(eventName) {
        return eventName.includes('error') ? 'error' :
            eventName.includes('warn') || eventName.includes('warning') ? 'warn' :
                eventName.includes('debug') ? 'debug' : 'info';
    }

    _sanitizeEventData(eventData) {
        const {eventName, timestamp, component, traceId, ...sanitized} = eventData;
        return sanitized;
    }

    _outputLog(logEntry) {
        this.levels[logEntry.level] >= this.currentLogLevel &&
        this.options.logger.log(JSON.stringify(logEntry));
    }
}