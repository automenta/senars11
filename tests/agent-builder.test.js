import { AgentBuilder } from '../src/agent/AgentBuilder.js';
import { Agent } from '../src/agent/Agent.js';
import { NAR } from '../src/nar/NAR.js';

describe('AgentBuilder', () => {
    let agent;

    afterEach(async () => {
        if (agent) {
            if (typeof agent.dispose === 'function') {
                await agent.dispose();
            } else if (typeof agent.stop === 'function') {
                agent.stop();
            }
            agent = null;
        }
    });

    test('should create an agent with default configuration', async () => {
        agent = await new AgentBuilder().build();

        expect(agent).toBeInstanceOf(Agent);
        expect(agent).toBeInstanceOf(NAR);
        expect(agent.evaluator).toBeDefined(); // NAR has getter evaluator
        expect(agent.inputQueue).toBeDefined(); // Agent has inputQueue
    });

    test('should create an agent with metrics enabled', async () => {
        agent = await new AgentBuilder()
            .withMetrics(true)
            .build();

        expect(agent.metricsMonitor).toBeDefined();
    });

    test('should create an agent with embeddings enabled', async () => {
        agent = await new AgentBuilder()
            .withEmbeddings({ enabled: true, model: 'test-model' })
            .build();

        expect(agent.embeddingLayer).toBeDefined();
    });

    test('should create an agent with LM enabled', async () => {
        agent = await new AgentBuilder()
            .withLM(true)
            .build();

        expect(agent.lm).toBeDefined();
    });

    test('should create an agent with tools enabled', async () => {
        agent = await new AgentBuilder()
            .withTools(true)
            .build();

        expect(agent.tools).toBeDefined();
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
