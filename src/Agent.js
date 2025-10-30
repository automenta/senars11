import { NAR } from './nar/NAR.js';
import { EvaluationEngine } from './reasoning/EvaluationEngine.js';

export class InputTasks {
    constructor() {
        this.tasks = [];
    }

    // Public Task Management Methods
    addTask(task, priority = 0) {
        if (!this._validateTask(task)) throw new Error('Invalid task format');
        this.tasks.push({ task, priority, timestamp: Date.now() });
        this._sortTasks();
    }

    removeTask(index) {
        return this._isValidIndex(index) ? this.tasks.splice(index, 1)[0] : null;
    }

    updatePriority(index, newPriority) {
        if (!this._isValidIndex(index)) return false;
        this.tasks[index].priority = newPriority;
        this._sortTasks();
        return true;
    }

    // Public Query Methods
    getHighestPriorityTask() {
        return this.tasks[0] || null;
    }

    getAllTasks() {
        return [...this.tasks];
    }

    getTasksByPriority(minPriority = -Infinity) {
        return this.tasks.filter(item => item.priority >= minPriority);
    }

    size() {
        return this.tasks.length;
    }

    clear() {
        this.tasks = [];
    }

    // Private Helper Methods
    _validateTask = task => task != null;

    _isValidIndex(index) {
        return index >= 0 && index < this.tasks.length;
    }

    _sortTasks() {
        this.tasks.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
    }
}

export class Agent {
    constructor(config = {}) {
        this.nar = config.nar || new NAR(config.narConfig || {});
        this.inputTasks = new InputTasks();
        this.evaluator = this.nar._evaluator;
        this.isRunning = false;
        this.config = { maxCyclesPerStep: config.maxCyclesPerStep || 100, ...config };
        this._pluginManager = null; // Initialize plugin manager
    }

    // Task Management Methods
    addTask(task, priority = 0) {
        this.inputTasks.addTask(task, priority);
    }

    removeTask(index) {
        return this.inputTasks.removeTask(index);
    }

    updatePriority(index, newPriority) {
        return this.inputTasks.updatePriority(index, newPriority);
    }

    // Runtime Control Methods
    async run() {
        this.isRunning = true;
        if (!this.nar.isRunning) this.nar.start();
        while (this.isRunning) {
            await this.processNextTask();
            await this._sleep(0);
        }
    }

    stop() {
        this.isRunning = false;
    }

    // Task Processing Methods
    async processNextTask() {
        const taskItem = this.inputTasks.getHighestPriorityTask();
        if (taskItem) {
            const { task } = taskItem;
            try {
                if (this._canAddTask(task)) {
                    await this.nar.step();
                    await this._processDerivedTasks();
                }
                this._removeProcessedTask(task);
            } catch (error) {
                this._logError('Error processing task:', error);
            }
        } else {
            await this._sleep(10);
        }
    }

    _canAddTask(task) {
        return this.nar._taskManager.addTask(task);
    }

    _logError(message, error) {
        if (this.logger) {
            this.logger.error(message, error);
        }
    }

    async _processDerivedTasks() {}

    _removeProcessedTask(task) {
        const allTasks = this.inputTasks.getAllTasks();
        const index = allTasks.findIndex(item => item.task === task);
        if (index !== -1) this.inputTasks.removeTask(index);
    }

    // Utility Methods
    _sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Status and Accessor Methods
    getStatus() {
        return {
            isRunning: this.isRunning,
            taskCount: this.inputTasks.size(),
            narStatus: this._getNARStatus()
        };
    }

    _getNARStatus() {
        if (!this.nar) return 'N/A';
        return {
            isRunning: this.nar.isRunning,
            cycleCount: this.nar.cycleCount,
            memoryStats: this.nar.memory?.getDetailedStats() || 'N/A'
        };
    }

    // Component Accessor Methods
    getNAR() { return this.nar; }
    getEvaluator() { return this.evaluator; }
    getInputTasks() { return this.inputTasks; }
    
    getLM() { return this.nar.lm || null; }
    getMetricsMonitor() { return this.nar.metricsMonitor || null; }
    getEmbeddingLayer() { return this.nar.embeddingLayer || null; }
    getTermLayer() { return this.nar.termLayer || null; }
    getTools() { return this.nar.tools || null; }
    getPluginManager() { return this._pluginManager; }
}