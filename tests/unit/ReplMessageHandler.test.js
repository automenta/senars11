import {ReplMessageHandler} from '../../src/repl/ReplMessageHandler.js';
import {jest} from '@jest/globals';

describe('ReplMessageHandler', () => {
    let handler;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            processInput: jest.fn(),
            executeCommand: jest.fn().mockImplementation(async (cmd, ...args) => {
                 return `Fallback: ${cmd}`;
            }),
            persistenceManager: {
                loadFromPath: jest.fn()
            },
            _run: jest.fn().mockResolvedValue('Run started'),
            _stop: jest.fn(),
            _stopRun: jest.fn(),
            load: jest.fn().mockResolvedValue(true),
            save: jest.fn().mockResolvedValue({identifier: 'test', size: 100}),
            getStats: jest.fn().mockReturnValue({}),
            getBeliefs: jest.fn().mockReturnValue([]),
            getGoals: jest.fn().mockReturnValue([]),
            // Mock properties accessed by commands
            config: {},
            getQuestions: jest.fn().mockReturnValue([]),
            getHistory: jest.fn().mockReturnValue([]),
            getConcepts: jest.fn().mockReturnValue([])
        };
        handler = new ReplMessageHandler(mockEngine);
    });

    test('processMessage handles direct agent input', async () => {
        mockEngine.processInput.mockResolvedValue('Processed');
        const result = await handler.processMessage({type: 'agent/input', payload: 'Hello'});
        expect(mockEngine.processInput).toHaveBeenCalledWith('Hello');
        expect(result.payload.result).toBe('Processed');
    });

    test('processMessage handles slash commands mapped to engine methods (run)', async () => {
        const result = await handler.processMessage({type: '/run'});
        expect(mockEngine._run).toHaveBeenCalled();
        // StartCommand returns this message
        expect(result).toContain('Execution started');
    });

    test('processMessage handles tools command via Registry', async () => {
        const result = await handler.processMessage({type: '/tools'});
        expect(mockEngine.executeCommand).not.toHaveBeenCalled();
        expect(result).toContain('Tools/MCP Configuration');
    });

    test('processMessage handles load command via Registry', async () => {
        const result = await handler.processMessage({type: '/load test.json'});
        expect(mockEngine.load).toHaveBeenCalledWith('test.json');
        expect(result).toContain('Loaded from test.json');
    });

    test('processMessage delegates unknown command to executeCommand', async () => {
        const result = await handler.processMessage({type: '/unknowncmd'});
        expect(mockEngine.executeCommand).toHaveBeenCalledWith('unknowncmd');
        expect(result).toBe('Fallback: unknowncmd');
    });
});
