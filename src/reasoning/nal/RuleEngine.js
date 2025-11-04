import {RuleEngine as BaseRuleEngine} from '../RuleEngine.js';
import {RuleManager} from './RuleManager.js';

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
        
        this._contextProviders = new Map();
    }

    async initialize(nalRules = [], lmRules = [], hybridRules = []) {
        ['nal', 'lm', 'hybrid'].forEach((type, i) => 
            this._registerRules(type, [nalRules, lmRules, hybridRules][i])
        );
        return this;
    }

    _registerRules(type, rules) {
        const ruleManager = this[`_${type}Rules`];
        for (const rule of rules) {
            ruleManager.register(rule, type);
        }
    }

    addContextProvider = (name, provider) => (this._contextProviders.set(name, provider), this)

    async getContext(params = {}) {
        const context = {
            memory: params.memory || null,
            focus: params.focus || null,
            currentTime: params.currentTime || Date.now(),
            task: params.task || null,
            ...params
        };

        for (const [name, provider] of this._contextProviders.entries()) {
            try {
                context[name] = await provider(context);
            } catch (error) {
                this.logger?.warn?.(`Context provider ${name} failed:`, error);
            }
        }

        return context;
    }

    applyNalRules = async (task, context = {}) => this._applyRules('nal', task, context)
    applyLmRules = async (task, context = {}) => this._applyRules('lm', task, context)
    applyHybridRules = async (task, context = {}) => this._applyRules('hybrid', task, context)

    async _applyRules(type, task, context) {
        const configKey = `enable${type.charAt(0).toUpperCase() + type.slice(1)}`;
        if (!this._config[configKey]) return [];

        const ruleManager = this[`_${type}Rules`];
        const results = await ruleManager.applyAllRules(task, context);
        
        this._metrics[`${type}Applications`]++;
        this._metrics.totalApplications++;
        this._metrics.totalDerivations += results.length;

        return results;
    }

    async applyAllRules(task, params = {}) {
        const context = await this.getContext(params);
        return await this._applyRulesByTypes(task, context, this._getEnabledRuleTypes());
    }

    _getEnabledRuleTypes = () => 
        [['nal', this._config.enableNal], ['lm', this._config.enableLm], ['hybrid', this._config.enableHybrid]]
            .filter(([, enabled]) => enabled).map(([type]) => type)

    async _applyRulesByTypes(task, context, ruleTypes) {
        const results = [];
        for (const type of ruleTypes) {
            const applyFn = this[`apply${type.charAt(0).toUpperCase() + type.slice(1)}Rules`].bind(this);
            results.push(...await applyFn(task, context));
        }
        return results;
    }

    async applyReasoningPath(task, params = {}) {
        const context = await this.getContext(params);
        const reasoningPath = this._determineReasoningPath(task, context);
        return await this._applyRulesByTypes(task, context, reasoningPath);
    }

    _determineReasoningPath(task, context) {
        const paths = [
            this._isNalSuitable(task, context) && 'nal',
            this._isLmSuitable(task, context) && 'lm',
            this._isHybridSuitable(task, context) && 'hybrid'
        ].filter(Boolean);

        return paths.length > 0 ? paths : ['nal'];
    }

    _isNalSuitable(task, context) {
        return task?.term?.isCompound && !this._isAmbiguous(task.term);
    }

    _isLmSuitable(task, context) {
        return this._isAmbiguous(task?.term) || this._isComplex(task) || this._requiresCreativity(task, context);
    }

    _isHybridSuitable(task, context) {
        return this._hasPartialInformation(task, context) && 
               (this._isNalSuitable(task, context) || this._isLmSuitable(task, context));
    }

    _isAmbiguous(term) {
        if (!term) return false;
        return term.isVariable || (term.name && (term.name === 'any' || term.name === '?'));
    }

    _isComplex(task) {
        return task?.term && this._getTermDepth(task.term) > 3;
    }

    _requiresCreativity = (task, context) => task?.type === 'QUESTION' || task?.type === 'GOAL'

    _hasPartialInformation(task, context) {
        return context?.memory?.getRelevantTasks && 
               context.memory.getRelevantTasks(task?.term)?.length < 2;
    }

    _getTermDepth(term) {
        if (!term?.isCompound || !term.components) return 1;
        return 1 + Math.max(0, ...term.components.map(comp => this._getTermDepth(comp)));
    }

    getStats() {
        return {
            ...this._metrics,
            ...(typeof super.getMetrics === 'function' ? super.getMetrics() : {}),
            uptime: Date.now() - this._metrics.startTime,
            nalStats: this._nalRules.getAggregatedMetrics(),
            lmStats: this._lmRules.getAggregatedMetrics(),
            hybridStats: this._hybridRules.getAggregatedMetrics()
        };
    }

    enableCategory = (category) => this._updateRuleStatus(category, 'enable', 'Category')
    disableCategory = (category) => this._updateRuleStatus(category, 'disable', 'Category')
    enableRule = (ruleId, type) => this._updateRuleStatus(type, 'enable', ruleId)
    disableRule = (ruleId, type) => this._updateRuleStatus(type, 'disable', ruleId)

    _updateRuleStatus(type, operation, value) {
        const ruleManager = this[`_${type}Rules`];
        if (ruleManager) {
            const method = value === 'Category' ? `${operation}Category` : operation;
            ruleManager[method](value === 'Category' ? type : value);
        }
        return this;
    }
}