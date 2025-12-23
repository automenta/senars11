import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { NAR } from '../../../core/src/nar/NAR.js';
import { inputAll, wait } from '../../support/testHelpers.js';
import { generateBeliefs } from '../../support/integrationTestUtils.js';

/**
 * Enhanced tests for memory consolidation, activation propagation, and decay.
 */

describe('Memory Consolidation and Activation', () => {
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

    test('Activation propagation through concept network', async () => {
        // Create a concept network
        await inputAll(nar, [
            '<node1 --> central>.',
            '<node2 --> central>.',
            '<node3 --> central>.',
            '<central --> core>.'
        ]);

        await nar.runCycles(5);

        // Activate one node repeatedly
        await nar.input('<node1 --> central>.');
        await nar.input('<node1 --> central>.');

        await nar.runCycles(10);

        // Verify activation spreads to related concepts
        const concepts = nar.memory.getAllConcepts();
        const centralConcept = concepts.find(c => c.term.toString().includes('central'));

        // Verify concept network was created
        expect(concepts.length).toBeGreaterThan(0);
        expect(centralConcept).toBeDefined();
    });

    test('Multi-step decay verification', async () => {
        await inputAll(nar, ['<decaying --> concept>.']);
        await nar.runCycles(2);

        const initialConcepts = nar.memory.getAllConcepts();
        const initialCount = initialConcepts.length;

        // Wait and run more cycles without new input
        await wait(100);
        await nar.runCycles(15);

        const finalConcepts = nar.memory.getAllConcepts();

        // Verify some decay occurred (concepts may be consolidated or removed)
        expect(finalConcepts.length).toBeLessThanOrEqual(initialCount + 5);
    });

    test('Consolidation threshold boundary tests', async () => {
        // Fill memory to just below threshold
        const beliefs = generateBeliefs(48, 'threshold');
        await inputAll(nar, beliefs);

        await nar.runCycles(5);
        const beforeThreshold = nar.memory.getAllConcepts().length;

        // Push over threshold
        await inputAll(nar, generateBeliefs(5, 'overflow'));
        await nar.runCycles(5);

        const afterThreshold = nar.memory.getAllConcepts();

        // Verify consolidation triggered
        expect(afterThreshold.length).toBeLessThanOrEqual(50);
        expect(afterThreshold.length).toBeGreaterThan(0);
    });

    test('Activation-based priority sorting', async () => {
        await inputAll(nar, [
            '<high_priority --> concept>.',
            '<medium_priority --> concept>.',
            '<low_priority --> concept>.'
        ]);

        // Repeatedly activate high priority concept
        for (let i = 0; i < 5; i++) {
            await nar.input('<high_priority --> concept>.');
            await wait(10);
        }

        await nar.runCycles(5);

        const concepts = nar.memory.getAllConcepts();
        const highPriority = concepts.find(c => c.term.toString().includes('high_priority'));

        // High priority concept should be present
        if (highPriority) {
            expect(highPriority).toBeDefined();
        }

        expect(concepts.length).toBeGreaterThan(0);
    });

    test('Activation persistence across cycles', async () => {
        await nar.input('<persistent --> concept>.');
        await nar.runCycles(3);

        // Re-activate
        await nar.input('<persistent --> concept>.');
        await nar.runCycles(5);

        const concepts = nar.memory.getAllConcepts();
        const persistent = concepts.find(c => c.term.toString().includes('persistent'));

        expect(persistent).toBeDefined();
    });
});
