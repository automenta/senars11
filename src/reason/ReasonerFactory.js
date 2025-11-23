import {TaskBagPremiseSource} from './TaskBagPremiseSource.js';
import {Strategy} from './Strategy.js';
import {RuleExecutor} from './RuleExecutor.js';
import {RuleProcessor} from './RuleProcessor.js';
import {Reasoner as StreamReasoner} from './Reasoner.js';

export class ReasonerFactory {
    static create(nar) {
        const config = nar.config;
        const reasoningConfig = config.reasoning || {};

        // Create premise source using the new reasoner's approach
        const premiseSource = new TaskBagPremiseSource(
            nar._focus,
            reasoningConfig.streamSamplingObjectives || {priority: true}
        );

        // Create strategy
        const strategy = new Strategy({
            ...reasoningConfig.streamStrategy,
            focus: nar._focus,
            memory: nar._memory
        });

        // Create rule executor
        const ruleExecutor = new RuleExecutor(reasoningConfig.streamRuleExecutor || {});

        // Create rule processor
        const ruleProcessor = new RuleProcessor(ruleExecutor, {
            maxDerivationDepth: reasoningConfig.maxDerivationDepth || 10,
            termFactory: nar._termFactory
        });

        // Create the main stream reasoner
        return new StreamReasoner(
            premiseSource,
            strategy,
            ruleProcessor,
            {
                maxDerivationDepth: reasoningConfig.maxDerivationDepth || 10,
                cpuThrottleInterval: reasoningConfig.cpuThrottleInterval || 0
            },
            nar  // Pass the NAR instance as parent for derivation feedback
        );
    }

    static async registerDefaultRules(streamReasoner, config) {
        const ruleExecutor = streamReasoner.ruleProcessor.ruleExecutor;

        // Import and register new stream reasoner rules
        const {
            InheritanceSyllogisticRule,
            ImplicationSyllogisticRule
        } = await import('./rules/nal/SyllogisticRule.js');
        const {ModusPonensRule} = await import('./rules/nal/ModusPonensRule.js');
        const {MetacognitionRules} = await import('./rules/nal/MetacognitionRules.js');

        ruleExecutor.register(new InheritanceSyllogisticRule());
        ruleExecutor.register(new ImplicationSyllogisticRule());
        ruleExecutor.register(new ModusPonensRule());

        // Register metacognition rules if enabled
        if (config.metacognition?.selfOptimization?.enabled) {
            for (const RuleClass of MetacognitionRules) {
                const rule = new RuleClass();
                ruleExecutor.register(rule);
            }
        }
    }
}
