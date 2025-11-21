import {NAR} from '../nar/NAR.js';
import {AgentReplEngine} from '../repl/AgentReplEngine.js';
import {ChatOllama} from "@langchain/ollama";

/**
 * SessionBuilder
 *
 * Responsible for constructing a complete "Session" (NAR + AgentReplEngine + LM + Tools).
 * Standardizes the initialization process across TUI, Web UI, and other interfaces.
 */
export class SessionBuilder {
    constructor(config = {}) {
        this.config = config;
        this.narConfig = config.nar || {};
        this.lmConfig = config.lm || {};
        this.persistenceConfig = config.persistence || {};
        this.inputProcessingConfig = config.inputProcessing || {};
    }

    /**
     * Build and return a fully initialized AgentReplEngine
     */
    async build() {
        console.log('🏗️  Building SeNARS Session...');

        // 1. Create NAR instance
        const nar = new NAR({
            tools: {enabled: true},
            lm: {enabled: true},
            ...this.narConfig
        });

        // Initialize NAR
        if (nar.initialize) {
             try {
                await nar.initialize();
                console.log('✅ NAR system initialized');
            } catch (error) {
                console.error('⚠️  Warning: Failed to initialize NAR system:', error.message);
            }
        }

        // 2. Create LM Provider
        // Currently supports Ollama as the primary built-in provider
        let lmProvider = null;

        // Check if we have valid LM config
        if (this.lmConfig.provider === 'ollama') {
            console.log(`🔧 Configuring Ollama: ${this.lmConfig.modelName}`);
            lmProvider = new ChatOllama({
                model: this.lmConfig.modelName,
                baseUrl: this.lmConfig.baseUrl,
                temperature: this.lmConfig.temperature,
            });
            // Add identifier for the engine
            lmProvider.name = 'ollama';
            // Attach tools array for later population
            lmProvider.tools = [];
        } else if (this.lmConfig.enabled) {
            console.warn('⚠️  LM enabled but no supported provider configured. Agent capabilities may be limited.');
        }

        // 3. Create AgentReplEngine (The Session Engine)
        const engine = new AgentReplEngine({
            nar: nar,
            lm: this.lmConfig,
            inputProcessing: this.inputProcessingConfig,
            persistence: this.persistenceConfig
        });

        // 4. Initialize Engine
        await engine.initialize();

        // 5. Register LM Provider with Engine
        if (lmProvider) {
            engine.registerLMProvider('ollama', lmProvider);
        }

        console.log('✅ Session Engine ready.');
        return engine;
    }
}
