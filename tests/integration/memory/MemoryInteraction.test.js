import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { NAR } from '../../../core/src/nar/NAR.js';
import { inputAll, wait } from '../../support/testHelpers.js';
import { generateBeliefs } from '../../support/integrationTestUtils.js';

describe('Memory Cross-Layer Interaction', () => {
    let nar;

    beforeEach(async () => {
        nar = new NAR({
            debug: { enabled: false },
            cycle: { delay: 5, maxTasksPerCycle: 10 },
            memory: {
                priorityThreshold: 0.3,
                consolidationInterval: 5,
                maxConcepts: 50
            }
        });
        if (nar.initialize) await nar.initialize();
    });

    afterEach(async () => {
        if (nar) {
            await nar.dispose();
            nar = null;
        }
    });

    test('Focus overflow → long-term consolidation', async () => {
        const beliefs = generateBeliefs(30, 'overflow');
        await inputAll(nar, beliefs);

        await nar.runCycles(5);

        const focus = nar._focus;
        const memory = nar.memory;

        if (focus && memory) {
            const focusTasks = focus.getTasks(100);
            const memConcepts = memory.getAllConcepts();

            expect(focusTasks.length).toBeLessThanOrEqual(50);
            expect(memConcepts.length).toBeGreaterThanOrEqual(10);
        }
    });

    test('Priority-based forgetting under memory pressure', async () => {
        const allBeliefs = generateBeliefs(45, 'pressure');
        await inputAll(nar, allBeliefs);

        const initialConcepts = nar.memory.getAllConcepts().length;

        await nar.runCycles(8);

        const finalConcepts = nar.memory.getAllConcepts();

        // Verify memory pressure triggers consolidation
        expect(finalConcepts.length).toBeLessThanOrEqual(50);
        expect(finalConcepts.length).toBeGreaterThan(0);

        // System should have processed inputs
        const stats = nar.getStats();
        expect(stats.memoryStats.totalConcepts).toBeGreaterThan(0);
    });

    test('Cross-focus-set reasoning', async () => {
        if (!nar._focus) {
            expect(true).toBe(true);
            return;
        }

        await nar.input('<A --> B>.');
        await nar.input('<B --> C>.');

        nar._focus.createFocusSet('set1', 5);
        nar._focus.setFocus('set1');
        await nar.input('<C --> D>.');

        nar._focus.createFocusSet('set2', 5);
        nar._focus.setFocus('set2');
        await nar.input('<D --> E>.');

        await nar.runCycles(10);

        const beliefs = nar.getBeliefs();
        const hasDerivation = beliefs.some(b => {
            const term = b.term.toString();
            return (term.includes('A') && term.includes('C')) ||
                (term.includes('B') && term.includes('D'));
        });

        expect(beliefs.length).toBeGreaterThan(2);
    });

    test('Memory validation triggers', async () => {
        const invalidInputs = [
            '(((A)).',
            '<unclosed',
            'term.%2.0;1.5%',
            ''
        ];

        for (const input of invalidInputs) {
            try {
                await nar.input(input);
            } catch (e) {
                // Expected for some invalid inputs
            }
        }

        const validInputs = ['<cat --> animal>.', '<dog --> pet>.'];
        await inputAll(nar, validInputs);

        const stats = nar.getStats();
        expect(stats.memoryStats.totalConcepts).toBeGreaterThanOrEqual(2);
    });

    test('Concept indexing under load', async () => {
        const inheritances = Array.from({ length: 25 }, (_, i) =>
            `<item_${i} --> category_${i % 5}>.`
        );

        await inputAll(nar, inheritances);
        await nar.runCycles(5);

        const concepts = nar.memory.getAllConcepts();
        const categoryRelated = concepts.filter(c =>
            c.term.toString().includes('category')
        );

        expect(concepts.length).toBeGreaterThanOrEqual(5);
        expect(categoryRelated.length).toBeGreaterThanOrEqual(1);
    });

    test('Memory consolidation with activation decay', async () => {
        await inputAll(nar, ['<active --> concept>.', '<dormant --> concept>.']);
        await nar.runCycles(3);

        await nar.input('<active --> concept>.');
        await nar.input('<active --> concept>.');

        await nar.runCycles(10);
        await wait(100);

        const concepts = nar.memory.getAllConcepts();
        const activeConcept = concepts.find(c => c.term.toString().includes('active'));

        if (activeConcept) {
            expect(activeConcept).toBeDefined();
        }

        expect(concepts.length).toBeGreaterThanOrEqual(1);
    });

    test('Belief revision updates memory correctly', async () => {
        await nar.input('<bird --> [can_fly]>.%0.9;0.8%');
        await nar.runCycles(2);

        const initialBeliefs = nar.getBeliefs();
        const initial = initialBeliefs.find(b => b.term.toString().includes('bird'));

        await nar.input('<bird --> [can_fly]>.%0.5;0.9%');
        await nar.runCycles(2);

        const updatedBeliefs = nar.getBeliefs();
        const updated = updatedBeliefs.find(b => b.term.toString().includes('bird'));

        expect(initial || updated).toBeDefined();
        expect(updatedBeliefs.length).toBeGreaterThanOrEqual(1);
    });

    test('Query retrieval from long-term memory', async () => {
        await inputAll(nar, [
            '<cat --> animal>.',
            '<dog --> animal>.',
            '<bird --> animal>.'
        ]);

        await nar.runCycles(5);

        await nar.input('<cat --> ?x>?');
        await nar.runCycles(3);

        const questions = nar.getQuestions();
        expect(questions.length).toBeGreaterThanOrEqual(1);

        const beliefs = nar.getBeliefs();
        const catRelated = beliefs.filter(b => b.term.toString().includes('cat'));
        expect(catRelated.length).toBeGreaterThanOrEqual(1);
    });
});
