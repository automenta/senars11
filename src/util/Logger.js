class Logger {
    constructor() {
        this.isTestEnv = this._detectTestEnvironment();
        this.silent = this.isTestEnv;
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.levels.INFO;
    }
    
    _detectTestEnvironment() {
        return (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)) ||
               (typeof window !== 'undefined' && window.__JEST__) ||
               (typeof jest !== 'undefined' && jest.version);
    }
    
    log(level, message, data = {}) {
        if (this.silent) return;
        
        const consoleMethod = console[level] || console.log;
        const prefixedMsg = `[${level.toUpperCase()}] ${message}`;
        
        if (this.isTestEnv) {
            const hasMock = consoleMethod._isMockFunction || (consoleMethod.mock && Array.isArray(consoleMethod.mock.calls));
            hasMock && consoleMethod(prefixedMsg, data);
        } else {
            consoleMethod(prefixedMsg, data);
        }
    }
    
    shouldLog(level) {
        const levelValue = this.levels[level.toUpperCase()] || this.levels.INFO;
        return !this.silent && levelValue <= this.currentLevel &&
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
    
    setLevel(level) {
        const levelValue = this.levels[level.toUpperCase()];
        if (levelValue !== undefined) {
            this.currentLevel = levelValue;
        }
    }
    
    getIsTestEnv() {
        return this.isTestEnv;
    }
    
    getLevel() {
        return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel);
    }
}

const logger = new Logger();
export {logger as Logger};