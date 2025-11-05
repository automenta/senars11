export class ModelSelector {
    constructor(providerRegistry) {
        this.providerRegistry = providerRegistry;
        this.cache = new Map();
    }

    select(task, constraints = {}) {
        const cacheKey = this._generateCacheKey(task, constraints);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const availableProviders = Array.from(this.providerRegistry.providers.keys());
        const result = this._selectBasedOnConstraints(availableProviders, constraints);
        
        this.cache.set(cacheKey, result);
        return result;
    }

    _generateCacheKey(task, constraints) {
        return `${task?.type || 'unknown'}_${JSON.stringify(constraints)}`;
    }

    _selectBasedOnConstraints(availableProviders, constraints) {
        if (Object.keys(constraints).length === 0) {
            return this.providerRegistry.defaultProviderId || availableProviders[0] || null;
        }

        return constraints.performance === 'high' ? availableProviders[0] :
               constraints.performance === 'low' ? availableProviders[availableProviders.length - 1] || null :
               availableProviders[0] || null;
    }

    getAvailableModels() {
        return Array.from(this.providerRegistry.providers.keys());
    }

    clearCache() {
        this.cache.clear();
    }
}