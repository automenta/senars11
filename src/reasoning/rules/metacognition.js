import {Rule} from '../Rule.js';

/**
 * A rule that adjusts the TermFactory's cache size when a low cache hit rate is detected.
 */
class AdjustCacheSizeRule extends Rule {
    constructor(termFactory) {
        super('AdjustCacheSizeRule', 'nal', 'Adjusts TermFactory cache size based on hit rate.', 0.9);
        this.termFactory = termFactory;
    }

    static create(termFactory) {
        return new AdjustCacheSizeRule(termFactory);
    }

    canApply(task) {
        return task.term.name === '((SELF, has_property, low_cache_hit_rate) --> TRUE)';
    }

    apply(task, context) {
        if (!this.canApply(task)) {
            return {results: [], rule: this};
        }

        const currentCacheSize = this.termFactory.getCacheSize();
        const newCacheSize = Math.floor(currentCacheSize * 1.2); // Increase by 20%

        if (context.nar) {
            context.nar.config.set('termFactory.maxCacheSize', newCacheSize);
            this.termFactory._maxCacheSize = newCacheSize;
            context.nar.logInfo(`Adjusted TermFactory cache size to ${newCacheSize}`);
        }

        return {results: [], rule: this};
    }
}

export const MetacognitionRules = [
    AdjustCacheSizeRule,
];
