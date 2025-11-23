import {ReplMessageHandler} from '../../src/repl/ReplMessageHandler.js';
import {jest} from '@jest/globals';

describe('ReplMessageHandler', () => {
    let handler;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            processInput: jest.fn(),
            executeCommand: jest.fn().mockImplementation(async (cmd, ...args) => {
                if (cmd === 'run') return 'Run started';
                if (cmd === 'tools') return 'Tools report...';
                if (cmd === 'load') return 'Session loaded';
                return `Unknown command: ${cmd}`;
            }),
            persistenceManager: {
                loadFromPath: jest.fn()
            },
            _run: jest.fn().mockResolvedValue('Run started')
        };
        handler = new ReplMessageHandler(mockEngine);
    });

    test('processMessage handles direct agent input', async () => {
        mockEngine.processInput.mockResolvedValue('Processed');
        const result = await handler.processMessage({type: 'agent/input', payload: 'Hello'});
        expect(mockEngine.processInput).toHaveBeenCalledWith('Hello');
        expect(result.payload.result).toBe('Processed');
    });

    test('processMessage handles slash commands mapped to engine methods', async () => {
        const result = await handler.processMessage({type: '/run'});
        expect(mockEngine._run).toHaveBeenCalled();
        expect(result).toBe('Run started');
    });

    test('processMessage delegates tools command to executeCommand', async () => {
        const result = await handler.processMessage({type: '/tools'});
        expect(mockEngine.executeCommand).toHaveBeenCalledWith('tools');
        expect(result).toBe('Tools report...');
    });

    test('processMessage delegates load command to executeCommand', async () => {
        const result = await handler.processMessage({type: '/load test.json'});
        expect(mockEngine.executeCommand).toHaveBeenCalledWith('load', 'test.json');
        expect(result).toBe('Session loaded');
    });
});
