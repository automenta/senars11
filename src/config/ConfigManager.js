/**
 * @file ConfigManager.js
 * @description Abstract configuration management utility
 */

import {validateConfigWithDefaults} from '../config/ConfigValidator.js';
import {deepFreeze} from '../util/common.js';

// Default configuration values
const DEFAULT_CONFIG = deepFreeze({
    memory: {
        capacity: 1000,
        consolidationThreshold: 0.1,
        forgettingThreshold: 0.05,
        conceptActivationDecay: 0.95
    },
    focus: {
        size: 100,
        setCount: 3,
        attentionDecay: 0.98,
        diversityFactor: 0.3
    },
    taskManager: {
        defaultPriority: 0.5,
        priorityThreshold: 0.1,
        priority: {
            confidenceMultiplier: 0.3,
            goalBoost: 0.2,
            questionBoost: 0.1
        }
    },
    cycle: {
        delay: 50,
        maxTasksPerCycle: 10,
        ruleApplicationLimit: 50
    },
    ruleEngine: {
        enableValidation: true,
        maxRuleApplicationsPerCycle: 20,
        performanceTracking: true
    },
    lm: {
        enabled: false,
        defaultProvider: 'dummy',
        maxConcurrentRequests: 5,
        timeout: 10000,
        retryAttempts: 2,
        cacheEnabled: true,
        cacheSize: 100,
        providers: {
            openai: {
                name: 'OpenAI',
                apiKey: '',
                model: 'gpt-4',
                baseURL: 'https://api.openai.com/v1',
                temperature: 0.7,
                maxTokens: 1000
            },
            ollama: {
                name: 'Ollama',
                apiKey: '',
                model: 'llama2',
                baseURL: 'http://localhost:11434/api',
                temperature: 0.7,
                maxTokens: 1000
            },
            anthropic: {
                name: 'Anthropic',
                apiKey: '',
                model: 'claude-3-sonnet-20240229',
                baseURL: 'https://api.anthropic.com/v1',
                temperature: 0.7,
                maxTokens: 1000
            }
        }
    },
    performance: {
        enableProfiling: false,
        maxExecutionTime: 100,
        memoryLimit: 512 * 1024 * 1024,
        gcThreshold: 0.8
    },
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
        maxFileSize: 10 * 1024 * 1024,
        retentionDays: 7
    },
    errorHandling: {
        enableGracefulDegradation: true,
        maxErrorRate: 0.1,
        enableRecovery: true,
        recoveryAttempts: 3
    },
    introspection: {
        enabled: true,
        perComponent: {
            TermFactory: true,
            Memory: true,
            NAR: true,
            Cycle: true,
            RuleEngine: true
        }
    },
    termFactory: {
        maxCacheSize: 5000
    },
    reasoning: {
        maxDerivationDepth: 10,
        cpuThrottleInterval: 0,
        streamSamplingObjectives: {priority: true},
        streamStrategy: {},
        streamRuleExecutor: {}
    },
    metacognition: {
        analyzers: ['PerformanceAnalyzer'],
        selfOptimization: {
            enabled: true
        },
        PerformanceAnalyzer: {
            avgCycleTimeThreshold: 100,
            cacheHitRateThreshold: 0.8
        }
    },
    components: {
        metacognition: {
            enabled: true,
            path: 'self/Metacognition.js',
            class: 'Metacognition',
            dependencies: ['nar', 'eventBus'],
            config: {
                analyzers: ['PerformanceAnalyzer'],
                selfOptimization: {
                    enabled: true
                },
                PerformanceAnalyzer: {
                    avgCycleTimeThreshold: 100,
                    cacheHitRateThreshold: 0.8
                }
            }
        }
    }
});

class ConfigManager {
    constructor(initialConfig = {}) {
        this._config = this._validateAndMergeConfig(initialConfig);
    }

    _validateAndMergeConfig(userConfig) {
        // Deep merge user config with defaults
        const mergedConfig = this._deepMerge(DEFAULT_CONFIG, userConfig);
        // Validate the merged config
        return validateConfigWithDefaults(mergedConfig);
    }

    _deepMerge(target, source) {
        const result = {...target};

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    get(path) {
        if (!path) return this._config;

        const pathParts = path.split('.');
        let current = this._config;

        for (const part of pathParts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    set(path, value) {
        const pathParts = path.split('.');
        const newConfig = this._deepClone(this._config);
        let current = newConfig;

        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (current[part] === undefined || current[part] === null) {
                current[part] = {};
            }
            current = current[part];
        }

        current[pathParts[pathParts.length - 1]] = value;

        // Re-validate the config after modification
        this._config = this._validateAndMergeConfig(newConfig);
        return this;
    }

    update(updates) {
        const newConfig = this._deepMerge(this._config, updates);
        this._config = this._validateAndMergeConfig(newConfig);
        return this;
    }

    toJSON() {
        return {...this._config};
    }

    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this._deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

// Singleton instance for global config management
const globalConfigManager = new ConfigManager();

export {ConfigManager, globalConfigManager, DEFAULT_CONFIG};