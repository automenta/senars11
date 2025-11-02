/**
 * Message processing pipeline for WebSocket communication
 * Implements elegant architectural patterns for message handling
 */

import { validateMessage } from '../schemas/messages.js';

// Message processor class that handles the pipeline of message processing
class MessageProcessor {
  constructor() {
    this.middleware = [];
    this.errorHandlers = [];
  }

  // Add middleware to the processing pipeline
  use(middlewareFn) {
    this.middleware.push(middlewareFn);
    return this;
  }

  // Add error handler to the pipeline
  onError(errorHandler) {
    this.errorHandlers.push(errorHandler);
    return this;
  }

  // Process a message through the pipeline
  async process(message, context = {}) {
    // Validate message
    const validatedMessage = validateMessage(message);
    if (!validatedMessage) {
      // Handle validation errors
      this.errorHandlers.forEach(handler => {
        try {
          handler(new Error('Message validation failed'), message, context);
        } catch (e) {
          console.error('Error in error handler:', e);
        }
      });
      return { success: false, error: 'Validation failed' };
    }

    let processedMessage = { ...validatedMessage };
    
    try {
      // Run through middleware pipeline
      for (const middleware of this.middleware) {
        processedMessage = await Promise.resolve(middleware(processedMessage, context));
        if (!processedMessage) break; // Middleware can halt the chain
      }
      
      return { success: true, data: processedMessage };
    } catch (error) {
      // Handle processing errors
      this.errorHandlers.forEach(handler => {
        try {
          handler(error, message, context);
        } catch (e) {
          console.error('Error in error handler:', e);
        }
      });
      
      return { success: false, error: error.message };
    }
  }
}

// Create a message processor instance
const createMessageProcessor = () => new MessageProcessor();

// Common message processing utilities
const messageProcessorUtils = {
  // Create a validation middleware
  createValidationMiddleware: (validator = validateMessage) => (message, context) => {
    const validated = validator(message);
    if (!validated) {
      throw new Error(`Message validation failed for type: ${message?.type}`);
    }
    return validated;
  },

  // Create a logging middleware
  createLoggingMiddleware: (logger = console.log) => (message, context) => {
    logger(`Processing message: ${message.type}`, {
      timestamp: Date.now(),
      ...context
    });
    return message;
  },

  // Create a transformation middleware
  createTransformMiddleware: (transformer) => (message, context) => {
    return transformer(message, context);
  },

  // Create a rate limiting middleware
  createRateLimitMiddleware: (maxPerInterval = 100, intervalMs = 1000) => {
    const messageCounts = new Map();
    
    return (message, context) => {
      const now = Date.now();
      const type = message.type;
      
      if (!messageCounts.has(type)) {
        messageCounts.set(type, []);
      }
      
      const counts = messageCounts.get(type);
      const recentCount = counts.filter(time => now - time < intervalMs).length;
      
      if (recentCount >= maxPerInterval) {
        throw new Error(`Rate limit exceeded for message type: ${type}`);
      }
      
      counts.push(now);
      // Clean up old timestamps
      messageCounts.set(type, counts.filter(time => now - time < intervalMs));
      
      return message;
    };
  },

  // Create a duplicate detection middleware
  createDuplicateDetectionMiddleware: (windowMs = 5000) => {
    const seenMessages = new Map();
    
    return (message, context) => {
      // Create a unique key based on message type and payload
      const key = `${message.type}_${JSON.stringify(message.payload)}`;
      const now = Date.now();
      
      if (seenMessages.has(key)) {
        const lastSeen = seenMessages.get(key);
        if (now - lastSeen < windowMs) {
          // This is a duplicate within the window
          return null; // Skip processing
        }
      }
      
      seenMessages.set(key, now);
      // Clean up old entries
      for (const [k, time] of seenMessages) {
        if (now - time >= windowMs) {
          seenMessages.delete(k);
        }
      }
      
      return message;
    };
  }
};

// Message routing utilities with centralized route management
const messageRouter = {
  // Create a message router that maps types to handlers
  createRouter: (routes = {}) => {
    const router = {
      routes,
      
      addRoute: (type, handler) => {
        router.routes[type] = handler;
        return router;
      },
      
      handle: (message, context) => {
        const handler = router.routes[message.type];
        if (handler) {
          return handler(message, context);
        } else {
          console.warn(`No handler for message type: ${message.type}`);
          return null;
        }
      }
    };
    
    return router;
  }
};

export {
  MessageProcessor,
  createMessageProcessor,
  messageProcessorUtils,
  messageRouter
};

export default {
  MessageProcessor,
  createMessageProcessor,
  messageProcessorUtils,
  messageRouter
};