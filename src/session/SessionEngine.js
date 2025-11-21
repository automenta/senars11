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

        // Configure input processing behavior
        this.inputProcessingConfig = {
            // Whether to fallback to Narsese processing when LM fails
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            // Whether to check if input looks like Narsese before trying Narsese fallback
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            // Temperature for LM calls
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };
    }

    // Expose the raw event bus for internal components that need it,
    // but prefer using the unified event stream for external consumers.
    get eventBus() {
        return this.nar._eventBus;
    }

    _initializeCommandRegistry() {
        const registry = new AgentCommandRegistry();

        // Register all agent commands
        registry.register(new AgentCreateCommand());
        registry.register(new GoalCommand());
        registry.register(new PlanCommand());
        registry.register(new ThinkCommand());
        registry.register(new ReasonCommand());
        registry.register(new LMCommand());
        registry.register(new ProvidersCommand());

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

        // Register NAR control tools with the LM provider
        this._registerNARTools();

        // Initialize the provider's agent after tools are registered
        const defaultProviderId = this.agentLM.providers.defaultProviderId;
        if (defaultProviderId) {
            const provider = this.agentLM.providers.get(defaultProviderId);
            if (provider && typeof provider.initialize === 'function') {
                provider.initialize();
            }
        }
    }

    _registerNARTools() {
        try {
            // Create NAR control tool with reference to this engine's nar instance
            const narControlTool = new NARControlTool(this.nar);

            // Find the current provider and add the tool to it
            const defaultProviderId = this.agentLM.providers.defaultProviderId;
            if (defaultProviderId) {
                const provider = this.agentLM.providers.get(defaultProviderId);
                if (provider) {
                    // Initialize the tools array if it doesn't exist
                    if (!Array.isArray(provider.tools)) {
                        provider.tools = [];
                    }

                    // Check if the tool is already registered to avoid duplicates
                    const existingToolIndex = provider.tools.findIndex(tool =>
                        tool.name === narControlTool.name ||
                        tool.constructor.name === narControlTool.constructor.name
                    );

                    if (existingToolIndex === -1) {
                        // Only add the tool if it's not already present
                        provider.tools.push(narControlTool);
                        console.log(`🔧 Registered NAR control tool with LM provider`);
                    } else {
                        console.log(`🔧 NAR control tool already registered`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error registering NAR tools:', error.message);
        }
    }

    _syncLMProviders() {
        if (this.lm?.providers) {
            for (const [providerId, provider] of this.lm.providers.providers.entries()) {
                this.agentLM.registerProvider(providerId, provider);
            }
            if (this.lm.providers.defaultProviderId) {
                this.agentLM.providers.setDefault(this.lm.providers.defaultProviderId);
            }
        }
    }

    _registerAgentEventHandlers() {
        const events = ['agent.action', 'agent.decision'];
        events.forEach(event => {
            this.nar.on?.(event, (data) => this.emit(event, data));
        });
    }

    /**
     * Bridges internal NAR events to the SessionEngine's public event emitter.
     * This creates a single "firehose" of events for the UI/Clients to consume.
     */
    _setupUnifiedEventStream() {
        const coreEvents = [
            'task.input', 'task.processed', 'cycle.start', 'cycle.complete',
            'task.added', 'belief.added', 'question.answered',
            'system.started', 'system.stopped', 'system.reset', 'system.loaded',
            'reasoning.step', 'concept.created', 'task.completed', 'reasoning.derivation'
        ];

        if (this.nar && this.nar._eventBus) {
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
            // Handle special case for agent-status
            if (cmd === 'agent-status') {
                return this.activeAgent
                    ? await this.commandRegistry.execute('agent', this, 'status', ...args)
                    : 'No active agent. Use "agent create <name>" or "agent select <name>".';
            }

            // Check if it's a registered agent command first
            if (this.commandRegistry.get(cmd)) {
                return await this.commandRegistry.execute(cmd, this, ...args);
            }
            // Otherwise use default command processing
            return await original(cmd, ...args);
        };
    }

    // Override processNarsese to add agent awareness
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
            throw error; // Re-throw to be handled upstream
        }
    }

    // Override processInput to route most input to LM first (agent behavior)
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

        try {
            // Use streaming execution and accumulate result
            let fullResponse = "";
            for await (const chunk of this.streamExecution(trimmedInput)) {
                if (chunk.type === "agent_response") {
                    fullResponse += chunk.content; // In a real UI we might want to show partial updates
                } else if (chunk.type === "tool_result") {
                    // Tool results might be interesting to log but not part of the final text response
                }
            }
            return fullResponse || "No response generated.";

        } catch (lmError) {
            logError(lmError, 'LM processing');

            // Only attempt Narsese fallback if enabled in config
            if (this.inputProcessingConfig.enableNarseseFallback) {
                // Only check Narsese syntax if enabled in config, otherwise always try Narsese fallback
                const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(trimmedInput);

                if (shouldTryNarsese) {
                    try {
                        return await this.processNarsese(trimmedInput);
                    } catch (narseseError) {
                        logError(narseseError, 'Narsese processing');
                        // Return a more user-friendly error
                        return `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${lmError.message}`;
                    }
                }
            }

            // For non-Narsese-like inputs or when fallback is disabled, just report the LM error
            return handleError(lmError, 'Agent processing');
        }
    }

    // Determine if input looks like potential Narsese syntax
    _isPotentialNarsese(input) {
        // Check for more specific Narsese patterns
        // Look for Narsese-specific structures like <subject --> predicate>
        const narsesePatterns = [
            /<[\w\s\-'"()[\]]*\s*-->\s*[\w\s\-'"()[\]]*>/,  // Standard Narsese relation: <A --> B>
            /<[\w\s\-'"()[\]]*\s*\^[\w\s\-'"()[\]]*>/,       // Narsese operation: <A ^op B>
            /[<].*[>].*[!]/,                                  // Narsese goal: <...>!
            /<.*\?.*>/,                                       // Narsese query: <...?> 
            /%[\d.]*;[\d.]*%/,                                // Narsese truth values: %f;c%
            /<.*\^.*>.*[!.]/,                                 // Narsese with op and goal/question
        ];

        return narsesePatterns.some(pattern => pattern.test(input));
    }

    async shutdown() {
        this.agents.clear();
        this.activeAgent = null;
        if (this.agentLM?.shutdown) await this.agentLM.shutdown();
        await super.shutdown();
    }

    // Streaming execution function - direct approach without LangGraph
    async* streamExecution(input) {
        const providerId = this.agentLM.providers.defaultProviderId;
        const provider = this.agentLM._getProvider(providerId);

        if (!provider) {
            // Try Narsese fallback first if enabled, because this might be a direct Narsese input
            // and no agent is configured (common in tests or core-only mode)
            if (this.inputProcessingConfig.enableNarseseFallback && this._isPotentialNarsese(input)) {
                try {
                    const result = await this.processNarsese(input);
                    yield {type: "agent_response", content: result || "Input processed"};
                    return;
                } catch (narseseError) {
                    // If Narsese fails, then report the missing provider error
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

        // We need to access the raw model for tool binding if possible,
        // or assume the provider handles tools if we pass them.
        // However, standard LM.js interface uses `streamText`.
        // We need to check if the provider exposes a LangChain-compatible model
        // or if we can use the provider directly.

        // Best effort: check if the provider has a `model` property (like AgentReplOllama uses)
        // or if `streamText` returns chunks with tool calls.
        // If the provider IS the LangChain wrapper, we might need to call `stream` on it.

        let model = provider.model || provider;

        // Create initial messages
        const messages = [new HumanMessage(input)];
        let toolCalls = [];

        // === First pass: Stream assistant response and detect tool calls ===
        try {
            // If the model supports .stream() (LangChain standard), use it
            let stream;
            if (typeof model.stream === 'function') {
                 stream = await model.stream(messages);
            } else if (typeof provider.streamText === 'function') {
                 // Fallback to provider's streamText if it doesn't expose the raw model
                 // This path might not support tools natively unless streamText does
                 stream = await provider.streamText(input, {
                     temperature: this.inputProcessingConfig.lmTemperature
                 });
            } else {
                 throw new Error("Model does not support streaming");
            }

            let assistantContent = "";

            for await (const chunk of stream) {
                // Handle LangChain chunk format
                if (typeof chunk === 'object') {
                    if (chunk.content) {
                        assistantContent += chunk.content;
                        yield {type: "agent_response", content: chunk.content};
                    }
                    if (chunk.tool_calls?.length > 0) {
                        toolCalls = chunk.tool_calls;
                    }
                } else if (typeof chunk === 'string') {
                    // Simple string stream
                    assistantContent += chunk;
                    yield {type: "agent_response", content: chunk};
                }
            }

            // If there are no tool calls, we're done
            if (!toolCalls || toolCalls.length === 0) {
                return;
            }

            // === Execute each tool call and stream results ===
            for (const tc of toolCalls) {
                yield* this._executeToolCall(tc, input, assistantContent, toolCalls, provider);
            }

        } catch (error) {
            const errorMsg = `❌ Streaming error: ${error.message}`;
            // Only log error if it's not a simple Narsese fallback scenario
            if (!this.inputProcessingConfig.enableNarseseFallback || !this._isPotentialNarsese(input)) {
                 console.error('Streaming execution error:', {error, input});
            }
            yield {type: "error", content: errorMsg};
            throw error; // Re-throw to allow fallback logic in processInput
        }
    }

    // Helper method to execute a single tool call with its follow-up response
    async* _executeToolCall(toolCall, originalInput, assistantContent, allToolCalls, provider) {
        const {name, args, id} = toolCall;

        // Yield the tool call notification
        yield {type: "tool_call", name, args};

        // Execute the tool
        const toolResult = await this._executeTool(name, args, provider);
        yield {type: "tool_result", content: toolResult};

        // Create messages for final response with tool results
        const messagesWithResults = [
            new HumanMessage(originalInput),
            {role: "assistant", content: assistantContent, tool_calls: allToolCalls},
            new ToolMessage({content: toolResult, tool_call_id: id, name})
        ];

        // === Stream final response with tool result in context ===
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

    // Helper method to execute a tool and return result or error message
    async _executeTool(name, args, provider) {
        // Find the tool in the provider's registered tools
        // The provider is expected to have a `tools` array
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

    // Keep legacy method for compatibility but route to new logic
    async processInputStreaming(input, onChunk) {
        const trimmedInput = input.trim();

        // Handle commands and empty input
        if (!trimmedInput) {
            const result = await this.executeCommand('next');
            if (onChunk) onChunk(result);
            return result;
        }
        if (trimmedInput.startsWith('/')) {
            const result = await this.executeCommand(...trimmedInput.slice(1).split(' '));
            if (onChunk) onChunk(result);
            return result;
        }
        const [firstPart, ...rest] = trimmedInput.split(' ');
        if (this.commandRegistry.get(firstPart)) {
            const result = await this.commandRegistry.execute(firstPart, this, ...rest);
            if (onChunk) onChunk(result);
            return result;
        }

        try {
             let fullResponse = "";
             for await (const chunk of this.streamExecution(trimmedInput)) {
                 if (chunk.type === 'agent_response') {
                     const content = chunk.content;
                     fullResponse += content;
                     if (onChunk) onChunk(`🤖: ${content}`);
                 } else if (chunk.type === 'tool_call') {
                     if (onChunk) onChunk(`\n[Calling tool: ${chunk.name}...]\n`);
                 } else if (chunk.type === 'tool_result') {
                     if (onChunk) onChunk(`\n[Tool result: ${chunk.content}]\n`);
                 }
             }
             return fullResponse;
        } catch (error) {
            // Fallback logic similar to original processInput
             if (this.inputProcessingConfig.enableNarseseFallback) {
                const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(trimmedInput);
                if (shouldTryNarsese) {
                    try {
                        const result = await this.processNarsese(trimmedInput);
                        if (onChunk) onChunk(result);
                        return result;
                    } catch (narseseError) {
                        const errorMsg = `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${error.message}`;
                        if (onChunk) onChunk(errorMsg);
                        return errorMsg;
                    }
                }
            }
            const errorMsg = handleError(error, 'Agent processing');
            if (onChunk) onChunk(errorMsg);
            return errorMsg;
        }
    }
}
