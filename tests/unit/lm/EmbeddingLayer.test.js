import {jest} from '@jest/globals';

// Mock @xenova/transformers
jest.unstable_mockModule('@xenova/transformers', () => ({
    pipeline: jest.fn(() => {
        return async (text) => ({
            data: new Float32Array([0.1, 0.2, 0.3])
        });
    })
}));

describe('EmbeddingLayer', () => {
    let EmbeddingLayer;

    beforeAll(async () => {
        const module = await import('../../../src/lm/EmbeddingLayer.js');
        EmbeddingLayer = module.EmbeddingLayer;
    });

    test('should initialize and generate embeddings using transformers', async () => {
        const layer = new EmbeddingLayer({provider: 'transformers'});
        const embedding = await layer.getEmbedding('test');
        expect(embedding).toHaveLength(3);
        expect(embedding[0]).toBeCloseTo(0.1);
    });

    test('should find similar items', async () => {
        const layer = new EmbeddingLayer({provider: 'transformers'});
        // Mock getEmbedding to return known vectors
        // We override getEmbedding to avoid dealing with the mocked pipeline details for similarity logic
        layer.getEmbedding = jest.fn(async (text) => {
            if (text === 'target') return [1, 0, 0];
            if (text === 'match') return [0.9, 0.1, 0];
            if (text === 'diff') return [0, 1, 0];
            return [0, 0, 0];
        });

        const results = await layer.findSimilar('target', ['match', 'diff'], {limit: 1});
        expect(results).toHaveLength(1);
        expect(results[0].item).toBe('match');
    });

    test('should fallback to dummy if transformers fail', async () => {
        const layer = new EmbeddingLayer({provider: 'transformers'});
        // Force initialization failure simulation by overriding _initialize
        layer._initialize = jest.fn(async () => {
             throw new Error('Load failed');
        });
        // We assume _generateEmbedding handles the failure gracefully if we modify it to catch _initialize errors?
        // Current implementation:
        /*
        if (this.config.provider === 'transformers') {
             await this._initialize(); // This throws
        */
        // If _initialize throws, _generateEmbedding throws (unless caught).
        // My implementation of _initialize catches errors!
        /*
             try {
                 const {pipeline} = await import('@xenova/transformers');
                 //...
             } catch (e) {
                 console.warn(...)
             }
        */
        // So _initialize won't throw. But this.pipeline will be null.

        // Let's verify _generateEmbedding falls back if pipeline is null.
        layer._initialize = jest.fn(async () => { /* no-op, pipeline remains null */ });

        const embedding = await layer.getEmbedding('test');
        expect(embedding).toHaveLength(384); // Dummy size
    });
});
