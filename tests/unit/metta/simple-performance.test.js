/**
 * Basic Performance Tests for MeTTa Implementation
 * Tests basic performance aspects without complex operations
 */

import { MeTTaInterpreter } from '../../../core/src/metta/MeTTaInterpreter.js';

describe('MeTTa Basic Performance Tests', () => {
    let interpreter;

    beforeEach(() => {
        interpreter = new MeTTaInterpreter({ loadStdlib: false });
    });

    describe('Basic Operation Performance', () => {
        test('arithmetic operations performance', () => {
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                const result = interpreter.run(`(^ &+ ${i} ${i + 1})`);
                expect(result[0].name).toBe(`${i + i + 1}`);
            }
            const end = performance.now();
            const duration = end - start;
            
            // Should complete within reasonable time (e.g., under 1 second for 100 operations)
            expect(duration).toBeLessThan(5000);
            console.log(`100 arithmetic operations took ${duration.toFixed(2)}ms`);
        });

        test('comparison operations performance', () => {
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                const result = interpreter.run(`(^ &== ${i} ${i})`);
                expect(result[0].name).toBe('True');
            }
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(5000);
            console.log(`100 comparison operations took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Rule Application Performance', () => {
        test('simple rule application speed', () => {
            // Add a simple rule
            interpreter.space.addRule(
                interpreter.parser.parse('(square $x)'),
                interpreter.parser.parse('(^ &* $x $x)')
            );
            
            const start = performance.now();
            for (let i = 1; i <= 50; i++) {
                const result = interpreter.run(`(square ${i})`);
                const expected = i * i;
                expect(parseInt(result[0].name)).toBe(expected);
            }
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
            console.log(`50 rule applications took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Space Operations Performance', () => {
        test('adding atoms to space', () => {
            const start = performance.now();
            for (let i = 0; i < 500; i++) {
                const atom = interpreter.parser.parse(`(test-atom-${i} ${i * 2})`);
                interpreter.space.add(atom);
            }
            const addDuration = performance.now() - start;
            
            // Verify we have the right number of atoms
            expect(interpreter.space.size()).toBeGreaterThanOrEqual(500);
            
            expect(addDuration).toBeLessThan(5000);
            console.log(`Adding 500 atoms took ${addDuration.toFixed(2)}ms`);
        });
    });

    describe('Reduction Engine Performance', () => {
        test('many reduction steps performance', () => {
            // Create a rule that requires multiple reduction steps
            interpreter.space.addRule(
                interpreter.parser.parse('(counter 0 $acc)'),
                interpreter.parser.parse('$acc')
            );
            interpreter.space.addRule(
                interpreter.parser.parse('(counter $n $acc)'),
                interpreter.parser.parse('(counter (- $n 1) (^ &+ $acc 1))')
            );
            
            const start = performance.now();
            const result = interpreter.run('(counter 50 0)');
            const end = performance.now();
            const duration = end - start;
            
            expect(parseInt(result[0].name)).toBe(50);
            expect(duration).toBeLessThan(5000);
            console.log(`Counter with 50 steps took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Simple List Processing', () => {
        test('small list operations', () => {
            // Test basic list creation and simple operations
            const start = performance.now();
            for (let i = 0; i < 10; i++) {
                const result = interpreter.run(`(: ${i} ())`);
                expect(result[0]).toBeDefined();
            }
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(5000);
            console.log(`Creating 10 simple lists took ${duration.toFixed(2)}ms`);
        });
    });
});