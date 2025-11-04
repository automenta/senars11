/**
 * Simple clock utility for time management
 */
export class Clock {
    static now() {
        return Date.now();
    }
    
    static since(timestamp) {
        return Date.now() - timestamp;
    }
}