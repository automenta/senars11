import {Rule} from './Rule.js';
import {logError, RuleExecutionError} from './utils/error.js';

/**
 * Language Model Rule for the stream reasoner system.
 */
export class LMRule extends Rule {
    constructor(id, lm, config = {}) {
        super(id, 'lm', config.priority ?? 1.0, config);
        this.lm = lm;

        this.config = {
            condition: this._getDefaultCondition(config),
            prompt: this._getPromptFunction(config),
            process: this._getProcessFunction(config),
            generate: this._getGenerateFunction(config),
            lm_options: {
                temperature: 0.7,
                max_tokens: 200,
                ...config.lm_options,
            },
            singlePremise: config.singlePremise ?? false,
            circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 60000,
                ...config.circuitBreaker
            },
            ...config,
        };

        this.name = config.name ?? id;
        this.description = config.description ?? 'Language Model Rule for generating inferences using neural models';

        if (config.promptTemplate) {
            this.promptTemplate = config.promptTemplate;
        }

        this.lmStats = {
            tokens: 0,
            calls: 0,
            avgTime: 0,
            successRate: 0,
            totalExecutions: 0
        };

        this.executionStats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            avgExecutionTime: 0
        };

        // Circuit Breaker State
        this.circuit = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failures: 0,
            lastFailure: 0,
            nextTry: 0
        };
    }

    static create(config) {
        const {id, lm, ...rest} = config;
        if (!id || !lm) {
            throw new Error('LMRule.create: `id` and `lm` are required to create an LMRule.');
        }
        return new LMRule(id, lm, rest);
    }

    canApply(primaryPremise, secondaryPremise, context) {
        try {
            // If circuit is OPEN, don't even check condition unless it's time to try
            if (this.circuit.state === 'OPEN') {
                if (Date.now() < this.circuit.nextTry) {
                    return false;
                }
            }
            return this.config.condition(primaryPremise, secondaryPremise, context);
        } catch (error) {
            logError(error, {
                ruleId: this.id,
                context: 'condition_evaluation'
            }, 'warn');
            return false;
        }
    }

    generatePrompt(primaryPremise, secondaryPremise, context) {
        return this.config.prompt(primaryPremise, secondaryPremise, context);
    }

    processLMOutput(lmResponse, primaryPremise, secondaryPremise, context) {
        return this.config.process(lmResponse, primaryPremise, secondaryPremise, context);
    }

    generateTasks(processedOutput, primaryPremise, secondaryPremise, context) {
        return this.config.generate(processedOutput, primaryPremise, secondaryPremise, context);
    }

    async apply(primaryPremise, secondaryPremise, context = {}) {
        // Check circuit breaker state first
        if (this.circuit.state === 'OPEN') {
            if (Date.now() > this.circuit.nextTry) {
                this.circuit.state = 'HALF_OPEN';
                console.log(`LMRule ${this.id}: Circuit HALF_OPEN, trying request...`);
            } else {
                return [];
            }
        }

        // Check if rule is applicable
        if (!this.canApply(primaryPremise, secondaryPremise, context)) {
            return [];
        }

        const startTime = Date.now();
        this.executionStats.totalExecutions++;

        try {
            const prompt = await this.generatePrompt(primaryPremise, secondaryPremise, context);
            const lmResponse = await this.executeLM(prompt);

            if (!lmResponse) {
                this._updateExecutionStats(false, Date.now() - startTime);
                return [];
            }

            const processedOutput = this.processLMOutput(lmResponse, primaryPremise, secondaryPremise, context);
            const newTasks = this.generateTasks(processedOutput, primaryPremise, secondaryPremise, context);

            // Success - Reset circuit if it was HALF_OPEN
            this._resetCircuit();
            this._updateExecutionStats(true, Date.now() - startTime);
            return newTasks;
        } catch (error) {
            console.error(`Error in LMRule ${this.id}:`, error);
            this._recordFailure();
            this._updateExecutionStats(false, Date.now() - startTime);
            return [];
        }
    }

    _recordFailure() {
        this.circuit.failures++;
        this.circuit.lastFailure = Date.now();
        if (this.circuit.failures >= this.config.circuitBreaker.failureThreshold) {
            this.circuit.state = 'OPEN';
            this.circuit.nextTry = Date.now() + this.config.circuitBreaker.resetTimeout;
            console.warn(`LMRule ${this.id}: Circuit OPEN due to ${this.circuit.failures} failures. Paused for ${this.config.circuitBreaker.resetTimeout}ms`);
        }
    }

    _resetCircuit() {
        if (this.circuit.state !== 'CLOSED') {
             console.log(`LMRule ${this.id}: Circuit CLOSED (recovered)`);
        }
        this.circuit.state = 'CLOSED';
        this.circuit.failures = 0;
    }

    async executeLM(prompt) {
        if (!this.lm) {
            throw new RuleExecutionError(`LM unavailable for rule ${this.id}`, this.id);
        }

        const startTime = Date.now();
        const response = await this._callLMInterface(prompt);
        const executionTime = Date.now() - startTime;

        this._updateLMStats(prompt.length + (response?.length ?? 0), executionTime);
        return response;
    }

    _callLMInterface(prompt) {
        const interfaces = ['generateText', 'process', 'query'];
        for (const method of interfaces) {
            if (typeof this.lm[method] === 'function') {
                return this.lm[method](prompt, this.config.lm_options);
            }
        }
        throw new Error(`LM does not have a compatible interface for rule ${this.id}. Expected one of: ${interfaces.join(', ')}`);
    }

    _updateLMStats(tokens, executionTime) {
        const s = this.lmStats;
        s.calls++;
        s.tokens += tokens;
        s.avgTime = (s.avgTime * (s.calls - 1) + executionTime) / s.calls;
    }

    _updateExecutionStats(success, executionTime) {
        if (success) {
            this.executionStats.successfulExecutions++;
        } else {
            this.executionStats.failedExecutions++;
        }

        const total = this.executionStats.totalExecutions;
        this.executionStats.avgExecutionTime = (this.executionStats.avgExecutionTime * (total - 1) + executionTime) / total;
        this.executionStats.successRate = this.executionStats.successfulExecutions / total;
    }

    getStats() {
        return {
            lm: {...this.lmStats},
            execution: {...this.executionStats},
            circuit: {...this.circuit},
            ruleInfo: {
                id: this.id,
                name: this.name,
                type: this.type,
                enabled: this.enabled
            }
        };
    }

    _fillPromptTemplate(template, primaryPremise, secondaryPremise) {
        let filledPrompt = template
            .replace('{{taskTerm}}', primaryPremise.term?.toString?.() ?? String(primaryPremise.term ?? 'unknown'))
            .replace('{{taskType}}', primaryPremise.punctuation ?? 'unknown')
            .replace('{{taskTruth}}', primaryPremise.truth ?
                `frequency: ${primaryPremise.truth.f}, confidence: ${primaryPremise.truth.c}` :
                'unknown truth value');

        if (secondaryPremise) {
            filledPrompt = filledPrompt
                .replace('{{secondaryTerm}}', secondaryPremise.term?.toString?.() ?? String(secondaryPremise.term ?? 'unknown'))
                .replace('{{secondaryType}}', secondaryPremise.punctuation ?? 'unknown')
                .replace('{{secondaryTruth}}', secondaryPremise.truth ?
                    `frequency: ${secondaryPremise.truth.f}, confidence: ${secondaryPremise.truth.c}` :
                    'unknown truth value');
        }

        return filledPrompt;
    }

    _getDefaultCondition(config) {
        return (primaryPremise, secondaryPremise, context) => {
            return !!this.lm &&
                primaryPremise?.term != null &&
                (secondaryPremise != null || config.singlePremise === true);
        };
    }

    _getPromptFunction(config) {
        return (primaryPremise, secondaryPremise, context) => {
            if (typeof config.promptTemplate === 'string') {
                return this._fillPromptTemplate(config.promptTemplate, primaryPremise, secondaryPremise);
            } else if (typeof config.promptTemplate === 'function') {
                return config.promptTemplate(primaryPremise, secondaryPremise, context);
            }
            throw new Error(`Prompt generation not implemented for rule: ${this.id}`);
        };
    }

    _getProcessFunction(config) {
        return (lmResponse, primaryPremise, secondaryPremise, context) => {
            if (typeof config.process === 'function') {
                return config.process(lmResponse, primaryPremise, secondaryPremise, context);
            } else if (typeof config.responseProcessor === 'function') {
                return config.responseProcessor(lmResponse, primaryPremise, secondaryPremise, context);
            }
            return lmResponse ?? '';
        };
    }

    _getGenerateFunction(config) {
        return (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (typeof config.generate === 'function') {
                return config.generate(processedOutput, primaryPremise, secondaryPremise, context);
            } else if (typeof config.responseProcessor === 'function') {
                return config.responseProcessor(processedOutput, primaryPremise, secondaryPremise, context);
            }
            return [];
        };
    }
}
