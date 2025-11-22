import {TermFactory} from '../core/TermFactory.js';
import {TermType} from '../core/Term.js';
import {parse} from '../core/parser/narsese.js';

describe('Core Domain', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    test('TermFactory creates Atomic Terms', () => {
        const cat = termFactory.create('cat');
        expect(cat.type).toBe(TermType.ATOM);
        expect(cat.name).toBe('cat');
        // Cache check
        const cat2 = termFactory.create('cat');
        expect(cat2).toBe(cat); // Reference equality
    });

    test('TermFactory creates Compound Terms', () => {
        const a = termFactory.create('a');
        const b = termFactory.create('b');
        const term = termFactory.create({operator: '-->', components: [a, b]});
        expect(term.type).toBe(TermType.COMPOUND);
        expect(term.name).toBe('(a --> b)');
    });

    test('TermFactory Normalization (Commutativity)', () => {
        // (&, a, b) == (&, b, a)
        const t1 = termFactory.create({operator: '&', components: ['a', 'b']});
        const t2 = termFactory.create({operator: '&', components: ['b', 'a']});
        expect(t1).toBe(t2);
        expect(t1.name).toBe('(&, a, b)');
    });

    test('TermFactory Normalization (Associativity)', () => {
        // (&, a, (&, b, c)) -> (&, a, b, c)
        const inner = termFactory.create({operator: '&', components: ['b', 'c']});
        const outer = termFactory.create({operator: '&', components: ['a', inner]});
        expect(outer.components.length).toBe(3);
        expect(outer.name).toBe('(&, a, b, c)');
    });

    test('Parser Integration', () => {
        const result = parse('(cat --> animal).', {termFactory});
        expect(result.term.name).toBe('(cat --> animal)');
        expect(result.taskType).toBe('BELIEF');
        expect(result.punctuation).toBe('.');
    });

    test('Parser Truth Value', () => {
        const result = parse('(bird --> animal). %1.0;0.9%', {termFactory});
        expect(result.truthValue.frequency).toBe(1.0);
        expect(result.truthValue.confidence).toBe(0.9);
    });
});
