export class ProviderRegistry {
    constructor() {
        this.providers = new Map();
        this.defaultProviderId = null;
    }

    get size() {
        return this.providers.size;
    }

    register(id, provider) {
        if (!id || !provider) {
            throw new Error('Provider ID and provider object are required');
        }

        this.providers.set(id, provider);

        if (!this.defaultProviderId) {
            this.defaultProviderId = id;
        }

        return this;
    }

    get(id) {
        return this.providers.get(id);
    }

    has(id) {
        return this.providers.has(id);
    }

    remove(id) {
        if (this.defaultProviderId === id) {
            const remainingProviders = Array.from(this.providers.keys());
            this.defaultProviderId = remainingProviders.length > 1 ? 
                remainingProviders.find(key => key !== id) || null : null;
        }
        return this.providers.delete(id);
    }

    getAll() {
        return new Map(this.providers);
    }

    setDefault(id) {
        if (this.providers.has(id)) {
            this.defaultProviderId = id;
        }
        return this;
    }
}