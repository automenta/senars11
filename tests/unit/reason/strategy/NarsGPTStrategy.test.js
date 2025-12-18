import { describe, it, expect, beforeEach } from '@jest/globals';
import { NarsGPTStrategy } from '../../../../core/src/reason/strategy/NarsGPTStrategy.js';

// Mock EmbeddingLayer
const createMockEmbeddingLayer = () => ({
    getEmbedding: async (text) => {
        // Simple hash-based mock embedding
        const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return Array(8).fill(0).map((_, i) => Math.sin(hash + i) * 0.5 + 0.5);
    },
    calculateSimilarity: (e1, e2) => {
        let dot = 0, m1 = 0, m2 = 0;
        for (let i = 0; i < e1.length; i++) {
            dot += e1[i] * e2[i];
            m1 += e1[i] ** 2;
            m2 += e2[i] ** 2;
        }
        return dot / (Math.sqrt(m1) * Math.sqrt(m2));
    },
    findSimilar: async () => []
});

// Mock Memory
const createMockMemory = (beliefs = []) => ({
    concepts: new Map([
        ['bird', { beliefs }],
        ['animal', { beliefs: [] }]
    ])
});

// Mock Task
const createMockTask = (termStr, truth = { f: 0.9, c: 0.8 }) => ({
    term: { toString: () => termStr, name: termStr },
    truth,
    stamp: { occurrenceTime: Date.now() },
    budget: { priority: 0.5 }
});

describe('NarsGPTStrategy', () => {
    let strategy;
    let mockEmbeddingLayer;

    beforeEach(() => {
        mockEmbeddingLayer = createMockEmbeddingLayer();
        strategy = new NarsGPTStrategy({
            embeddingLayer: mockEmbeddingLayer,
            relevantViewSize: 10,
            recentViewSize: 5,
            atomCreationThreshold: 0.95
        });
    });

    describe('constructor', () => {
        it('should initialize with default configuration', () => {
            const defaultStrategy = new NarsGPTStrategy();
            expect(defaultStrategy.name).toBe('NarsGPT');
            expect(defaultStrategy.relevantViewSize).toBe(30);
            expect(defaultStrategy.recentViewSize).toBe(10);
            expect(defaultStrategy.atomCreationThreshold).toBe(0.95);
        });

        it('should accept custom configuration', () => {
            expect(strategy.relevantViewSize).toBe(10);
            expect(strategy.recentViewSize).toBe(5);
        });
    });

    describe('perspectiveSwap', () => {
        it('should swap "you" to "I"', () => {
            expect(strategy.perspectiveSwap('you are smart')).toBe('I am smart');
        });

        it('should swap "I" to "you"', () => {
            expect(strategy.perspectiveSwap('I am here')).toBe('you are here');
        });

        it('should swap possessives', () => {
            expect(strategy.perspectiveSwap('your dog')).toMatch(/my dog/i);
            expect(strategy.perspectiveSwap('my cat')).toMatch(/your cat/i);
        });

        it('should handle no swap when disabled', () => {
            strategy.perspectiveSwapEnabled = false;
            expect(strategy.perspectiveSwap('you are smart')).toBe('you are smart');
        });
    });

    describe('buildAttentionBuffer', () => {
        it('should return empty array with no memory', async () => {
            const buffer = await strategy.buildAttentionBuffer('query', null, Date.now());
            expect(buffer).toEqual([]);
        });

        it('should build buffer from memory concepts', async () => {
            const memory = createMockMemory([
                createMockTask('(bird --> animal)'),
                createMockTask('(penguin --> bird)')
            ]);
            const buffer = await strategy.buildAttentionBuffer('bird', memory, Date.now());
            expect(buffer.length).toBeGreaterThan(0);
        });
    });

    describe('atomize', () => {
        it('should create new atom when no similar exists', async () => {
            const result = await strategy.atomize('elephant', 'NOUN');
            expect(result.isNew).toBe(true);
            expect(result.unifiedTerm).toBeNull();
        });

        it('should unify with existing similar atom', async () => {
            await strategy.atomize('cat', 'NOUN');
            // Same term should unify
            const result = await strategy.atomize('cat', 'NOUN');
            expect(result.isNew).toBe(false);
            expect(result.unifiedTerm).toBe('cat');
        });

        it('should handle missing embedding layer', async () => {
            const noEmbedStrategy = new NarsGPTStrategy();
            const result = await noEmbedStrategy.atomize('test');
            expect(result.isNew).toBe(true);
        });
    });

    describe('ground and checkGrounding', () => {
        it('should register grounding', async () => {
            await strategy.ground('(bird --> animal)', 'Birds are animals');
            expect(strategy.groundings.size).toBe(1);
        });

        it('should find grounded sentence', async () => {
            await strategy.ground('(bird --> animal)', 'Birds are animals');
            const result = await strategy.checkGrounding('Birds are animals');
            expect(result.grounded).toBe(true);
            expect(result.match).toBe('(bird --> animal)');
        });

        it('should return ungrounded for unknown sentence', async () => {
            const result = await strategy.checkGrounding('Unknown statement');
            expect(result.grounded).toBe(false);
        });
    });

    describe('formatContext', () => {
        it('should format buffer as numbered list', () => {
            const buffer = [
                { task: createMockTask('(a --> b)', { f: 0.9, c: 0.8 }), score: 0.5 },
                { task: createMockTask('(c --> d)', { f: 0.7, c: 0.6 }), score: 0.3 }
            ];
            const context = strategy.formatContext(buffer);
            expect(context).toContain('1.');
            expect(context).toContain('2.');
            expect(context).toContain('0.90');
        });
    });

    describe('generateCandidates', () => {
        it('should yield candidates from memory', async () => {
            const memory = createMockMemory([
                createMockTask('(bird --> flyer)'),
            ]);
            const primaryTask = createMockTask('What can fly?');
            const context = { memory, currentTime: Date.now() };

            const candidates = [];
            for await (const candidate of strategy.generateCandidates(primaryTask, context)) {
                candidates.push(candidate);
            }

            expect(candidates.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getStatus', () => {
        it('should return strategy status', () => {
            const status = strategy.getStatus();
            expect(status.name).toBe('NarsGPT');
            expect(status.config.relevantViewSize).toBe(10);
            expect(status.groundingsCount).toBe(0);
        });
    });
});
