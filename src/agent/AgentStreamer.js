import {HumanMessage, ToolMessage} from "@langchain/core/messages";
import {handleError} from '../util/ErrorHandler.js';
import {AGENT_EVENTS} from "./constants.js";

export class AgentStreamer {
    constructor(agent) {
        this.agent = agent;
        this._currentToolCalls = [];
    }

    async accumulateStreamResponse(input) {
        if (!this.agent.lm) return this.agent.inputProcessor.processNarsese(input);

        let response = "";
        for await (const chunk of this.streamExecution(input)) {
            if (chunk.type === "agent_response") response += chunk.content;
        }
        return response || "No response generated.";
    }

    async* streamExecution(input) {
        if (!this.agent.lm || !this._getProvider()) {
            yield* this._handleMissingProvider(input);
            return;
        }

        const provider = this._getProvider();
        this._currentToolCalls = [];

        try {
            const assistantContent = yield* this._streamAssistantResponse([new HumanMessage(input)], provider);
            if (this._currentToolCalls.length > 0) {
                yield* this._executeAllToolCalls(this._currentToolCalls, input, assistantContent, provider);
            }
        } catch (error) {
            yield* this._handleStreamingError(error, input);
            throw error;
        }
    }

    _getProvider() {
        return this.agent.lm?._getProvider(this.agent.lm.providers.defaultProviderId);
    }

    async* _handleMissingProvider(input) {
        if (this.agent.inputProcessingConfig.enableNarseseFallback && this.agent.inputProcessor._isPotentialNarsese(input)) {
            try {
                const result = await this.agent.inputProcessor.processNarsese(input);
                yield {type: "agent_response", content: result || "Input processed"};
                return;
            } catch (error) {
                yield {type: "agent_response", content: "❌ Agent initialized but Narsese processing failed."};
                return;
            }
        }
        yield {type: "agent_response", content: "❌ No LM provider available and input not recognized as Narsese."};
    }

    async* _streamAssistantResponse(messages, provider) {
        let model = provider.model || provider;
        let stream;

        if (typeof model.stream === 'function') {
            stream = await model.stream(messages);
        } else if (typeof provider.streamText === 'function') {
            stream = await provider.streamText(messages[0].content, {
                temperature: this.agent.inputProcessingConfig.lmTemperature
            });
        } else {
            const response = await provider.invoke(messages[0].content);
            yield {type: "agent_response", content: response};
            return response;
        }

        let assistantContent = "";
        for await (const chunk of stream) {
            const content = typeof chunk === 'object' ? chunk.content : chunk;
            if (content) {
                assistantContent += content;
                yield {type: "agent_response", content};
            }
            if (typeof chunk === 'object' && chunk.tool_calls?.length > 0) {
                this._collectToolCalls(chunk.tool_calls);
            }
        }
        return assistantContent;
    }

    _collectToolCalls(calls) {
        this._currentToolCalls = this._currentToolCalls.concat(calls);
    }

    async* _executeAllToolCalls(toolCalls, originalInput, assistantContent, provider) {
        for (const tc of toolCalls) {
            yield {type: "tool_call", name: tc.name, args: tc.args};
            const result = await this._executeTool(tc.name, tc.args, provider);
            yield {type: "tool_result", content: result};

            const messages = [
                new HumanMessage(originalInput),
                {role: "assistant", content: assistantContent, tool_calls: toolCalls},
                new ToolMessage({content: result, tool_call_id: tc.id, name: tc.name})
            ];

            try {
                const model = provider.model || provider;
                if (typeof model.stream === 'function') {
                    for await (const chunk of await model.stream(messages)) {
                        if (chunk.content) yield {type: "agent_response", content: chunk.content};
                    }
                }
            } catch (error) {
                yield {type: "agent_response", content: `Error generating final response: ${error.message}`};
            }
        }
    }

    async _executeTool(name, args, provider) {
        const tool = (provider.tools || []).find(t => t.name === name);
        if (!tool) return `Error: Tool ${name} not found`;

        try {
            return await tool.invoke(args);
        } catch (error) {
            return `Error executing ${name}: ${error.message}`;
        }
    }

    async* _handleStreamingError(error, input) {
        if (!this.agent.inputProcessingConfig.enableNarseseFallback || !this.agent.inputProcessor._isPotentialNarsese(input)) {
            console.error('Streaming execution error:', {error, input});
        }
        yield {type: "error", content: `❌ Streaming error: ${error.message}`};
    }

    async processInputStreaming(input, onChunk, onStep) {
        const trimmed = input.trim();
        if (!trimmed) {
            const res = await this.agent.executeCommand('next');
            onChunk?.(res);
            return res;
        }

        if (trimmed.startsWith('/') || this.agent.commandRegistry.get(trimmed.split(' ')[0])) {
            const res = await this.agent.inputProcessor.processInput(input); // processInput handles commands
            onChunk?.(res);
            return res;
        }

        try {
            let fullResponse = "";
            for await (const chunk of this.streamExecution(trimmed)) {
                onStep?.(chunk);
                if (chunk.type === 'agent_response') {
                    fullResponse += chunk.content;
                    onChunk?.(chunk.content);
                } else if (chunk.type === 'tool_call') {
                    onChunk?.(`\n[Calling tool: ${chunk.name}...]\n`);
                } else if (chunk.type === 'tool_result') {
                    onChunk?.(`\n[Tool result: ${chunk.content}]\n`);
                }
            }
            return fullResponse;
        } catch (error) {
            if (this.agent.inputProcessingConfig.enableNarseseFallback && this.agent.inputProcessor._isPotentialNarsese(trimmed)) {
                try {
                    const res = await this.agent.inputProcessor.processNarsese(trimmed);
                    onChunk?.(res);
                    return res;
                } catch (e) {
                    const msg = `💭 Agent processed: Input "${trimmed}" may not be valid Narsese. LM Error: ${error.message}`;
                    onChunk?.(msg);
                    return msg;
                }
            }
            const msg = handleError(error, 'Agent processing');
            onChunk?.(msg);
            return msg;
        }
    }
}
