import { BaseComponent } from '../util/BaseComponent.js';
import { Metrics } from '../util/Metrics.js';
import { ProviderRegistry } from './ProviderRegistry.js';
import { ModelSelector } from './ModelSelector.js';
import { NarseseTranslator } from './NarseseTranslator.js';
import { CircuitBreaker } from '../util/CircuitBreaker.js';
import { LMStats } from './LMStats.js';
import { ProviderUtils } from './ProviderUtils.js';
import { EmptyOutputError } from './EmptyOutputError.js';

export class LM extends BaseComponent {
    constructor(config = {}, eventBus = null) {
        super(config, 'LM', eventBus);

        this.providers = new ProviderRegistry();
        this.modelSelector = new ModelSelector(this.providers);
        this.narseseTranslator = new NarseseTranslator();
        this.circuitBreaker = new CircuitBreaker(this._getCircuitBreakerConfig());
        this.lmMetrics = new Metrics();
        this.activeWorkflows = new Map();
        this.lmStats = new LMStats();
    }

    get config() {
        return { ...this._config };
    }

    get metrics() {
        return this.lmMetrics;
    }

    _getCircuitBreakerConfig() {
        const cbConfig = this.config?.circuitBreaker ?? {};
        return {
            failureThreshold: cbConfig.failureThreshold ?? 5,
            timeout: cbConfig.timeout ?? 60000,
            resetTimeout: cbConfig.resetTimeout ?? 30000
        };
    }

    async _initialize() {
        if (this.lmMetrics.initialize) {
            await this.lmMetrics.initialize(this.config?.metrics ?? {});
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
        const id = providerId ?? this.providers.defaultProviderId;
        return id && this.providers.has(id) ? this.providers.get(id) : null;
    }

    async _executeWithCircuitBreaker(operation, ...args) {
        try {
            return await this.circuitBreaker.execute(() => operation(...args));
        } catch (error) {
            this._handleCircuitBreakerError(error, args[0] ?? args[1]);
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
        if (!provider) throw new Error(`Provider "${providerId ?? this.providers.defaultProviderId}" not found.`);

        const startTime = Date.now();
        const result = await this._executeWithCircuitBreaker(ProviderUtils.standardGenerate, provider, prompt, options);

        this._validateOutput(result, providerId);

        this.lmStats.update(prompt, result, providerId, startTime);
        this.updateMetric('totalCalls', this.lmStats.totalCalls);
        this.updateMetric('totalTokens', this.lmStats.totalTokens);
        this.updateMetric('avgResponseTime', this.lmStats.avgResponseTime);
        return result;
    }

    _validateOutput(result, providerId) {
        const validationConfig = this.config?.validation ?? {};
        const emptyOutputMode = validationConfig.emptyOutput ?? 'warn';
        const narseseValidation = validationConfig.narsese ?? false;

        if (typeof result === 'string' && result.trim().length === 0) {
            const error = new EmptyOutputError('LM returned empty output', providerId);
            if (emptyOutputMode === 'error') throw error;
            if (emptyOutputMode === 'warn') {
                this.logWarn('Empty output detected', { providerId });
                this.eventBus?.emit('lm:empty-output', { providerId, timestamp: Date.now() });
            }
        }

        if (narseseValidation && typeof result === 'string' && this._looksLikeNarsese(result)) {
            try {
                this.narseseTranslator.toNarsese(result);
            } catch (error) {
                this.logWarn('Narsese-like output failed validation', {
                    providerId,
                    output: result.substring(0, 100),
                    error: error.message
                });
                this.eventBus?.emit('lm:invalid-narsese', {
                    providerId,
                    output: result,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
    }

    _looksLikeNarsese(text) {
        return /[<>]|-->|<->|==>|<=>|%/.test(text);
    }

    async streamText(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId ?? this.providers.defaultProviderId}" not found.`);

        return await this._executeWithCircuitBreaker(ProviderUtils.standardStream, provider, prompt, options);
    }

    async generateEmbedding(text, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId ?? this.providers.defaultProviderId}" not found.`);

        return await this._executeWithCircuitBreaker(provider.generateEmbedding.bind(provider), text);
    }

    async process(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) throw new Error(`Provider "${providerId ?? this.providers.defaultProviderId}" not found.`);

        if (typeof provider.process === 'function') {
            return await this._executeWithCircuitBreaker(provider.process.bind(provider), prompt, options);
        }

        return this.generateText(prompt, options, providerId);
    }

    selectOptimalModel(task, constraints = {}) {
        return this.modelSelector.select(task, constraints);
    }

    getAvailableModels() {
        return this.modelSelector.getAvailableModels();
    }

    _handleFallback(prompt, options = {}) {
        this.logInfo('Using fallback strategy - LM unavailable, degrading to pure NAL reasoning');
        return `FALLBACK: Processed with pure NAL reasoning - ${prompt}`;
    }

    _handleEmbeddingFallback(text) {
        this.logInfo('Using fallback strategy - Generate embedding unavailable');
        const textLength = text?.length ?? 0;
        return Array(8).fill(0).map((_, i) => Math.sin(textLength * (i + 1) * 0.1));
    }

    getMetrics() {
        return this.lmStats.getMetrics(this.providers.size);
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
