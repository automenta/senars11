import {Logger} from '../../../util/Logger.js';

export class BaseAnalyzer {
    constructor(options, verbose) {
        this.options = options;
        this.verbose = verbose;
    }

    async safeAnalyze(analysisFunction, errorMessage) {
        try {
            return await analysisFunction();
        } catch (error) {
            if (this.verbose) Logger.error(`❌ ${errorMessage}:`, {message: error.message});
            return {
                status: 'error',
                error: `${errorMessage}: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    log(message, level = 'info', meta = {}) {
        if (!this.verbose) return;

        const timestamp = new Date().toISOString();
        const levelEmojis = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            debug: '🔍',
            success: '✅'
        };

        const emoji = levelEmojis[level] || 'ℹ️';
        const fullMessage = `${emoji} [${timestamp}] ${message}`;

        if (Object.keys(meta).length > 0) {
            Logger.info(fullMessage, meta);
        } else {
            Logger.info(fullMessage);
        }
    }

    logError(message, error = null) {
        const errorInfo = error ? {
            message: error.message,
            stack: this.options?.debug ? error.stack : undefined
        } : null;

        this.log(message, 'error', errorInfo);
    }
}