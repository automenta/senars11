import {Reasoner} from '../engine/Reasoner.js';
import {TaskType} from '../core/Task.js';
import {parse} from '../core/parser/narsese.js';
import {jest} from '@jest/globals';

describe('Execution Rule', () => {
    let reasoner;

    beforeEach(() => {
        reasoner = new Reasoner();
    });

    test('Math Operation: (add ^ (1, 2))!', () => {
        const task = parse('(add ^ (1, 2))!', {termFactory: reasoner.termFactory});
        reasoner.input(task);

        let result = null;
        reasoner.eventBus.on('derivation', (data) => {
            // Look for result of execution
            if (data.task.term.operator === '-->' &&
                data.task.term.components[1].name === '3') {
                result = data.task;
            }
        });

        reasoner.run(5);

        expect(result).not.toBeNull();
        expect(result.term.components[0].name).toBe('(add ^ (1, 2))');
        expect(result.term.components[1].name).toBe('3');
    });

    test('IO Operation: (log ^ Test)!', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const task = parse('(log ^ Test)!', {termFactory: reasoner.termFactory});
        reasoner.input(task);

        reasoner.run(5);

        expect(logSpy).toHaveBeenCalledWith('OP LOG:', 'Test');
        logSpy.mockRestore();
    });
});
