import { AgentBuilder } from '../../../agent/src/agent/AgentBuilder.js';
import { Agent } from '../../../agent/src/agent/Agent.js';
import { NAR } from '../../../core/src/nar/NAR.js';

describe('AgentBuilder', () => {
    let agent;

    afterEach(async () => {
        if (agent?.dispose) await agent.dispose();
        else if (agent?.stop) agent.stop();
        agent = null;
    });

    const build = async (builder = new AgentBuilder()) => {
        agent = await builder.build();
        return agent;
    };

    test('default configuration', async () => {
        const a = await build();
        expect(a).toBeInstanceOf(Agent);
        expect(a).toBeInstanceOf(NAR);
        expect(a.evaluator).toBeDefined();
        expect(a.inputQueue).toBeDefined();
    });

    test('individual subsystems enabled', async () => {
        expect((await build(new AgentBuilder().withMetrics(true))).metricsMonitor).toBeDefined();
        expect((await build(new AgentBuilder().withEmbeddings({
            enabled: true,
            model: 'test'
        }))).embeddingLayer).toBeDefined();
        expect((await build(new AgentBuilder().withLM(true).withConfig({ lm: { modelName: 'test-model' } }))).lm).toBeDefined();
        expect((await build(new AgentBuilder().withTools(true))).tools).toBeDefined();
    });

    test('functors configured', async () => {
        const a = await build(new AgentBuilder().withFunctors(['core-arithmetic']));
        const reg = a.evaluator.getFunctorRegistry();
        expect(reg.has('add')).toBe(true);
        expect(reg.has('multiply')).toBe(true);
    });

    test('configuration object', async () => {
        const config = {
            subsystems: {
                metrics: true, embeddingLayer: { enabled: true },
                functors: ['core-arithmetic'], rules: ['syllogistic-core'],
                tools: false, lm: true
            },
            lm: { modelName: 'test-model' }
        };
        const a = await build(new AgentBuilder().withConfig(config));

        expect(a.metricsMonitor).toBeDefined();
        expect(a.embeddingLayer).toBeDefined();
        expect(a.lm).toBeDefined();
        expect(a.evaluator.getFunctorRegistry().has('add')).toBe(true);
    });

    test('selective disabling', async () => {
        const config = {
            subsystems: {
                metrics: false, embeddingLayer: { enabled: false },
                tools: false, lm: false, functors: []
            }
        };
        const a = await build(new AgentBuilder().withConfig(config));

        expect(a.embeddingLayer).toBeNull();
        expect(a.lm).toBeNull();
        expect(a.tools).toBeNull();
    });
});
