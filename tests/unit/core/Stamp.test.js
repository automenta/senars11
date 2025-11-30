import {ArrayStamp, Stamp} from '../../../src/Stamp.js';

describe('Stamp', () => {
    test('initialization', () => {
        const opts = { id: 'test-id', creationTime: 12345, source: 'INPUT', derivations: ['d1', 'd2'] };
        const stamp = new ArrayStamp(opts);
        expect(stamp).toBeInstanceOf(ArrayStamp);
        expect(stamp).toMatchObject(opts);
    });

    test('immutability', () => {
        const stamp = new ArrayStamp({id: 's1'});
        expect(() => stamp.id = 'new-id').toThrow();
        expect(() => stamp.derivations.push('d3')).toThrow();
    });

    test('static createInput', () => {
        const s = Stamp.createInput();
        expect(s).toBeInstanceOf(ArrayStamp);
        expect(s).toMatchObject({ source: 'INPUT', derivations: [] });
        expect(Math.abs(s.creationTime - Date.now())).toBeLessThanOrEqual(1000);
    });

    test('derive', () => {
        const [p1, p2, p3, p4] = [
            new ArrayStamp({id: 'p1', derivations: ['d1']}),
            new ArrayStamp({id: 'p2', derivations: ['d2']}),
            new ArrayStamp({id: 'p3', derivations: ['d1', 'd2']}),
            new ArrayStamp({id: 'p4', derivations: ['d2', 'd3']})
        ];

        const d1 = Stamp.derive([p1, p2]);
        expect(d1.source).toBe('DERIVED');
        expect(d1.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));
        expect(d1.derivations).toHaveLength(4);

        const d2 = Stamp.derive([p3, p4]);
        expect(d2.derivations).toEqual(expect.arrayContaining(['p3', 'p4', 'd1', 'd2', 'd3']));
        expect(d2.derivations).toHaveLength(5);
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
