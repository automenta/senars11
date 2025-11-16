import {BaseComponent} from '../util/BaseComponent.js';
import {Metrics} from '../util/Metrics.js';
import {ProviderRegistry} from './ProviderRegistry.js';
import {ModelSelector} from './ModelSelector.js';
import {NarseseTranslator} from './NarseseTranslator.js';
import {CircuitBreaker} from '../util/CircuitBreaker.js';

export class LM extends BaseComponent {
    constructor(config = {}, eventBus = null) {
        super(config, 'LM', eventBus);

        this.providers = new ProviderRegistry();
        this.modelSelector = new ModelSelector(this.providers);
        this.narseseTranslator = new NarseseTranslator();
        this.circuitBreaker = new CircuitBreaker(this._getCircuitBreakerConfig());
        this.lmMetrics = new Metrics();
        this.activeWorkflows = new Map();
        this.lmStats = {
            totalCalls: 0,
            totalTokens: 0,
            avgResponseTime: 0,
            providerUsage: new Map()
        };
        // Don't freeze during construction, freeze after initialization if needed
        // Object.freeze(this);
    }

    get config() {
        return {...this._config};
    }

    get metrics() {
        return this.lmMetrics;
    }

    _getCircuitBreakerConfig() {
        const cbConfig = this.config.circuitBreaker || {};
        return {
            failureThreshold: cbConfig.failureThreshold || 5,
            timeout: cbConfig.timeout || 60000,
            resetTimeout: cbConfig.resetTimeout || 30000
        };
    }

    async _initialize() {
        if (this.lmMetrics.initialize) {
            await this.lmMetrics.initialize(this.config.metrics || {});
        }

        this.logInfo('LM component initialized', {
            config: Object.keys(this.config),
            providerCount: this.providers.size
        });
    }

    registerProvider(id, provider) {
        this.providers.register(id, provider);
        this.logInfo('Provider registered', {
            providerId: id,
            default: id === this.providers.defaultProviderId
        });
        return this;
    }

    _getProvider(providerId = null) {
        const id = providerId || this.providers.defaultProviderId;
        return id && this.providers.has(id) ? this.providers.get(id) : null;
    }

    async _executeWithCircuitBreaker(provider, operation, ...args) {
        try {
            return await this.circuitBreaker.execute(() => operation.apply(provider, args));
        } catch (error) {
            this._handleCircuitBreakerError(error, args[0] || args[1]);
            throw error;
        }
    }

    _handleCircuitBreakerError(error, fallbackInput) {
        if (error.message?.includes('Circuit breaker is OPEN')) {
            this.logInfo('Circuit breaker is OPEN, using fallback...');
            return true;
        }
        this.logError('Circuit breaker error:', error);
        return false;
    }

    async generateText(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);

        const startTime = Date.now();
        try {
            const result = await this._executeWithCircuitBreaker(provider, provider.generateText, prompt, options);
            this._updateStats(prompt, result, providerId, startTime);
            return result;
        } catch (error) {
            return this._handleCircuitBreakerError(error, prompt)
                ? this._handleFallback(prompt, options)
                : Promise.reject(error);
        }
    }

    async streamText(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);

        try {
            return await this._executeWithCircuitBreaker(provider, provider.streamText, prompt, options);
        } catch (error) {
            if (this._handleCircuitBreakerError(error, prompt)) {
                // For streaming, we return a simulated async iterator as fallback
                this.logInfo('Circuit breaker fallback for streaming - streaming unavailable');
                return {
                    async* [Symbol.asyncIterator]() {
                        yield 'Streaming unavailable - using fallback response';
                    }
                };
            } else {
                throw error;
            }
        }
    }

    async generateEmbedding(text, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);

        try {
            return await this._executeWithCircuitBreaker(provider, provider.generateEmbedding, text);
        } catch (error) {
            return this._handleCircuitBreakerError(error, text)
                ? this._handleEmbeddingFallback(text)
                : Promise.reject(error);
        }
    }

    async process(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);

        try {
            if (typeof provider.process === 'function') {
                return await this._executeWithCircuitBreaker(provider, provider.process, prompt, options);
            }

            return provider.generateText
                ? await this.generateText(prompt, options, providerId)
                : provider.generate
                    ? await provider.generate(prompt, options)
                    : prompt;
        } catch (error) {
            return this._handleCircuitBreakerError(error, prompt)
                ? this._handleFallback(prompt, options)
                : Promise.reject(error);
        }
    }

    _updateStats(prompt, result, providerId, startTime) {
        this.lmStats.totalCalls++;
        this.lmStats.totalTokens += this._countTokens(prompt) + this._countTokens(result);
        const responseTime = Date.now() - startTime;
        this.lmStats.avgResponseTime = (this.lmStats.avgResponseTime * (this.lmStats.totalCalls - 1) + responseTime) / this.lmStats.totalCalls;

        const usage = this.lmStats.providerUsage.get(providerId) || {calls: 0, tokens: 0};
        usage.calls++;
        usage.tokens += this._countTokens(result);
        this.lmStats.providerUsage.set(providerId, usage);

        this.updateMetric('totalCalls', this.lmStats.totalCalls);
        this.updateMetric('totalTokens', this.lmStats.totalTokens);
        this.updateMetric('avgResponseTime', this.lmStats.avgResponseTime);
    }

    selectOptimalModel(task, constraints = {}) {
        return this.modelSelector.select(task, constraints);
    }

    getAvailableModels() {
        return this.modelSelector.getAvailableModels();
    }

    _countTokens(text) {
        return typeof text === 'string' ? text.split(/\s+/).filter(token => token.length > 0).length : 0;
    }

    _handleFallback(prompt, options = {}) {
        this.logInfo('Using fallback strategy - LM unavailable, degrading to pure NAL reasoning');
        return `FALLBACK: Processed with pure NAL reasoning - ${prompt}`;
    }

    _handleEmbeddingFallback(text) {
        this.logInfo('Using fallback strategy - Generate embedding unavailable');
        const textLength = text?.length || 0;
        return Array(8).fill(0).map((_, i) => Math.sin(textLength * (i + 1) * 0.1));
    }

    getMetrics() {
        return {
            providerCount: this.providers.size,
            lmStats: {...this.lmStats},
            providerUsage: new Map(this.lmStats.providerUsage)
        };
    }

    getCircuitBreakerState() {
        return this.circuitBreaker.getState();
    }

    resetCircuitBreaker() {
        this.circuitBreaker.reset();
        this.logInfo('Circuit breaker reset');
    }

    translateToNarsese(text) {
        return this.narseseTranslator.toNarsese(text);
    }

    translateFromNarsese(narsese) {
        return this.narseseTranslator.fromNarsese(narsese);
    }
}