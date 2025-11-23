import {HumanMessage, ToolMessage} from "@langchain/core/messages";
import {NAR} from '../nar/NAR.js';
import {Input} from '../task/Input.js';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {CommandProcessor} from '../repl/utils/CommandProcessor.js';
import {handleError, logError} from '../util/ErrorHandler.js';
import {FormattingUtils} from '../repl/utils/index.js';
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
        super(config);

        this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.inputQueue = new Input();
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.isRunningLoop = false;
        this.runInterval = null;
        this.traceEnabled = false;

        this.inputProcessingConfig = {
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };

        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath ?? './agent.json'
        });

        this.commandProcessor = new CommandProcessor(this, this.persistenceManager, this.sessionState);
        this.commandRegistry = this._initializeCommandRegistry();
        this._currentToolCalls = [];

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

    emit(event, ...args) {
        this._eventBus?.emit(event, ...args);
    }

    async initialize() {
        await super.initialize();
        this._registerEventHandlers();
        this.emit(AGENT_EVENTS.ENGINE_READY, {success: true, message: 'Agent initialized successfully'});
        return true;
    }

    _initializeCommandRegistry() {
        const registry = new AgentCommandRegistry();
        [
            new AgentCreateCommand(),
            new GoalCommand(),
            new PlanCommand(),
            new ThinkCommand(),
            new ReasonCommand(),
            new LMCommand(),
            new ProvidersCommand()
        ].forEach(cmd => registry.register(cmd));
        return registry;
    }

    _registerEventHandlers() {
        this.on('task.focus', (task) => {
            this.emit('log', `🎯 FOCUSED: ${this.formatTaskForDisplay(task)}`);
        });
    }

    async processInput(input) {
        const trimmed = input.trim();
        if (!trimmed) return this.executeCommand('next');

        this.sessionState.history.push(trimmed);
        if (trimmed.startsWith('/')) return this.executeCommand(...trimmed.slice(1).split(' '));

        const [cmd, ...args] = trimmed.split(' ');
        if (this.commandRegistry.get(cmd)) return this.commandRegistry.execute(cmd, this, ...args);

        return this._processAgentInput(trimmed);
    }

    async executeCommand(cmd, ...args) {
        const ALIASES = {
            'next': 'n', 'run': 'go', 'stop': 'st', 'quit': 'exit', 'q': 'exit'
        };
        const command = ALIASES[cmd] ?? cmd;

        const builtins = {
            'n': () => this._next(),
            'go': () => this._run(),
            'st': () => this._stop(),
            'exit': () => { this.emit(AGENT_EVENTS.ENGINE_QUIT); return '👋 Goodbye!'; }
        };

        if (builtins[command]) return builtins[command]();

        return this.commandRegistry.get(command)
            ? this.commandRegistry.execute(command, this, ...args)
            : this._executeGeneralCommand(command, ...args);
    }

    async _executeGeneralCommand(cmd, ...args) {
        try {
            const result = await this.commandProcessor.executeCommand(cmd, ...args);
            this.emit(`command.${cmd}`, {command: cmd, args, result});
            return result;
        } catch (error) {
            this.emit(AGENT_EVENTS.COMMAND_ERROR, {command: cmd, args, error: error.message});
            return `❌ Error executing command: ${error.message}`;
        }
    }

    async _processAgentInput(input) {
        try {
            return await this._accumulateStreamResponse(input);
        } catch (error) {
            logError(error, 'LM processing');
            return this._handleProcessingError(input, error);
        }
    }

    async _accumulateStreamResponse(input) {
        if (!this.lm) return this.processNarsese(input);

        let response = "";
        for await (const chunk of this.streamExecution(input)) {
            if (chunk.type === "agent_response") response += chunk.content;
        }
        return response || "No response generated.";
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
        const taskId = this.inputQueue.addTask(input, 0.5, {
            type: 'user_input',
            source: 'narsese',
            timestamp: Date.now()
        });

        try {
            const startTime = Date.now();
            const result = await this.input(input);
            const duration = Date.now() - startTime;

            if (result !== false && result !== null) {
                this.inputQueue.updatePriorityById(taskId, 0.8);
                this.emit(AGENT_EVENTS.NARSESE_PROCESSED, {
                    input, result, duration, taskId, beliefs: this.getBeliefs?.() ?? []
                });
                return `✅ Input processed successfully (${duration}ms)`;
            }

            const task = this.inputQueue.getTaskById(taskId);
            if (task) task.metadata.status = 'duplicate/failed';
            return '❌ Failed to process input (possibly duplicate or invalid)';
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
        const patterns = [
            /<[\w\s\-'"()[\]]*\s*-->\s*[\w\s\-'"()[\]]*>/,
            /<[\w\s\-'"()[\]]*\s*\^[\w\s\-'"()[\]]*>/,
            /[<].*[>].*[!]/,
            /<.*\?.*>/,
            /%[\d.]*;[\d.]*%/,
            /<.*\^.*>.*[!.]/
        ];
        return patterns.some(p => p.test(input));
    }

    async* streamExecution(input) {
        if (!this.lm || !this._getProvider()) {
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
        return this.lm?._getProvider(this.lm.providers.defaultProviderId);
    }

    async* _handleMissingProvider(input) {
        if (this.inputProcessingConfig.enableNarseseFallback && this._isPotentialNarsese(input)) {
            try {
                const result = await this.processNarsese(input);
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
                temperature: this.inputProcessingConfig.lmTemperature
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
        if (!this.inputProcessingConfig.enableNarseseFallback || !this._isPotentialNarsese(input)) {
            console.error('Streaming execution error:', {error, input});
        }
        yield {type: "error", content: `❌ Streaming error: ${error.message}`};
    }

    async processInputStreaming(input, onChunk) {
        const trimmed = input.trim();
        if (!trimmed) {
            const res = await this.executeCommand('next');
            onChunk?.(res);
            return res;
        }

        if (trimmed.startsWith('/') || this.commandRegistry.get(trimmed.split(' ')[0])) {
            const res = await this.processInput(input); // processInput handles commands
            onChunk?.(res);
            return res;
        }

        try {
            let fullResponse = "";
            for await (const chunk of this.streamExecution(trimmed)) {
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
             if (this.inputProcessingConfig.enableNarseseFallback && this._isPotentialNarsese(trimmed)) {
                 try {
                     const res = await this.processNarsese(trimmed);
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

    async _next() {
        try {
            await this.step();
            this.emit(AGENT_EVENTS.NAR_CYCLE_STEP, {cycle: this.cycleCount});
            return `⏭️  Single cycle executed. Cycle: ${this.cycleCount}`;
        } catch (error) {
            this.emit(AGENT_EVENTS.NAR_ERROR, {error: error.message});
            return `❌ Error executing single cycle: ${error.message}`;
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
        await this.step();
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

    reset(options = {}) {
        super.reset(options);
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        this.emit(AGENT_EVENTS.ENGINE_RESET);
        return '🔄 Agent reset successfully.';
    }

    async save() { return this.commandProcessor._save(); }
    async load() { return this.commandProcessor._load(); }
    getHistory() { return [...this.sessionState.history]; }
    formatTaskForDisplay(task) { return FormattingUtils.formatTask(task); }
}
