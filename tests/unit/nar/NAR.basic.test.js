import { NAR } from '../../../src/nar/NAR.js';

describe('NAR - Basic Functionality', () => {
    let nar;

    beforeEach(async () => {
        nar = new NAR();
        await nar.initialize();
    });

    test('should handle basic atomic terms', async () => {
        const success = await nar.input('cat.');
        expect(success).toBe(true);

        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBeGreaterThan(0);
        expect(beliefs[0].term.toString()).toContain('cat');
    });

    test('should handle spaced compounds', async () => {
        const success = await nar.input('(cat --> dog).');
        expect(success).toBe(true);

        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBeGreaterThan(0);
    });

    test('should handle tight compounds', async () => {
        const success = await nar.input('(cat-->dog).');
        expect(success).toBe(true);

        const beliefs = nar.getBeliefs();
        expect(beliefs.length).toBeGreaterThan(0);
    });
});