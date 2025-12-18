import {BaseProvider} from './BaseProvider.js';

let pipelinePromise = null;
const importPipeline = () => {
    if (!pipelinePromise) {
        pipelinePromise = import('@huggingface/transformers').then(mod => mod.pipeline);
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
        this.tools = config.tools || [];
    }

    async _initialize() {
        if (this.pipeline) return;

        const startTime = Date.now();
        this._emitEvent('lm:model-load-start', {modelName: this.modelName, task: this.task});

        try {
            const pipeline = await importPipeline();
            const loadModelPromise = pipeline(this.task, this.modelName, {device: this.device});

            this.pipeline = await this._withTimeout(
                loadModelPromise,
                this.loadTimeout,
                `Model loading (${this.modelName})`
            );

            const elapsed = Date.now() - startTime;
            this._emitEvent('lm:model-load-complete', {
                modelName: this.modelName,
                task: this.task,
                elapsedMs: elapsed
            });
            this._emitDebug('Model loaded successfully', {modelName: this.modelName, elapsedMs: elapsed});
        } catch (error) {
            const elapsed = Date.now() - startTime;

            if (error.message.includes('timed out')) {
                this._emitEvent('lm:model-load-timeout', {
                    modelName: this.modelName,
                    task: this.task,
                    timeoutMs: this.loadTimeout,
                    elapsedMs: elapsed
                });
            }

            this.pipeline = null; // Cleanup on failure
            throw error;
        }
    }

    async generateText(prompt, options = {}) {
        const stream = this.streamText(prompt, options);
        let fullResponse = '';
        for await (const chunk of stream) {
            fullResponse += chunk;
        }
        return fullResponse;
    }

    async* streamText(prompt, options = {}) {
        await this._initialize();

        let currentPrompt = prompt;
        const maxTurns = 5;

        for (let turn = 0; turn < maxTurns; turn++) {
            const formattedPrompt = this.tools.length > 0
                ? this._formatPromptWithTools(currentPrompt)
                : currentPrompt;

            let fullOutput = '';
            for await (const chunk of this._streamPipeline(formattedPrompt, options)) {
                fullOutput += chunk;
                yield chunk;
            }

            const toolCall = this._parseToolCall(fullOutput);

            if (toolCall) {
                const toolResult = await this._executeTool(toolCall);
                currentPrompt = `${fullOutput}\nTool Result: ${toolResult}`;
            } else {
                return; // End of generation
            }
        }
    }

    _formatPromptWithTools(prompt) {
        const toolDescriptions = this.tools.map(tool =>
            `${tool.name}: ${tool.description} - Schema: ${JSON.stringify(tool.schema)}`
        ).join('\n');

        return `You have access to the following tools:\n${toolDescriptions}\n\nTo use a tool, respond with a JSON object with "tool" and "args" keys, wrapped in \`\`\`json blocks, e.g., \`\`\`json\n{"tool": "tool_name", "args": {"arg1": "value1"}}\n\`\`\`\n\n${prompt}`;
    }

    _parseToolCall(text) {
        const toolCallRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
        const match = text.match(toolCallRegex);

        if (match && match[1]) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.tool && parsed.args) {
                    return parsed;
                }
            } catch (error) {
                // Not a valid tool call
            }
        }
        return null;
    }

    async _executeTool(toolCall) {
        const tool = this.tools.find(t => t.name === toolCall.tool);
        if (tool) {
            try {
                const result = await tool.execute(toolCall.args);
                return JSON.stringify(result);
            } catch (error) {
                return `Error executing tool: ${error.message}`;
            }
        }
        return `Tool "${toolCall.tool}" not found.`;
    }

    async* _streamPipeline(prompt, options) {
        const {maxTokens, temperature, ...restOptions} = options;
        const temp = temperature ?? 0.7;

        let resolvePromise, rejectPromise;
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        const outputQueue = [];
        let processing = true;
        let fullOutput = '';

        const callback_function = (beams) => {
            const decodedText = this.pipeline.tokenizer.decode(beams[0].output_token_ids, {skip_special_tokens: true});
            if (decodedText.length > fullOutput.length && decodedText.startsWith(fullOutput)) {
                const newText = decodedText.substring(fullOutput.length);
                outputQueue.push(newText);
            }
            fullOutput = decodedText;
        };

        const resultPromise = this.pipeline(prompt, {
            max_new_tokens: maxTokens ?? 256,
            temperature: temp,
            do_sample: temp > 0,
            callback_function,
            ...restOptions
        });

        resultPromise.then((output) => {
            this._emitDebug('Pipeline output', {output});

            // If streaming didn't capture anything but we have output, enqueue it
            if (fullOutput.length === 0 && Array.isArray(output) && output[0]?.generated_text) {
                const generated = output[0].generated_text;
                // Remove prompt if included (common in text-generation task)
                const cleanText = generated.startsWith(prompt) ? generated.slice(prompt.length) : generated;
                if (cleanText) outputQueue.push(cleanText);
            }
            processing = false;
            resolvePromise();
        }).catch(err => {
            processing = false;
            rejectPromise(err);
        });

        while (processing || outputQueue.length > 0) {
            if (outputQueue.length > 0) {
                yield outputQueue.shift();
            } else {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }

    async destroy() {
        // Clear pipeline reference to allow GC
        this.pipeline = null;
        // Note: The underlying pipeline from transformers.js might not have an explicit destroy method
        // but clearing the reference helps.
        // Also ensure any pending streams are stopped (though generator logic handles this via loop conditions)
    }
}
