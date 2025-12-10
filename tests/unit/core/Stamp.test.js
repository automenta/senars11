import {ArrayStamp, Stamp} from '../../../core/src/Stamp.js';

describe('Stamp', () => {
    test('initialization', () => {
        const opts = {id: 'test-id', creationTime: 12345, source: 'INPUT', derivations: ['d1', 'd2']};
        const stamp = new ArrayStamp(opts);
        expect(stamp).toMatchObject(opts);
        expect(stamp.occurrenceTime).toBe(12345);
    });

    test('immutability', () => {
        const stamp = new ArrayStamp({id: 's1'});
        expect(Object.isFrozen(stamp)).toBe(true);
        expect(Object.isFrozen(stamp.derivations)).toBe(true);
        expect(() => stamp.id = 'new-id').toThrow();
        expect(() => stamp.derivations.push('new')).toThrow();
    });

    test('static createInput', () => {
        const s = Stamp.createInput();
        expect(s).toMatchObject({source: 'INPUT', derivations: []});
        expect(Math.abs(s.creationTime - Date.now())).toBeLessThanOrEqual(1000);
    });

    test('derive', () => {
        const [p1, p2, p3] = [
            new ArrayStamp({id: 'p1', derivations: ['d1'], depth: 1}),
            new ArrayStamp({id: 'p2', derivations: ['d2'], depth: 2}),
            new ArrayStamp({id: 'p3', derivations: [], depth: 0})
        ];

        const d1 = Stamp.derive([p1, p2]);
        expect(d1).toMatchObject({source: 'DERIVED', depth: 3});
        expect(d1.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));

        const d2 = Stamp.derive([p3]);
        expect(d2.depth).toBe(1);
    });

    test('equality', () => {
        const s1 = new ArrayStamp({id: 's1'});
        expect(s1.equals(new ArrayStamp({id: 's1'}))).toBe(true);
        expect(s1.equals(new ArrayStamp({id: 's2'}))).toBe(false);
        expect(s1.equals(null)).toBe(false);
    });

    test('unique ID generation', () => {
        expect(new ArrayStamp().id).not.toBe(new ArrayStamp().id);
    });
});
