import {BaseProvider} from './BaseProvider.js';

export class DummyProvider extends BaseProvider {
    constructor(options = {}) {
        super(options);
        this.id = options.id || 'dummy';
        this.latency = options.latency || 0;
        this.responseTemplate = options.responseTemplate || 'Response to: {prompt}';
    }

    async generateText(prompt, options = {}) {
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }
        return this.responseTemplate.replace('{prompt}', prompt);
    }

    async generateEmbedding(text) {
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }

        const embedding = [];
        for (let i = 0; i < 16; i++) {
            embedding.push(Math.sin(text.charCodeAt(i % text.length) + i));
        }
        return embedding;
    }
}