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
        // More robust test environment detection
        return (
            (typeof process !== 'undefined' && (
                process.env.NODE_ENV === 'test' ||
                process.env.JEST_WORKER_ID !== undefined ||
                process.env.VITEST === 'true'
            )) ||
            (typeof window !== 'undefined' && (
                window.__JEST__ ||
                window.__VITEST__
            )) ||
            (typeof globalThis !== 'undefined' && (
                globalThis.__JEST__ ||
                globalThis.__VITEST__
            )) ||
            (typeof jest !== 'undefined' && jest.version) ||
            (typeof vi !== 'undefined' && vi.version)
        );
    }

    log(level, message, data = {}) {
        if (this.silent) return;

        const consoleMethod = console[level] || console.log;
        const prefixedMsg = `[${level.toUpperCase()}] ${message}`;

        // Improved mock detection
        if (this.isTestEnv) {
            const hasMock = consoleMethod._isMockFunction ||
                (consoleMethod.mock && Array.isArray(consoleMethod.mock.calls)) ||
                consoleMethod.__isMockFunction;

            if (hasMock) {
                consoleMethod(prefixedMsg, data);
            }
            // In test env, we still want to see logs in console if not mocked
            else if (process.env.SHOW_LOGS_IN_TESTS) {
                consoleMethod(prefixedMsg, data);
            }
        } else {
            consoleMethod(prefixedMsg, data);
        }
    }

    shouldLog(level) {
        const levelValue = this.levels[level.toUpperCase()] ?? this.levels.INFO;
        const isDebugAllowed = level !== 'debug' ||
            (typeof process !== 'undefined' &&
                (process.env.NODE_ENV === 'development' || process.env.DEBUG));

        const isInfoAllowed = level !== 'info' || !this.isTestEnv ||
            (typeof process !== 'undefined' && process.env.SHOW_INFO_IN_TESTS);

        return !this.silent &&
            levelValue <= this.currentLevel &&
            isDebugAllowed &&
            isInfoAllowed;
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
        this.shouldLog('error') && this.log('error', msg,
            this.isTestEnv ? {message: data?.message || msg} : data);
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

    // Added utility methods for better control
    enable() {
        this.silent = false;
    }

    disable() {
        this.silent = true;
    }
}

const logger = new Logger();
export {logger as Logger};