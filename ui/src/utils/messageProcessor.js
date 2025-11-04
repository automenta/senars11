import {validateMessage, validateMessageDetailed} from '../schemas/messages.js';

class MessageProcessor {
    constructor() {
        this.middleware = [];
        this.errorHandlers = [];
    }

    use(middlewareFn) {
        this.middleware.push(middlewareFn);
        return this;
    }

    onError(errorHandler) {
        this.errorHandlers.push(errorHandler);
        return this;
    }

    async process(message, context = {}) {
        const validation = validateMessageDetailed(message);
        if (!validation.success) {
            this.errorHandlers.forEach(handler => {
                try {
                    handler(new Error(`Message validation failed: ${validation.errorMessage}`), message, context);
                } catch (e) {
                    console.error('Error in error handler:', e);
                }
            });
            return {success: false, error: validation.errorMessage || 'Validation failed'};
        }

        let processedMessage = {...validation.data};

        try {
            for (const middleware of this.middleware) {
                processedMessage = await Promise.resolve(middleware(processedMessage, context));
                if (!processedMessage) break;
            }

            return {success: true, data: processedMessage};
        } catch (error) {
            this.errorHandlers.forEach(handler => {
                try {
                    handler(error, message, context);
                } catch (e) {
                    console.error('Error in error handler:', e);
                }
            });

            return {success: false, error: error.message};
        }
    }
}

const createMessageProcessor = () => new MessageProcessor();

const messageProcessorUtils = {
    createValidationMiddleware: (validator = validateMessage) => (message) => {
        const validated = validator(message);
        if (!validated) throw new Error(`Message validation failed for type: ${message?.type}`);
        return validated;
    },

    createLoggingMiddleware: (logger = console.log) => (message, context) => {
        logger(`Processing message: ${message.type}`, {timestamp: Date.now(), ...context});
        return message;
    },

    createTransformMiddleware: (transformer) => (message, context) => transformer(message, context),

    createRateLimitMiddleware: (maxPerInterval = 100, intervalMs = 1000) => {
        const messageCounts = new Map();

        return (message) => {
            const now = Date.now();
            const type = message.type;
            const counts = messageCounts.get(type) || [];
            
            const recentCount = counts.filter(time => now - time < intervalMs).length;
            if (recentCount >= maxPerInterval) {
                throw new Error(`Rate limit exceeded for message type: ${type}`);
            }
            
            messageCounts.set(type, [...counts, now].filter(time => now - time < intervalMs));
            return message;
        };
    },

    createDuplicateDetectionMiddleware: (windowMs = 5000) => {
        const seenMessages = new Map();

        return (message) => {
            const key = `${message.type}_${JSON.stringify(message.payload)}`;
            const now = Date.now();
            const lastSeen = seenMessages.get(key);
            
            if (lastSeen && now - lastSeen < windowMs) return null;
            
            seenMessages.set(key, now);
            for (const [k, time] of seenMessages) {
                if (now - time >= windowMs) seenMessages.delete(k);
            }
            
            return message;
        };
    },

    createConditionalMiddleware: (condition, trueMiddleware, falseMiddleware = null) =>
        async (message, context) => {
            if (condition(message, context)) {
                return await Promise.resolve(trueMiddleware(message, context));
            } else if (falseMiddleware) {
                return await Promise.resolve(falseMiddleware(message, context));
            }
            return message;
        },

    createFilterMiddleware: (filterFn) => (message, context) =>
        filterFn(message, context) ? message : null,

    createCompositeMiddleware: (middlewares) => async (message, context) => {
        let processedMessage = message;
        for (const middleware of middlewares) {
            processedMessage = await Promise.resolve(middleware(processedMessage, context));
            if (processedMessage === null) break;
        }
        return processedMessage;
    }
};

const messageRouter = {
    createRouter: (routes = {}) => ({
        routes,
        addRoute(type, handler) {
            this.routes[type] = handler;
            return this;
        },
        handle(message, context) {
            const handler = this.routes[message.type];
            if (handler) return handler(message, context);
            console.debug(`No handler for message type: ${message.type}`);
            return null;
        }
    })
};

export {MessageProcessor, createMessageProcessor, messageProcessorUtils, messageRouter};
export default {MessageProcessor, createMessageProcessor, messageProcessorUtils, messageRouter};