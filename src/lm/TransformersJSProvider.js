import {BaseProvider} from './BaseProvider.js';

let pipelinePromise = null;
const importPipeline = () => {
    if (!pipelinePromise) {
        pipelinePromise = import('@xenova/transformers').then(mod => {
            // Configure env to reduce warnings
            if (mod.env) {
                // Ensure we try to download if not found locally
                mod.env.allowLocalModels = false;
                // Reduce logging verbosity if supported by the version
                if (mod.env.backends && mod.env.backends.onnx) {
                    mod.env.backends.onnx.logLevel = 'error';
                }
            }
            return mod.pipeline;
        });
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
        const pipeline = await importPipeline();
        this.pipeline = await pipeline(this.task, this.modelName, {device: this.device});
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

        this.pipeline(prompt, {
            max_new_tokens: maxTokens ?? 256,
            temperature: temp,
            do_sample: temp > 0,
            callback_function,
            ...restOptions
        }).then(() => {
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
}
