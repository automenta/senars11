import { BaseComponent } from '../util/BaseComponent.js';

/**
 * Priority Histogram Tuner
 * Observes priority distributions in Memory and Focus during reasoning and adjusts 
 * activation and forgetting rates accordingly
 */
export class PriorityHistogramTuner extends BaseComponent {
    constructor(config = {}) {
        super({
            // Default configuration values
            histogramBuckets: config.histogramBuckets || 10,
            bucketWidth: config.bucketWidth || 0.1,
            updateIntervalCycles: config.updateIntervalCycles || 50,
            activationDecayAdjustmentStep: config.activationDecayAdjustmentStep || 0.001,
            priorityDecayAdjustmentStep: config.priorityDecayAdjustmentStep || 0.001,
            forgettingRateAdjustmentStep: config.forgettingRateAdjustmentStep || 0.01,
            targetDistribution: config.targetDistribution || 'uniform', // 'uniform', 'exponential', 'normal'
            enableAdaptiveTuning: config.enableAdaptiveTuning !== false,
            ...config
        }, 'PriorityHistogramTuner');
        
        this._cycleCount = 0;
        this._priorityHistogram = new Array(this.config.histogramBuckets).fill(0);
        this._focusPriorityHistogram = new Array(this.config.histogramBuckets).fill(0);
        this._historicalDistributions = [];
        this._tuningHistory = [];
        this._lastAdjustmentTime = Date.now();
    }

    /**
     * Sample priorities from Memory and Focus to build histogram
     */
    samplePriorities(memory, focus) {
        // Clear current histograms
        this._priorityHistogram.fill(0);
        this._focusPriorityHistogram.fill(0);

        // Sample from memory concepts
        const concepts = memory.getAllConcepts();
        for (const concept of concepts) {
            const priority = concept.activation || concept.priority || 0;
            const bucketIndex = this._getBucketIndex(priority);
            if (bucketIndex >= 0 && bucketIndex < this._priorityHistogram.length) {
                this._priorityHistogram[bucketIndex]++;
            }
        }

        // Sample from focus tasks
        const focusTasks = focus.getTasks(focus.getStats().focusSets.default.size || 100);
        for (const task of focusTasks) {
            const priority = task.budget?.priority || 0;
            const bucketIndex = this._getBucketIndex(priority);
            if (bucketIndex >= 0 && bucketIndex < this._focusPriorityHistogram.length) {
                this._focusPriorityHistogram[bucketIndex]++;
            }
        }

        // Normalize histograms
        this._normalizeHistogram(this._priorityHistogram);
        this._normalizeHistogram(this._focusPriorityHistogram);

        // Store historical distribution
        this._historicalDistributions.push({
            timestamp: Date.now(),
            memoryDistribution: [...this._priorityHistogram],
            focusDistribution: [...this._focusPriorityHistogram],
            memoryStats: memory.getDetailedStats()
        });

        // Keep only recent history to avoid memory growth
        if (this._historicalDistributions.length > 100) {
            this._historicalDistributions = this._historicalDistributions.slice(-50);
        }
    }

    /**
     * Get bucket index for a priority value
     */
    _getBucketIndex(priority) {
        const boundedPriority = Math.max(0, Math.min(1.0, priority));
        return Math.floor(boundedPriority / this.config.bucketWidth);
    }

    /**
     * Normalize histogram to sum to 1.0
     */
    _normalizeHistogram(histogram) {
        const sum = histogram.reduce((acc, val) => acc + val, 0);
        if (sum > 0) {
            for (let i = 0; i < histogram.length; i++) {
                histogram[i] /= sum;
            }
        }
    }

    /**
     * Calculate distribution characteristics
     */
    _calculateDistributionStats(histogram) {
        let mean = 0;
        let variance = 0;
        let entropy = 0;

        for (let i = 0; i < histogram.length; i++) {
            const bucketCenter = (i + 0.5) * this.config.bucketWidth;
            mean += bucketCenter * histogram[i];
            if (histogram[i] > 0) {
                entropy -= histogram[i] * Math.log2(histogram[i]);
            }
        }

        for (let i = 0; i < histogram.length; i++) {
            const bucketCenter = (i + 0.5) * this.config.bucketWidth;
            variance += Math.pow(bucketCenter - mean, 2) * histogram[i];
        }

        const stdDev = Math.sqrt(variance);

        return {
            mean,
            variance,
            stdDev,
            entropy,
            skewness: this._calculateSkewness(histogram, mean, stdDev),
            kurtosis: this._calculateKurtosis(histogram, mean, variance)
        };
    }

    /**
     * Calculate skewness of distribution
     */
    _calculateSkewness(histogram, mean, stdDev) {
        if (stdDev === 0) return 0;

        let skewness = 0;
        for (let i = 0; i < histogram.length; i++) {
            const bucketCenter = (i + 0.5) * this.config.bucketWidth;
            skewness += Math.pow((bucketCenter - mean) / stdDev, 3) * histogram[i];
        }
        return skewness;
    }

    /**
     * Calculate kurtosis of distribution
     */
    _calculateKurtosis(histogram, mean, variance) {
        if (variance === 0) return 0;

        let kurtosis = 0;
        for (let i = 0; i < histogram.length; i++) {
            const bucketCenter = (i + 0.5) * this.config.bucketWidth;
            kurtosis += Math.pow((bucketCenter - mean) / Math.sqrt(variance), 4) * histogram[i];
        }
        return kurtosis - 3; // Excess kurtosis
    }

    /**
     * Analyze histogram to determine needed adjustments
     */
    analyzeAndAdjust(memory, focus) {
        if (!this.config.enableAdaptiveTuning) {
            return [];
        }

        this._cycleCount++;
        if (this._cycleCount % this.config.updateIntervalCycles !== 0) {
            return [];
        }

        // Calculate current distribution statistics
        const memoryStats = this._calculateDistributionStats(this._priorityHistogram);
        const focusStats = this._calculateDistributionStats(this._focusPriorityHistogram);

        // Determine what adjustments are needed based on distribution characteristics
        const adjustments = [];

        // Check for high entropy (spread out distribution) - may need more forgetting
        if (memoryStats.entropy > 2.5) { // High entropy indicates spread out priorities
            adjustments.push({
                parameter: 'conceptForgottenRatio',
                direction: 'increase',
                reason: 'High entropy in memory priorities indicates need for more forgetting',
                magnitude: 0.05
            });
        } else if (memoryStats.entropy < 1.0) { // Low entropy indicates concentrated priorities
            adjustments.push({
                parameter: 'conceptForgottenRatio',
                direction: 'decrease',
                reason: 'Low entropy in memory priorities indicates need for less forgetting',
                magnitude: 0.02
            });
        }

        // Check for skewness - if highly skewed, adjust decay rates
        if (Math.abs(memoryStats.skewness) > 1.0) {
            if (memoryStats.skewness > 0) { // Right skewed (high priorities dominate)
                adjustments.push({
                    parameter: 'activationDecayRate',
                    direction: 'increase',
                    reason: 'Right-skewed priority distribution suggests need for faster decay',
                    magnitude: 0.005
                });
            } else { // Left skewed (low priorities dominate)
                adjustments.push({
                    parameter: 'activationDecayRate',
                    direction: 'decrease',
                    reason: 'Left-skewed priority distribution suggests need for slower decay',
                    magnitude: 0.003
                });
            }
        }

        // Check focus distribution - should have high priorities concentrated
        if (focusStats.mean < 0.3) {
            adjustments.push({
                parameter: 'priorityThreshold',
                direction: 'decrease',
                reason: 'Low average focus priority suggests threshold is too high',
                magnitude: 0.05
            });
        } else if (focusStats.mean > 0.8) {
            adjustments.push({
                parameter: 'priorityThreshold',
                direction: 'increase',
                reason: 'High average focus priority suggests threshold is too low',
                magnitude: 0.02
            });
        }

        // Apply adjustments to memory system
        const appliedAdjustments = this._applyAdjustments(adjustments, memory);

        // Record tuning history
        this._tuningHistory.push({
            timestamp: Date.now(),
            cycleCount: this._cycleCount,
            memoryStats,
            focusStats,
            adjustments: appliedAdjustments,
            histogram: [...this._priorityHistogram],
            focusHistogram: [...this._focusPriorityHistogram]
        });

        // Keep tuning history limited
        if (this._tuningHistory.length > 50) {
            this._tuningHistory = this._tuningHistory.slice(-30);
        }

        return appliedAdjustments;
    }

    /**
     * Apply adjustments to the memory system
     */
    _applyAdjustments(adjustments, memory) {
        const applied = [];

        for (const adj of adjustments) {
            try {
                let currentValue, newValue;

                switch (adj.parameter) {
                    case 'activationDecayRate':
                        currentValue = memory._config.activationDecayRate;
                        newValue = adj.direction === 'increase' 
                            ? currentValue + adj.magnitude * this.config.activationDecayAdjustmentStep
                            : currentValue - adj.magnitude * this.config.activationDecayAdjustmentStep;
                        // Clamp to reasonable bounds
                        newValue = Math.max(0.001, Math.min(0.1, newValue));
                        memory._config.activationDecayRate = newValue;
                        break;

                    case 'conceptForgottenRatio':
                        // Assuming this maps to some memory parameter for forgetting
                        // This would be mapped to the actual memory forgetting configuration
                        currentValue = memory._config.conceptForgottenRatio || 0.1;
                        newValue = adj.direction === 'increase' 
                            ? currentValue + adj.magnitude * this.config.forgettingRateAdjustmentStep
                            : currentValue - adj.magnitude * this.config.forgettingRateAdjustmentStep;
                        newValue = Math.max(0.01, Math.min(0.5, newValue));
                        memory._config.conceptForgottenRatio = newValue;
                        break;

                    case 'priorityThreshold':
                        currentValue = memory._config.priorityThreshold;
                        newValue = adj.direction === 'increase' 
                            ? currentValue + adj.magnitude * 0.05
                            : currentValue - adj.magnitude * 0.05;
                        newValue = Math.max(0.01, Math.min(0.99, newValue));
                        memory._config.priorityThreshold = newValue;
                        break;

                    default:
                        continue; // Skip unknown parameters
                }

                applied.push({
                    ...adj,
                    oldValue: currentValue,
                    newValue: newValue,
                    successful: true
                });

            } catch (error) {
                applied.push({
                    ...adj,
                    successful: false,
                    error: error.message
                });
            }
        }

        return applied;
    }

    /**
     * Get current priority histogram
     */
    getPriorityHistogram() {
        return {
            memoryDistribution: [...this._priorityHistogram],
            focusDistribution: [...this._focusPriorityHistogram],
            bucketWidth: this.config.bucketWidth,
            timestamp: Date.now()
        };
    }

    /**
     * Get tuning recommendations based on current histogram
     */
    getTuningRecommendations() {
        const memoryStats = this._calculateDistributionStats(this._priorityHistogram);
        const focusStats = this._calculateDistributionStats(this._focusPriorityHistogram);

        const recommendations = [];

        // Memory distribution recommendations
        if (memoryStats.entropy > 2.8) {
            recommendations.push({
                type: 'memory_management',
                priority: 'high',
                recommendation: 'High entropy in memory priorities detected. Consider increasing forgetting rates.',
                suggestedAdjustment: { parameter: 'conceptForgottenRatio', action: 'increase', amount: 0.05 }
            });
        }

        if (memoryStats.entropy < 0.8) {
            recommendations.push({
                type: 'memory_management',
                priority: 'medium',
                recommendation: 'Low entropy in memory priorities detected. Consider decreasing forgetting rates.',
                suggestedAdjustment: { parameter: 'conceptForgottenRatio', action: 'decrease', amount: 0.02 }
            });
        }

        // Focus distribution recommendations
        if (focusStats.mean < 0.2) {
            recommendations.push({
                type: 'attention_management',
                priority: 'high',
                recommendation: 'Low priority concentration in focus. Consider lowering priority threshold.',
                suggestedAdjustment: { parameter: 'priorityThreshold', action: 'decrease', amount: 0.05 }
            });
        }

        // Distribution shape recommendations
        if (Math.abs(memoryStats.skewness) > 1.2) {
            recommendations.push({
                type: 'priority_balancing',
                priority: 'medium',
                recommendation: `Highly skewed priority distribution detected (skewness: ${memoryStats.skewness.toFixed(2)}). Consider adjusting decay rates.`,
                suggestedAdjustment: { parameter: 'activationDecayRate', action: memoryStats.skewness > 0 ? 'increase' : 'decrease', amount: 0.005 }
            });
        }

        return recommendations;
    }

    /**
     * Get historical tuning data
     */
    getTuningHistory(limit = 10) {
        return this._tuningHistory.slice(-limit);
    }

    /**
     * Get distribution analysis
     */
    getDistributionAnalysis() {
        const memoryStats = this._calculateDistributionStats(this._priorityHistogram);
        const focusStats = this._calculateDistributionStats(this._focusPriorityHistogram);

        return {
            memory: {
                ...memoryStats,
                distribution: [...this._priorityHistogram],
                bucketWidth: this.config.bucketWidth
            },
            focus: {
                ...focusStats,
                distribution: [...this._focusPriorityHistogram],
                bucketWidth: this.config.bucketWidth
            },
            timestamp: Date.now()
        };
    }

    /**
     * Reset histograms
     */
    reset() {
        this._priorityHistogram.fill(0);
        this._focusPriorityHistogram.fill(0);
        this._cycleCount = 0;
        this._historicalDistributions = [];
        this._tuningHistory = [];
    }

    /**
     * Serialize tuner state
     */
    serialize() {
        return {
            config: this.config,
            cycleCount: this._cycleCount,
            priorityHistogram: [...this._priorityHistogram],
            focusPriorityHistogram: [...this._focusPriorityHistogram],
            historicalDistributions: this._historicalDistributions,
            tuningHistory: this._tuningHistory,
            version: '1.0.0'
        };
    }

    /**
     * Deserialize tuner state
     */
    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid PriorityHistogramTuner data for deserialization');
            }

            if (data.config) {
                this.config = {...this.config, ...data.config};
            }

            this._cycleCount = data.cycleCount || 0;
            
            if (data.priorityHistogram && data.priorityHistogram.length === this._priorityHistogram.length) {
                this._priorityHistogram = [...data.priorityHistogram];
            }
            
            if (data.focusPriorityHistogram && data.focusPriorityHistogram.length === this._focusPriorityHistogram.length) {
                this._focusPriorityHistogram = [...data.focusPriorityHistogram];
            }

            this._historicalDistributions = data.historicalDistributions || [];
            this._tuningHistory = data.tuningHistory || [];

            return true;
        } catch (error) {
            console.error('Error during PriorityHistogramTuner deserialization:', error);
            return false;
        }
    }
}