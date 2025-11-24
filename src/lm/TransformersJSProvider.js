import {BaseProvider} from './BaseProvider.js';

export class TransformersJSProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.modelName = config.modelName || 'Xenova/LaMini-Flan-T5-783M';
        this.task = config.task || 'text2text-generation';
        this.device = config.device || 'cpu'; // 'webgpu' if available, but defaults to cpu for safety
        this.pipeline = null;
    }

    async _initialize() {
        if (this.pipeline) return;
        try {
            const {pipeline} = await import('@xenova/transformers');
            this.pipeline = await pipeline(this.task, this.modelName, {device: this.device});
        } catch (error) {
            throw new Error(`TransformersJS initialization failed: ${error.message}`);
        }
    }

    async generateText(prompt, options = {}) {
        await this._initialize();
        try {
            const output = await this.pipeline(prompt, {
                max_new_tokens: options.maxTokens || 256,
                temperature: options.temperature || 0.7,
                do_sample: (options.temperature || 0.7) > 0,
                ...options
            });
            const res = Array.isArray(output) ? output[0] : output;
            return res?.generated_text || res?.text || JSON.stringify(output);
        } catch (error) {
            throw new Error(`TransformersJS generation failed: ${error.message}`);
        }
    }
}
