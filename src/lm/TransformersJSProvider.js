import {BaseProvider} from './BaseProvider.js';

let pipelinePromise = null;
const importPipeline = () => {
    if (!pipelinePromise) {
        pipelinePromise = import('@xenova/transformers').then(mod => mod.pipeline);
    }
    return pipelinePromise;
};

export class TransformersJSProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.modelName = config.modelName ?? 'Xenova/LaMini-Flan-T5-783M';
        this.task = config.task ?? 'text2text-generation';
        this.device = config.device ?? 'cpu';
        this.pipeline = null;
    }

    async _initialize() {
        if (this.pipeline) return;
        const pipeline = await importPipeline();
        this.pipeline = await pipeline(this.task, this.modelName, {device: this.device});
    }

    async generateText(prompt, options = {}) {
        await this._initialize();
        const {maxTokens, temperature, ...restOptions} = options;
        const temp = temperature ?? 0.7;

        const output = await this.pipeline(prompt, {
            max_new_tokens: maxTokens ?? 256,
            temperature: temp,
            do_sample: temp > 0,
            ...restOptions
        });

        const result = Array.isArray(output) ? output[0] : output;
        return result?.generated_text ?? result?.text ?? JSON.stringify(result);
    }
}
