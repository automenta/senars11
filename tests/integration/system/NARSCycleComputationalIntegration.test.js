import {NAR} from '../../../core/src/nar/NAR.js';

describe('NARS Inference Cycle Integration with Computational Operations', () => {
    let nar;

    beforeEach(() => {
        nar = new NAR();
    });

    afterEach(async () => {
        // Properly dispose of the NAR to prevent asynchronous operation issues
        if (nar && typeof nar.dispose === 'function') {
            await nar.dispose();
        }
    });

    test('computational operations should integrate with NARS cycle', async () => {
        try {
            const success = await nar.input('(add(3, 2) --> 5).');
            expect(success).toBe(true);

            const results = await nar.step();

            expect(results).toBeDefined();

            const memoryStats = nar.memory.getDetailedStats();
            expect(memoryStats).toBeDefined();
        } catch (error) {
            console.error("Error in computational operations test:", error.message);
            throw error;
        }
    });

    test('equation solving results should be properly integrated into NARS memory', async () => {
        try {
            const success = await nar.input('(multiply(2, 3) --> 6).');
            expect(success).toBe(true);

            const cycleResult = await nar.step();

            expect(cycleResult).toBeDefined();
        } catch (error) {
            console.error("Error in equation solving test:", error.message);
            throw error;
        }
    });

    test('higher-order pattern matching should work within NARS cycle', async () => {
        try {
            const success = await nar.input('((Human ==> Mortal) --> Truth).');
            expect(success).toBe(true);

            const cycleResult = await nar.step();

            expect(cycleResult).toBeDefined();
        } catch (error) {
            console.error("Error in higher-order pattern matching test:", error.message);
            throw error;
        }
    });
});