import {ReplEngine} from '../repl/ReplEngine.js';
import {LM} from '../lm/LM.js';
import {NARControlTool} from '../tool/NARControlTool.js';
import {handleError, logError} from '../util/ErrorHandler.js';
import {HumanMessage, ToolMessage} from "@langchain/core/messages";
import {
    AgentCommandRegistry,
    AgentCreateCommand,
    GoalCommand,
    LMCommand,
    PlanCommand,
    ProvidersCommand,
    ReasonCommand,
    ThinkCommand
} from '../repl/commands/AgentCommands.js';

export class SessionEngine extends ReplEngine {
    constructor(config = {}) {
        super(config);

        this.agentLM = new LM(config.lm || {}, this.eventBus);
        this.agents = new Map();
        this.activeAgent = null;
        this.commandRegistry = this._initializeCommandRegistry();

        this.inputProcessingConfig = {
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };
    }

    get eventBus() {
        return this.nar._eventBus;
    }

    _initializeCommandRegistry() {
        const registry = new AgentCommandRegistry();
        const commands = [
            new AgentCreateCommand(),
            new GoalCommand(),
            new PlanCommand(),
            new ThinkCommand(),
            new ReasonCommand(),
            new LMCommand(),
            new ProvidersCommand()
        ];

        commands.forEach(cmd => registry.register(cmd));
        return registry;
    }

    registerLMProvider(id, provider) {
        this.agentLM.registerProvider(id, provider);
        this.agentLM.providers.setDefault(id);
    }

    async initialize() {
        await super.initialize();

        if (this.agentLM.initialize) {
            await this.agentLM.initialize();
        }

        this._syncLMProviders();
        this._registerAgentEventHandlers();
        this._setupUnifiedEventStream();
        this._registerNARTools();

        const defaultProviderId = this.agentLM.providers.defaultProviderId;
        const provider = defaultProviderId && this.agentLM.providers.get(defaultProviderId);
        if (provider?.initialize) {
            await provider.initialize();
        }
    }

    _registerNARTools() {
        try {
            const narControlTool = new NARControlTool(this.nar);
            const defaultProviderId = this.agentLM.providers.defaultProviderId;
            const provider = defaultProviderId && this.agentLM.providers.get(defaultProviderId);

            if (provider) {
                provider.tools ??= [];
                const isAlreadyRegistered = provider.tools.some(tool =>
                    tool.name === narControlTool.name ||
                    tool.constructor.name === narControlTool.constructor.name
                );

                if (!isAlreadyRegistered) {
                    provider.tools.push(narControlTool);
                    console.log('🔧 Registered NAR control tool with LM provider');
                } else {
                    console.log('🔧 NAR control tool already registered');
                }
            }
        } catch (error) {
            console.error('❌ Error registering NAR tools:', error.message);
        }
    }

    _syncLMProviders() {
        const sourceProviders = this.lm?.providers;
        if (sourceProviders) {
            for (const [providerId, provider] of sourceProviders.providers.entries()) {
                this.agentLM.registerProvider(providerId, provider);
            }
            sourceProviders.defaultProviderId && this.agentLM.providers.setDefault(sourceProviders.defaultProviderId);
        }
    }

    _registerAgentEventHandlers() {
        ['agent.action', 'agent.decision'].forEach(event => {
            this.nar.on?.(event, (data) => this.emit(event, data));
        });
    }

    _setupUnifiedEventStream() {
        const coreEvents = [
            'task.input', 'task.processed', 'cycle.start', 'cycle.complete',
            'task.added', 'belief.added', 'question.answered',
            'system.started', 'system.stopped', 'system.reset', 'system.loaded',
            'reasoning.step', 'concept.created', 'task.completed', 'reasoning.derivation'
        ];

        if (this.nar?._eventBus) {
            coreEvents.forEach(eventType => {
                this.nar._eventBus.on(eventType, (data, options = {}) => {
                    this.emit(eventType, data, options);
                });
            });
        }
    }

    addAgentCommands() {
        this._overrideCommandProcessor();
    }

    _overrideCommandProcessor() {
        const original = this.executeCommand.bind(this);
        this.executeCommand = async (cmd, ...args) => {
            if (cmd === 'agent-status') {
                return this.activeAgent
                    ? await this.commandRegistry.execute('agent', this, 'status', ...args)
                    : 'No active agent. Use "agent create <name>" or "agent select <name>".';
            }

            return this.commandRegistry.get(cmd)
                ? await this.commandRegistry.execute(cmd, this, ...args)
                : await original(cmd, ...args);
        };
    }

    async processNarsese(input) {
        try {
            const result = await super.processNarsese(input);

            if (input.includes('!') && this.activeAgent) {
                const agent = this.agents.get(this.activeAgent);
                agent?.goals.push({content: input, timestamp: Date.now(), status: 'pending'});
            }

            return result;
        } catch (error) {
            logError(error, 'processNarsese');
            throw error;
        }
    }

    async processInput(input) {
        const trimmedInput = input.trim();
        if (!trimmedInput) return await this.executeCommand('next');

        this.sessionState.history.push(trimmedInput);

        if (trimmedInput.startsWith('/')) {
            return await this.executeCommand(...trimmedInput.slice(1).split(' '));
        }

        const [firstPart, ...rest] = trimmedInput.split(' ');
        if (this.commandRegistry.get(firstPart)) {
            return await this.commandRegistry.execute(firstPart, this, ...rest);
        }

        return await this._processAgentInput(trimmedInput);
    }

    async _processAgentInput(input) {
        try {
            return await this._accumulateStreamResponse(input);
        } catch (lmError) {
            logError(lmError, 'LM processing');
            return await this._handleProcessingError(input, lmError);
        }
    }

    async _accumulateStreamResponse(input) {
        let fullResponse = "";
        for await (const chunk of this.streamExecution(input)) {
            if (chunk.type === "agent_response") {
                fullResponse += chunk.content;
            }
        }
        return fullResponse || "No response generated.";
    }

    async _handleProcessingError(input, lmError) {
        const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(input);

        if (this.inputProcessingConfig.enableNarseseFallback && shouldTryNarsese) {
            try {
                return await this.processNarsese(input);
            } catch (narseseError) {
                logError(narseseError, 'Narsese processing');
                return `💭 Agent processed: Input "${input}" may not be valid Narsese. LM Error: ${lmError.message}`;
            }
        }

        return handleError(lmError, 'Agent processing');
    }

    _isPotentialNarsese(input) {
        const narsesePatterns = [
            /<[\w\s\-'"()[\]]*\s*-->\s*[\w\s\-'"()[\]]*>/,  // <A --> B>
            /<[\w\s\-'"()[\]]*\s*\^[\w\s\-'"()[\]]*>/,       // <A ^op B>
            /[<].*[>].*[!]/,                                  // Goal: <...>!
            /<.*\?.*>/,                                       // Query: <...?>
            /%[\d.]*;[\d.]*%/,                                // Truth values: %f;c%
            /<.*\^.*>.*[!.]/,                                 // With op and goal/question
        ];

        return narsesePatterns.some(pattern => pattern.test(input));
    }

    async shutdown() {
        this.agents.clear();
        this.activeAgent = null;
        if (this.agentLM?.shutdown) await this.agentLM.shutdown();
        await super.shutdown();
    }

    async* streamExecution(input) {
        const provider = this._getProvider();

        if (!provider) {
            return yield* this._handleMissingProvider(input);
        }

        const messages = [new HumanMessage(input)];
        this._resetToolCalls();

        try {
            const assistantContent = yield* this._streamAssistantResponse(messages, provider);

            const toolCalls = this._currentToolCalls;
            if (toolCalls?.length > 0) {
                yield* this._executeAllToolCalls(toolCalls, input, assistantContent, provider);
            }
        } catch (error) {
            yield* this._handleStreamingError(error, input);
            throw error;
        }
    }

    _getProvider() {
        const providerId = this.agentLM.providers.defaultProviderId;
        return this.agentLM._getProvider(providerId);
    }

    async* _handleMissingProvider(input) {
        if (this.inputProcessingConfig.enableNarseseFallback && this._isPotentialNarsese(input)) {
            try {
                const result = await this.processNarsese(input);
                yield {type: "agent_response", content: result || "Input processed"};
                return;
            } catch (narseseError) {
                const errorMsg = "Agent not initialized or provider missing. Call initialize() first.";
                console.error(errorMsg);
                yield {type: "agent_response", content: `❌ ${errorMsg}`};
                return;
            }
        }

        const errorMsg = "Agent not initialized or provider missing. Call initialize() first.";
        console.error(errorMsg);
        yield {type: "agent_response", content: `❌ ${errorMsg}`};
        return;
    }

    async* _streamAssistantResponse(messages, provider) {
        let model = provider.model || provider;
        let stream;

        if (typeof model.stream === 'function') {
            stream = await model.stream(messages);
        } else if (typeof provider.streamText === 'function') {
            stream = await provider.streamText(messages[0].content, {
                temperature: this.inputProcessingConfig.lmTemperature
            });
        } else {
            throw new Error("Model does not support streaming");
        }

        let assistantContent = "";
        for await (const chunk of stream) {
            if (typeof chunk === 'object' && chunk.content) {
                assistantContent += chunk.content;
                yield {type: "agent_response", content: chunk.content};
                chunk.tool_calls?.length > 0 && this._collectToolCalls(chunk.tool_calls);
            } else if (typeof chunk === 'string') {
                assistantContent += chunk;
                yield {type: "agent_response", content: chunk};
            }
        }

        return assistantContent;
    }

    _resetToolCalls() {
        this.__currentToolCalls = [];
    }

    _collectToolCalls(calls) {
        this.__currentToolCalls = this.__currentToolCalls.concat(calls);
    }

    get _currentToolCalls() {
        return this.__currentToolCalls || [];
    }

    async* _executeAllToolCalls(toolCalls, originalInput, assistantContent, provider) {
        for (const tc of toolCalls) {
            yield* this._executeToolCall(tc, originalInput, assistantContent, toolCalls, provider);
        }
    }

    async* _handleStreamingError(error, input) {
        const errorMsg = `❌ Streaming error: ${error.message}`;
        if (!this.inputProcessingConfig.enableNarseseFallback || !this._isPotentialNarsese(input)) {
            console.error('Streaming execution error:', {error, input});
        }
        yield {type: "error", content: errorMsg};
    }

    async* _executeToolCall(toolCall, originalInput, assistantContent, allToolCalls, provider) {
        const {name, args, id} = toolCall;

        yield {type: "tool_call", name, args};

        const toolResult = await this._executeTool(name, args, provider);
        yield {type: "tool_result", content: toolResult};

        const messagesWithResults = [
            new HumanMessage(originalInput),
            {role: "assistant", content: assistantContent, tool_calls: allToolCalls},
            new ToolMessage({content: toolResult, tool_call_id: id, name})
        ];

        try {
            let model = provider.model || provider;
            if (typeof model.stream === 'function') {
                const finalStream = await model.stream(messagesWithResults);
                let finalContent = "";
                for await (const chunk of finalStream) {
                    if (chunk.content) {
                        finalContent += chunk.content;
                        yield {type: "agent_response", content: chunk.content};
                    }
                }
            }
        } catch (error) {
            const errorResponse = `Error generating final response: ${error.message}`;
            console.error('Error in final response generation:', error);
            yield {type: "agent_response", content: errorResponse};
        }
    }

    async _executeTool(name, args, provider) {
        const tools = provider.tools || [];
        const tool = tools.find(t => t.name === name);

        if (!tool) {
            const errorMsg = `Error: Tool ${name} not found`;
            console.error(errorMsg);
            return errorMsg;
        }

        try {
            return await tool.invoke(args);
        } catch (error) {
            const errorMsg = `Error executing ${name}: ${error.message}`;
            console.error(errorMsg, {error, toolName: name, args});
            return errorMsg;
        }
    }

    async processInputStreaming(input, onChunk) {
        const trimmedInput = input.trim();

        if (!trimmedInput) {
            const result = await this.executeCommand('next');
            onChunk?.(result);
            return result;
        }
        if (trimmedInput.startsWith('/')) {
            const result = await this.executeCommand(...trimmedInput.slice(1).split(' '));
            onChunk?.(result);
            return result;
        }
        const [firstPart, ...rest] = trimmedInput.split(' ');
        if (this.commandRegistry.get(firstPart)) {
            const result = await this.commandRegistry.execute(firstPart, this, ...rest);
            onChunk?.(result);
            return result;
        }

        try {
             let fullResponse = "";
             for await (const chunk of this.streamExecution(trimmedInput)) {
                 if (chunk.type === 'agent_response') {
                     fullResponse += chunk.content;
                     onChunk?.(`🤖: ${chunk.content}`);
                 } else if (chunk.type === 'tool_call') {
                     onChunk?.(`\n[Calling tool: ${chunk.name}...]\n`);
                 } else if (chunk.type === 'tool_result') {
                     onChunk?.(`\n[Tool result: ${chunk.content}]\n`);
                 }
             }
             return fullResponse;
        } catch (error) {
             if (this.inputProcessingConfig.enableNarseseFallback) {
                const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(trimmedInput);
                if (shouldTryNarsese) {
                    try {
                        const result = await this.processNarsese(trimmedInput);
                        onChunk?.(result);
                        return result;
                    } catch (narseseError) {
                        const errorMsg = `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${error.message}`;
                        onChunk?.(errorMsg);
                        return errorMsg;
                    }
                }
            }
            const errorMsg = handleError(error, 'Agent processing');
            onChunk?.(errorMsg);
            return errorMsg;
        }
    }
}
