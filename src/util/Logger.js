class Logger {
    constructor() {
        this.isTestEnv = this._detectTestEnvironment();
        this.silent = this.isTestEnv;
    }

    _detectTestEnvironment() {
        return (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)) ||
               (typeof window !== 'undefined' && window.__JEST__) ||
               (typeof jest !== 'undefined' && jest.version);
    }

    log(level, message, data = {}) {
        if (this.silent) return;

        const consoleMethod = console[level] || console.log;
        const logWithPrefix = (msg, d) => consoleMethod(`[${level.toUpperCase()}]`, msg, d);

        if (this.isTestEnv) {
            const hasMock = consoleMethod._isMockFunction || (consoleMethod.mock && Array.isArray(consoleMethod.mock.calls));
            hasMock && logWithPrefix(message, data);
        } else {
            logWithPrefix(message, data);
        }
    }

    shouldLog(level) {
        return !this.silent && 
               (level !== 'debug' || (process.env.NODE_ENV === 'development' || process.env.DEBUG)) &&
               (level !== 'info' || !this.isTestEnv);
    }

    debug(msg, data) {
        this.shouldLog('debug') && this.log('debug', msg, data);
    }

    info(msg, data) {
        this.shouldLog('info') && this.log('info', msg, data);
    }

    warn(msg, data) {
        this.shouldLog('warn') && this.log('warn', msg, data);
    }

    error(msg, data) {
        this.shouldLog('error') && this.log('error', msg, this.isTestEnv ? {message: data?.message || msg} : data);
    }

    setSilent(silent) {
        this.silent = silent;
    }

    getIsTestEnv() {
        return this.isTestEnv;
    }
}

const logger = new Logger();
export {logger as Logger};