/**
 * Logger utility for consistent error handling and debugging
 */
class Logger {
    static log(level, message, context = null) {
        const timestamp = new Date().toISOString();
        const logEntry = context
            ? `[${timestamp}] ${level}: ${message} | Context: ${JSON.stringify(context)}`
            : `[${timestamp}] ${level}: ${message}`;

        if (level === 'ERROR') {
            console.error(logEntry);
        } else if (level === 'WARN') {
            console.warn(logEntry);
        } else if (level === 'DEBUG') {
            // Only log debug messages in development
            if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
                console.debug(logEntry);
            }
        } else {
            console.log(logEntry);
        }
    }

    static error(message, context = null) {
        this.log('ERROR', message, context);
    }

    static warn(message, context = null) {
        this.log('WARN', message, context);
    }

    static info(message, context = null) {
        this.log('INFO', message, context);
    }

    static debug(message, context = null) {
        this.log('DEBUG', message, context);
    }
}

export default Logger;