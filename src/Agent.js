import {NAR} from './nar/NAR.js';

export class Input {
    constructor() {
        this.tasks = [];
        this.idCounter = 0; // For generating unique IDs
    }

    addTask(task, priority = 0, metadata = {}) {
        if (!this._validateTask(task)) throw new Error('Invalid task format');

        const taskId = this._generateId();
        const taskItem = {
            id: taskId,
            task,
            priority,
            timestamp: Date.now(),
            metadata: { ...metadata, createdAt: Date.now() },
            derivedTasks: [] // Track derived tasks from this input
        };

        this.tasks.push(taskItem);
        this._sortTasks();

        return taskId;
    }

    removeTask(index) {
        return this._isValidIndex(index) ? this.tasks.splice(index, 1)[0] : null;
    }

    removeTaskById(taskId) {
        const index = this.tasks.findIndex(item => item.id === taskId);
        return index !== -1 ? this.tasks.splice(index, 1)[0] : null;
    }

    updatePriority(index, newPriority, mode = 'direct') {
        if (!this._isValidIndex(index)) return false;

        const taskItem = this.tasks[index];
        taskItem.priority = newPriority;

        if (mode === 'cascade') {
            this._updateDerivedPriorities(taskItem.id, newPriority);
        }

        this._sortTasks();
        return true;
    }

    updatePriorityById(taskId, newPriority, mode = 'direct') {
        const index = this.tasks.findIndex(item => item.id === taskId);
        return index !== -1 ? this.updatePriority(index, newPriority, mode) : false;
    }

    getHighestPriorityTask() {
        return this.tasks[0] ?? null;
    }

    getAllTasks() {
        return [...this.tasks];
    }

    getTasksByPriority(minPriority = -Infinity) {
        return this.tasks.filter(item => item.priority >= minPriority);
    }

    getTaskById(taskId) {
        return this.tasks.find(item => item.id === taskId) ?? null;
    }

    size() {
        return this.tasks.length;
    }

    clear() {
        this.tasks = [];
    }

    getTaskDependencies(inputId) {
        const inputTask = this.getTaskById(inputId);
        return inputTask ? [...inputTask.derivedTasks] : [];
    }

    deleteInputWithDependencies(inputId) {
        const taskItem = this.removeTaskById(inputId);
        if (taskItem) {
            this._removeDerivedTasks(inputId);
            return taskItem;
        }
        return null;
    }

    editInputWithRecreate(inputId, newInput, metadata = {}) {
        const index = this.tasks.findIndex(item => item.id === inputId);
        if (index !== -1) {
            const oldTaskItem = this.tasks[index];
            const newPriority = oldTaskItem.priority;

            this._removeDerivedTasks(inputId);

            this.tasks[index] = {
                id: inputId,
                task: newInput,
                priority: newPriority,
                timestamp: Date.now(), // Update timestamp
                metadata: { ...oldTaskItem.metadata, ...metadata, modifiedAt: Date.now() },
                derivedTasks: [] // Reset derived tasks
            };

            this._sortTasks();
            return true;
        }
        return false;
    }

    addDerivedTask(inputId, derivedTask) {
        const taskItem = this.getTaskById(inputId);
        if (taskItem) {
            if (!taskItem.derivedTasks) {
                taskItem.derivedTasks = [];
            }
            taskItem.derivedTasks.push(derivedTask);
        }
    }

    _updateDerivedPriorities(inputId, priority) {
        const taskItem = this.getTaskById(inputId);
        if (taskItem?.derivedTasks) {
            taskItem.derivedTasks.forEach(derivedTask => {
                if (derivedTask.metadata) {
                    derivedTask.metadata.priority = priority;
                }
            });
        }
    }

    _removeDerivedTasks(inputId) {
        const taskItem = this.getTaskById(inputId);
        if (taskItem?.derivedTasks) {
            taskItem.derivedTasks = [];
        }
    }

    _validateTask = task => task != null;

    _isValidIndex(index) {
        return index >= 0 && index < this.tasks.length;
    }

    _sortTasks() {
        this.tasks.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
    }

    _generateId() {
        return `input_${++this.idCounter}_${Date.now()}`;
    }
}

export class Agent {
    constructor(config = {}) {
        this.nar = config.nar ?? new NAR(config.narConfig ?? {});
        this.inputTasks = new Input(); // Manage user input tasks
        this.evaluator = this.nar._evaluator;
        this.isRunning = false;
        this.config = {maxCyclesPerStep: config.maxCyclesPerStep ?? 100, ...config};
        this._pluginManager = null;
    }

    addTask(task, priority = 0) {
        return this.inputTasks.addTask(task, priority);
    }

    removeTask(index) {
        return this.inputTasks.removeTask(index);
    }

    updatePriority(index, newPriority) {
        return this.inputTasks.updatePriority(index, newPriority);
    }

    getTaskDependencies(inputId) {
        return this.inputTasks.getTaskDependencies(inputId);
    }

    deleteInputWithDependencies(inputId) {
        return this.inputTasks.deleteInputWithDependencies(inputId);
    }

    editInputWithRecreate(inputId, newInput, metadata = {}) {
        return this.inputTasks.editInputWithRecreate(inputId, newInput, metadata);
    }

    updateInputPriority(inputId, newPriority, mode = 'direct') {
        return this.inputTasks.updatePriorityById(inputId, newPriority, mode);
    }

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

    async processNextTask() {
        const taskItem = this.inputTasks.getHighestPriorityTask();
        if (taskItem) {
            const {task} = taskItem;
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

    async _processDerivedTasks() {
    }

    _removeProcessedTask(task) {
        const allTasks = this.inputTasks.getAllTasks();
        const index = allTasks.findIndex(item => item.task === task);
        if (index !== -1) this.inputTasks.removeTask(index);
    }

    _sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
            isRunning: this.nar.isRunning ?? false,
            cycleCount: this.nar.cycleCount ?? 0,
            memoryStats: this.nar.memory?.getDetailedStats() ?? 'N/A'
        };
    }

    getNAR() {
        return this.nar;
    }

    getEvaluator() {
        return this.evaluator;
    }

    getInputTasks() {
        return this.inputTasks;
    }

    getLM() {
        return this.nar.lm ?? null;
    }

    getMetricsMonitor() {
        return this.nar.metricsMonitor ?? null;
    }

    getEmbeddingLayer() {
        return this.nar.embeddingLayer ?? null;
    }

    getTermLayer() {
        return this.nar.termLayer ?? null;
    }

    getTools() {
        return this.nar.tools ?? null;
    }

    getPluginManager() {
        return this._pluginManager;
    }
}