import {Bag} from './Bag.js';
import {clamp} from '../util/common.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {Task} from '../task/Task.js';

const TASK_TYPES = Object.freeze({BELIEF: 'BELIEF', GOAL: 'GOAL', QUESTION: 'QUESTION'});
const CAPACITY_DISTRIBUTION = Object.freeze({BELIEF: 0.6, GOAL: 0.3, QUESTION: 0.1});

export class Concept extends BaseComponent {
    static DEFAULT_CONFIG = {
        maxBeliefs: 100,
        maxGoals: 50,
        maxQuestions: 20,
        defaultDecayRate: 0.01,
        defaultActivationBoost: 0.1,
        maxActivation: 1.0,
        minQuality: 0,
        maxQuality: 1
    };

    constructor(term, config = {}) {
        super({...Concept.DEFAULT_CONFIG, ...config}, `Concept<${term.toString()}>`);

        this._term = term;
        this._createdAt = Date.now();
        this._lastAccessed = Date.now();
        this._beliefs = new Bag(this.config.maxBeliefs);
        this._goals = new Bag(this.config.maxGoals);
        this._questions = new Bag(this.config.maxQuestions);
        this._activation = 0;
        this._useCount = 0;
        this._quality = 0;
    }

    get term() {
        return this._term;
    }

    get createdAt() {
        return this._createdAt;
    }

    get lastAccessed() {
        return this._lastAccessed;
    }

    get activation() {
        return this._activation;
    }

    get useCount() {
        return this._useCount;
    }

    get quality() {
        return this._quality;
    }

    get priority() {
        return this._activation;
    }

    get beliefs() {
        return this._beliefs;
    }

    get goals() {
        return this._goals;
    }

    get questions() {
        return this._questions;
    }

    get totalTasks() {
        return this._beliefs.size + this._goals.size + this._questions.size;
    }

    get averagePriority() {
        return this.totalTasks ? this._calculateWeightedAveragePriority() : 0;
    }

    _calculateWeightedAveragePriority() {
        const bags = [this._beliefs, this._goals, this._questions];
        const sizes = [this._beliefs.size, this._goals.size, this._questions.size];

        let totalWeightedPriority = 0;
        for (let i = 0; i < bags.length; i++) {
            totalWeightedPriority += bags[i].getAveragePriority() * sizes[i];
        }

        return totalWeightedPriority / this.totalTasks;
    }

    _getStorage(taskType) {
        switch (taskType) {
            case TASK_TYPES.BELIEF: return this._beliefs;
            case TASK_TYPES.GOAL: return this._goals;
            case TASK_TYPES.QUESTION: return this._questions;
            default:
                const validTypes = Object.values(TASK_TYPES).join(', ');
                throw new Error(`Unknown task type: ${taskType}. Expected ${validTypes}.`);
        }
    }

    _updateLastAccessed() {
        this._lastAccessed = Date.now();
    }

    addTask(task) {
        const storage = this._getStorage(task.type);
        const added = storage.add(task);
        if (added) {
            this._updateLastAccessed();
            this._useCount++;
        }
        return added;
    }

    enforceCapacity(maxTasksPerType) {
        Object.entries(CAPACITY_DISTRIBUTION).forEach(([type, factor]) => {
            const bag = this[`_${type.toLowerCase()}s`]; // Convert BELIEF to _beliefs
            if (bag) {
                this._enforceBagCapacity(bag, maxTasksPerType * factor);
            }
        });
    }

    _enforceBagCapacity(bag, maxCount) {
        while (bag.size > maxCount) {
            bag._removeItemByPolicy();
        }
    }

    getTask(taskId) {
        const allBags = [this._beliefs, this._goals, this._questions];
        for (const bag of allBags) {
            const task = bag.find(t => t.stamp.id === taskId);
            if (task) return task;
        }
        return null;
    }

    replaceTask(oldTask, newTask) {
        const storage = this._getStorage(oldTask.type);
        if (storage.remove(oldTask)) {
            return storage.add(newTask);
        }
        return false;
    }

    getHighestPriorityTask(taskType) {
        return this._getStorage(taskType).peek() || null;
    }

    getTasksByType(taskType) {
        const storage = this._getStorage(taskType);
        return storage.getItemsInPriorityOrder?.() || [];
    }

    removeTask(task) {
        const removed = this._getStorage(task.type).remove(task);
        if (removed) {
            this._updateLastAccessed();
        }
        return removed || false;
    }

    applyDecay(decayRate = this.config.defaultDecayRate) {
        [this._beliefs, this._goals, this._questions].forEach(bag => bag.applyDecay(decayRate));
        this._activation *= (1 - decayRate);
        this._updateLastAccessed();
    }

    boostActivation(activationBoost = this.config.defaultActivationBoost) {
        this._activation = clamp(this._activation + activationBoost, 0, this.config.maxActivation);
        this._updateLastAccessed();
        this.incrementUseCount();
    }

    incrementUseCount() {
        this._useCount++;
    }

    updateQuality(qualityChange) {
        this._quality = clamp(this._quality + qualityChange, this.config.minQuality, this.config.maxQuality);
    }

    containsTask(task) {
        return this._getStorage(task.type).contains(task);
    }

    getAllTasks() {
        // Get tasks from all storage bags using efficient array concatenation
        const beliefs = this._beliefs.getItemsInPriorityOrder?.() || [];
        const goals = this._goals.getItemsInPriorityOrder?.() || [];
        const questions = this._questions.getItemsInPriorityOrder?.() || [];

        // Combine all tasks and sort by priority
        return [...beliefs, ...goals, ...questions]
            .sort((a, b) => b.budget.priority - a.budget.priority);
    }

    updateTaskBudget(task, newBudget) {
        const storage = this._getStorage(task.type);
        return this._replaceTaskInStorage(storage, task, task.clone({budget: newBudget}));
    }

    _replaceTaskInStorage(storage, oldTask, newTask) {
        return storage.remove(oldTask) && storage.add(newTask);
    }

    getStats() {
        return {
            term: this._term.toString(),
            totalTasks: this.totalTasks,
            beliefsCount: this._beliefs.size,
            goalsCount: this._goals.size,
            questionsCount: this._questions.size,
            activation: this._activation,
            useCount: this._useCount,
            quality: this._quality,
            averagePriority: this.averagePriority,
            createdAt: this._createdAt,
            lastAccessed: this._lastAccessed
        };
    }

    serialize() {
        return {
            term: this._term.serialize ? this._term.serialize() : this._term.toString(),
            createdAt: this._createdAt,
            lastAccessed: this._lastAccessed,
            activation: this._activation,
            useCount: this._useCount,
            quality: this._quality,
            beliefs: this._beliefs.serialize ? this._beliefs.serialize() : null,
            goals: this._goals.serialize ? this._goals.serialize() : null,
            questions: this._questions.serialize ? this._questions.serialize() : null,
            config: this.config,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        if (!data) {
            this.logError('Invalid concept data for deserialization');
            return false;
        }

        try {
            this._createdAt = data.createdAt || Date.now();
            this._lastAccessed = data.lastAccessed || Date.now();
            this._activation = data.activation || 0;
            this._useCount = data.useCount || 0;
            this._quality = data.quality || 0;

            if (data.config) {
                Object.assign(this.config, data.config);
            }

            const deserializationMap = [
                {dataKey: 'beliefs', bagKey: '_beliefs'},
                {dataKey: 'goals', bagKey: '_goals'},
                {dataKey: 'questions', bagKey: '_questions'}
            ];

            for (const {dataKey, bagKey} of deserializationMap) {
                if (data[dataKey] && this[bagKey].deserialize) {
                    await this[bagKey].deserialize(data[dataKey], Task.fromJSON);
                }
            }

            return true;
        } catch (error) {
            this.logError('Error during concept deserialization:', {error: error.message, stack: error.stack});
            return false;
        }
    }
}