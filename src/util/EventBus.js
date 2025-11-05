import mitt from 'mitt';
import {TraceId} from './TraceId.js';

export class EventBus {
    constructor() {
        this._emitter = mitt();
        this._middleware = [];
        this._errorHandlers = new Set();
        this._stats = {eventsEmitted: 0, eventsHandled: 0, errors: 0};
        this._enabled = true;
        this._maxListeners = 10; // Prevent memory leaks
    }
    
    on(eventName, callback) {
        // Check for potential memory leak
        const currentCount = this.listenerCount(eventName);
        if (currentCount >= this._maxListeners) {
            console.warn(`Possible memory leak detected: ${currentCount} listeners for event "${eventName}"`);
        }
        
        this._emitter.on(eventName, callback);
        return this;
    }
    
    once(eventName, callback) {
        const onceWrapper = (data) => {
            this.off(eventName, onceWrapper);
            callback(data);
        };
        return this.on(eventName, onceWrapper);
    }
    
    off(eventName, callback) {
        this._emitter.off(eventName, callback);
        return this;
    }
    
    use(middleware) {
        if (typeof middleware !== 'function') throw new Error('Middleware must be a function');
        this._middleware.push(middleware);
        return this;
    }
    
    removeMiddleware(middleware) {
        const index = this._middleware.indexOf(middleware);
        if (index !== -1) this._middleware.splice(index, 1);
        return this;
    }
    
    onError(handler) {
        if (typeof handler === 'function') this._errorHandlers.add(handler);
        return this;
    }
    
    async emit(eventName, data = {}, options = {}) {
        if (!this._enabled) return;
        
        this._stats.eventsEmitted++;
        const traceId = options.traceId || TraceId.generate();
        let processedData = {...data, eventName, traceId};
        
        // Process middleware in parallel where possible
        for (const middleware of this._middleware) {
            try {
                // Allow middleware to be either sync or async
                const result = middleware(processedData);
                processedData = result instanceof Promise ? await result : result;
                
                // Allow middleware to cancel event processing by returning null
                if (processedData === null) return;
            } catch (error) {
                return this._handleError('middleware', error, {eventName, data, traceId});
            }
        }
        
        // Emit event
        try {
            this._emitter.emit(eventName, processedData);
            this._stats.eventsHandled++;
        } catch (error) {
            this._stats.errors++;
            this._handleError('listener', error, {eventName, data, traceId});
        }
    }
    
    _handleError(type, error, context) {
        // Process error handlers
        const errorHandlers = [...this._errorHandlers]; // Create snapshot to prevent modification during iteration
        for (const handler of errorHandlers) {
            try {
                handler(error, type, context);
            } catch (handlerError) {
                console.error('Error in EventBus error handler:', handlerError);
            }
        }
        
        // Default error logging
        if (errorHandlers.length === 0) {
            console.error(`EventBus error in ${type}:`, error, context);
        }
    }
    
    getStats() {
        return {...this._stats};
    }
    
    clear() {
        this._emitter.all.clear();
        this._middleware = [];
        this._errorHandlers.clear();
        this._stats = {eventsEmitted: 0, eventsHandled: 0, errors: 0};
    }
    
    enable() {
        this._enabled = true;
    }
    
    disable() {
        this._enabled = false;
    }
    
    isEnabled() {
        return this._enabled;
    }
    
    hasListeners(eventName) {
        return !!this._emitter.all.get(eventName)?.size;
    }
    
    listenerCount(eventName) {
        return this._emitter.all.get(eventName)?.size || 0;
    }
    
    // Added utility methods for better control
    setMaxListeners(maxListeners) {
        if (typeof maxListeners === 'number' && maxListeners > 0) {
            this._maxListeners = maxListeners;
        }
        return this;
    }
    
    getMaxListeners() {
        return this._maxListeners;
    }
    
    removeAllListeners(eventName) {
        if (eventName) {
            this._emitter.all.delete(eventName);
        } else {
            this._emitter.all.clear();
        }
        return this;
    }
}
