import {SequentialRuleProcessor} from './SequentialRuleProcessor.js';
import {ParallelRuleProcessor} from './ParallelRuleProcessor.js';

/**
 * Factory for creating rule processors with various configurations
 */
export class ProcessorFactory {
    /**
     * Create a processor based on the specified type
     */
    static async createAsync(config = {}) {
        const {type = 'sequential', ...processorConfig} = config;

        switch (type) {
            case 'sequential':
                return new SequentialRuleProcessor(processorConfig);
            case 'parallel':
                return new ParallelRuleProcessor(processorConfig);
            default:
                throw new Error(`Unknown processor type: ${type}`);
        }
    }

    /**
     * Create an optimized processor with specific performance characteristics
     */
    static async createOptimizedAsync(options = {}) {
        const {type = 'sequential', optimizationLevel = 'standard', ...config} = options;

        // Apply optimization settings based on level
        const optimizedConfig = {
            ...config,
            maxBatchSize: this._getOptimizedBatchSize(optimizationLevel),
            maxConcurrency: this._getOptimizedConcurrency(optimizationLevel)
        };

        return this.createAsync({type, ...optimizedConfig});
    }

    /**
     * Get appropriate batch size based on optimization level
     */
    static _getOptimizedBatchSize(optimizationLevel) {
        switch (optimizationLevel) {
            case 'aggressive':
                return 200;
            case 'balanced':
                return 100;
            case 'conservative':
                return 50;
            default:
                return 100;
        }
    }

    /**
     * Get appropriate concurrency based on optimization level
     */
    static _getOptimizedConcurrency(optimizationLevel) {
        switch (optimizationLevel) {
            case 'aggressive':
                return 10;
            case 'balanced':
                return 5;
            case 'conservative':
                return 2;
            default:
                return 5;
        }
    }
}