export class SoftwareAnalyzerConfig {
    constructor(options = {}) {
        this.defaults = {
            all: true,
            verbose: false,
            summaryOnly: false,
            slowest: false,
            timeout: 180000, // 3 minutes default timeout
            cacheEnabled: true,
            cacheTTL: 600000, // 10 minutes default cache time
            maxResultSize: 10000, // Maximum number of results to store
            debug: false,
            analyzeConcurrency: 1 // Number of concurrent analyses (1 = sequential)
        };

        // Merge options with defaults
        this.settings = {...this.defaults, ...options};

        // Validate configuration
        this.validate();
    }

    validate() {
        // Validate timeout
        if (typeof this.settings.timeout !== 'number' || this.settings.timeout <= 0) {
            this.settings.timeout = this.defaults.timeout;
        }

        // Validate cache settings
        if (typeof this.settings.cacheTTL !== 'number' || this.settings.cacheTTL <= 0) {
            this.settings.cacheTTL = this.defaults.cacheTTL;
        }

        // Validate concurrency
        if (typeof this.settings.analyzeConcurrency !== 'number' || this.settings.analyzeConcurrency < 1) {
            this.settings.analyzeConcurrency = this.defaults.analyzeConcurrency;
        }
    }

    update(options = {}) {
        this.settings = {...this.settings, ...options};
        this.validate();
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.validate();
    }

    getAll() {
        return {...this.settings};
    }
}