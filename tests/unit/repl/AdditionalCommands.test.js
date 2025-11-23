import {ReplMessageHandler} from '../../../src/repl/ReplMessageHandler.js';
import {jest} from '@jest/globals';

describe('ReplMessageHandler - Additional Commands', () => {
    let handler;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            processInput: jest.fn(),
            config: { test: 'value', nested: { val: 1 } },
            verbose: false,
            getConcepts: jest.fn().mockReturnValue([{term: 'test', priority: 0.9, activation: 0.8}]),
            getBeliefs: jest.fn().mockReturnValue([]),
            getConceptPriorities: jest.fn().mockReturnValue([{term: 'test', priority: 0.9, activation: 0.8}]),
            on: jest.fn(),
            _watchers: []
        };
        handler = new ReplMessageHandler(mockEngine);
    });

    test('config command works', async () => {
        const result = await handler.processMessage({type: '/config test'});
        expect(result).toContain('test');
        expect(result).toContain('value');
    });

    test('verbose command works', async () => {
        const result = await handler.processMessage({type: '/verbose on'});
        expect(result).toContain('Verbose mode enabled');
        expect(mockEngine.verbose).toBe(true);
    });

    test('priority command works', async () => {
        const result = await handler.processMessage({type: '/priority'});
        expect(result).toContain('Priority Queue');
        expect(result).toContain('0.900');
    });

    test('batch command works', async () => {
        mockEngine.executeCommand = jest.fn().mockResolvedValue('Command executed');
        mockEngine.processInput.mockResolvedValue('Input processed');

        // Note: batch command splits by args. If we pass "/verbose on", it treats it as 2 args "/verbose" and "on".
        // The implementation says: for (const cmd of args) ...
        // So "/batch /verbose" should work.

        const result = await handler.processMessage({type: '/batch /config'});
        expect(result).toContain('> /config');
        // It calls executeCommand for /config
        expect(mockEngine.executeCommand).toHaveBeenCalledWith('config');
    });
});
