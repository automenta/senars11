import {Agent} from './Agent.js';
import {PluginManager} from '../util/Plugin.js';
import {ChatOllama} from "@langchain/ollama";
import {TransformersJSProvider} from "../lm/TransformersJSProvider.js";

export class AgentBuilder {
    constructor(initialConfig = {}) {
        this.config = {
            subsystems: {
                metrics: true,
                embeddingLayer: false,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: false,
                lm: false,
                ...initialConfig.subsystems
            },
            memory: {
                enableMemoryValidation: true,
                memoryValidationInterval: 30000,
                ...initialConfig.memory
            },
            nar: {...initialConfig.nar},
            lm: {
                circuitBreaker: {
                    failureThreshold: 5,
                    timeout: 60000,
                    resetTimeout: 30000
                },
                ...initialConfig.lm
            },
            persistence: initialConfig.persistence || {},
            inputProcessing: initialConfig.inputProcessing || {}
        };
        this.dependencies = new Map();

        if (initialConfig) this.withConfig(initialConfig);
    }

    static createAgent(config = {}) {
        return new AgentBuilder(config).build();
    }

    static createBasicAgent() {
        return AgentBuilder.createAgent({
            subsystems: {
                metrics: true,
                embeddingLayer: false,
                functors: ['core-arithmetic'],
                rules: ['syllogistic-core'],
                tools: false,
                lm: false
            }
        });
    }

    static createAdvancedAgent(config = {}) {
        return AgentBuilder.createAgent({
            subsystems: {
                metrics: true,
                embeddingLayer: true,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: true,
                lm: {enabled: true}
            },
            ...config
        });
    }

    withConfig(config) {
        ['subsystems', 'memory', 'nar', 'lm', 'persistence', 'inputProcessing'].forEach(key => {
            if (config[key]) this.config[key] = {...this.config[key], ...config[key]};
        });
        return this;
    }

    withMetrics(metricsConfig = true) {
        this.config.subsystems.metrics = metricsConfig;
        return this;
    }

    withEmbeddings(embeddingConfig = true) {
        this.config.subsystems.embeddingLayer = embeddingConfig;
        return this;
    }

    withFunctors(functorConfig) {
        this.config.subsystems.functors = Array.isArray(functorConfig) ? functorConfig : functorConfig;
        return this;
    }

    withRules(ruleConfig) {
        this.config.subsystems.rules = Array.isArray(ruleConfig) ? ruleConfig : ruleConfig;
        return this;
    }

    withTools(toolConfig = true) {
        this.config.subsystems.tools = toolConfig;
        return this;
    }

    withLM(lmConfig = true) {
        this.config.subsystems.lm = lmConfig;
        return this;
    }

    registerDependency(name, dependency) {
        this.dependencies.set(name, dependency);
        return this;
    }

    async build() {
        const agent = new Agent(this._buildAgentConfig());

        const pluginManager = new PluginManager({
            nar: agent,
            agent: agent,
            eventBus: agent._eventBus
        });

        if (this.config.subsystems.plugins) {
            this._registerPlugins(pluginManager, this.config.subsystems.plugins);
        }

        agent._pluginManager = pluginManager;

        if (this.config.subsystems.functors) {
            const registry = agent.evaluator?.getFunctorRegistry?.();
            if (registry) this._registerFunctors(registry, this.config.subsystems.functors);
        }

        await this._initializeSubsystems(agent);

        const lmProvider = this._createLMProvider();
        if (lmProvider && agent.lm) {
            agent.lm.registerProvider(lmProvider.name || 'default', lmProvider);
            if (!agent.lm.providers.defaultProviderId) {
                agent.lm.providers.setDefault(lmProvider.name || 'default');
            }
        }

        return agent;
    }

    _buildAgentConfig() {
        const {subsystems, nar} = this.config;
        return {
            ...nar,
            memory: this.config.memory,
            persistence: this.config.persistence,
            inputProcessing: this.config.inputProcessing,
            lm: {
                enabled: !!subsystems.lm,
                ...(typeof subsystems.lm === 'object' ? subsystems.lm : {}),
                ...this.config.lm
            },
            tools: {
                enabled: !!subsystems.tools,
                ...(typeof subsystems.tools === 'object' ? subsystems.tools : {})
            },
            embeddingLayer: {
                enabled: !!subsystems.embeddingLayer,
                ...(typeof subsystems.embeddingLayer === 'object' ? subsystems.embeddingLayer : {})
            },
            metricsMonitor: subsystems.metrics ? (typeof subsystems.metrics === 'object' ? subsystems.metrics : {}) : undefined
        };
    }

    _createLMProvider() {
        if (this.config.lm.provider === 'ollama') {
            const lmProvider = new ChatOllama({
                model: this.config.lm.modelName,
                baseUrl: this.config.lm.baseUrl,
                temperature: this.config.lm.temperature,
            });
            lmProvider.name = 'ollama';
            lmProvider.tools = [];
            return lmProvider;
        } else if (this.config.lm.provider === 'transformersjs') {
            const lmProvider = new TransformersJSProvider({
                modelName: this.config.lm.modelName,
                temperature: this.config.lm.temperature
            });
            lmProvider.name = 'transformersjs';
            lmProvider.tools = [];
            return lmProvider;
        }
        return null;
    }

    _registerFunctors(registry, functorConfig) {
        if (Array.isArray(functorConfig)) {
            functorConfig.forEach(c => this._registerFunctorCollection(registry, c));
        } else if (typeof functorConfig === 'object') {
            Object.entries(functorConfig)
                .filter(([, enabled]) => enabled)
                .forEach(([c]) => this._registerFunctorCollection(registry, c));
        }
    }

    _registerFunctorCollection(registry, collectionName) {
        const collections = {
            'core-arithmetic': () => this._registerArithmeticFunctors(registry),
            'set-operations': () => this._registerSetOperationFunctors(registry),
        };
        const collection = collections[collectionName];
        if (collection) collection();
    }

    _registerArithmeticFunctors(registry) {
        [
            {name: 'add', fn: (a, b) => a + b, commutative: true, associative: true, desc: 'Addition'},
            {name: 'subtract', fn: (a, b) => a - b, commutative: false, associative: false, desc: 'Subtraction'},
            {name: 'multiply', fn: (a, b) => a * b, commutative: true, associative: true, desc: 'Multiplication'},
            {
                name: 'divide',
                fn: (a, b) => b !== 0 ? a / b : null,
                commutative: false,
                associative: false,
                desc: 'Division'
            }
        ].forEach(op => {
            if (!registry.has(op.name)) {
                registry.registerFunctorDynamic(op.name, op.fn, {
                    arity: 2,
                    isCommutative: op.commutative,
                    isAssociative: op.associative,
                    description: op.desc
                });
            }
        });
    }

    _registerSetOperationFunctors(registry) {
        [
            {
                name: 'union',
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? [...new Set([...a, ...b])] : null,
                commutative: true,
                desc: 'Set union'
            },
            {
                name: 'intersection',
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? a.filter(x => b.includes(x)) : null,
                commutative: true,
                desc: 'Set intersection'
            }
        ].forEach(op => {
            if (!registry.has(op.name)) {
                registry.registerFunctorDynamic(op.name, op.fn, {
                    arity: 2,
                    isCommutative: op.commutative,
                    description: op.desc
                });
            }
        });
    }

    _registerPlugins(pluginManager, pluginConfig) {
        const register = (config, id) => {
            if (config.instance) pluginManager.registerPlugin(config.instance);
            else if (config.constructor) {
                pluginManager.registerPlugin(new config.constructor(id || config.constructor.name.toLowerCase(), config.config || {}));
            }
        };

        if (Array.isArray(pluginConfig)) {
            pluginConfig
                .filter(Boolean)
                .forEach(p => register(p, p.id));
        } else if (typeof pluginConfig === 'object') {
            Object.entries(pluginConfig)
                .filter(([, c]) => c && c.enabled !== false)
                .forEach(([id, c]) => register(c, id));
        }
    }

    async _initializeSubsystems(agent) {
        if (agent.initialize) await agent.initialize();

        if (agent._pluginManager) {
            try {
                if (await agent._pluginManager.initializeAll()) {
                    agent._pluginManager.startAll().catch(e => console.error('Failed to start plugins:', e));
                }
            } catch (e) {
                console.error('Failed to initialize plugins:', e);
            }
        }
    }
}
