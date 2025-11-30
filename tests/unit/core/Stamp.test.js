import {ArrayStamp, Stamp} from '../../../src/Stamp.js';

describe('Stamp', () => {
    test('initialization', () => {
        const stamp = new ArrayStamp({
            id: 'test-id',
            creationTime: 12345,
            source: 'INPUT',
            derivations: ['d1', 'd2'],
        });

        expect(stamp).toBeInstanceOf(ArrayStamp);
        expect(stamp.id).toBe('test-id');
        expect(stamp.creationTime).toBe(12345);
        expect(stamp.source).toBe('INPUT');
        expect(stamp.derivations).toEqual(['d1', 'd2']);
    });

    test('immutability', () => {
        const stamp = new ArrayStamp({id: 's1'});
        expect(() => { stamp.id = 'new-id'; }).toThrow();
        expect(() => { stamp.derivations.push('d3'); }).toThrow();
    });

    test('static createInput', () => {
        const inputStamp = Stamp.createInput();
        expect(inputStamp).toBeInstanceOf(ArrayStamp);
        expect(inputStamp.source).toBe('INPUT');
        expect(inputStamp.derivations).toHaveLength(0);
        const now = Date.now();
        expect(inputStamp.creationTime).toBeGreaterThanOrEqual(now - 1000);
        expect(inputStamp.creationTime).toBeLessThanOrEqual(now + 1000);
    });

    test('derive', () => {
        const p1 = new ArrayStamp({id: 'p1', derivations: ['d1']});
        const p2 = new ArrayStamp({id: 'p2', derivations: ['d2']});
        const derived1 = Stamp.derive([p1, p2]);

        expect(derived1.source).toBe('DERIVED');
        expect(derived1.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));
        expect(derived1.derivations).toHaveLength(4);

        const p3 = new ArrayStamp({id: 'p3', derivations: ['d1', 'd2']});
        const p4 = new ArrayStamp({id: 'p4', derivations: ['d2', 'd3']});
        const derived2 = Stamp.derive([p3, p4]);

        expect(derived2.derivations).toEqual(expect.arrayContaining(['p3', 'p4', 'd1', 'd2', 'd3']));
        expect(derived2.derivations).toHaveLength(5);
    });

    test('equality', () => {
        const s1 = new ArrayStamp({id: 's1'});
        const s1Clone = new ArrayStamp({id: 's1'});
        const s2 = new ArrayStamp({id: 's2'});

        expect(s1.equals(s1Clone)).toBe(true);
        expect(s1.equals(s2)).toBe(false);
        expect(s1.equals(null)).toBe(false);
    });

    test('unique ID generation', () => {
        expect(new ArrayStamp().id).not.toBe(new ArrayStamp().id);
    });
});
