
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";

/**
 * Wrapper for Transformers.js to behave like a LangChain ChatModel.
 * Supports tool calling via prompt engineering and output parsing.
 */
export class TransformersJSModel extends BaseChatModel {
    constructor(fields) {
        super(fields);
        this.modelName = fields?.modelName || 'Xenova/LaMini-Flan-T5-783M';
        this.task = fields?.task || 'text2text-generation';
        this.device = fields?.device || 'cpu';
        this.temperature = fields?.temperature ?? 0;
        this.maxTokens = fields?.maxTokens ?? 512;
        this.pipeline = null;
        this.boundTools = [];
    }

    _llmType() {
        return "transformers_js";
    }

    async _initialize() {
        if (this.pipeline) return;
        try {
            // Suppress ONNX Runtime warnings
            if (!process.env.ORT_LOG_LEVEL) {
                process.env.ORT_LOG_LEVEL = '3';
            }

            const { pipeline, env } = await import('@xenova/transformers');

            // Ensure we use a cache directory that is writable if needed
            // env.cacheDir = './.cache'; // Optional customization

            this.pipeline = await pipeline(this.task, this.modelName, {
                device: this.device,
                quantized: true
            });
        } catch (error) {
            throw new Error(`TransformersJS initialization failed: ${error.message}`);
        }
    }

    bindTools(tools) {
        this.boundTools = tools;
        return this;
    }

    async _generate(messages, options, runManager) {
        const prompt = this._formatMessages(messages);
        await this._initialize();

        try {
            const output = await this.pipeline(prompt, {
                max_new_tokens: this.maxTokens,
                temperature: this.temperature,
                do_sample: this.temperature > 0,
            });

            const res = Array.isArray(output) ? output[0] : output;
            const text = res?.generated_text || res?.text || JSON.stringify(output);

            const { content, tool_calls } = this._parseOutput(text);

            return {
                generations: [
                    {
                        text: text,
                        message: new AIMessage({
                            content,
                            tool_calls
                        })
                    }
                ]
            };
        } catch (error) {
            throw new Error(`TransformersJS generation failed: ${error.message}`);
        }
    }

    async *_streamResponseChunks(messages, options, runManager) {
        const prompt = this._formatMessages(messages);
        await this._initialize();

        // Transformers.js pipeline doesn't support streaming efficiently in the same way for all models
        // But for text-generation it might support a callback.
        // For now, we simulate streaming by generating full text and yielding it.
        // If the underlying pipeline supports streamer, we could use it.

        // TODO: implement true streaming if possible with @xenova/transformers Streamer

        try {
            const output = await this.pipeline(prompt, {
                max_new_tokens: this.maxTokens,
                temperature: this.temperature,
                do_sample: this.temperature > 0,
            });

            const res = Array.isArray(output) ? output[0] : output;
            const text = res?.generated_text || res?.text || JSON.stringify(output);

            const { content, tool_calls } = this._parseOutput(text);

            if (tool_calls && tool_calls.length > 0) {
                 // Yield empty content with tool calls
                 yield new ChatGenerationChunk({
                    message: new AIMessageChunk({
                        content: content || "",
                        tool_calls: tool_calls
                    }),
                    text: text
                });
            } else {
                // Yield content
                 yield new ChatGenerationChunk({
                    message: new AIMessageChunk({
                        content: content,
                    }),
                    text: content
                });
            }

        } catch (error) {
             throw new Error(`TransformersJS streaming failed: ${error.message}`);
        }
    }

    _formatMessages(messages) {
        let systemPrompt = "";
        let chatHistory = "";

        // Construct tool definitions
        if (this.boundTools && this.boundTools.length > 0) {
            systemPrompt += "You are a helpful assistant. You have access to the following tools:\n";
            this.boundTools.forEach(tool => {
                const schema = JSON.stringify(tool.schema || tool.parameters || {});
                systemPrompt += `- ${tool.name}: ${tool.description}. Arguments: ${schema}\n`;
            });
            systemPrompt += "\nTo use a tool, output exactly:\nAction: <tool_name>\nAction Input: <json_arguments>\n";
            systemPrompt += "If no tool is needed, just provide the answer.\n\n";
            systemPrompt += "Example:\nUser: Add 2 and 3\nAssistant:\nAction: calculator\nAction Input: {\"operation\": \"add\", \"a\": 2, \"b\": 3}\n\n";
        }

        messages.forEach(msg => {
            if (msg instanceof SystemMessage) {
                systemPrompt += `${msg.content}\n`;
            } else if (msg instanceof HumanMessage) {
                chatHistory += `User: ${msg.content}\n`;
            } else if (msg instanceof AIMessage) {
                chatHistory += `Assistant: ${msg.content}\n`;
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    msg.tool_calls.forEach(tc => {
                        chatHistory += `Action: ${tc.name}\nAction Input: ${JSON.stringify(tc.args)}\n`;
                    });
                }
            } else if (msg instanceof ToolMessage) {
                chatHistory += `Tool Result: ${msg.content}\n`;
            } else if (typeof msg === 'string') {
                 chatHistory += `User: ${msg}\n`;
            }
        });

        // T5 usually expects "instruction: ... input: ..."
        // But LaMini-Flan-T5 is instruction tuned.
        // We'll concat system + history + "Assistant:"
        return `${systemPrompt}\n${chatHistory}\nAssistant:`;
    }

    _parseOutput(text) {
        const actionRegex = /Action:\s*(.+)\s*Action Input:\s*({.+})/s;
        const match = text.match(actionRegex);

        if (match) {
            try {
                const toolName = match[1].trim();
                const argsString = match[2].trim();
                const args = JSON.parse(argsString);

                return {
                    content: text.substring(0, match.index).trim(),
                    tool_calls: [{
                        name: toolName,
                        args: args,
                        id: `call_${Date.now()}` // Mock ID
                    }]
                };
            } catch (e) {
                // Failed to parse JSON or regex, return as text
                console.warn("Failed to parse tool call:", e);
                return { content: text, tool_calls: [] };
            }
        }

        return { content: text, tool_calls: [] };
    }
}
