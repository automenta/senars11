import {Reasoner} from '../engine/Reasoner.js';
import {parse} from '../core/parser/narsese.js';

describe('Reasoner Engine', () => {
    let reasoner;

    beforeEach(() => {
        reasoner = new Reasoner();
    });

    test('Derivation: A->B, B->C -> A->C', () => {
        // 1. Input A->B
        const task1 = parse('(A --> B).', {termFactory: reasoner.termFactory});
        reasoner.input(task1);

        // 2. Input B->C
        const task2 = parse('(B --> C).', {termFactory: reasoner.termFactory});
        reasoner.input(task2);

        // 3. Run
        let derived = null;
        reasoner.eventBus.on('derivation', (data) => {
            if (data.task.term.name === '(A --> C)') {
                derived = data.task;
            }
        });

        reasoner.run(10);

        expect(derived).not.toBeNull();
        expect(derived.term.name).toBe('(A --> C)');
    });
});
