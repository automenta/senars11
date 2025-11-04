import mitt from 'mitt';
import {TraceId} from './TraceId.js';

export class EventBus {
    constructor() {
        this._emitter = mitt();
        this._middleware = [];
        this._errorHandlers = new Set();
        this._stats = {eventsEmitted: 0, eventsHandled: 0, errors: 0};
        this._enabled = true;
    }
    
    on(eventName, callback) {
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
        
        // Process middleware
        for (const middleware of this._middleware) {
            try {
                processedData = await middleware(processedData);
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
        for (const handler of this._errorHandlers) {
            try {
                handler(error, type, context);
            } catch (handlerError) {
                console.error('Error in EventBus error handler:', handlerError);
            }
        }
        
        // Default error logging
        if (this._errorHandlers.size === 0) {
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
}
