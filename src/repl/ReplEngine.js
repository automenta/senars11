import { EventEmitter } from 'events';
import { NAR } from '../nar/NAR.js';
import { CommandProcessor } from './utils/CommandProcessor.js';
import { PersistenceManager } from '../io/PersistenceManager.js';
import { Input } from '../Agent.js';

const SPECIAL_COMMANDS = { 'next': 'n', 'n': 'n', 'run': 'go', 'go': 'go', 'stop': 'st', 'st': 'st', 'quit': 'exit', 'q': 'exit', 'exit': 'exit' };
const EVENTS = {
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
    ENGINE_SHUTDOWN: 'engine.shutdown'
};

export class ReplEngine extends EventEmitter {
    constructor(config = {}) {
        super();

        this.nar = new NAR(config.nar ?? {});
        this.inputManager = new Input(); // Manage user input tasks
        this.sessionState = { history: [], lastResult: null, startTime: Date.now() };
        this.persistenceManager = new PersistenceManager({ defaultPath: config.persistence?.defaultPath ?? './agent.json' });
        this.commandProcessor = new CommandProcessor(this.nar, this.persistenceManager, this.sessionState);

        this.isRunningLoop = false;
        this.runInterval = null;
        this.originalTraceState = false;
        this.traceEnabled = false;
    }

    async initialize() {
        try {
            await this.nar.initialize();
            this.emit(EVENTS.ENGINE_READY, { success: true, message: 'NAR initialized successfully' });
            return true;
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, { error: error.message });
            return false;
        }
    }

    async processInput(input) {
        const trimmedInput = input.trim();
        if (!trimmedInput) return await this.executeCommand('next');

        this.sessionState.history.push(trimmedInput);

        return trimmedInput.startsWith('/')
            ? await this.executeCommand(...trimmedInput.slice(1).split(' '))
            : await this.processNarsese(trimmedInput);
    }

    async processNarsese(input) {
        try {
            const taskId = this.inputManager.addTask(input, 0.5, {
                type: 'user_input',
                source: 'narsese',
                timestamp: Date.now()
            });

            const startTime = Date.now();
            const result = await this.nar.input(input);
            await this.nar.step();
            const duration = Date.now() - startTime;

            if (result) {
                this._handleSuccessfulNarsese(input, result, duration, taskId);
                return `✅ Input processed successfully (${duration}ms)`;
            } else {
                this._handleFailedNarsese(input, taskId);
                return '❌ Failed to process input';
            }
        } catch (error) {
            this._handleNarseseError(input, error);
            return `❌ Error: ${error.message}`;
        }
    }

    _handleSuccessfulNarsese(input, result, duration, taskId) {
        this.inputManager.updatePriorityById(taskId, 0.8); // Increase priority after successful processing
        this.emit(EVENTS.NARSESE_PROCESSED, {
            input,
            result,
            duration,
            taskId, // Include the task ID in the event
            beliefs: this.nar.getBeliefs?.() ?? []
        });
    }

    _handleFailedNarsese(input, taskId) {
        const task = this.inputManager.getTaskById(taskId);
        if (task) {
            task.metadata.error = true;
            task.metadata.errorTime = Date.now();
            this.inputManager.updatePriorityById(taskId, 0.1); // Lower priority for failed tasks
        }
        this.emit(EVENTS.NARSESE_ERROR, { input, error: '❌ Failed to process input', taskId });
    }

    _handleNarseseError(input, error) {
        // Find the task by looking at the most recently added task
        const allTasks = this.inputManager.getAllTasks();
        const latestTask = allTasks.at(-1); // More concise way to get last element

        if (latestTask && latestTask.task === input) {
            latestTask.metadata.error = true;
            latestTask.metadata.errorTime = Date.now();
            this.inputManager.updatePriorityById(latestTask.id, 0.1);
        }

        this.emit(EVENTS.NARSESE_ERROR, { input, error: error.message });
    }

    async executeCommand(cmd, ...args) {
        const cmdType = SPECIAL_COMMANDS[cmd] ?? cmd;

        switch (cmdType) {
            case 'n': return await this._next();
            case 'go': return await this._run();
            case 'st': return await this._stop();
            case 'exit':
                this.emit('engine.quit');
                return '👋 Goodbye!';
        }

        try {
            const result = await this.commandProcessor.executeCommand(cmd, ...args);
            this.emit(`command.${cmd}`, { command: cmd, args, result });
            return result;
        } catch (error) {
            const errorMsg = `❌ Error executing command: ${error.message}`;
            this.emit('command.error', { command: cmd, args, error: error.message });
            return errorMsg;
        }
    }

    async _next() {
        try {
            await this.nar.step();
            const output = `⏭️  Single cycle executed. Cycle: ${this.nar.cycleCount}`;
            this.emit(EVENTS.NAR_CYCLE_STEP, { cycle: this.nar.cycleCount });
            return output;
        } catch (error) {
            const errorMsg = `❌ Error executing single cycle: ${error.message}`;
            this.emit(EVENTS.NAR_ERROR, { error: error.message });
            return errorMsg;
        }
    }

    async _run() {
        if (this.isRunningLoop) return '⏸️  Already running. Use "/stop" to stop.';

        this.originalTraceState = this.traceEnabled;
        this.isRunningLoop = true;
        this.emit(EVENTS.NAR_CYCLE_START, { reason: 'continuous run' });

        if (!this.traceEnabled) {
            this.traceEnabled = true;
            this.emit(EVENTS.NAR_TRACE_ENABLE, { reason: 'run session' });
        }

        this.runInterval = setInterval(() => {
            this.nar.step().catch(error => {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            });
        }, 10);

        this.emit(EVENTS.NAR_CYCLE_RUNNING, { interval: 10 });
        return '🏃 Running continuously... Use "/stop" to stop.';
    }

    _stop() { return this._stopRun(); }

    _stopRun() {
        if (this.runInterval) {
            clearInterval(this.runInterval);
            this.runInterval = null;
        }
        this.isRunningLoop = false;

        if (!this.originalTraceState && this.traceEnabled) {
            this.traceEnabled = false;
            this.emit(EVENTS.NAR_TRACE_RESTORE, { originalState: this.originalTraceState });
        }

        this.emit(EVENTS.NAR_CYCLE_STOP);
        return '🛑 Run stopped.';
    }

    getStats() { return this.nar.getStats?.() ?? {}; }
    getBeliefs() { return this.nar.getBeliefs?.() ?? []; }
    getHistory() { return [...this.sessionState.history]; }
    isRunning() { return this.isRunningLoop; }

    reset() {
        this.nar.reset?.();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        this.emit(EVENTS.ENGINE_RESET);
        return '🔄 NAR system reset successfully.';
    }

    async save() {
        try {
            const state = this.nar.serialize?.();
            if (!state) return 'Serialization not supported by NAR instance.';

            const result = await this.persistenceManager.saveToDefault(state);
            this.emit(EVENTS.ENGINE_SAVE, { filePath: result.filePath, size: result.size });
            return `💾 NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, { error: error.message });
            return `❌ Error saving NAR state: ${error.message}`;
        }
    }

    async load() {
        try {
            const exists = await this.persistenceManager.exists();
            if (!exists) return `📁 Save file does not exist: ${this.persistenceManager.defaultPath}`;

            const state = await this.persistenceManager.loadFromDefault();
            const success = await this.nar.deserialize?.(state);

            if (success) {
                this.emit(EVENTS.ENGINE_LOAD, { filePath: this.persistenceManager.defaultPath });
                return `💾 NAR state loaded successfully from ${this.persistenceManager.defaultPath}`;
            } else {
                return '❌ Failed to load NAR state - deserialization error';
            }
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, { error: error.message });
            return `❌ Error loading NAR state: ${error.message}`;
        }
    }

    async shutdown() {
        if (this.isRunningLoop) this._stopRun();
        this.emit(EVENTS.ENGINE_SHUTDOWN);
    }
}