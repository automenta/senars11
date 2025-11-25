import {BaseProvider} from './BaseProvider.js';

export class TransformersJSProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.modelName = config.modelName || 'Xenova/LaMini-Flan-T5-783M';
        this.task = config.task || 'text2text-generation';
        this.device = config.device || 'cpu'; // 'webgpu' if available, but defaults to cpu for safety
        this.pipeline = null;
        this.tools = [];
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

    async invoke(prompt, options = {}) {
        return await this.generateText(prompt, options);
    }

    async *stream(messages, options = {}) {
        await this._initialize();
        const prompt = Array.isArray(messages) ? messages[messages.length - 1].content : messages;

        const responseText = await this.generateText(prompt, options);

        // Simple tool parsing simulation
        // Example: "Tool: add(5, 3)"
        const toolPattern = /Tool:\s*(\w+)\(([^)]*)\)/i;
        const match = responseText.match(toolPattern);

        if (match) {
             const [fullMatch, toolName, argsStr] = match;

             // Content before tool
             if (match.index > 0) {
                 yield { content: responseText.substring(0, match.index) };
             }

             // Parse args
             let args = {};
             try {
                 if (argsStr.trim().startsWith('{')) {
                     args = JSON.parse(argsStr);
                 } else {
                     const parts = argsStr.split(',').map(s => s.trim());
                     if (parts.length >= 2) {
                         // Simple heuristic for demo tools like add(a,b)
                         args = { a: parts[0], b: parts[1] };
                     } else {
                         args = { input: parts[0] };
                     }
                 }
             } catch (e) {
                 args = { raw: argsStr };
             }

             yield {
                 tool_calls: [{
                     id: `call_${Date.now()}`,
                     name: toolName,
                     args: args,
                     type: 'tool_call'
                 }]
             };

             // Content after tool
             if (match.index + fullMatch.length < responseText.length) {
                 yield { content: responseText.substring(match.index + fullMatch.length) };
             }

        } else {
            yield { content: responseText };
        }
    }
}
