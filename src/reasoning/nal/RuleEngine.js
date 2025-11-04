import {RuleEngine as BaseRuleEngine} from '../RuleEngine.js';
import {RuleManager} from './RuleManager.js';

/**
 * Advanced NAL-focused Rule Engine that extends the base RuleEngine
 * with sophisticated hybrid NAL-LM reasoning capabilities
 */
export class RuleEngine extends BaseRuleEngine {
    constructor(config = {}) {
        super(config);
        this._nalRules = new RuleManager();
        this._lmRules = new RuleManager();
        this._hybridRules = new RuleManager();
        
        this._config = {
            enableNal: true,
            enableLm: true,
            enableHybrid: true,
            ...config
        };
        
        this._metrics = {
            totalApplications: 0,
            nalApplications: 0,
            lmApplications: 0,
            hybridApplications: 0,
            totalDerivations: 0,
            startTime: Date.now()
        };
        
        this._contextProviders = new Map(); // For providing context to rules
    }

    /**
     * Initialize the rule engine with the specified rules
     * @param {Array} nalRules - Array of NAL rules to register
     * @param {Array} lmRules - Array of LM rules to register
     * @param {Array} hybridRules - Array of hybrid rules to register
     */
    async initialize(nalRules = [], lmRules = [], hybridRules = []) {
        // Register NAL rules
        for (const rule of nalRules) {
            this._nalRules.register(rule, 'nal');
        }

        // Register LM rules
        for (const rule of lmRules) {
            this._lmRules.register(rule, 'lm');
        }

        // Register hybrid rules
        for (const rule of hybridRules) {
            this._hybridRules.register(rule, 'hybrid');
        }

        return this;
    }

    /**
     * Add a context provider for rules
     * @param {string} name - Name of the context provider
     * @param {Function} provider - Function that provides context given parameters
     */
    addContextProvider(name, provider) {
        this._contextProviders.set(name, provider);
        return this;
    }

    /**
     * Get context for rule application
     * @param {Object} params - Parameters for context creation
     * @returns {Object} - Context object
     */
    async getContext(params = {}) {
        const context = {
            memory: params.memory || null,
            focus: params.focus || null,
            currentTime: params.currentTime || Date.now(),
            task: params.task || null,
            ...params
        };

        // Add any additional context from providers
        for (const [name, provider] of this._contextProviders.entries()) {
            try {
                context[name] = await provider(context);
            } catch (error) {
                this.logger?.warn(`Context provider ${name} failed:`, error);
            }
        }

        return context;
    }

    /**
     * Apply NAL rules to a task
     * @param {Object} task - The task to apply rules to
     * @param {Object} context - Context for rule application
     * @returns {Array} - Array of derived tasks
     */
    async applyNalRules(task, context = {}) {
        return this._applyRules('nal', task, context);
    }

    /**
     * Apply LM rules to a task
     * @param {Object} task - The task to apply rules to
     * @param {Object} context - Context for rule application
     * @returns {Array} - Array of derived tasks
     */
    async applyLmRules(task, context = {}) {
        return this._applyRules('lm', task, context);
    }

    /**
     * Apply hybrid NAL-LM rules to a task
     * @param {Object} task - The task to apply rules to
     * @param {Object} context - Context for rule application
     * @returns {Array} - Array of derived tasks
     */
    async applyHybridRules(task, context = {}) {
        return this._applyRules('hybrid', task, context);
    }

    /**
     * Generic method to apply rules of a specific type
     * @param {string} type - Type of rules to apply (nal, lm, hybrid)
     * @param {Object} task - The task to apply rules to
     * @param {Object} context - Context for rule application
     * @returns {Array} - Array of derived tasks
     */
    async _applyRules(type, task, context) {
        const configKey = `enable${type.charAt(0).toUpperCase() + type.slice(1)}`;
        if (!this._config[configKey]) return [];

        const ruleManager = this[`_${type}Rules`];
        const results = await ruleManager.applyAllRules(task, context);
        
        // Update metrics
        this._metrics[`${type}Applications`]++;
        this._metrics.totalApplications++;
        this._metrics.totalDerivations += results.length;

        return results;
    }

    /**
     * Apply all applicable rules to a task
     * @param {Object} task - The task to apply rules to
     * @param {Object} params - Parameters for context creation
     * @returns {Array} - Array of derived tasks
     */
    async applyAllRules(task, params = {}) {
        const context = await this.getContext(params);
        
        const ruleTypes = [
            [this._config.enableNal, 'nal', this.applyNalRules.bind(this)],
            [this._config.enableLm, 'lm', this.applyLmRules.bind(this)],
            [this._config.enableHybrid, 'hybrid', this.applyHybridRules.bind(this)]
        ];

        const enabledRuleTypes = ruleTypes.filter(([enabled]) => enabled);
        const results = [];

        for (const [_, type, applyRuleFn] of enabledRuleTypes) {
            results.push(...await applyRuleFn(task, context));
        }

        return results;
    }

    /**
     * Apply rules with sophisticated reasoning path selection
     * @param {Object} task - The task to apply rules to
     * @param {Object} params - Parameters for context creation
     * @returns {Array} - Array of derived tasks
     */
    async applyReasoningPath(task, params = {}) {
        const context = await this.getContext(params);
        const reasoningPath = this._determineReasoningPath(task, context);

        const ruleTypes = [
            [reasoningPath.includes('nal'), 'nal', this.applyNalRules.bind(this)],
            [reasoningPath.includes('lm'), 'lm', this.applyLmRules.bind(this)],
            [reasoningPath.includes('hybrid'), 'hybrid', this.applyHybridRules.bind(this)]
        ];

        const enabledRuleTypes = ruleTypes.filter(([enabled]) => enabled);
        const results = [];

        for (const [_, type, applyRuleFn] of enabledRuleTypes) {
            results.push(...await applyRuleFn(task, context));
        }

        return results;
    }

    /**
     * Determine the most appropriate reasoning path for a task
     * @param {Object} task - The task to analyze
     * @param {Object} context - Context for analysis
     * @returns {Array} - Array of reasoning paths to use
     */
    _determineReasoningPath(task, context) {
        const paths = [
            this._isNalSuitable(task, context) && 'nal',
            this._isLmSuitable(task, context) && 'lm',
            this._isHybridSuitable(task, context) && 'hybrid'
        ].filter(Boolean);

        return paths.length > 0 ? paths : ['nal'];
    }

    /**
     * Check if a task is suitable for NAL reasoning
     * @param {Object} task - The task to analyze
     * @param {Object} context - Context for analysis
     * @returns {boolean} - Whether NAL is suitable
     */
    _isNalSuitable(task, context) {
        // NAL is suitable for structured, symbolic tasks
        return task.term &&
            task.term.isCompound &&
            !this._isAmbiguous(task.term);
    }

    /**
     * Check if a task might benefit from LM reasoning
     * @param {Object} task - The task to analyze
     * @param {Object} context - Context for analysis
     * @returns {boolean} - Whether LM is suitable
     */
    _isLmSuitable(task, context) {
        // LM is suitable for complex, ambiguous, or natural language tasks
        return this._isAmbiguous(task.term) ||
            this._isComplex(task) ||
            this._requiresCreativity(task, context);
    }

    /**
     * Check if a task is suitable for hybrid reasoning
     * @param {Object} task - The task to analyze
     * @param {Object} context - Context for analysis
     * @returns {boolean} - Whether hybrid is suitable
     */
    _isHybridSuitable(task, context) {
        // Hybrid is suitable when both NAL and LM can contribute
        return this._hasPartialInformation(task, context) &&
            (this._isNalSuitable(task, context) || this._isLmSuitable(task, context));
    }

    /**
     * Check if a term is ambiguous
     * @param {Object} term - The term to check
     * @returns {boolean} - Whether the term is ambiguous
     */
    _isAmbiguous(term) {
        if (!term) return false;

        // Check for variables or highly general terms
        return term.isVariable ||
            (term.name && (term.name === 'any' || term.name === '?'));
    }

    /**
     * Check if a task is complex
     * @param {Object} task - The task to check
     * @returns {boolean} - Whether the task is complex
     */
    _isComplex(task) {
        // Complexity could be determined by term depth, number of components, etc.
        return task.term && this._getTermDepth(task.term) > 3;
    }

    /**
     * Check if a task requires creativity
     * @param {Object} task - The task to check
     * @param {Object} context - Context for analysis
     * @returns {boolean} - Whether the task requires creativity
     */
    _requiresCreativity(task, context) {
        // For now, assume open-ended questions or goals require creativity
        return task.type === 'QUESTION' || task.type === 'GOAL';
    }

    /**
     * Check if the task has partial information that could benefit from LM
     * @param {Object} task - The task to check
     * @param {Object} context - Context for analysis
     * @returns {boolean} - Whether the task has partial information
     */
    _hasPartialInformation(task, context) {
        // Check if there's not enough information in memory for pure NAL reasoning
        return context.memory &&
            context.memory.getRelevantTasks &&
            context.memory.getRelevantTasks(task.term).length < 2;
    }

    /**
     * Calculate the depth of a term (how deeply nested it is)
     * @param {Object} term - The term to analyze
     * @returns {number} - The depth of the term
     */
    _getTermDepth(term) {
        if (!term?.isCompound || !term.components) return 1;
        
        return 1 + Math.max(0, ...term.components.map(comp => this._getTermDepth(comp)));
    }

    /**
     * Get statistics about rule applications
     * @returns {Object} - Statistics about rule applications
     */
    getStats() {
        // Combine metrics from base engine and NAL-specific metrics
        return {
            ...this._metrics,
            ...super.getMetrics ? super.getMetrics() : {},
            uptime: Date.now() - this._metrics.startTime,
            nalStats: this._nalRules.getAggregatedMetrics(),
            lmStats: this._lmRules.getAggregatedMetrics(),
            hybridStats: this._hybridRules.getAggregatedMetrics()
        };
    }

    /**
     * Enable rules by category
     * @param {string} category - The category to enable
     */
    enableCategory(category) {
        return this._updateRuleStatus(category, 'enable', 'Category');
    }

    /**
     * Disable rules by category
     * @param {string} category - The category to disable
     */
    disableCategory(category) {
        return this._updateRuleStatus(category, 'disable', 'Category');
    }

    /**
     * Enable a specific rule
     * @param {string} ruleId - The ID of the rule to enable
     * @param {string} type - The type of rule (nal, lm, hybrid)
     */
    enableRule(ruleId, type) {
        return this._updateRuleStatus(type, 'enable', ruleId);
    }

    /**
     * Disable a specific rule
     * @param {string} ruleId - The ID of the rule to disable
     * @param {string} type - The type of rule (nal, lm, hybrid)
     */
    disableRule(ruleId, type) {
        return this._updateRuleStatus(type, 'disable', ruleId);
    }

    /**
     * Generic method to update rule status
     * @param {string} type - Type of rule (nal, lm, hybrid)
     * @param {string} operation - Operation to perform (enable, disable)
     * @param {string|boolean} value - Value to pass to the operation (category name or rule ID)
     */
    _updateRuleStatus(type, operation, value) {
        const ruleManager = this[`_${type}Rules`];
        if (ruleManager) {
            const method = value === 'Category' 
                ? `${operation}Category` 
                : operation;
            ruleManager[method](value === 'Category' ? type : value);
        }
        return this;
    }
}