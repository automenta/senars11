import {PremiseSource} from './PremiseSource.js';
import {randomWeightedSelect} from './utils/randomWeightedSelect.js';
import {mergeConfig, sleep} from './utils/common.js';
import {logError, ReasonerError} from './utils/error.js';

/**
 * A PremiseSource that draws from a TaskBag with configurable sampling objectives.
 */
export class TaskBagPremiseSource extends PremiseSource {
    /**
     * @param {Memory} memory - The memory to draw from (should contain a taskBag).
     * @param {object} samplingObjectives - Configuration for the sampling strategy.
     */
    constructor(memory, samplingObjectives) {
        // Set default sampling objectives if not provided
        const defaults = mergeConfig({
            priority: true,
            recency: false,
            punctuation: false,
            novelty: false,
            targetTime: null,  // Default to current time when used
            weights: {},
            dynamic: false
        }, samplingObjectives);

        super(memory, defaults);

        // Helper to abstract access to the underlying task collection
        this._taskCollection = this._initializeTaskCollection(memory);

        if (!this._taskCollection) {
             throw new ReasonerError('TaskBagPremiseSource requires either a memory object with a taskBag/bag property or a Focus component with getTasks method', 'CONFIG_ERROR');
        }

        // Initialize sampling strategy weights based on sampling objectives
        const initialWeights = {
            priority: defaults.priority ? 1.0 : 0.0,
            recency: defaults.recency ? 1.0 : 0.0,
            punctuation: defaults.punctuation ? 1.0 : 0.0,
            novelty: defaults.novelty ? 1.0 : 0.0
        };

        // Override with any explicit weights provided
        this.weights = mergeConfig(initialWeights, defaults.weights);

        // Performance tracking for dynamic adaptation
        this.performanceStats = {
            priority: {count: 0, effectiveness: 0},
            recency: {count: 0, effectiveness: 0},
            punctuation: {count: 0, effectiveness: 0},
            novelty: {count: 0, effectiveness: 0}
        };

        this.dynamicAdaptation = defaults.dynamic;
        this.lastUpdate = Date.now();
        this.samplingObjectives = defaults;
    }

    /**
     * Initialize task collection abstraction
     * @private
     */
    _initializeTaskCollection(memory) {
        // Support different memory types: traditional taskBag/bag, or Focus component
        if (memory && typeof memory.getTasks === 'function') {
            // Focus-like component
            return {
                getAll: () => memory.getTasks(1000),
                remove: (task) => {
                   // Focus.js removeTaskFromFocus takes hash
                   return memory.removeTaskFromFocus(task.stamp.id);
                },
                tryGetHighestPriority: () => {
                     // Focus requires probabilistic sampling (roulette), not deterministic top-task selection.
                     // Returning null here forces _sampleByPriority to use the fallback roulette logic.
                     return null;
                },
                size: () => {
                     // Focus has getStats or we just check getTasks length
                     return memory.getTasks(1000).length;
                }
            };
        }

        const bag = memory?.taskBag ?? memory?.bag ?? null;
        if (bag) {
            return {
                getAll: () => {
                   if (typeof bag.getAll === 'function') return bag.getAll();
                   if (typeof bag.getItemsInPriorityOrder === 'function') return bag.getItemsInPriorityOrder();
                   return [];
                },
                remove: (task) => bag.remove(task),
                tryGetHighestPriority: () => {
                    // Only use optimized retrieval if it consumes the task (take/pop).
                    // If we just 'peek' or 'get', we'd return the same task repeatedly, causing a loop.
                    // By returning null, we fall back to roulette sampling on the bag contents.
                    if (bag.take) return bag.take();
                    if (bag.pop) return bag.pop();
                    // Original code supported bag.get(0) but that might have been for a specific Bag impl
                    // capable of removal or where repeated processing was handled elsewhere.
                    // Safest path for standard Bag is to sample if we can't consume.
                    return null;
                },
                size: () => {
                     if (bag.size !== undefined) return bag.size;
                     if (typeof bag.length === 'number') return bag.length;
                     if (typeof bag.count === 'function') return bag.count();
                     return 0;
                }
            };
        }

        return null;
    }

    /**
     * Returns an async stream of premises sampled from the task bag.
     * @returns {AsyncGenerator<Task>}
     */
    async* stream() {
        while (true) {
            try {
                const task = await this._sampleTask();
                if (task) {
                    yield task;
                } else {
                    await this._waitForTask();
                }
            } catch (error) {
                logError(error, {context: 'premise_source_stream'}, 'warn');
                await this._waitForTask();
                continue;
            }
        }
    }

    async tryGetTask() {
        return await this._sampleTask();
    }

    async _sampleTask() {
        try {
            if (this._taskCollection.size() === 0) {
                return null;
            }

            if (this.dynamicAdaptation) {
                this._updateWeightsDynamically();
            }

            const selectedMethod = this._selectSamplingMethod();
            const startTime = Date.now();
            const selectedTask = this._applySamplingMethod(selectedMethod);

            if (selectedTask) {
                const executionTime = Date.now() - startTime;
                const effectiveness = 1.0 / (executionTime + 1);
                this.recordMethodEffectiveness(selectedMethod, effectiveness);
            }

            return selectedTask;
        } catch (error) {
            logError(error, {context: 'task_sampling'}, 'error');
            return null;
        }
    }

    _applySamplingMethod(method) {
        switch (method) {
            case 'priority':
                return this._sampleByPriority();
            case 'recency':
                return this._sampleByRecency();
            case 'punctuation':
                return this._sampleByPunctuation();
            case 'novelty':
                return this._sampleByNovelty();
            default:
                return this._sampleByPriority();
        }
    }

    _selectSamplingMethod() {
        const methods = Object.keys(this.weights);
        const weights = methods.map(method => this.weights[method]);
        const totalWeight = weights.reduce((sum, w) => sum + Math.max(w, 0.001), 0);
        const normalizedWeights = weights.map(w => w / totalWeight);
        return randomWeightedSelect(methods, normalizedWeights);
    }

    _sampleByPriority() {
        // Try optimized access first
        const task = this._taskCollection.tryGetHighestPriority();
        if (task) return task;

        // Fallback to roulette on full list
        const allTasks = this._taskCollection.getAll();
        if (allTasks.length === 0) return null;
        if (allTasks.length === 1) return allTasks[0];

        const totalPriority = allTasks.reduce((sum, t) => sum + (t.budget?.priority || 0), 0);

        if (totalPriority <= 0) {
            return allTasks[Math.floor(Math.random() * allTasks.length)];
        }

        let randomValue = Math.random() * totalPriority;
        for (const t of allTasks) {
            const p = t.budget?.priority || 0;
            if (randomValue < p) return t;
            randomValue -= p;
        }

        return allTasks[allTasks.length - 1];
    }

    _sampleByRecency() {
        const allTasks = this._taskCollection.getAll();
        if (allTasks.length === 0) return null;

        const targetTime = this.samplingObjectives.targetTime ?? Date.now();

        allTasks.sort((a, b) => {
            const timeA = a.stamp?.lastUpdated ?? a.stamp?.creationTime ?? 0;
            const timeB = b.stamp?.lastUpdated ?? b.stamp?.creationTime ?? 0;
            return Math.abs(timeA - targetTime) - Math.abs(timeB - targetTime);
        });

        return allTasks[0];
    }

    _sampleByPunctuation() {
        const allTasks = this._taskCollection.getAll();
        if (allTasks.length === 0) return null;

        const goalsAndQuestions = allTasks.filter(task => {
            const type = task.type;
            return type === 'GOAL' || type === 'QUESTION';
        });

        if (goalsAndQuestions.length > 0) {
            return goalsAndQuestions[Math.floor(Math.random() * goalsAndQuestions.length)];
        }

        return this._sampleByPriority();
    }

    _sampleByNovelty() {
        const allTasks = this._taskCollection.getAll();
        if (allTasks.length === 0) return null;

        // Calculate novelty as inverse of derivation depth
        // We map to objects to sort, then extract task
        const sorted = allTasks.map(task => ({
            task,
            novelty: 1 / ((task.stamp?.depth ?? 0) + 1)
        })).sort((a, b) => b.novelty - a.novelty);

        return sorted[0].task;
    }

    _updateWeightsDynamically() {
        const now = Date.now();
        if (now - this.lastUpdate < 1000) return;
        this.lastUpdate = now;

        for (const method in this.performanceStats) {
            const stats = this.performanceStats[method];
            if (stats.count > 0) {
                const effectiveness = stats.effectiveness / stats.count;
                this.weights[method] = 0.9 * this.weights[method] + 0.1 * effectiveness;
            }
        }
    }

    recordMethodEffectiveness(method, effectiveness) {
        const stats = this.performanceStats[method];
        if (stats) {
            stats.count++;
            stats.effectiveness += effectiveness;
        }
    }

    async _waitForTask() {
        await sleep(10);
    }
}
