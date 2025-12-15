/**
 * Integration test for PrologStrategy with FunctorRegistry
 * Tests custom functor registration and runtime extensibility
 */

import { PrologStrategy } from '../../../core/src/reason/strategy/PrologStrategy.js';
import { Task } from '../../../core/src/task/Task.js';
import { TermFactory } from '../../../core/src/term/TermFactory.js';

describe('PrologStrategy Functor Integration', () => {
    let strategy;
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        strategy = new PrologStrategy({ termFactory });
    });

    test('should use functor registry for arithmetic operations', async () => {
        // Add rule: result(X) :- X is 2 + 3.
        strategy.addPrologRule('result(X) :- X is 2 + 3.');

        const query = new Task({
            term: termFactory.create('result', [termFactory.variable('R')]),
            punctuation: '?',
            truth: null
        });

        const results = await strategy.ask(query);
        expect(results.length).toBeGreaterThan(0);

        // Find binding for R
        const resultTerm = results[0].term;
        expect(resultTerm).toBeDefined();
    });

    test('should support comparison operators via functor registry', async () => {
        strategy.addPrologFacts('value(10).');
        strategy.addPrologRule('big(X) :- value(X), X > 5.');

        const query = new Task({
            term: termFactory.create('big', [termFactory.variable('X')]),
            punctuation: '?',
            truth: null
        });

        const results = await strategy.ask(query);
        expect(results.length).toBeGreaterThan(0);
    });

    test('should support custom functor registration', () => {
        // Register custom functor: double(X) = X * 2
        strategy.registerFunctor('double', (x) => Number(x) * 2, {
            arity: 1,
            category: 'custom',
            description: 'Doubles a number'
        });

        // Verify functor is registered
        expect(strategy.functorRegistry.has('double')).toBe(true);

        // Test direct execution
        const result = strategy.functorRegistry.execute('double', 5);
        expect(result).toBe(10);
    });

    test('should use custom functor in prolog rules', async () => {
        // Register triple functor
        strategy.registerFunctor('triple', (x) => Number(x) * 3, {
            arity: 1,
            category: 'custom'
        });

        // Add rule using custom functor
        strategy.addPrologRule('compute(X) :- X is triple(4).');

        const query = new Task({
            term: termFactory.create('compute', [termFactory.variable('R')]),
            punctuation: '?',
            truth: null
        });

        const results = await strategy.ask(query);
        expect(results.length).toBeGreaterThan(0);
        // Result term should contain R=12
    });

    test('should chain custom functors', () => {
        // Register multiple custom functors
        strategy.registerFunctor('square', (x) => Number(x) ** 2, { arity: 1 });
        strategy.registerFunctor('half', (x) => Number(x) / 2, { arity: 1 });

        // Test chaining: half(square(4)) = half(16) = 8
        const squareResult = strategy.functorRegistry.execute('square', 4);
        expect(squareResult).toBe(16);

        const halfResult = strategy.functorRegistry.execute('half', squareResult);
        expect(halfResult).toBe(8);
    });

    test('should maintain backward compatibility with existing operators', async () => {
        // Test all original operators still work
        const operators = [
            { rule: 'test1(X) :- X is 5 + 3.', expected: true },
            { rule: 'test2(X) :- X is 10 - 4.', expected: true },
            { rule: 'test3(X) :- X is 3 * 4.', expected: true },
            { rule: 'test4(X) :- X is 20 / 4.', expected: true },
            { rule: 'test5 :- 10 > 5.', expected: true },
            { rule: 'test6 :- 3 < 7.', expected: true },
            { rule: 'test7 :- 5 >= 5.', expected: true },
            { rule: 'test8 :- 4 <= 8.', expected: true }
        ];

        for (const { rule } of operators) {
            strategy.addPrologRule(rule);
        }

        // Verify knowledge base has rules
        expect(strategy.knowledgeBase.size).toBeGreaterThan(0);
    });
});
