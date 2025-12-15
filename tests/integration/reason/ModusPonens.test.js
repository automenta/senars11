import { TaskMatch, TestNAR } from '../../../core/src/testing/TestNAR.js';

describe('Modus Ponens', () => {
    test('derive b from (a ==> b) and a', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(1)
            .expect(new TaskMatch('b').withFlexibleTruth(0.72, 0.65, 0.05))
            .execute();

        expect(result).toBe(true);
    });

    test('no derivation without antecedent', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .run(1)
            .expectNot('b')
            .execute();

        expect(result).toBe(true);
    });

    test('complex terms', async () => {
        const result = await new TestNAR()
            .input('(sunny_day ==> good_mood)', 0.85, 0.9)
            .input('sunny_day', 0.9, 0.85)
            .run(1)
            .expect(new TaskMatch('good_mood').withFlexibleTruth(0.77, 0.69, 0.05))
            .execute();

        expect(result).toBe(true);
    });
});
