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
        expect(stamp).toMatchObject({
            id: 'test-id',
            creationTime: 12345,
            source: 'INPUT',
            derivations: ['d1', 'd2']
        });
    });

    test('immutability', () => {
        const stamp = new ArrayStamp({id: 's1'});
        expect(() => { stamp.id = 'new-id'; }).toThrow();
        expect(() => { stamp.derivations.push('d3'); }).toThrow();
    });

    test('static createInput', () => {
        const inputStamp = Stamp.createInput();
        expect(inputStamp).toBeInstanceOf(ArrayStamp);
        expect(inputStamp).toMatchObject({
            source: 'INPUT',
            derivations: []
        });
        const now = Date.now();
        expect(Math.abs(inputStamp.creationTime - now)).toBeLessThanOrEqual(1000);
    });

    test('derive', () => {
        const [p1, p2, p3, p4] = [
            new ArrayStamp({id: 'p1', derivations: ['d1']}),
            new ArrayStamp({id: 'p2', derivations: ['d2']}),
            new ArrayStamp({id: 'p3', derivations: ['d1', 'd2']}),
            new ArrayStamp({id: 'p4', derivations: ['d2', 'd3']})
        ];

        const derived1 = Stamp.derive([p1, p2]);
        expect(derived1.source).toBe('DERIVED');
        expect(derived1.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));
        expect(derived1.derivations).toHaveLength(4);

        const derived2 = Stamp.derive([p3, p4]);
        expect(derived2.derivations).toEqual(expect.arrayContaining(['p3', 'p4', 'd1', 'd2', 'd3']));
        expect(derived2.derivations).toHaveLength(5);
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
