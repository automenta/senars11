/**
 * @file MockEmbeddingProvider.js
 * @description Mock LM and embedding provider for deterministic testing of LM-NAL rule interactions
 */

/**
 * Mock embedding provider with controllable embeddings and LM responses
 */
export class MockEmbeddingProvider {
    constructor(data = {}) {
        this.embeddings = data.embeddings ?? {};
        this.responses = data.responses ?? {};
        this.calls = [];
        this.enabled = true;
    }

    async getEmbedding(term) {
        const key = String(term);
        this.calls.push({ type: 'embedding', key });
        return this.embeddings[key] ?? this._generateDefaultEmbedding(key);
    }

    calculateSimilarity(e1, e2) {
        if (!Array.isArray(e1) || !Array.isArray(e2) || e1.length !== e2.length) return 0;

        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < e1.length; i++) {
            dot += e1[i] * e2[i];
            mag1 += e1[i] ** 2;
            mag2 += e2[i] ** 2;
        }
        return mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
    }

    async findSimilar(input, candidates, threshold = 0.7) {
        if (!this.enabled) return [];

        const inputEmb = await this.getEmbedding(input);
        const results = await Promise.all(
            candidates.map(async c => ({
                item: c,
                similarity: this.calculateSimilarity(inputEmb, await this.getEmbedding(c))
            }))
        );
        return results.filter(r => r.similarity >= threshold).sort((a, b) => b.similarity - a.similarity);
    }

    _generateDefaultEmbedding(key) {
        const hash = this._hash(key);
        return Array.from({ length: 64 }, (_, i) => Math.sin(hash + i * 0.1) * 0.5 + 0.5);
    }

    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash &= hash;
        }
        return Math.abs(hash);
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }
    clearCache() { }
    getStats() { return { calls: this.calls.length, enabled: this.enabled }; }
}

/**
 * Mock LM provider with predefined responses based on prompt patterns
 */
export class MockLMProvider {
    constructor(responses = {}) {
        this.responses = responses;
        this.calls = [];
        this.enabled = true;
    }

    async generateText(prompt) {
        this.calls.push({ prompt, timestamp: Date.now() });

        for (const [pattern, response] of Object.entries(this.responses)) {
            if (prompt.includes(pattern)) {
                return typeof response === 'function' ? response(prompt) : response;
            }
        }
        return '';
    }

    isAvailable() { return this.enabled; }
    getStats() { return { calls: this.calls.length, enabled: this.enabled }; }
    getCalls() { return this.calls; }
    reset() { this.calls = []; }
}

/**
 * Create a combined mock provider for both LM and embeddings
 */
export const createMockProviders = (data = {}) => ({
    lm: new MockLMProvider(data.responses ?? {}),
    embeddingLayer: new MockEmbeddingProvider(data)
});
