import mitt from 'mitt';
import {TraceId} from './TraceId.js';

export class EventBus {
    constructor() {
        this._emitter = mitt();
        this._middleware = [];
        this._enabled = true;
    }

    on(eventName, callback) {
        this._emitter.on(eventName, callback);
        return this;
    }

    off(eventName, callback) {
        this._emitter.off(eventName, callback);
        return this;
    }

    use(middleware) {
        this._middleware.push(middleware);
        return this;
    }

    async emit(eventName, data = {}, options = {}) {
        if (!this._enabled) return;

        const traceId = options.traceId || TraceId.generate();
        let processedData = {...data, eventName, traceId};

        for (const middleware of this._middleware) {
            try {
                const result = await middleware(processedData);
                if (result === null) return; // Cancel
                processedData = result;
            } catch (error) {
                console.error('EventBus Middleware Error:', error);
            }
        }

        try {
            this._emitter.emit(eventName, processedData);
        } catch (error) {
            console.error('EventBus Emit Error:', error);
        }
    }
}
