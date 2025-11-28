import { AgentBuilder } from '../src/agent/AgentBuilder.js';
import { Agent } from '../src/agent/Agent.js';
import { NAR } from '../src/nar/NAR.js';

describe('AgentBuilder', () => {
    let agent;

    afterEach(async () => {
        if (agent?.dispose) await agent.dispose();
        else if (agent?.stop) agent.stop();
        agent = null;
    });

    test('should create an agent with default configuration', async () => {
        agent = await new AgentBuilder().build();

        expect(agent).toBeInstanceOf(Agent);
        expect(agent).toBeInstanceOf(NAR);
        expect(agent.evaluator).toBeDefined(); // NAR has getter evaluator
        expect(agent.inputQueue).toBeDefined(); // Agent has inputQueue
    });

    test.each([
        { method: 'withMetrics', prop: 'metricsMonitor', value: true },
        { method: 'withLM', prop: 'lm', value: true },
        { method: 'withTools', prop: 'tools', value: true }
    ])('should create an agent with $method', async ({ method, prop, value }) => {
        agent = await new AgentBuilder()[method](value).build();
        expect(agent[prop]).toBeDefined();
    });

    test('should create an agent with embeddings enabled', async () => {
        agent = await new AgentBuilder()
            .withEmbeddings({ enabled: true, model: 'test-model' })
            .build();

        expect(agent.embeddingLayer).toBeDefined();
    });

    test('should create an agent with functors configured', async () => {
        agent = await new AgentBuilder()
            .withFunctors(['core-arithmetic'])
            .build();

        const functorRegistry = agent.evaluator.getFunctorRegistry();
        expect(functorRegistry.has('add')).toBe(true);
        expect(functorRegistry.has('multiply')).toBe(true);
    });

    test('should create an agent with configuration object', async () => {
        agent = await new AgentBuilder()
            .withConfig({
                subsystems: {
                    metrics: true,
                    embeddingLayer: { enabled: true },
                    functors: ['core-arithmetic'],
                    rules: ['syllogistic-core'],
                    tools: false,
                    lm: true
                }
            })
            .build();

        expect(agent.metricsMonitor).toBeDefined();
        expect(agent.embeddingLayer).toBeDefined();
        expect(agent.lm).toBeDefined();

        const functorRegistry = agent.evaluator.getFunctorRegistry();
        expect(functorRegistry.has('add')).toBe(true);
    });

    test('should allow selective subsystem disabling', async () => {
        agent = await new AgentBuilder()
            .withConfig({
                subsystems: {
                    metrics: false,
                    embeddingLayer: { enabled: false },
                    tools: false,
                    lm: false
                }
            })
            .build();

        expect(agent.embeddingLayer).toBeNull();
        expect(agent.lm).toBeNull();
        expect(agent.tools).toBeNull();
    });
});
