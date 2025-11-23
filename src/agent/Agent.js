import {NAR} from '../nar/NAR.js';
import {Input} from '../task/Input.js';
import {PersistenceManager} from '../io/PersistenceManager.js';
import {FormattingUtils} from '../repl/utils/index.js';
import * as Commands from '../repl/commands/Commands.js';
import {AGENT_EVENTS} from './constants.js';
import {InputProcessor} from './InputProcessor.js';
import {AgentStreamer} from './AgentStreamer.js';

export class Agent extends NAR {
    constructor(config = {}) {
        super(config);

        this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.inputQueue = new Input();
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.isRunningLoop = false;
        this.runInterval = null;
        this.traceEnabled = false;
        this.echo = false;
        this.quiet = false;

        this.inputProcessingConfig = {
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };

        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath ?? './agent.json'
        });

        this.commandRegistry = this._initializeCommandRegistry();

        this.uiState = {
            taskGrouping: null,
            taskSelection: [],
            taskFilters: {},
            viewMode: 'vertical-split'
        };

        // Initialize helper components
        this.inputProcessor = new InputProcessor(this);
        this.agentStreamer = new AgentStreamer(this);
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
        const registry = new Commands.AgentCommandRegistry();
        // Register all command classes exported from Commands.js
        Object.values(Commands).forEach(CmdClass => {
            if (typeof CmdClass === 'function' &&
                CmdClass.prototype instanceof Commands.AgentCommand &&
                CmdClass !== Commands.AgentCommand) {
                try {
                    registry.register(new CmdClass());
                } catch (e) {
                    console.warn(`Failed to register command ${CmdClass.name}: ${e.message}`);
                }
            }
        });
        return registry;
    }

    _registerEventHandlers() {
        // No longer automatically emit log events for task.focus - UI handles task.focus directly
    }

    async processInput(input) {
        return this.inputProcessor.processInput(input);
    }

    async executeCommand(cmd, ...args) {
        const ALIASES = {
            'next': 'n', 'stop': 'st', 'quit': 'exit', 'q': 'exit'
        };
        const command = ALIASES[cmd] ?? cmd;

        const builtins = {
            'n': () => this._next(),
            'go': () => this._run(),
            'st': () => this._stop(),
            'exit': () => {
                this.emit(AGENT_EVENTS.ENGINE_QUIT);
                return '👋 Goodbye!';
            }
        };

        // Prefer registry commands over builtins if strict match?
        // But here builtins check comes first.
        // 'go' is still builtin for continuous run without args.
        // 'run' is now free to be handled by registry.

        if (builtins[command]) return builtins[command]();

        if (this.commandRegistry.get(command)) {
            const result = await this.commandRegistry.execute(command, this, ...args);
            this.emit(`command.${command}`, {command, args, result});
            return result;
        }

        return `❌ Unknown command: ${command}`;
    }

    // Delegate methods for backward compatibility and API
    async processNarsese(input) {
        return this.inputProcessor.processNarsese(input);
    }

    async* streamExecution(input) {
        yield* this.agentStreamer.streamExecution(input);
    }

    async processInputStreaming(input, onChunk) {
        return this.agentStreamer.processInputStreaming(input, onChunk);
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
        return this.startAutoStep(10);
    }

    async startAutoStep(interval = 10) {
        if (this.isRunningLoop) {
             this._stopRun();
        }

        this.isRunningLoop = true;
        this.emit(AGENT_EVENTS.NAR_CYCLE_START, {reason: 'auto-step'});

        // If not in quiet mode, enable trace for visibility unless explicitly disabled?
        // Spec says /quiet suppresses trace.
        // If quiet is false, we generally want trace on for demo.
        if (!this.quiet && !this.traceEnabled) {
            this.traceEnabled = true;
            this.emit(AGENT_EVENTS.NAR_TRACE_ENABLE, {reason: 'auto-step session'});
        }

        this.runInterval = setInterval(() => {
            this._autonomousStep().catch(error => {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            });
        }, interval);

        this.emit(AGENT_EVENTS.NAR_CYCLE_RUNNING, {interval});
        return `🏃 Auto-stepping every ${interval}ms... Use "/stop" or input to stop.`;
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

    async save() {
        const state = this.serialize();
        return await this.persistenceManager.saveToDefault(state);
    }

    async load(filepath = null) {
        let state;
        if (filepath) {
             state = await this.persistenceManager.loadFromPath(filepath);
        } else {
             state = await this.persistenceManager.loadFromDefault();
        }
        if (!state) return false;
        return await this.deserialize(state);
    }

    getHistory() {
        return [...this.sessionState.history];
    }

    formatTaskForDisplay(task) {
        return FormattingUtils.formatTask(task);
    }
}
