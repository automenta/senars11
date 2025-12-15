import fs from 'fs';
import { DummyProvider } from './DummyProvider.js';
import { TransformersJSProvider } from './TransformersJSProvider.js';

export class LMConfig {
    static PROVIDERS = Object.freeze({
        TRANSFORMERS: 'transformers',
        OLLAMA: 'ollama',
        OPENAI: 'openai',
        HUGGINGFACE: 'huggingface',
        DUMMY: 'dummy'
    });

    constructor(options = {}) {
        this.configs = new Map();
        this.active = null;
        this.persistPath = options.persistPath ?? '.senars-lm-config.json';

        this.setProvider(LMConfig.PROVIDERS.TRANSFORMERS, { model: 'Xenova/all-MiniLM-L6-v2', type: 'transformers' });
        this.setProvider(LMConfig.PROVIDERS.DUMMY, { type: 'dummy' });
        this.setActive(LMConfig.PROVIDERS.TRANSFORMERS);
    }

    setProvider(name, config) {
        this.configs.set(name, { name, ...config, enabled: config.enabled ?? true });
    }

    getProvider(name) {
        return this.configs.get(name) ?? null;
    }

    setActive(name) {
        if (!this.configs.has(name)) throw new Error(`Provider ${name} not configured`);
        this.active = name;
    }

    getActive() {
        if (!this.active) throw new Error('No active provider set');
        return this.configs.get(this.active);
    }

    listProviders() {
        return Array.from(this.configs.keys());
    }

    async test(name = this.active) {
        if (!name) return { success: false, message: 'No provider specified' };

        const config = this.getProvider(name);
        if (!config) return { success: false, message: `Provider ${name} not found` };

        try {
            const provider = this._createProvider(config);
            if (provider.embed) await provider.embed('test');
            else if (provider.complete) await provider.complete('test');
            return { success: true, message: 'Connection successful' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    save(path = this.persistPath) {
        fs.writeFileSync(path, JSON.stringify({
            active: this.active,
            providers: Object.fromEntries(this.configs)
        }, null, 2), 'utf-8');
    }

    load(path = this.persistPath) {
        if (!fs.existsSync(path)) return;

        try {
            const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
            this.active = data.active;
            this.configs = new Map(Object.entries(data.providers));
        } catch (error) {
            console.warn(`Failed to load LM config from ${path}:`, error.message);
        }
    }

    createActiveProvider() {
        return this._createProvider(this.getActive());
    }

    isConfigured(name) {
        return this.configs.has(name);
    }

    getActiveProviderName() {
        return this.active;
    }

    clearAll() {
        this.configs.clear();
        this.active = null;
    }

    _createProvider(config) {
        if (!config) throw new Error('Cannot create provider from null config');

        const type = config.type ?? config.name;
        const { TRANSFORMERS, DUMMY, OLLAMA, OPENAI, HUGGINGFACE } = LMConfig.PROVIDERS;

        if (type === 'transformers' || type === TRANSFORMERS) return new TransformersJSProvider(config);
        if (type === 'dummy' || type === DUMMY) return new DummyProvider(config);
        if (type === 'ollama' || type === OLLAMA) throw new Error('Ollama provider not yet implemented');
        if (type === 'openai' || type === OPENAI) throw new Error('OpenAI provider not yet implemented');
        if (type === 'huggingface' || type === HUGGINGFACE) throw new Error('HuggingFace provider not yet implemented');

        throw new Error(`Unknown provider type: ${type}`);
    }

    isConfigured(name) {
        return this.configs.has(name);
    }

    getActiveProviderName() {
        return this.active;
    }

    clearAll() {
        this.configs.clear();
        this.active = null;
    }

    toJSON() {
        return {
            active: this.active,
            providers: Object.fromEntries(this.configs),
            version: '1.0.0'
        };
    }

    static fromJSON(json) {
        const config = new LMConfig({ persistPath: json.persistPath });
        config.active = json.active;
        config.configs = new Map(Object.entries(json.providers ?? {}));
        return config;
    }
}
