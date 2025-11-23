import {NAR} from '../nar/NAR.js';
import {SessionEngine} from './SessionEngine.js';
import {ChatOllama} from "@langchain/ollama";

export class SessionBuilder {
    constructor(config = {}) {
        this.config = config;
        this.narConfig = config.nar || {};
        this.lmConfig = config.lm || {};
        this.persistenceConfig = config.persistence || {};
        this.inputProcessingConfig = config.inputProcessing || {};
    }

    async build() {
        console.log('🏗️  Building SeNARS Session...');

        const nar = await this._createAndInitializeNAR();
        const lmProvider = this._createLMProvider();
        const engine = await this._createAndInitializeEngine(nar);

        if (lmProvider) {
            engine.registerLMProvider('ollama', lmProvider);
        }

        console.log('✅ Session Engine ready.');
        return engine;
    }

    async _createAndInitializeNAR() {
        const nar = new NAR({
            tools: {enabled: true},
            lm: {enabled: true},
            ...this.narConfig
        });

        if (nar.initialize) {
            try {
                await nar.initialize();
                console.log('✅ NAR system initialized');
            } catch (error) {
                console.error('⚠️  Warning: Failed to initialize NAR system:', error.message);
            }
        }
        return nar;
    }

    _createLMProvider() {
        if (this.lmConfig.provider === 'ollama') {
            console.log(`🔧 Configuring Ollama: ${this.lmConfig.modelName}`);
            const lmProvider = new ChatOllama({
                model: this.lmConfig.modelName,
                baseUrl: this.lmConfig.baseUrl,
                temperature: this.lmConfig.temperature,
            });
            lmProvider.name = 'ollama';
            lmProvider.tools = [];
            return lmProvider;
        } else if (this.lmConfig.enabled) {
            console.warn('⚠️  LM enabled but no supported provider configured. Agent capabilities may be limited.');
        }
        return null;
    }

    async _createAndInitializeEngine(nar) {
        const engine = new SessionEngine({
            nar,
            lm: this.lmConfig,
            inputProcessing: this.inputProcessingConfig,
            persistence: this.persistenceConfig
        });

        await engine.initialize();
        return engine;
    }
}
