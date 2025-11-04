/**
 * Time management utility
 */
export class Clock {
    static now() {
        return Date.now();
    }
    
    static since(timestamp) {
        return Date.now() - timestamp;
    }
    
    static elapsed(start, end = this.now()) {
        return end - start;
    }
}