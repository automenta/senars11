/**
 * @file MockEmbeddingProvider.js
 * @description Mock LM and embedding provider for deterministic testing of LM-NAL rule interactions
 */

/**
 * Mock embedding provider with controllable embeddings and LM responses
 */
export class MockEmbeddingProvider {
    constructor(data = {}) {
        this.embeddings = data.embeddings || {};
        this.responses = data.responses || {};
        this.calls = [];
        this.enabled = true;
    }

    async getEmbedding(term) {
        const key = typeof term === 'string' ? term : term.toString();
        this.calls.push({ type: 'embedding', key });
        return this.embeddings[key] || this._generateDefaultEmbedding(key);
    }

    calculateSimilarity(embedding1, embedding2) {
        if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) return 0;
        if (embedding1.length !== embedding2.length) return 0;

        let dotProduct = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            mag1 += embedding1[i] ** 2;
            mag2 += embedding2[i] ** 2;
        }
        return mag1 && mag2 ? dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
    }

    async findSimilar(input, candidates, threshold = 0.7) {
        if (!this.enabled) return [];
        const inputEmb = await this.getEmbedding(input);
        const results = [];
        for (const candidate of candidates) {
            const candidateEmb = await this.getEmbedding(candidate);
            const similarity = this.calculateSimilarity(inputEmb, candidateEmb);
            if (similarity >= threshold) results.push({ item: candidate, similarity });
        }
        return results.sort((a, b) => b.similarity - a.similarity);
    }

    _generateDefaultEmbedding(key) {
        // Generate deterministic embedding based on string hash
        const hash = this._hash(key);
        const dim = 64;
        const embedding = new Array(dim);
        for (let i = 0; i < dim; i++) {
            embedding[i] = Math.sin(hash + i * 0.1) * 0.5 + 0.5;
        }
        return embedding;
    }

    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }
    clearCache() { /* no-op for mock */ }
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
export function createMockProviders(data = {}) {
    return {
        lm: new MockLMProvider(data.responses || {}),
        embeddingLayer: new MockEmbeddingProvider(data)
    };
}
