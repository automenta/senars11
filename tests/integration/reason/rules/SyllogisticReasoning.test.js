/**
 * Basic syllogism tests using the new TestNAR framework.
 */

import { TaskMatch, TestNAR } from '../../../../core/src/testing/TestNAR.js';

describe('Syllogistic Reasoning Tests', () => {
    it('should derive (a ==> c) from (a ==> b) and (b ==> c) with correct truth value', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('(b ==> c)', 0.8, 0.8)
            .run(1)
            .expect(new TaskMatch('(a ==> c)').withFlexibleTruth(0.71, 0.51, 0.25))
            .expectNot('(c ==> a)')
            .execute();

        expect(result).toBe(true);
    });
});