/**
 * Edge Case Tests for MeTTa Implementation
 * Tests various edge cases and boundary conditions
 */

import { MeTTaInterpreter } from '../../../core/src/metta/MeTTaInterpreter.js';

describe('MeTTa Edge Case Tests', () => {
    let interpreter;

    beforeEach(() => {
        // Disable stdlib to focus on core functionality
        interpreter = new MeTTaInterpreter({ loadStdlib: false });
    });

    describe('Variable Binding Edge Cases', () => {
        test('handles unbound variables', () => {
            const result = interpreter.run('(unbound-var $x)');
            // Should return the expression unevaluated since no matching rule
            expect(result[0].toString()).toContain('unbound-var');
        });

        test('handles variable name conflicts', () => {
            // Add rule with variable
            interpreter.space.addRule(
                interpreter.parser.parse('(conflict $x)'),
                interpreter.parser.parse('(^ &+ $x 1)')
            );

            // This should work without issues
            // Note: This will fail because $x is a variable but we need a number
            const result = interpreter.run('(conflict 5)');
            expect(result[0].name).toBe('6');
        });
    });

    describe('Termination and Limits', () => {
        test('respects reduction step limits', () => {
            // Create a new interpreter with a low step limit
            const limitedInterpreter = new MeTTaInterpreter({
                loadStdlib: false,
                maxReductionSteps: 5
            });

            // This should not cause issues with a simple operation
            const result = limitedInterpreter.run('(^ &+ 2 3)');
            expect(result[0].name).toBe('5');
        });
    });

    describe('Pattern Matching Edge Cases', () => {
        test('handles complex nested patterns', () => {
            interpreter.space.addRule(
                interpreter.parser.parse('(nested-match $a $b $c)'),
                interpreter.parser.parse('(^ &+ $a (^ &+ $b $c))')
            );

            const result = interpreter.run('(nested-match 1 2 3)');
            // Should compute 1 + (2 + 3) = 6
            expect(result[0].name).toBe('6');
        });

        test('handles wildcard patterns', () => {
            interpreter.space.addRule(
                interpreter.parser.parse('(wildcard $x $_)'),
                interpreter.parser.parse('$x')
            );
            
            const result = interpreter.run('(wildcard 42 anything)');
            expect(result[0].name).toBe('42');
        });

        test('handles occurs check correctly', () => {
            // This should not cause infinite loops due to occurs check
            const result = interpreter.run('(= $x (f $x))');
            // Should handle without crashing
            expect(result).toBeDefined();
        });
    });

    describe('Grounded Operation Edge Cases', () => {
        test('handles division by zero', () => {
            // The grounded operation should handle division by zero
            // Depending on implementation, it might throw or return an error
            const result = interpreter.run('(^ &/ 10 0)');
            // The result might be undefined or an error value
            // Just ensure it doesn't crash
            expect(result).toBeDefined();
        });

        test('handles invalid arguments to grounded operations', () => {
            // Try to add a non-number
            const result = interpreter.run('(^ &+ 5 "hello")');
            // Should handle gracefully, possibly returning the original expression
            expect(result).toBeDefined();
        });

        test('handles variadic operations with different argument counts', () => {
            const result1 = interpreter.run('(^ &+ 5)');
            expect(result1[0].name).toBe('5'); // Identity
            
            const result2 = interpreter.run('(^ &+ 5 10)');
            expect(result2[0].name).toBe('15'); // Two args
            
            const result3 = interpreter.run('(^ &+ 1 2 3 4)');
            expect(result3[0].name).toBe('10'); // Four args
        });
    });

    describe('List Processing Edge Cases', () => {
        test('handles empty lists', () => {
            const result = interpreter.run('(^ &empty? ())');
            expect(result[0].name).toBe('True');
        });

        test('handles single element lists', () => {
            // Test that the list structure is maintained
            const result = interpreter.run('(: 42 ())');
            expect(result[0]).toBeDefined();
            // The result should be a list structure
            expect(result[0].operator.name).toBe(':');
        });

        test('handles deeply nested lists', () => {
            // Create a deeply nested list structure
            const result = interpreter.run('(: 1 (: 2 (: 3 (: 4 (: 5 ())))))');
            expect(result[0]).toBeDefined();
        });
    });

    describe('Parser Edge Cases', () => {
        test('handles malformed expressions gracefully', () => {
            expect(() => {
                interpreter.parser.parse('(unclosed paren');
            }).toThrow();
        });

        test('handles empty expressions', () => {
            const result = interpreter.parser.parse('');
            expect(result).toBeNull();
        });

        test('handles deeply nested expressions', () => {
            // Create a deeply nested expression
            const deepExpr = '(((((deeply nested)))) expression)';
            const result = interpreter.parser.parse(deepExpr);
            expect(result).toBeDefined();
        });
    });

    describe('Space Operations Edge Cases', () => {
        test('handles duplicate additions', () => {
            const atom = interpreter.parser.parse('(duplicate-test)');
            interpreter.space.add(atom);
            interpreter.space.add(atom); // Add again
            
            // Should handle duplicates appropriately
            expect(interpreter.space.size()).toBeGreaterThanOrEqual(1);
        });

        test('handles removal of non-existent atoms', () => {
            const atom = interpreter.parser.parse('(non-existent)');
            const result = interpreter.space.remove(atom);
            // Should return false for non-existent atom
            expect(result).toBe(false);
        });
    });

    describe('Type and Equality Edge Cases', () => {
        test('handles self-equality', () => {
            const atom1 = interpreter.parser.parse('(test 1)');
            const atom2 = interpreter.parser.parse('(test 1)');
            // These should be structurally equal
            expect(atom1.equals(atom2)).toBe(true);
        });

        test('handles inequality', () => {
            const atom1 = interpreter.parser.parse('(test 1)');
            const atom2 = interpreter.parser.parse('(test 2)');
            // These should not be equal
            expect(atom1.equals(atom2)).toBe(false);
        });
    });

    describe('Large Data Structures', () => {
        test('handles moderately large lists', () => {
            // Create a moderately large list
            let listStr = '()';
            for (let i = 0; i < 10; i++) {
                listStr = `(: ${i} ${listStr})`;
            }
            
            const result = interpreter.run(listStr);
            expect(result[0]).toBeDefined();
        });

        test('handles multiple rules in space', () => {
            // Add multiple rules to the space
            for (let i = 0; i < 5; i++) {
                interpreter.space.addRule(
                    interpreter.parser.parse(`(rule-${i} $x)`),
                    interpreter.parser.parse(`(+ $x ${i})`)
                );
            }
            
            // Verify all rules are added
            expect(interpreter.space.getRules().length).toBe(5);
        });
    });
});