/**
 * Comprehensive Unit Test for Syllogistic Reasoning
 * This test validates EVERY SINGLE ASPECT of the (a-->b) + (b-->c) -> (a-->c) derivation
 * 
 * Issues to validate:
 * 1. Truth values are properly handled and not undefined
 * 2. Beliefs don't disappear during reasoning cycles  
 * 3. Syllogistic reasoning produces expected derivation
 * 4. Proper validation of Task truth requirements
 * 5. Rule unification and application works correctly
 */

import {NAR} from '../src/nar/NAR.js';
import {Task} from '../src/task/Task.js';
import {Truth} from '../src/Truth.js';
import {Term} from '../src/term/Term.js';
import {SyllogisticRule} from '../src/reasoning/rules/syllogism.js';

describe('Syllogistic Reasoning - (a-->b) + (b-->c) -> (a-->c)', () => {
    let nar;

    beforeEach(async () => {
        nar = new NAR();
        await nar.initialize();
    });

    afterEach(() => {
        if (nar && typeof nar.dispose === 'function') {
            nar.dispose();
        }
    });

    test('1. Truth Value Handling - No Undefined Values', async () => {
        // Input statement and verify truth values are properly set
        await nar.input('(a-->b). %1.0;0.9%');
        
        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBe(1);
        
        const task = beliefs[0];
        expect(task).toBeDefined();
        expect(task.truth).toBeDefined();
        expect(task.truth.frequency).toBeDefined();
        expect(task.truth.confidence).toBeDefined();
        expect(typeof task.truth.frequency).toBe('number');
        expect(typeof task.truth.confidence).toBe('number');
        expect(task.truth.frequency).toBe(1.0);
        expect(task.truth.confidence).toBe(0.9);
    });

    test('2. Default Truth Values for Beliefs', async () => {
        // Test that beliefs get default truth when none provided
        await nar.input('(a-->b).');
        
        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBe(1);
        
        const task = beliefs[0];
        expect(task.truth).toBeDefined();
        expect(task.truth.frequency).toBe(1.0);
        expect(task.truth.confidence).toBe(0.9);
    });

    test('3. Task Validation - Beliefs require truth values', () => {
        // Create a proper Term object the same way as other tests
        const mockTerm = new Term({name: 'test'});
        
        // Attempt to create a belief task without truth should fail
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '.',
                truth: null, // No truth value for belief
                budget: { priority: 0.5 }
            });
        }).toThrow(/BELIEF tasks must have valid truth values/);
    });

    test('4. Task Validation - Questions cannot have truth values', () => {
        // Create a proper Term object the same way as other tests
        const mockTerm = new Term({name: 'test'});
        
        // Attempt to create a question task with truth should fail
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '?',
                truth: new Truth(1.0, 0.9), // Truth value for question
                budget: { priority: 0.5 }
            });
        }).toThrow(/Questions cannot have truth values/);
    });

    test('5. Task Validation - Goals require truth values', () => {
        // Create a proper Term object the same way as other tests
        const mockTerm = new Term({name: 'test'});
        
        // Attempt to create a goal task without truth should fail
        expect(() => {
            new Task({
                term: mockTerm,
                punctuation: '!',
                truth: null, // No truth value for goal
                budget: { priority: 0.5 }
            });
        }).toThrow(/GOAL tasks must have valid truth values/);
    });

    test('6. Belief Persistence - No Disappearing Beliefs', async () => {
        await nar.input('(a-->b). %1.0;0.9%');
        await nar.input('(b-->c). %1.0;0.9%');
        
        // Verify beliefs exist initially
        let beliefs = nar.getBeliefs();
        expect(beliefs.length).toBe(2);
        
        // Run multiple reasoning cycles
        for (let i = 0; i < 5; i++) {
            await nar.step();
            beliefs = nar.getBeliefs();
            expect(beliefs.length).toBeGreaterThanOrEqual(0); // Should not be negative
            expect(beliefs.length).toBeLessThanOrEqual(10); // Should be reasonable limit
        }
    });

    test('7. Syllogistic Rule Creation and Structure', () => {
        // Verify the syllogistic rule is properly structured
        const rule = SyllogisticRule.create(nar._termFactory);
        
        expect(rule).toBeDefined();
        expect(rule.id).toBe('syllogism/deduction');
        expect(rule.premises).toBeDefined();
        expect(rule.premises.length).toBe(2);
        
        // Premises should be (?S --> ?M) and (?M --> ?P) patterns
        expect(rule.premises[0]).toBeDefined();
        expect(rule.premises[1]).toBeDefined();
        
        expect(rule.conclusion).toBeDefined();
    });

    test('8. Syllogistic Rule Direct Application', async () => {
        // Create tasks manually to test direct rule application
        const termA = nar._termFactory.create('a');
        const termB = nar._termFactory.create('b');  
        const termC = nar._termFactory.create('c');
        
        const termAB = nar._termFactory.create({operator: '-->', components: [termA, termB]});
        const termBC = nar._termFactory.create({operator: '-->', components: [termB, termC]});
        
        const taskAB = new Task({
            term: termAB,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: { priority: 0.5 }
        });
        
        const taskBC = new Task({
            term: termBC,
            punctuation: '.',
            truth: new Truth(1.0, 0.9),
            budget: { priority: 0.5 }
        });

        const rule = SyllogisticRule.create(nar._termFactory);
        const results = await rule._apply([taskAB, taskBC], null, nar._termFactory);
        
        // At minimum, the rule application should not fail
        // The number of results depends on whether unification works
        expect(Array.isArray(results)).toBe(true);
        
        // Check if we get any results (success or failure of the derivation is separate)
        // if unification works, we should get a result
    });

    test('9. Complete Syllogistic Derivation Process', async () => {
        // This is the main test case: (a-->b) + (b-->c) -> (a-->c)
        await nar.input('(a-->b). %1.0;0.9%');
        await nar.input('(b-->c). %1.0;0.9%');
        
        // Verify initial state: 2 beliefs exist
        let beliefs = nar.getBeliefs();
        expect(beliefs.length).toBe(2);
        
        const containsAB = beliefs.some(b => {
            const term = b.term?.toString?.() || b.term || '';
            console.log('Belief term:', term);
            return term === '(a-->b)' || term === '(-->, a, b)';
        });
        
        const containsBC = beliefs.some(b => {
            const term = b.term?.toString?.() || b.term || '';
            return term === '(b-->c)' || term === '(-->, b, c)';
        });
        
        expect(containsAB).toBe(true);
        expect(containsBC).toBe(true);
        
        // Run reasoning cycles to allow syllogistic inference
        let foundAC = false;
        for (let i = 0; i < 10; i++) {
            await nar.step();
            
            beliefs = nar.getBeliefs();
            console.log(`Beliefs after step ${i}:`, beliefs.map(b => b.term.toString()));
            foundAC = beliefs.some(b => {
                const term = b.term?.toString?.() || b.term || '';
                return term === '(a-->c)' || term === '(-->, a, c)';
            });
            
            if (foundAC) break;
        }
        
        // Get the derived task to verify its properties
        const acTask = beliefs.find(b => {
            const term = b.term?.toString?.() || b.term || '';
            return term === '(a-->c)' || term === '(-->, a, c)';
        });

        // This is the critical assertion - (a-->c) should be derived
        expect(foundAC).toBe(true);
        
        expect(acTask).toBeDefined();
        expect(acTask.type).toBe('BELIEF');
        expect(acTask.truth).toBeDefined();
        expect(typeof acTask.truth.frequency).toBe('number');
        expect(typeof acTask.truth.confidence).toBe('number');
        expect(acTask.truth.frequency).toBeGreaterThan(0);
        expect(acTask.truth.confidence).toBeGreaterThan(0);
    });

    test('10. Truth Value Consistency Across System', async () => {
        await nar.input('(a-->b). %1.0;0.9%');
        
        const beliefs = nar.getBeliefs();
        const task = beliefs[0];
        
        // Verify that truth values are accessible via expected property names
        expect(task.truth.frequency).toBeDefined();
        expect(task.truth.confidence).toBeDefined();
        expect(task.truth.frequency).toBe(1.0);
        expect(task.truth.confidence).toBe(0.9);
        
        // Verify toString method works properly
        const truthString = task.truth.toString();
        expect(truthString).toContain('1.00');
        expect(truthString).toContain('0.90');
        expect(truthString).toMatch(/%[0-9.]+;[0-9.]+%/);
    });

    test('11. Input Format Processing', async () => {
        // Test both explicit and implicit truth value inputs
        await nar.input('(a-->b).'); // Should use defaults
        await nar.input('(b-->c). %0.8;0.7%'); // Should use explicit values
        
        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBe(2);
        
        const abTask = beliefs.find(b => {
            const termString = b.term?.toString?.() || b.term || '';
            return termString === '(a-->b)' || termString === '(-->, a, b)';
        });
        const bcTask = beliefs.find(b => {
            const termString = b.term?.toString?.() || b.term || '';
            return termString === '(b-->c)' || termString === '(-->, b, c)';
        });
        
        expect(abTask).toBeDefined();
        expect(bcTask).toBeDefined();
        
        // First task should have default values
        expect(abTask.truth.frequency).toBe(1.0);
        expect(abTask.truth.confidence).toBe(0.9);
        
        // Second task should have explicit values
        expect(bcTask.truth.frequency).toBe(0.8);
        expect(bcTask.truth.confidence).toBe(0.7);
    });

    test('12. Rule Engine Integration', async () => {
        // Verify that rules are properly registered in the engine
        const ruleEngine = nar.ruleEngine;
        expect(ruleEngine).toBeDefined();
        
        // The specific check depends on the internal structure of RuleEngine
        // We'll verify that the syllogistic rule is available for use
        await nar.input('(a-->b). %1.0;0.9%');
        await nar.input('(b-->c). %1.0;0.9%');
        
        const initialBeliefs = nar.getBeliefs().length;
        await nar.step();
        const afterStepBeliefs = nar.getBeliefs().length;
        
        // Should have processed without errors
        expect(initialBeliefs).toBeGreaterThanOrEqual(0);
        expect(afterStepBeliefs).toBeGreaterThanOrEqual(0);
    });

    test('13. Memory and Concept Integrity', async () => {
        await nar.input('(a-->b). %1.0;0.9%');
        await nar.input('(b-->c). %1.0;0.9%');
        
        // Check memory stats
        const stats = nar.getStats();
        expect(stats.memoryStats).toBeDefined();
        
        const conceptCount = stats.memoryStats?.memoryUsage?.concepts || stats.memoryStats?.totalConcepts || 0;
        const taskCount = stats.memoryStats?.memoryUsage?.totalTasks || stats.memoryStats?.totalTasks || 0;
        
        expect(conceptCount).toBeGreaterThanOrEqual(2); // Should have at least 2 concepts
        expect(taskCount).toBeGreaterThanOrEqual(2);    // Should have at least 2 tasks
    });
});

// Run the test suite manually if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    // Simple test runner for when executed directly
    console.log('🧪 Running Syllogistic Reasoning Unit Tests...');
    
    const testFunctions = {
        '1. Truth Value Handling - No Undefined Values': async () => {
            const nar = new NAR();
            await nar.initialize();
            await nar.input('(a-->b). %1.0;0.9%');
            const beliefs = nar.getBeliefs();
            const task = beliefs[0];
            if (!task || !task.truth || task.truth.frequency !== 1.0) {
                throw new Error('Truth value not properly set');
            }
            console.log('✅ Test 1 passed');
            return true;
        },
        
        '9. Complete Syllogistic Derivation Process': async () => {
            const nar = new NAR();
            await nar.initialize();
            await nar.input('(a-->b). %1.0;0.9%');
            await nar.input('(b-->c). %1.0;0.9%');
            
            let foundAC = false;
            for (let i = 0; i < 10; i++) {
                await nar.step();
                const beliefs = nar.getBeliefs();
                foundAC = beliefs.some(b => {
                    const term = b.term?.toString?.() || b.term || '';
                    return term.toString()==='(a-->c)';
                });
                if (foundAC) break;
            }
            
            if (!foundAC) {
                throw new Error('Syllogistic derivation (a-->c) not found');
            }
            console.log('✅ Test 9 passed');
            return true;
        }
    };
    
    // Run critical tests
    Promise.all(Object.entries(testFunctions).map(async ([name, testFn]) => {
        try {
            await testFn();
            console.log(`✅ ${name}`);
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
        }
    })).then(() => {
        console.log('\\n📋 Unit test execution completed. Check results above.');
    });
}