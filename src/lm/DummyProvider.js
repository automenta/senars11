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

    async invoke(prompt) {
        return this.generateText(prompt);
    }

    async* streamText(prompt, options = {}) {
        const text = await this.generateText(prompt, options);
        const chunkSize = 5;
        for (let i = 0; i < text.length; i += chunkSize) {
            yield text.substring(i, Math.min(i + chunkSize, text.length));
            if (this.latency > 0) await new Promise(resolve => setTimeout(resolve, 10));
        }
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