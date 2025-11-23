import {Agent} from './Agent.js';
import {SystemConfig} from '../config/SystemConfig.js';
import {PluginManager} from '../util/Plugin.js';
import {ChatOllama} from "@langchain/ollama";

export class AgentBuilder {
    constructor(initialConfig = {}) {
        // Start with default config structure
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
            nar: {
                ...initialConfig.nar
            },
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

        // Merge initial config fully
        if (initialConfig) {
             this.withConfig(initialConfig);
        }
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
        // Deep merge logic simplified for this builder
        if (config.subsystems) this.config.subsystems = {...this.config.subsystems, ...config.subsystems};
        if (config.memory) this.config.memory = {...this.config.memory, ...config.memory};
        if (config.nar) this.config.nar = {...this.config.nar, ...config.nar};
        if (config.lm) this.config.lm = {...this.config.lm, ...config.lm};
        if (config.persistence) this.config.persistence = {...this.config.persistence, ...config.persistence};
        if (config.inputProcessing) this.config.inputProcessing = {...this.config.inputProcessing, ...config.inputProcessing};
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
        const agentConfig = this._buildAgentConfig();

        const agent = new Agent(agentConfig);

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
            const evaluator = agent.evaluator;
            if (evaluator && typeof evaluator.getFunctorRegistry === 'function') {
                this._registerFunctors(evaluator.getFunctorRegistry(), this.config.subsystems.functors);
            }
        }

        await this._initializeSubsystems(agent);

        const lmProvider = this._createLMProvider();
        if (lmProvider && agent.lm) {
             agent.lm.registerProvider('ollama', lmProvider);
             if (!agent.lm.providers.defaultProviderId) {
                 agent.lm.providers.setDefault('ollama');
             }
        }

        return agent;
    }

    _buildAgentConfig() {
        const config = {
            ...this.config.nar,
            memory: this.config.memory,
            persistence: this.config.persistence,
            inputProcessing: this.config.inputProcessing,
            lm: {
                enabled: !!this.config.subsystems.lm,
                ...(typeof this.config.subsystems.lm === 'object' ? this.config.subsystems.lm : {}),
                ...this.config.lm
            },
            tools: {
                enabled: !!this.config.subsystems.tools,
                ...(typeof this.config.subsystems.tools === 'object' ? this.config.subsystems.tools : {})
            },
            embeddingLayer: {
                 enabled: !!this.config.subsystems.embeddingLayer,
                 ...(typeof this.config.subsystems.embeddingLayer === 'object' ? this.config.subsystems.embeddingLayer : {})
            }
        };

        if (this.config.subsystems.metrics) {
            config.metricsMonitor = typeof this.config.subsystems.metrics === 'object'
                ? this.config.subsystems.metrics
                : {};
        }

        return config;
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
        }
        return null;
    }

    _registerFunctors(registry, functorConfig) {
        if (Array.isArray(functorConfig)) {
            functorConfig.forEach(collection => {
                this._registerFunctorCollection(registry, collection);
            });
        } else if (typeof functorConfig === 'object') {
            this._registerFunctorCollections(registry, functorConfig);
        }
    }

    _registerFunctorCollection(registry, collectionName) {
        const collectionMap = {
            'core-arithmetic': () => this._registerArithmeticFunctors(registry),
            'set-operations': () => this._registerSetOperationFunctors(registry),
        };

        const registerFn = collectionMap[collectionName];
        if (registerFn) {
            registerFn();
        }
    }

    _registerFunctorCollections(registry, collectionsConfig) {
        Object.entries(collectionsConfig)
            .filter(([, enabled]) => enabled)
            .forEach(([collectionName]) => this._registerFunctorCollection(registry, collectionName));
    }

    _registerArithmeticFunctors(registry) {
        const arithmeticOps = [
            {name: 'add', fn: (a, b) => a + b, commutative: true, associative: true, desc: 'Addition operation'},
            {
                name: 'subtract',
                fn: (a, b) => a - b,
                commutative: false,
                associative: false,
                desc: 'Subtraction operation'
            },
            {
                name: 'multiply',
                fn: (a, b) => a * b,
                commutative: true,
                associative: true,
                desc: 'Multiplication operation'
            },
            {
                name: 'divide',
                fn: (a, b) => b !== 0 ? a / b : null,
                commutative: false,
                associative: false,
                desc: 'Division operation'
            }
        ];

        arithmeticOps.forEach(op => {
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
        const setOps = [
            {
                name: 'union',
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? [...new Set([...a, ...b])] : null,
                commutative: true,
                desc: 'Set union operation'
            },
            {
                name: 'intersection',
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? a.filter(x => b.includes(x)) : null,
                commutative: true,
                desc: 'Set intersection operation'
            }
        ];

        setOps.forEach(op => {
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
        if (Array.isArray(pluginConfig)) {
            pluginConfig.forEach(pluginSpec => {
                if (pluginSpec && pluginSpec.instance) {
                    pluginManager.registerPlugin(pluginSpec.instance);
                } else if (pluginSpec && pluginSpec.constructor) {
                    const plugin = new pluginSpec.constructor(
                        pluginSpec.id || pluginSpec.constructor.name.toLowerCase(),
                        pluginSpec.config || {}
                    );
                    pluginManager.registerPlugin(plugin);
                }
            });
        } else if (typeof pluginConfig === 'object') {
            Object.entries(pluginConfig)
                .filter(([, config]) => config && config.enabled !== false)
                .forEach(([pluginId, config]) => {
                    if (config.instance) {
                        pluginManager.registerPlugin(config.instance);
                    } else if (config.constructor) {
                        const plugin = new config.constructor(pluginId, config.config || {});
                        pluginManager.registerPlugin(plugin);
                    }
                });
        }
    }

    async _initializeSubsystems(agent) {
        if (this.config.subsystems.tools) {
            // Tools init
        }

        if (agent.initialize) {
             await agent.initialize();
        }

        if (agent._pluginManager) {
            agent._pluginManager.initializeAll().then(success => {
                if (success) {
                    agent._pluginManager.startAll().catch(error => {
                        console.error('Failed to start plugins:', error);
                    });
                }
            }).catch(error => {
                console.error('Failed to initialize plugins:', error);
            });
        }
    }
}
