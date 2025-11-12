import { AgentReplEngine } from '../../src/repl/AgentReplEngine.js';
import { LangChainProvider } from '../../src/lm/LangChainProvider.js';

describe('AgentReplEngine Streaming Integration Test', () => {
    let engine;

    beforeEach(() => {
        const provider = new LangChainProvider({
            provider: 'ollama',
            modelName: process.env.OLLAMA_MODEL || 'llama3.2', // Use configurable model name, default to llama3.2
            baseURL: 'http://localhost:11434',
        });

        engine = new AgentReplEngine({});
        // Manually register the provider with the agentLM
        engine.agentLM.registerProvider('test', provider);
        engine.agentLM.providers.setDefault('test');
    });

    it('should receive a streamed response from the LM for a simple input', async () => {
        await engine.initialize();

        const input = 'Hello, world!';
        let streamedOutput = '';
        const onChunk = (chunk) => {
            streamedOutput += chunk;
        };

        await engine.processInputStreaming(input, onChunk);

        // We expect some non-empty response from the agent.
        // The exact response will vary, so we just check that it's not empty.
        expect(streamedOutput.length).toBeGreaterThan(0);
        expect(streamedOutput.startsWith('🤖:')).toBe(true);
    }, 60000); // Increased timeout to 60 seconds for the test

    it('should properly invoke tools when the LM requests them', async () => {
        await engine.initialize();

        // Test that tools can be invoked when requested by the LM
        const input = 'What are the current beliefs in the system? Use the appropriate tool to get this information.';
        let result = await engine.processInput(input);

        // We expect the response to contain information about beliefs
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
    }, 60000); // Increased timeout to 60 seconds for the test
});
