import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createNarsGPTQARule } from '../../../../../core/src/reason/rules/lm/LMNarsGPTQARule.js';
import { createNarsGPTBeliefRule } from '../../../../../core/src/reason/rules/lm/LMNarsGPTBeliefRule.js';
import { createNarsGPTGoalRule } from '../../../../../core/src/reason/rules/lm/LMNarsGPTGoalRule.js';
import { NarsGPTPrompts } from '../../../../../core/src/reason/rules/lm/NarsGPTPrompts.js';
import { Punctuation } from '../../../../../core/src/task/Task.js';

// Mock LM
const createMockLM = (response = 'Mock response') => ({
    generateText: jest.fn().mockResolvedValue(response),
    process: jest.fn().mockResolvedValue(response)
});

// Mock NarsGPTStrategy
const createMockStrategy = () => ({
    buildAttentionBuffer: jest.fn().mockResolvedValue([
        { task: { term: { toString: () => '(bird --> animal)' }, truth: { f: 0.9, c: 0.8 } } }
    ]),
    perspectiveSwap: jest.fn(text => text),
    checkGrounding: jest.fn().mockResolvedValue({ grounded: true, match: null, similarity: 0.9 })
});

// Mock Task factories
const createQuestionTask = (termStr) => ({
    term: { toString: () => termStr, name: termStr, isAtomic: true },
    punctuation: Punctuation.QUESTION,
    truth: null,
    budget: { priority: 0.8 }
});

const createBeliefTask = (termStr) => ({
    term: { toString: () => termStr, name: termStr, isAtomic: true },
    punctuation: Punctuation.BELIEF,
    truth: { f: 0.9, c: 0.8 },
    budget: { priority: 0.7 }
});

const createGoalTask = (termStr) => ({
    term: { toString: () => termStr, name: termStr, isAtomic: true },
    punctuation: Punctuation.GOAL,
    truth: { f: 0.9, c: 0.9 },
    budget: { priority: 0.9 }
});

describe('NarsGPTPrompts', () => {
    describe('formatBuffer', () => {
        it('should format empty buffer', () => {
            expect(NarsGPTPrompts.formatBuffer([])).toContain('No relevant');
        });

        it('should format buffer with items', () => {
            const buffer = [
                { task: { term: { toString: () => '(a --> b)' }, truth: { f: 0.9, c: 0.8 } } }
            ];
            const result = NarsGPTPrompts.formatBuffer(buffer);
            expect(result).toContain('1.');
            expect(result).toContain('(a --> b)');
        });
    });

    describe('question prompt', () => {
        it('should generate question prompt', () => {
            const prompt = NarsGPTPrompts.question('Context here', 'What is X?');
            expect(prompt).toContain('Context here');
            expect(prompt).toContain('What is X?');
            expect(prompt).toContain('memory items');
        });
    });

    describe('belief prompt', () => {
        it('should generate belief encoding prompt', () => {
            const prompt = NarsGPTPrompts.belief('Context', 'Dogs are animals');
            expect(prompt).toContain('Dogs are animals');
            expect(prompt).toContain('inheritance');
        });
    });
});

describe('LMNarsGPTQARule', () => {
    let rule;
    let mockLM;
    let mockStrategy;

    beforeEach(() => {
        mockLM = createMockLM('The bird can fly.');
        mockStrategy = createMockStrategy();
        rule = createNarsGPTQARule({
            lm: mockLM,
            narsGPTStrategy: mockStrategy
        });
    });

    it('should have correct id', () => {
        expect(rule.id).toBe('narsgpt-qa');
    });

    it('should match question tasks', () => {
        const questionTask = createQuestionTask('What can fly?');
        expect(rule.config.condition(questionTask)).toBe(true);
    });

    it('should not match belief tasks', () => {
        const beliefTask = createBeliefTask('(bird --> animal)');
        expect(rule.config.condition(beliefTask)).toBe(false);
    });
});

describe('LMNarsGPTBeliefRule', () => {
    let rule;
    let mockLM;

    beforeEach(() => {
        mockLM = createMockLM('(dog --> animal). {0.9 0.8}');
        rule = createNarsGPTBeliefRule({
            lm: mockLM,
            narsGPTStrategy: createMockStrategy()
        });
    });

    it('should have correct id', () => {
        expect(rule.id).toBe('narsgpt-belief');
    });

    it('should match natural language belief tasks', () => {
        const nlTask = createBeliefTask('"Dogs are animals"');
        expect(rule.config.condition(nlTask)).toBe(true);
    });

    it('should not match structured Narsese', () => {
        const narseseTask = {
            term: { toString: () => '(a --> b)', name: 'a --> b', isAtomic: false },
            punctuation: Punctuation.BELIEF
        };
        expect(rule.config.condition(narseseTask)).toBe(false);
    });
});

describe('LMNarsGPTGoalRule', () => {
    let rule;
    let mockLM;
    let mockStrategy;

    beforeEach(() => {
        mockLM = createMockLM('1. Find food!\n2. Go to forest!');
        mockStrategy = createMockStrategy();
        rule = createNarsGPTGoalRule({
            lm: mockLM,
            narsGPTStrategy: mockStrategy
        });
    });

    it('should have correct id', () => {
        expect(rule.id).toBe('narsgpt-goal');
    });

    it('should match goal tasks', async () => {
        const goalTask = createGoalTask('(achieve --> happiness)');
        const result = await rule.config.condition(goalTask);
        expect(result).toBe(true);
    });

    it('should reject ungrounded goals when strategy requires grounding', async () => {
        mockStrategy.checkGrounding.mockResolvedValue({ grounded: false });
        const goalTask = createGoalTask('(unknown --> goal)');
        const result = await rule.config.condition(goalTask);
        expect(result).toBe(false);
    });
});
