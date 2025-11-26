import {Agent} from './Agent.js';
import {PluginManager} from '../util/Plugin.js';
import {FunctorProvider} from './FunctorProvider.js';
import {LMProviderBuilder} from '../lm/LMProviderBuilder.js';

export class AgentBuilder {
    constructor(initialConfig = {}) {
        this.config = this.constructor.getDefaultConfig();
        this.dependencies = new Map();

        if (initialConfig) {
            this.withConfig(initialConfig);
        }
    }

    static getDefaultConfig() {
        return {
            subsystems: {
                metrics: true,
                embeddingLayer: false,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: false,
                lm: false,
            },
            memory: {
                enableMemoryValidation: true,
                memoryValidationInterval: 30000,
            },
            nar: {},
            lm: {
                circuitBreaker: {
                    failureThreshold: 5,
                    timeout: 60000,
                    resetTimeout: 30000
                },
            },
            persistence: {},
            inputProcessing: {}
        };
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
        const advancedConfig = {
            subsystems: {
                metrics: true,
                embeddingLayer: true,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: true,
                lm: { enabled: true },
            },
        };
        return new AgentBuilder(advancedConfig).withConfig(config).build();
    }

    withConfig(config) {
        Object.assign(this.config, config);
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

        agent._pluginManager = new PluginManager({
            nar: agent,
            agent: agent,
            eventBus: agent._eventBus
        });

        if (this.config.subsystems.plugins) {
            this._registerPlugins(agent._pluginManager, this.config.subsystems.plugins);
        }

        FunctorProvider.registerFunctors(agent.evaluator?.getFunctorRegistry?.(), this.config.subsystems.functors);

        await this._initializeSubsystems(agent);

        const lmProvider = LMProviderBuilder.create(agent, this.config.lm);
        if (lmProvider) {
            agent.lm?.registerProvider(lmProvider.name, lmProvider);
            agent.lm?.providers.setDefault(lmProvider.name);
        }

        return agent;
    }

    _buildAgentConfig() {
        const {subsystems, nar, memory, persistence, inputProcessing, lm} = this.config;
        const {lm: lmSubsystem, tools, embeddingLayer, metrics} = subsystems;

        return {
            ...nar,
            memory,
            persistence,
            inputProcessing,
            lm: {
                enabled: !!lmSubsystem,
                ...(typeof lmSubsystem === 'object' ? lmSubsystem : {}),
                ...lm
            },
            tools: {
                enabled: !!tools,
                ...(typeof tools === 'object' ? tools : {})
            },
            embeddingLayer: {
                enabled: !!embeddingLayer,
                ...(typeof embeddingLayer === 'object' ? embeddingLayer : {})
            },
            metricsMonitor: metrics ? (typeof metrics === 'object' ? metrics : {}) : undefined
        };
    }

    _registerPlugins(pluginManager, pluginConfig) {
        const register = (config, id) => {
            if (config.instance) pluginManager.registerPlugin(config.instance);
            else if (config.constructor) {
                pluginManager.registerPlugin(new config.constructor(id ?? config.constructor.name.toLowerCase(), config.config ?? {}));
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
