import {LMRule} from '../reason/LMRule.js';

export class LMRuleFactory {
    /**
     * Create an LM rule using the new declarative configuration approach
     */
    static create(config) {
        const { id, lm, ...rest } = config;
        if (!id || !lm) {
            throw new Error('LMRuleFactory.create: `id` and `lm` are required.');
        }

        // Use the static create method from LMRule for the new configuration approach
        return LMRule.create(config);
    }

    /**
     * Create a rule using the legacy approach (for backward compatibility)
     */
    static createLegacy(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
        // For backward compatibility, construct a config object in the new format
        const newConfig = {
            ...config,
            promptTemplate,
            responseProcessor,
            priority
        };
        
        return LMRule.create({ id, lm, ...newConfig });
    }

    /**
     * Create a simple rule with basic configuration
     */
    static createSimple(config) {
        const { id, lm, promptTemplate, priority = 1.0, ...rest } = config;
        
        // Create a simple rule with basic processing
        const fullConfig = {
            id,
            lm,
            priority,
            promptTemplate,
            process: (lmResponse) => lmResponse || '',
            generate: async (processedOutput, primaryPremise, secondaryPremise, context) => {
                if (!processedOutput) return [];
                
                // Default implementation would parse LM output and create tasks
                // This is a placeholder - actual implementation would depend on the use case
                return [];
            },
            ...rest
        };
        
        return LMRule.create(fullConfig);
    }

    /**
     * Create an inference rule using the new declarative approach
     */
    static createInferenceRule(config) {
        const { id, lm, priority = 1.0, ...rest } = config;
        
        const fullConfig = {
            id,
            lm,
            priority,
            name: 'Inference Rule',
            description: 'Generates logical inferences using language models',
            condition: (primaryPremise, secondaryPremise, context) => {
                return primaryPremise && primaryPremise.term;
            },
            prompt: (primaryPremise, secondaryPremise, context) => {
                return `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a logical inference or conclusion based on this information. Respond with a valid Narsese statement.`;
            },
            process: (lmResponse) => {
                return lmResponse || '';
            },
            generate: async (processedOutput, primaryPremise, secondaryPremise, context) => {
                if (!processedOutput) return [];
                
                // In a real implementation, this would parse the LM response 
                // and create appropriate NARS tasks
                return [];
            },
            promptTemplate: `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a logical inference or conclusion based on this information. Respond with a valid Narsese statement.`,
            ...rest
        };
        
        return LMRule.create(fullConfig);
    }

    /**
     * Create a hypothesis generation rule using the new declarative approach
     */
    static createHypothesisRule(config) {
        const { id, lm, priority = 1.0, ...rest } = config;
        
        const fullConfig = {
            id,
            lm,
            priority,
            name: 'Hypothesis Generation Rule',
            description: 'Generates plausible hypotheses using language models',
            condition: (primaryPremise, secondaryPremise, context) => {
                return primaryPremise && primaryPremise.term;
            },
            prompt: (primaryPremise, secondaryPremise, context) => {
                return `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a plausible hypothesis that could explain or relate to this information. Respond with a valid Narsese statement.`;
            },
            process: (lmResponse) => {
                return lmResponse || '';
            },
            generate: async (processedOutput, primaryPremise, secondaryPremise, context) => {
                if (!processedOutput) return [];
                
                // In a real implementation, this would parse the LM response 
                // and create appropriate NARS tasks representing hypotheses
                return [];
            },
            promptTemplate: `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a plausible hypothesis that could explain or relate to this information. Respond with a valid Narsese statement.`,
            ...rest
        };
        
        return LMRule.create(fullConfig);
    }

    /**
     * Create a rule that works with just one premise
     */
    static createSinglePremise(config) {
        const { id, lm, ...rest } = config;
        const fullConfig = {
            singlePremise: true,
            ...rest,
            id,
            lm
        };
        
        return LMRule.create(fullConfig);
    }

    /**
     * Create a custom rule with a builder pattern for enhanced ergonomics
     */
    static builder() {
        return new LMRuleBuilder();
    }
}

/**
 * Helper class for building LM rules with a fluent API
 */
class LMRuleBuilder {
    constructor() {
        this.config = {};
    }

    id(id) {
        this.config.id = id;
        return this;
    }

    lm(lm) {
        this.config.lm = lm;
        return this;
    }

    name(name) {
        this.config.name = name;
        return this;
    }

    description(description) {
        this.config.description = description;
        return this;
    }

    priority(priority) {
        this.config.priority = priority;
        return this;
    }

    condition(conditionFn) {
        this.config.condition = conditionFn;
        return this;
    }

    prompt(promptFn) {
        this.config.prompt = promptFn;
        return this;
    }

    process(processFn) {
        this.config.process = processFn;
        return this;
    }

    generate(generateFn) {
        this.config.generate = generateFn;
        return this;
    }

    lmOptions(options) {
        this.config.lm_options = options;
        return this;
    }

    singlePremise(single = true) {
        this.config.singlePremise = single;
        return this;
    }

    build() {
        if (!this.config.id || !this.config.lm) {
            throw new Error('LM rule builder requires both id and lm to be set');
        }
        return LMRule.create(this.config);
    }
}