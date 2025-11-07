import { EventEmitter } from 'events';
import { NAR } from '../nar/NAR.js';
import { CommandProcessor } from './utils/CommandProcessor.js';
import { PersistenceManager } from '../io/PersistenceManager.js';

export class ReplEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.nar = new NAR(config.nar ?? {});
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
            this.emit('engine.ready', { success: true, message: 'NAR initialized successfully' });
            return true;
        } catch (error) {
            this.emit('engine.error', { error: error.message });
            return false;
        }
    }

    async processInput(input) {
        const trimmedInput = input.trim();
        if (!trimmedInput) return await this.executeCommand('next'); // Empty input triggers next cycle

        this.sessionState.history.push(trimmedInput);

        return trimmedInput.startsWith('/') 
            ? await this.executeCommand(...trimmedInput.slice(1).split(' '))
            : await this.processNarsese(trimmedInput);
    }

    async processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            await this.nar.step();
            const duration = Date.now() - startTime;

            if (result) {
                const output = `✅ Input processed successfully (${duration}ms)`;
                this.emit('narsese.processed', { input, result, duration, beliefs: this.nar.getBeliefs?.() ?? [] });
                return output;
            } else {
                const error = '❌ Failed to process input';
                this.emit('narsese.error', { input, error });
                return error;
            }
        } catch (error) {
            const errorMsg = `❌ Error: ${error.message}`;
            this.emit('narsese.error', { input, error: error.message });
            return errorMsg;
        }
    }

    async executeCommand(cmd, ...args) {
        // Handle special engine-specific commands
        const specialCmds = { 'next': 'n', 'n': 'n', 'run': 'go', 'go': 'go', 'stop': 'st', 'st': 'st', 'quit': 'exit', 'q': 'exit', 'exit': 'exit' };
        
        switch (specialCmds[cmd] ?? cmd) {
            case 'n': return await this._next();
            case 'go': return await this._run();
            case 'st': return await this._stop();
            case 'exit': 
                this.emit('engine.quit');
                return '👋 Goodbye!';
        }

        // Delegate to shared command processor for standard commands
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
            this.emit('nar.cycle.step', { cycle: this.nar.cycleCount });
            return output;
        } catch (error) {
            const errorMsg = `❌ Error executing single cycle: ${error.message}`;
            this.emit('nar.error', { error: error.message });
            return errorMsg;
        }
    }

    async _run() {
        if (this.isRunningLoop) return '⏸️  Already running. Use "/stop" to stop.';

        this.originalTraceState = this.traceEnabled;
        this.isRunningLoop = true;
        this.emit('nar.cycle.start', { reason: 'continuous run' });

        if (!this.traceEnabled) {
            this.traceEnabled = true;
            this.emit('nar.trace.enable', { reason: 'run session' });
        }

        this.runInterval = setInterval(async () => {
            try {
                await this.nar.step();
            } catch (error) {
                console.error(`❌ Error during run: ${error.message}`);
                this._stopRun();
            }
        }, 10);

        this.emit('nar.cycle.running', { interval: 10 });
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
            this.emit('nar.trace.restore', { originalState: this.originalTraceState });
        }

        this.emit('nar.cycle.stop');
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
        this.emit('engine.reset');
        return '🔄 NAR system reset successfully.';
    }

    async save() {
        try {
            const state = this.nar.serialize?.();
            if (!state) return 'Serialization not supported by NAR instance.';

            const result = await this.persistenceManager.saveToDefault(state);
            this.emit('engine.save', { filePath: result.filePath, size: result.size });
            return `💾 NAR state saved successfully to ${result.filePath} (${Math.round(result.size / 1024)} KB)`;
        } catch (error) {
            this.emit('engine.save.error', { error: error.message });
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
                this.emit('engine.load', { filePath: this.persistenceManager.defaultPath });
                return `💾 NAR state loaded successfully from ${this.persistenceManager.defaultPath}`;
            } else {
                return '❌ Failed to load NAR state - deserialization error';
            }
        } catch (error) {
            this.emit('engine.load.error', { error: error.message });
            return `❌ Error loading NAR state: ${error.message}`;
        }
    }

    async shutdown() {
        if (this.isRunningLoop) this._stopRun();
        this.emit('engine.shutdown');
    }
}