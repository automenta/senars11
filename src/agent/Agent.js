import {NAR} from '../nar/NAR.js';
import {Input} from '../task/Input.js';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {CommandProcessor} from '../repl/utils/CommandProcessor.js';
import {handleError, logError} from '../util/ErrorHandler.js';
import {HumanMessage, ToolMessage} from "@langchain/core/messages";
import {
    AgentCommandRegistry,
    AgentCreateCommand,
    GoalCommand,
    PlanCommand,
    ThinkCommand,
    ReasonCommand,
    LMCommand,
    ProvidersCommand
} from '../repl/commands/AgentCommands.js';
import {FormattingUtils} from '../repl/utils/index.js';

const AGENT_EVENTS = {
    ENGINE_READY: 'engine.ready',
    ENGINE_ERROR: 'engine.error',
    NARSESE_PROCESSED: 'narsese.processed',
    NARSESE_ERROR: 'narsese.error',
    ENGINE_QUIT: 'engine.quit',
    NAR_CYCLE_STEP: 'nar.cycle.step',
    NAR_CYCLE_START: 'nar.cycle.start',
    NAR_CYCLE_RUNNING: 'nar.cycle.running',
    NAR_CYCLE_STOP: 'nar.cycle.stop',
    NAR_TRACE_ENABLE: 'nar.trace.enable',
    NAR_TRACE_RESTORE: 'nar.trace.restore',
    NAR_ERROR: 'nar.error',
    COMMAND_ERROR: 'command.error',
    ENGINE_RESET: 'engine.reset',
    ENGINE_SAVE: 'engine.save',
    ENGINE_LOAD: 'engine.load',
    ENGINE_SHUTDOWN: 'engine.shutdown',
    AGENT_ACTION: 'agent.action',
    AGENT_DECISION: 'agent.decision'
};

export class Agent extends NAR {
    constructor(config = {}) {
        // Initialize NAR
        super(config);

        // Agent-specific state
        this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.inputQueue = new Input();
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.isRunningLoop = false;
        this.runInterval = null;
        this.traceEnabled = false;

        // Configuration
        this.inputProcessingConfig = {
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };

        // Persistence
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath ?? './agent.json'
        });

        // Command Processor
        this.commandProcessor = new CommandProcessor(this, this.persistenceManager, this.sessionState);

        // Agent Command Registry
        this.commandRegistry = this._initializeCommandRegistry();

        // LM Provider alias (NAR has _lm)
        this._currentToolCalls = [];

        // UI State (from ReplEngine)
        this.uiState = {
            taskGrouping: null,
            taskSelection: [],
            taskFilters: {},
            viewMode: 'vertical-split'
        };
    }

    get agentLM() {
        return this.lm;
    }

    // Compatibility for consumers expecting 'emit'
    emit(event, ...args) {
        if (this._eventBus) {
            this._eventBus.emit(event, ...args);
        }
    }

    async initialize() {
        await super.initialize();

        // Initialize command registry or other agent-specifics
        this._registerEventHandlers();

        // If there are default tools or providers setup in config, ensure they are ready
        // NAR.initialize() handles _lm and _toolIntegration initialization

        this.emit(AGENT_EVENTS.ENGINE_READY, {success: true, message: 'Agent initialized successfully'});
        return true;
    }

    _initializeCommandRegistry() {
        const registry = new AgentCommandRegistry();
        // Register default agent commands
        // Note: Some commands might need adaptation if they expect 'engine.agents' map
        // We will address this by updating AgentCommands.js or providing shims if needed.
        const commands = [
            // new AgentCreateCommand(), // Temporarily disabled or needs adaptation for single-agent context
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

    _registerEventHandlers() {
        // Proxy internal NAR events to Agent events if needed
        // Since Agent IS NAR, listeners on Agent already hear NAR events.
        // But ReplEngine emitted specific events like NARSESE_PROCESSED.
        // We will emit them manually in processNarsese.

        this._focusHandler = (task) => {
             const formattedTask = this.formatTaskForDisplay(task);
             this.emit('log', `🎯 FOCUSED: ${formattedTask}`);
        };
        this.on('task.focus', this._focusHandler);
    }

    // Input Processing (Unified from ReplEngine and SessionEngine)
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

        // Default: Process as Agent Input (LM or Narsese)
        return await this._processAgentInput(trimmedInput);
    }

    async executeCommand(cmd, ...args) {
         // Handle special short commands
         const SPECIAL_COMMANDS = {
            'next': 'n', 'n': 'n',
            'run': 'go', 'go': 'go',
            'stop': 'st', 'st': 'st',
            'quit': 'exit', 'q': 'exit', 'exit': 'exit'
        };

        const cmdType = SPECIAL_COMMANDS[cmd] ?? cmd;

        if (cmdType === 'n') return await this._next();
        if (cmdType === 'go') return await this._run();
        if (cmdType === 'st') return await this._stop();
        if (cmdType === 'exit') {
            this.emit(AGENT_EVENTS.ENGINE_QUIT);
            return '👋 Goodbye!';
        }

        // Check Agent Registry first
        if (this.commandRegistry.get(cmd)) {
             return await this.commandRegistry.execute(cmd, this, ...args);
        }

        // Fallback to General Command Processor
        return await this._executeGeneralCommand(cmd, ...args);
    }

    async _executeGeneralCommand(cmd, ...args) {
        try {
            const result = await this.commandProcessor.executeCommand(cmd, ...args);
            this.emit(`command.${cmd}`, {command: cmd, args, result});
            return result;
        } catch (error) {
            const errorMsg = `❌ Error executing command: ${error.message}`;
            this.emit(AGENT_EVENTS.COMMAND_ERROR, {command: cmd, args, error: error.message});
            return errorMsg;
        }
    }

    async _processAgentInput(input) {
        try {
            // Attempt LM stream accumulation
            return await this._accumulateStreamResponse(input);
        } catch (lmError) {
            logError(lmError, 'LM processing');
            return await this._handleProcessingError(input, lmError);
        }
    }

    async _accumulateStreamResponse(input) {
        if (!this.lm) {
            // If no LM, fallback to Narsese immediately
             return await this.processNarsese(input);
        }

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

    async processNarsese(input) {
        // Add to input queue for record keeping / priority management
        const taskId = this.inputQueue.addTask(input, 0.5, {
            type: 'user_input',
            source: 'narsese',
            timestamp: Date.now()
        });

        try {
            const startTime = Date.now();
            const result = await this.input(input); // Call NAR.input()
            const duration = Date.now() - startTime;

            if (result !== false && result !== null) {
                this.inputQueue.updatePriorityById(taskId, 0.8);
                this.emit(AGENT_EVENTS.NARSESE_PROCESSED, {
                    input,
                    result,
                    duration,
                    taskId,
                    beliefs: this.getBeliefs?.() ?? []
                });
                return `✅ Input processed successfully (${duration}ms)`;
            } else {
                 // Handle failure (e.g. duplicate)
                 // Note: NAR.input returns false for duplicates sometimes?
                 // Wait, NAR.js _processNewTask returns 'added' boolean.

                 // If duplicate, it returns false.
                 const task = this.inputQueue.getTaskById(taskId);
                 if(task) task.metadata.status = 'duplicate/failed';

                 return '❌ Failed to process input (possibly duplicate or invalid)';
            }
        } catch (error) {
            this._handleNarseseError(input, error, taskId);
            return `❌ Error: ${error.message}`;
        }
    }

    _handleNarseseError(input, error, taskId) {
        const task = this.inputQueue.getTaskById(taskId);
        if (task) {
            task.metadata.error = true;
            task.metadata.errorTime = Date.now();
            this.inputQueue.updatePriorityById(taskId, 0.1);
        }
        this.emit(AGENT_EVENTS.NARSESE_ERROR, {input, error: error.message, taskId});
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

    // Stream Execution (from SessionEngine)
    async* streamExecution(input) {
        if (!this.lm) {
             yield* this._handleMissingProvider(input);
             return;
        }

        const provider = this._getProvider();
        if (!provider) {
            yield* this._handleMissingProvider(input);
            return;
        }

        const messages = [new HumanMessage(input)];
        this._currentToolCalls = [];

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
        if (!this.lm) return null;
        const providerId = this.lm.providers.defaultProviderId;
        return this.lm._getProvider(providerId);
    }

    async* _handleMissingProvider(input) {
        if (this.inputProcessingConfig.enableNarseseFallback && this._isPotentialNarsese(input)) {
            try {
                const result = await this.processNarsese(input);
                yield {type: "agent_response", content: result || "Input processed"};
                return;
            } catch (narseseError) {
                const errorMsg = "Agent initialized but Narsese processing failed.";
                yield {type: "agent_response", content: `❌ ${errorMsg}`};
                return;
            }
        }
        yield {type: "agent_response", content: `❌ No LM provider available and input not recognized as Narsese.`};
    }

    async* _streamAssistantResponse(messages, provider) {
        let model = provider.model || provider;
        let stream;

        // Check streaming capability
        if (typeof model.stream === 'function') {
            stream = await model.stream(messages);
        } else if (typeof provider.streamText === 'function') {
            stream = await provider.streamText(messages[0].content, {
                temperature: this.inputProcessingConfig.lmTemperature
            });
        } else {
            // Fallback for non-streaming?
             const response = await provider.invoke(messages[0].content);
             yield {type: "agent_response", content: response};
             return response;
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

    _collectToolCalls(calls) {
        this._currentToolCalls = this._currentToolCalls.concat(calls);
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

        // Recursion or follow-up with LM not fully implemented here to keep simple,
        // but basics are here. SessionEngine had logic for final response generation.
        // We'll skip complex tool chains for this refactor unless needed.
        // Actually, let's include the final generation.

        const messagesWithResults = [
            new HumanMessage(originalInput),
            {role: "assistant", content: assistantContent, tool_calls: allToolCalls},
            new ToolMessage({content: toolResult, tool_call_id: id, name})
        ];

         try {
            let model = provider.model || provider;
            if (typeof model.stream === 'function') {
                const finalStream = await model.stream(messagesWithResults);
                for await (const chunk of finalStream) {
                    if (chunk.content) {
                        yield {type: "agent_response", content: chunk.content};
                    }
                }
            }
        } catch (error) {
            yield {type: "agent_response", content: `Error generating final response: ${error.message}`};
        }
    }

    async _executeTool(name, args, provider) {
        const tools = provider.tools || [];
        const tool = tools.find(t => t.name === name);

        if (!tool) {
            return `Error: Tool ${name} not found`;
        }

        try {
            return await tool.invoke(args);
        } catch (error) {
            return `Error executing ${name}: ${error.message}`;
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

    // Run Loop (from ReplEngine)
    async _next() {
        try {
            await this.step();
            const output = `⏭️  Single cycle executed. Cycle: ${this.cycleCount}`;
            this.emit(AGENT_EVENTS.NAR_CYCLE_STEP, {cycle: this.cycleCount});
            return output;
        } catch (error) {
            const errorMsg = `❌ Error executing single cycle: ${error.message}`;
            this.emit(AGENT_EVENTS.NAR_ERROR, {error: error.message});
            return errorMsg;
        }
    }

    async _run() {
        if (this.isRunningLoop) return '⏸️  Already running. Use "/stop" to stop.';

        this.isRunningLoop = true;
        this.emit(AGENT_EVENTS.NAR_CYCLE_START, {reason: 'continuous run'});

        if (!this.traceEnabled) {
            this.traceEnabled = true;
            this.emit(AGENT_EVENTS.NAR_TRACE_ENABLE, {reason: 'run session'});
        }

        // Autonomous loop
        this.runInterval = setInterval(() => {
            this._autonomousStep().catch(error => {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            });
        }, 10);

        this.emit(AGENT_EVENTS.NAR_CYCLE_RUNNING, {interval: 10});
        return '🏃 Running continuously... Use "/stop" to stop.';
    }

    async _autonomousStep() {
        // 1. Process pending tasks from input queue if any
        await this.processPendingInputTasks();
        // 2. Step the NAR reasoner
        await this.step();
    }

    async processPendingInputTasks() {
        // Logic to move tasks from inputQueue to NAR if needed
        // For now, processNarsese already inputs to NAR.
        // If we want asynchronous inputs, we would pull from inputQueue here.
        // But Input queue is currently just a log/priority list.
        // We'll leave this as a hook.
    }

    _stop() {
        return this._stopRun();
    }

    _stopRun() {
        if (this.runInterval) {
            clearInterval(this.runInterval);
            this.runInterval = null;
        }
        this.isRunningLoop = false;
        this.emit(AGENT_EVENTS.NAR_CYCLE_STOP);
        return '🛑 Run stopped.';
    }

    // State Management
    getStats() {
        return super.getStats();
    }

    getBeliefs(queryTerm = null) {
        return super.getBeliefs(queryTerm);
    }

    getHistory() {
        return [...this.sessionState.history];
    }

    reset(options = {}) {
        super.reset(options);
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        this.emit(AGENT_EVENTS.ENGINE_RESET);
        return '🔄 Agent reset successfully.';
    }

    // Save/Load
    async save() {
         return await this.commandProcessor._save();
    }

    async load() {
        return await this.commandProcessor._load();
    }

    formatTaskForDisplay(task) {
        return FormattingUtils.formatTask(task);
    }
}
