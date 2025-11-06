/**
 * Time management utility with additional time conversion and formatting functions
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

    // Additional time utility functions
    static secondsSince(timestamp) {
        return this.since(timestamp) / 1000;
    }

    static minutesSince(timestamp) {
        return this.secondsSince(timestamp) / 60;
    }

    static hoursSince(timestamp) {
        return this.minutesSince(timestamp) / 60;
    }

    static daysSince(timestamp) {
        return this.hoursSince(timestamp) / 24;
    }

    static formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
        return `${(ms / 3600000).toFixed(2)}h`;
    }

    static formatTimestamp(timestamp, options = {}) {
        const date = new Date(timestamp);
        const {showMilliseconds = false, utc = false} = options;

        const formatOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            ...(utc ? {timeZone: 'UTC'} : {})
        };

        let formatted = date.toLocaleString(undefined, formatOptions);
        if (showMilliseconds) {
            formatted += `.${date.getMilliseconds().toString().padStart(3, '0')}`;
        }

        return formatted;
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // High-resolution timing for performance measurements
    static hrtime() {
        if (typeof process !== 'undefined' && process.hrtime) {
            const hr = process.hrtime();
            return hr[0] * 1000 + hr[1] / 1000000; // Convert to milliseconds
        }
        return this.now(); // Fallback to Date.now()
    }

    static hrElapsed(start, end = this.hrtime()) {
        return end - start;
    }
}