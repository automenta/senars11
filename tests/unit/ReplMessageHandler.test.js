import {ReplMessageHandler} from '../../src/repl/ReplMessageHandler.js';
import {jest} from '@jest/globals';

describe('ReplMessageHandler', () => {
    let handler;
    let mockEngine;

    beforeEach(() => {
        mockEngine = {
            processInput: jest.fn(),
            executeCommand: jest.fn(),
            persistenceManager: {
                loadFromPath: jest.fn().mockResolvedValue({some: 'state'})
            },
            deserialize: jest.fn().mockResolvedValue(true),
            _run: jest.fn().mockResolvedValue('Run started'),
            agentLM: {
                providers: {
                    defaultProviderId: 'test-provider',
                    get: jest.fn().mockReturnValue({
                        tools: [{name: 'test-tool', description: 'A test tool'}]
                    })
                }
            },
            nar: {
                getAvailableTools: jest.fn().mockReturnValue(['nar-tool']),
                mcp: {
                    getAvailableTools: jest.fn().mockReturnValue({allTools: ['mcp-tool']})
                }
            }
        };
        handler = new ReplMessageHandler(mockEngine);
    });

    test('processMessage handles direct agent input', async () => {
        mockEngine.processInput.mockResolvedValue('Processed');
        const result = await handler.processMessage({type: 'agent/input', payload: 'Hello'});
        expect(mockEngine.processInput).toHaveBeenCalledWith('Hello');
        // Agent input handler returns object
        expect(result.payload.result).toBe('Processed');
    });

    test('processMessage handles slash commands mapped to engine methods', async () => {
        // Direct slash command returns string from handler
        const result = await handler.processMessage({type: '/run'});
        expect(mockEngine._run).toHaveBeenCalled();
        expect(result).toBe('Run started');
    });

    test('tools command generates report', async () => {
        const result = await handler.processMessage({type: '/tools'});
        // Direct slash command returns string
        const report = result;
        expect(report).toContain('Tools/MCP Configuration');
        expect(report).toContain('test-tool');
        expect(report).toContain('nar-tool');
        expect(report).toContain('mcp-tool');
    });

    test('load command validates path', async () => {
        const result = await handler.processMessage({type: '/load ../secret.json'});
        expect(result).toContain('Invalid path');
    });

    test('load command calls persistence manager', async () => {
        const result = await handler.processMessage({type: '/load test.json'});
        expect(mockEngine.persistenceManager.loadFromPath).toHaveBeenCalled();
        expect(mockEngine.deserialize).toHaveBeenCalledWith({some: 'state'});
        expect(result).toContain('Session loaded');
    });
});
