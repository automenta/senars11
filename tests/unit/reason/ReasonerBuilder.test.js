import {jest} from '@jest/globals';
import {ReasonerBuilder} from '../../../src/reason/ReasonerBuilder.js';
import {TaskBagPremiseSource} from '../../../src/reason/TaskBagPremiseSource.js';
import {Strategy} from '../../../src/reason/Strategy.js';
import {RuleProcessor} from '../../../src/reason/RuleProcessor.js';
import {Focus} from '../../../src/memory/Focus.js';
import {createTestMemory} from '../../support/baseTestUtils.js';

describe('ReasonerBuilder', () => {
    let context;
    let focus;
    let memory;

    beforeEach(() => {
        memory = createTestMemory();
        focus = new Focus();
        context = {
            focus,
            memory,
            termFactory: {} // Mock termFactory
        };
    });

    test('should build a reasoner with default components', () => {
        const builder = new ReasonerBuilder(context);
        const reasoner = builder.build();

        expect(reasoner).toBeDefined();
        expect(reasoner.premiseSource).toBeInstanceOf(TaskBagPremiseSource);
        expect(reasoner.strategy).toBeInstanceOf(Strategy);
        expect(reasoner.ruleProcessor).toBeInstanceOf(RuleProcessor);
    });

    test('should allow configuring the reasoner', () => {
        const config = {
            maxDerivationDepth: 5,
            cpuThrottleInterval: 10
        };
        const builder = new ReasonerBuilder(context).withConfig(config);
        const reasoner = builder.build();

        expect(reasoner.config.maxDerivationDepth).toBe(5);
        expect(reasoner.config.cpuThrottleInterval).toBe(10);
    });

    test('should allow injecting custom components', () => {
        const customPremiseSource = new TaskBagPremiseSource(focus);
        const customStrategy = new Strategy({focus, memory});

        const builder = new ReasonerBuilder(context)
            .withPremiseSource(customPremiseSource)
            .withStrategy(customStrategy);

        const reasoner = builder.build();

        expect(reasoner.premiseSource).toBe(customPremiseSource);
        expect(reasoner.strategy).toBe(customStrategy);
        // RuleProcessor should be default since not injected
        expect(reasoner.ruleProcessor).toBeInstanceOf(RuleProcessor);
    });

    test('static build method should work (backward compatibility)', () => {
        const config = {
            reasoning: {
                maxDerivationDepth: 7
            }
        };

        const reasoner = ReasonerBuilder.build(config, context);

        expect(reasoner).toBeDefined();
        expect(reasoner.config.maxDerivationDepth).toBe(7);
        expect(reasoner.premiseSource).toBeInstanceOf(TaskBagPremiseSource);
    });
});
