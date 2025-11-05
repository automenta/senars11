/**
 * Shared utility functions for reasoning components
 */

export class ReasoningUtils {
    static validateFocusSet(focusSet) {
        if (!Array.isArray(focusSet)) {
            throw new Error(`Focus set must be an array, received: ${typeof focusSet}`);
        }
    }

    static createDefaultConfig(config, defaults = {}) {
        return {
            ...defaults,
            ...config
        };
    }

    static updateMetrics(metrics, type, count) {
        metrics[`${type}Inferences`] += count;
        metrics.totalInferences += count;
    }

    static createPerformanceStats(metrics, ruleEngine, strategySelector) {
        return {
            ...metrics,
            uptime: Date.now() - metrics.startTime,
            ruleEngineStats: ruleEngine.metrics || null,
            strategySelectorStats: strategySelector.getPerformanceRecommendation?.()
                ? strategySelector.getPerformanceRecommendation()
                : null
        };
    }

    static createRuleStats(ruleEngine) {
        const rules = ruleEngine.rules;
        return {
            totalRules: rules.length,
            ruleNames: rules.map(r => r.id),
            ruleTypes: {
                lmRules: rules.filter(r => r.type === 'lm').length,
                nalRules: rules.filter(r => r.type !== 'lm').length
            },
            ...ruleEngine.metrics
        };
    }

    static async processWithReasoningMode(engine, mode, focusSet, maxDerivedTasks) {
        if (!engine[mode]) return [];
        
        const methodName = `_perform${mode.charAt(0).toUpperCase() + mode.slice(1)}Inference`;
        if (typeof engine[methodName] === 'function') {
            return await engine[methodName](focusSet, maxDerivedTasks);
        }
        
        return [];
    }
}

export function createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}

export function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

export function flattenResults(results) {
    return results.flat();
}

export function safeApply(fn, ...args) {
    try {
        return fn(...args);
    } catch (e) {
        return null;
    }
}

export function allSatisfy(array, predicate) {
    return array.every(predicate);
}

export function safeFilter(array, predicate) {
    try {
        return array.filter(predicate);
    } catch (e) {
        return [];
    }
}

export function removeDuplicates(array, keyFn) {
    if (keyFn) {
        const seen = new Set();
        return array.filter(item => {
            const key = keyFn(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    return [...new Set(array)];
}

export function removeDuplicateTasks(tasks) {
    const seen = new Set();
    return tasks.filter(task => {
        const key = task.serialize ? task.serialize() : JSON.stringify(task);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}