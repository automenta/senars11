import {EventEmitter} from 'events';
import {v4 as uuidv4} from 'uuid';

import {NAR} from '../nar/NAR.js';
import {Input} from '../Agent.js';
import {PersistenceManager} from '../io/PersistenceManager.js';

import {CommandProcessor} from './utils/CommandProcessor.js';
import {FormattingUtils} from './utils/index.js';

const SPECIAL_COMMANDS = {
    'next': 'n',
    'n': 'n',
    'run': 'go',
    'go': 'go',
    'stop': 'st',
    'st': 'st',
    'quit': 'exit',
    'q': 'exit',
    'exit': 'exit'
};
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

        let narConfig = {};
        let existingNar = null;

        if (config.nar instanceof NAR) {
            existingNar = config.nar;
            const { nar, ...restConfig } = config;
            config = restConfig;
        } else {
            narConfig = config.nar ?? {};
        }

        this.nar = existingNar || new NAR(narConfig);
        this.inputManager = new Input();
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.persistenceManager = new PersistenceManager({
            defaultPath: config.persistence?.defaultPath ?? './agent.json'
        });
        this.commandProcessor = new CommandProcessor(this.nar, this.persistenceManager, this.sessionState);

        this.isRunningLoop = false;
        this.runInterval = null;
        this.originalTraceState = false;
        this.traceEnabled = false;

        this.uiState = {
            taskGrouping: null,
            taskSelection: [],
            taskFilters: {},
            viewMode: 'vertical-split'
        };
    }

    async initialize() {
        try {
            if (this.nar.initialize) {
                await this.nar.initialize();
            }

            this._registerEventHandlers();

            this.emit(EVENTS.ENGINE_READY, {success: true, message: 'NAR initialized successfully'});
            return true;
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, {error: error.message});
            return false;
        }
    }

    _registerEventHandlers() {
        this._focusHandler = (task) => {
            const formattedTask = this.formatTaskForDisplay(task);
            this.emit('log', `🎯 FOCUSED: ${formattedTask}`);
        };

        if (this.nar.on) {
            this.nar.on('task.focus', this._focusHandler);
        }
    }

    _unregisterEventHandlers() {
        if (this.nar.off && this._focusHandler) {
            this.nar.off('task.focus', this._focusHandler);
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
        const taskId = this.inputManager.addTask(input, 0.5, {
            type: 'user_input',
            source: 'narsese',
            timestamp: Date.now()
        });

        try {
            const {result, duration} = await this._executeNarseseInput(input);
            if (result !== false && result !== null) {
                this._handleSuccessfulNarsese(input, result, duration, taskId);
                return `✅ Input processed successfully (${duration}ms)`;
            } else {
                this._handleFailedNarsese(input, taskId);
                return '❌ Failed to process input';
            }
        } catch (error) {
            console.error('Narsese processing error:', error);
            this._handleNarseseError(input, error);
            return `❌ Error: ${error.message}`;
        }
    }

    async _executeNarseseInput(input) {
        const startTime = Date.now();
        const result = await this.nar.input(input);
        const duration = Date.now() - startTime;
        return {result, duration};
    }

    _handleSuccessfulNarsese(input, result, duration, taskId) {
        this.inputManager.updatePriorityById(taskId, 0.8);
        this.emit(EVENTS.NARSESE_PROCESSED, {
            input,
            result,
            duration,
            taskId,
            beliefs: this.nar.getBeliefs?.() ?? []
        });
    }

    _handleFailedNarsese(input, taskId) {
        const task = this.inputManager.getTaskById(taskId);
        if (task) {
            task.metadata.error = true;
            task.metadata.errorTime = Date.now();
            this.inputManager.updatePriorityById(taskId, 0.1);
        } else
            this.emit(EVENTS.NARSESE_ERROR, {input, error: '❌ Failed to process input', taskId});
    }

    _handleNarseseError(input, error) {
        const allTasks = this.inputManager.getAllTasks();
        const latestTask = allTasks.at(-1);

        if (latestTask?.task === input) {
            latestTask.metadata = {
                ...latestTask.metadata,
                error: true,
                errorTime: Date.now()
            };
            this.inputManager.updatePriorityById(latestTask.id, 0.1);
        }

        this.emit(EVENTS.NARSESE_ERROR, {input, error: error.message});
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

        return await this._executeGeneralCommand(cmd, ...args);
    }

    async _executeGeneralCommand(cmd, ...args) {
        try {
            const result = await this.commandProcessor.executeCommand(cmd, ...args);
            this.emit(`command.${cmd}`, {command: cmd, args, result});
            return result;
        } catch (error) {
            const errorMsg = `❌ Error executing command: ${error.message}`;
            this.emit('command.error', {command: cmd, args, error: error.message});
            return errorMsg;
        }
    }

    async _next() {
        try {
            await this.nar.step();
            const output = `⏭️  Single cycle executed. Cycle: ${this.nar.cycleCount}`;
            this.emit(EVENTS.NAR_CYCLE_STEP, {cycle: this.nar.cycleCount});
            return output;
        } catch (error) {
            console.error('Cycle execution error:', error);
            const errorMsg = `❌ Error executing single cycle: ${error.message}`;
            this.emit(EVENTS.NAR_ERROR, {error: error.message});
            return errorMsg;
        }
    }

    async _run() {
        if (this.isRunningLoop) return '⏸️  Already running. Use "/stop" to stop.';

        this.originalTraceState = this.traceEnabled;
        this.isRunningLoop = true;
        this.emit(EVENTS.NAR_CYCLE_START, {reason: 'continuous run'});

        if (!this.traceEnabled) {
            this.traceEnabled = true;
            this.emit(EVENTS.NAR_TRACE_ENABLE, {reason: 'run session'});
        }

        this.runInterval = setInterval(() => {
            this.nar.step().catch(error => {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            });
        }, 10);

        this.emit(EVENTS.NAR_CYCLE_RUNNING, {interval: 10});
        return '🏃 Running continuously... Use "/stop" to stop.';
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

        if (!this.originalTraceState && this.traceEnabled) {
            this.traceEnabled = false;
            this.emit(EVENTS.NAR_TRACE_RESTORE, {originalState: this.originalTraceState});
        }

        this.emit(EVENTS.NAR_CYCLE_STOP);
        return '🛑 Run stopped.';
    }

    getStats() {
        return this.nar.getStats?.() ?? {};
    }

    getBeliefs() {
        return this.nar.getBeliefs?.() ?? [];
    }

    getHistory() {
        return [...this.sessionState.history];
    }

    isRunning() {
        return this.isRunningLoop;
    }

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

            const result = await this._saveStateToDefault(state);
            this.emit(EVENTS.ENGINE_SAVE, {filePath: result.filePath, size: result.size});
            return this._formatSaveResult(result);
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, {error: error.message});
            return `❌ Error saving NAR state: ${error.message}`;
        }
    }

    async _saveStateToDefault(state) {
        return await this.persistenceManager.saveToDefault(state);
    }

    _formatSaveResult(result) {
        return `💾 NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
    }

    async load() {
        try {
            if (!await this._saveFileExists()) {
                return `📁 Save file does not exist: ${this.persistenceManager.defaultPath}`;
            }

            const state = await this._loadStateFromDefault();
            const success = await this.nar.deserialize?.(state);

            return success
                ? this._formatLoadSuccess()
                : '❌ Failed to load NAR state - deserialization error';
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, {error: error.message});
            return `❌ Error loading NAR state: ${error.message}`;
        }
    }

    async _saveFileExists() {
        return await this.persistenceManager.exists();
    }

    async _loadStateFromDefault() {
        return await this.persistenceManager.loadFromDefault();
    }

    _formatLoadSuccess() {
        this.emit(EVENTS.ENGINE_LOAD, {filePath: this.persistenceManager.defaultPath});
        return `💾 NAR state loaded successfully from ${this.persistenceManager.defaultPath}`;
    }

    // Session state management methods
    setUIState(newState) {
        this.uiState = {...this.uiState, ...newState};
        this.emit('ui.state.updated', {state: this.uiState});
    }

    getUIState() {
        return {...this.uiState};
    }

    async saveSessionState(filePath) {
        const sessionData = {
            uiState: this.uiState,
            inputTasks: this.inputManager.getAllTasks(),
            narState: this.nar.serialize ? await this.nar.serialize() : null,
            history: this.sessionState.history,
            timestamp: Date.now()
        };

        try {
            const result = await this.persistenceManager.saveToPath(sessionData, filePath);
            this.emit(EVENTS.ENGINE_SAVE, {filePath: result.filePath, size: result.size});
            return result;
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, {error: error.message});
            throw error;
        }
    }

    async loadSessionState(filePath) {
        try {
            const sessionData = await this.persistenceManager.loadFromPath(filePath);

            if (sessionData.uiState) {
                this.uiState = {...this.uiState, ...sessionData.uiState};
            }

            if (sessionData.inputTasks) {
                // Clear current tasks and restore from saved state
                // This is a simplified restoration - in a real implementation, 
                // we'd need to properly recreate the input manager state
                this.inputManager.clear();
                sessionData.inputTasks.forEach(task => {
                    this.inputManager.addTask(task.task, task.priority, task.metadata);
                });
            }

            if (sessionData.narState && this.nar.deserialize) {
                await this.nar.deserialize(sessionData.narState);
            }

            if (sessionData.history) {
                this.sessionState.history = [...sessionData.history];
            }

            this.emit(EVENTS.ENGINE_LOAD, {filePath});
            this.emit('session.restored', {filePath, uiState: this.uiState});
            return sessionData;
        } catch (error) {
            this.emit(EVENTS.ENGINE_ERROR, {error: error.message});
            throw error;
        }
    }

    // Format a task for display using appropriate formatting utilities
    formatTaskForDisplay(task) {
        try {
            // Use the FormattingUtils to format the task properly
            return FormattingUtils.formatTask(task);
        } catch (error) {
            console.error('Error formatting task:', error);
            return 'Formatting error';
        }
    }

    // Generate a notebook entry from the current session state
    generateNotebookEntry(type, content, metadata = {}) {
        return {
            id: uuidv4(),
            type,
            content,
            timestamp: Date.now(),
            metadata: {
                ...metadata,
                cycle: this.nar.cycleCount || 0,
                memoryStats: this.getStats()
            }
        };
    }

    // Capture the current session as a notebook
    async captureNotebook(format = 'json', title = 'SeNARS Session', description = 'Interactive reasoning session') {
        const notebook = {
            id: uuidv4(),
            title,
            description,
            format: 'seNARS-notebook-v1',
            timestamp: Date.now(),
            metadata: {
                version: '1.0',
                engineConfig: this.nar.config || {},
                sessionStats: this.getStats()
            },
            entries: [
                // Include the history of inputs and outputs
                ...this.sessionState.history.map(input => this.generateNotebookEntry('input', input)),
                // Add current beliefs and state
                this.generateNotebookEntry('beliefs', this.getBeliefs(), {type: 'beliefs'}),
                // Add system status
                this.generateNotebookEntry('status', this.getStats(), {type: 'system-status'})
            ]
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(notebook, null, 2);
            case 'markdown':
                return this._convertNotebookToMarkdown(notebook);
            case 'text':
                return this._convertNotebookToText(notebook);
            default:
                throw new Error(`Unsupported notebook format: ${format}`);
        }
    }

    // Convert notebook to markdown format for reporting
    _convertNotebookToMarkdown(notebook) {
        let markdown = `# ${notebook.title}\n\n`;
        markdown += `> ${notebook.description}\n\n`;
        markdown += `**Generated:** ${new Date(notebook.timestamp).toLocaleString()}\n\n`;

        notebook.entries.forEach((entry, index) => {
            markdown += `## Entry ${index + 1}: ${entry.type}\n\n`;
            markdown += `**Time:** ${new Date(entry.timestamp).toLocaleString()}\n\n`;

            if (entry.type === 'input') {
                markdown += `**Input:** \`\`\`\n${entry.content}\n\`\`\`\n\n`;
            } else if (entry.type === 'beliefs') {
                markdown += `**Beliefs:** \`\`\`json\n${JSON.stringify(entry.content, null, 2)}\n\`\`\`\n\n`;
            } else {
                markdown += `**Content:** ${JSON.stringify(entry.content, null, 2)}\n\n`;
            }

            markdown += `---\n\n`;
        });

        return markdown;
    }

    // Convert notebook to text format for reporting
    _convertNotebookToText(notebook) {
        let text = `=== ${notebook.title} ===\n\n`;
        text += `${notebook.description}\n\n`;
        text += `Generated: ${new Date(notebook.timestamp).toLocaleString()}\n\n`;

        notebook.entries.forEach((entry, index) => {
            text += `--- Entry ${index + 1}: ${entry.type} ---\n`;
            text += `Time: ${new Date(entry.timestamp).toLocaleString()}\n`;

            if (entry.type === 'input') {
                text += `Input: ${entry.content}\n`;
            } else if (entry.type === 'beliefs') {
                text += `Beliefs: ${JSON.stringify(entry.content)}\n`;
            } else {
                text += `Content: ${JSON.stringify(entry.content)}\n`;
            }

            text += '\n';
        });

        return text;
    }

    async shutdown() {
        if (this.isRunningLoop) this._stopRun();
        this._unregisterEventHandlers();
        this.emit(EVENTS.ENGINE_SHUTDOWN);
    }
}
