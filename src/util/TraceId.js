import {v4 as uuidv4} from 'uuid';

/**
 * Trace ID utility for distributed tracing
 */
export class TraceId {
    static generate() {
        return uuidv4();
    }
    
    static ensure(traceId) {
        return traceId || this.generate();
    }
    
    static isValid(traceId) {
        return typeof traceId === 'string' && traceId.length > 0;
    }
}