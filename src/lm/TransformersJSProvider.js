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
            // Dynamic import to support environments where transformers might be optional
            const {pipeline, env} = await import('@xenova/transformers');

            // Configure cache if needed (env.localModelPath = ...)
            // For now, use default cache

            this.pipeline = await pipeline(this.task, this.modelName, {
                device: this.device
            });
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

            // Extract text based on output format
            if (Array.isArray(output)) {
                return output[0]?.generated_text || output[0]?.text || JSON.stringify(output);
            }
            return output?.generated_text || output?.text || JSON.stringify(output);
        } catch (error) {
            throw new Error(`TransformersJS generation failed: ${error.message}`);
        }
    }
}
