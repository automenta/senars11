export class BaseProvider {
    constructor(config = {}) {
        this.id = config.id || this.constructor.name.toLowerCase();
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens ?? 100;
        this.config = config;
    }

    async process(prompt, options = {}) {
        return typeof this.generateText === 'function'
            ? this.generateText(prompt, options)
            : prompt;
    }

    async generateHypothesis(observations, options = {}) {
        const observationsText = observations.join('\n');
        const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;
        return this.process(prompt, options);
    }

    async streamText(prompt, options = {}) {
        throw new Error(`Streaming not implemented for ${this.constructor.name}. Implement in subclass.`);
    }

    getModelName() {
        return this.config.modelName || this.id;
    }
}