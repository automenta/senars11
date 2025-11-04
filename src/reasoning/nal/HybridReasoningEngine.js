import {Logger} from '../../util/Logger.js';

/**
 * Helper class for resolving conflicts between NAL and LM results
 */
class ConflictResolver {
    constructor() {
        this.conflicts = [];
        this.resolutionStrategies = new Map();
        this.stats = {
            conflictsDetected: 0,
            conflictsResolved: 0,
            resolutionMethodCounts: {},
            validationErrors: 0
        };
    }

    /**
     * Validates input results before processing
     */
    _validateResults(results, source) {
        if (!Array.isArray(results)) {
            console.warn(`Invalid results from ${source}: not an array`);
            this.stats.validationErrors++;
            return [];
        }

        return results.filter(result => {
            if (!result || typeof result !== 'object') {
                console.warn(`Invalid result object from ${source}: not an object`);
                this.stats.validationErrors++;
                return false;
            }

            // Validate that result has required properties
            if (!result.term) {
                console.warn(`Invalid result from ${source}: missing term property`);
                this.stats.validationErrors++;
                return false;
            }

            // Validate truth value if present
            if (result.truth) {
                const {f: frequency, c: confidence} = result.truth;
                if (typeof frequency === 'number' && (frequency < 0 || frequency > 1)) {
                    console.warn(`Invalid frequency value in result from ${source}: ${frequency}`);
                    this.stats.validationErrors++;
                    return false;
                }

                if (typeof confidence === 'number' && (confidence < 0 || confidence > 1)) {
                    console.warn(`Invalid confidence value in result from ${source}: ${confidence}`);
                    this.stats.validationErrors++;
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Resolves conflicts between NAL, LM, and hybrid results
     */
    async resolveConflicts(nalResults, lmResults, hybridResults) {
        try {
            // Validate inputs
            const validNalResults = this._validateResults(nalResults || [], 'NAL');
            const validLmResults = this._validateResults(lmResults || [], 'LM');
            const validHybridResults = this._validateResults(hybridResults || [], 'hybrid');

            const allResults = [...validNalResults, ...validLmResults, ...validHybridResults];
            const resolvedResults = [];
            const potentialConflicts = [];

            // Detect potential conflicts by comparing similar results
            for (let i = 0; i < allResults.length; i++) {
                for (let j = i + 1; j < allResults.length; j++) {
                    if (this._isConflicting(allResults[i], allResults[j])) {
                        potentialConflicts.push([allResults[i], allResults[j]]);
                        this.stats.conflictsDetected++;
                    }
                }
            }

            if (potentialConflicts.length > 0) {
                // Resolve each conflict
                for (const [result1, result2] of potentialConflicts) {
                    try {
                        const resolved = await this._resolvePair(result1, result2);
                        resolvedResults.push(resolved);
                        this.stats.conflictsResolved++;
                    } catch (error) {
                        console.error('Error resolving conflict pair:', error);
                        this.stats.validationErrors++;
                        // If we can't resolve, keep both results
                        resolvedResults.push(result1, result2);
                    }
                }
            } else {
                // No conflicts, return all valid results
                return allResults;
            }

            return resolvedResults;
        } catch (error) {
            console.error('Error in conflict resolution:', error);
            this.stats.validationErrors++;
            // Return original results if conflict resolution fails
            return [...(nalResults || []), ...(lmResults || []), ...(hybridResults || [])];
        }
    }

    /**
     * Checks if two results are conflicting
     */
    _isConflicting(result1, result2) {
        // Two results conflict if they have the same term but significantly different truth values
        if (result1.term?.id !== result2.term?.id) {
            return false; // Different terms, not conflicting
        }

        // Check for significant difference in truth values
        const truthDiff = Math.abs((result1.truth?.f || 0.5) - (result2.truth?.f || 0.5));
        return truthDiff > 0.3; // Consider conflicting if frequency differs by more than 0.3
    }

    /**
     * Resolves a conflict between two results
     */
    async _resolvePair(result1, result2) {
        // Resolution strategy: prefer result with higher confidence
        const confidence1 = result1.truth?.c || 0.1;
        const confidence2 = result2.truth?.c || 0.1;

        if (confidence1 > confidence2) {
            this._updateResolutionStats('confidence_based');
            return result1;
        } else if (confidence2 > confidence1) {
            this._updateResolutionStats('confidence_based');
            return result2;
        } else {
            // Same confidence, use other factors
            // For now, prefer NAL results but in real implementation this could be configurable
            this._updateResolutionStats('default_preference');
            return result1;
        }
    }

    /**
     * Updates statistics for resolution method used
     */
    _updateResolutionStats(method) {
        this.stats.resolutionMethodCounts[method] = (this.stats.resolutionMethodCounts[method] || 0) + 1;
    }

    /**
     * Gets conflict resolution statistics
     */
    getStats() {
        return this.stats;
    }
}

/**
 * HybridReasoningEngine - Manages sophisticated collaboration between NAL and LM reasoning
 */
export class HybridReasoningEngine {
    constructor(nalEngine, lm, config = {}) {
        // Validate constructor arguments
        if (nalEngine !== null && typeof nalEngine !== 'object') {
            throw new Error('NAL engine must be an object or null');
        }

        if (lm !== null && typeof lm !== 'object') {
            throw new Error('LM must be an object or null');
        }

        if (config && typeof config !== 'object') {
            throw new Error('Config must be an object');
        }

        this.nalEngine = nalEngine;  // NAL Rule Engine
        this.lm = lm;                // Language Model instance
        this.config = {
            gapDetectionThreshold: this._validateThreshold(config.gapDetectionThreshold, 0.3),
            confidenceThreshold: this._validateThreshold(config.confidenceThreshold, 0.7),
            maxIterations: Math.max(1, Math.floor(config.maxIterations || 3)),
            ...config
        };
        this.logger = Logger;
        this.feedbackLoops = new Map(); // Track feedback between systems
        this.conflictResolver = new ConflictResolver();
    }

    /**
     * Validates threshold values to ensure they are between 0 and 1
     */
    _validateThreshold(value, defaultValue) {
        if (value === undefined || value === null) {
            return defaultValue;
        }

        if (typeof value !== 'number' || value < 0 || value > 1) {
            this.logger.warn(`Invalid threshold value: ${value}, using default: ${defaultValue}`);
            return defaultValue;
        }

        return value;
    }

    /**
     * Performs hybrid reasoning by coordinating NAL and LM systems
     */
    async reason(task, context = {}) {
        try {
            // Validate input parameters
            this._validateTask(task);

            if (context && typeof context !== 'object') {
                throw new Error('Context must be an object');
            }

            const results = {
                nalResults: [],
                lmResults: [],
                hybridResults: [],
                reasoningPath: [],
                finalDecision: null,
                errorCount: 0,
                warningCount: 0
            };

            this.logger.info(`Starting hybrid reasoning for task: ${task.term?.toString() || task.toString() || 'unknown'}`);

            // Step 1: Apply NAL reasoning
            try {
                const nalResults = await this._applyNALReasoning(task, context);
                results.reasoningPath.push('NAL reasoning applied');
                results.nalResults = Array.isArray(nalResults) ? nalResults : [];
            } catch (nalError) {
                results.errorCount++;
                this.logger.error('Error in NAL reasoning step:', nalError);
                results.reasoningPath.push('NAL reasoning failed');
                results.nalResults = [];
            }

            // Step 2: Apply LM reasoning
            try {
                const lmResults = await this._applyLMReasoning(task, context);
                results.reasoningPath.push('LM reasoning applied');
                results.lmResults = Array.isArray(lmResults) ? lmResults : [];
            } catch (lmError) {
                results.errorCount++;
                this.logger.error('Error in LM reasoning step:', lmError);
                results.reasoningPath.push('LM reasoning failed');
                results.lmResults = [];
            }

            // Step 3: Detect gaps and apply cross-validation
            try {
                const gaps = this._detectReasoningGaps(task, results.nalResults, results.lmResults, context);
                if (gaps.length > 0) {
                    results.reasoningPath.push(`Detected ${gaps.length} gaps in reasoning`);

                    // Fill gaps using the other system
                    for (const gap of gaps) {
                        try {
                            const gapResult = await this._fillGap(task, gap, context);
                            results.hybridResults.push(...Array.isArray(gapResult) ? gapResult : []);
                        } catch (gapError) {
                            results.errorCount++;
                            this.logger.error('Error filling gap:', gapError);
                        }
                    }
                }
            } catch (gapError) {
                results.errorCount++;
                this.logger.error('Error in gap detection:', gapError);
            }

            // Step 4: Cross-validate results
            try {
                const validatedResults = await this._crossValidate(results.nalResults, results.lmResults, context);
                results.reasoningPath.push('Cross-validation completed');
                results.hybridResults.push(...Array.isArray(validatedResults) ? validatedResults : []);
            } catch (validationError) {
                results.errorCount++;
                this.logger.error('Error in cross-validation:', validationError);
                results.reasoningPath.push('Cross-validation failed');
            }

            // Step 5: Resolve conflicts between NAL and LM results
            try {
                const finalResults = await this.conflictResolver.resolveConflicts(results.nalResults, results.lmResults, results.hybridResults);
                results.reasoningPath.push('Conflict resolution completed');
                results.finalDecision = Array.isArray(finalResults) ? finalResults : [];
            } catch (conflictError) {
                results.errorCount++;
                this.logger.error('Error in conflict resolution:', conflictError);
                results.reasoningPath.push('Conflict resolution failed');
                // Use original results if conflict resolution fails
                results.finalDecision = [...results.nalResults, ...results.lmResults, ...results.hybridResults];
            }

            return results;
        } catch (error) {
            this.logger.error('Critical error in hybrid reasoning:', error);
            return {
                nalResults: [],
                lmResults: [],
                hybridResults: [],
                reasoningPath: ['Critical error occurred'],
                finalDecision: [],
                errorCount: 1,
                errorMessage: error.message
            };
        }
    }

    /**
     * Fills a reasoning gap using the appropriate system
     */
    async _fillGap(task, gap, context) {
        return gap.requiresLM
            ? await this._applyLMForGap(task, gap, context)
            : await this._applyNALForGap(task, gap, context);
    }

    /**
     * Validates the input task before reasoning
     */
    _validateTask(task) {
        if (!task) {
            throw new Error('Task cannot be null or undefined');
        }

        if (typeof task !== 'object') {
            throw new Error('Task must be an object');
        }

        if (!task.term) {
            throw new Error('Task must have a term property');
        }

        // Validate truth value if present
        if (task.truth) {
            const {f: frequency, c: confidence} = task.truth;
            if (typeof frequency === 'number' && (frequency < 0 || frequency > 1)) {
                throw new Error(`Invalid frequency value in task: ${frequency}`);
            }

            if (typeof confidence === 'number' && (confidence < 0 || confidence > 1)) {
                throw new Error(`Invalid confidence value in task: ${confidence}`);
            }
        }

        return true;
    }

    /**
     * Applies NAL reasoning to the given task
     */
    async _applyNALReasoning(task, context) {
        if (!this.nalEngine) {
            this.logger.warn('NAL engine not available, returning empty results');
            return [];
        }

        try {
            // Validate the input task
            this._validateTask(task);

            // Apply all applicable NAL rules to the task
            const results = await this.nalEngine.applyRules(task);

            // Validate results before returning
            return Array.isArray(results) ? results : [];
        } catch (error) {
            this.logger.error('Error in NAL reasoning:', error);
            // Return empty array but log more details
            this.logger.debug('Error details:', {
                taskValid: task && task.term ? true : false,
                taskType: typeof task,
                errorMessage: error.message
            });
            return [];
        }
    }

    /**
     * Applies LM reasoning to the given task
     */
    async _applyLMReasoning(task, context) {
        if (!this.lm) {
            this.logger.warn('LM not available, returning empty results');
            return [];
        }

        try {
            // Validate the input task
            this._validateTask(task);

            // Use LM rules if available, otherwise use direct LM processing
            const lmRules = this._getLMReasoningRules();
            if (!Array.isArray(lmRules)) {
                this.logger.warn('LM rules is not an array, returning empty results');
                return [];
            }

            const results = [];
            let ruleProcessingErrors = 0;

            for (const rule of lmRules) {
                if (!rule) {
                    this.logger.warn('Null or undefined rule encountered, skipping');
                    continue;
                }

                try {
                    if (rule.canApply && rule.canApply(task, context)) {
                        const ruleResults = await rule.apply(task, context);
                        if (ruleResults) {
                            const normalizedResults = Array.isArray(ruleResults.results) ? ruleResults.results : [ruleResults];
                            results.push(...normalizedResults);
                        }
                    }
                } catch (ruleError) {
                    ruleProcessingErrors++;
                    this.logger.error('Error applying LM rule:', ruleError);
                    this.logger.debug('Rule error details:', {
                        ruleName: rule.constructor?.name || rule.id || 'unknown rule',
                        ruleType: typeof rule
                    });
                    // Continue processing other rules
                }
            }

            if (ruleProcessingErrors > 0) {
                this.logger.warn(`Processed ${lmRules.length} rules with ${ruleProcessingErrors} errors`);
            }

            return results;
        } catch (error) {
            this.logger.error('Error in LM reasoning:', error);
            this.logger.debug('Error details:', {
                taskValid: task && task.term ? true : false,
                taskType: typeof task,
                errorMessage: error.message
            });
            return [];
        }
    }

    /**
     * Gets available LM reasoning rules
     */
    _getLMReasoningRules() {
        if (!this.nalEngine || !this.nalEngine.lm) return [];

        // In a real implementation, these would be registered LM rules
        // For now, we'll return an empty array and implement specific rules separately
        return this.nalEngine.lm._registeredLMRules || [];
    }

    /**
     * Validates reasoning results before gap detection
     */
    _validateReasoningResults(results, source) {
        if (!Array.isArray(results)) {
            this.logger.warn(`Invalid ${source} results: not an array`);
            return [];
        }

        return results.filter(result => {
            if (!result || typeof result !== 'object') {
                this.logger.warn(`Invalid result object from ${source}: not an object`);
                return false;
            }

            // Validate truth value if present
            if (result.truth) {
                const {c: confidence} = result.truth;
                if (typeof confidence === 'number' && (confidence < 0 || confidence > 1)) {
                    this.logger.warn(`Invalid confidence value in ${source} result: ${confidence}`);
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Detects gaps in reasoning between NAL and LM systems
     */
    _detectReasoningGaps(task, nalResults, lmResults, context) {
        try {
            // Validate input
            this._validateTask(task);

            // Validate reasoning results
            const validNalResults = this._validateReasoningResults(nalResults, 'NAL');
            const validLmResults = this._validateReasoningResults(lmResults, 'LM');

            const gaps = [];

            // Check if NAL reasoning produced low-confidence results
            const lowConfidenceNAL = validNalResults.filter(result =>
                result.truth && typeof result.truth.c === 'number' && result.truth.c < this.config.gapDetectionThreshold
            );

            if (lowConfidenceNAL.length > 0) {
                gaps.push({
                    type: 'low_confidence_nal',
                    requiresLM: true,
                    target: lowConfidenceNAL,
                    description: 'NAL produced low-confidence results'
                });
            }

            // Check if LM reasoning produced low-confidence results
            const lowConfidenceLM = validLmResults.filter(result =>
                result.truth && typeof result.truth.c === 'number' && result.truth.c < this.config.gapDetectionThreshold
            );

            if (lowConfidenceLM.length > 0) {
                gaps.push({
                    type: 'low_confidence_lm',
                    requiresLM: false, // Actually requires NAL validation
                    target: lowConfidenceLM,
                    description: 'LM produced low-confidence results'
                });
            }

            // Check for complex reasoning that might benefit from hybrid approach
            if (task.term?.complexity > 5) { // Complex terms
                gaps.push({
                    type: 'complex_reasoning',
                    requiresLM: true,
                    target: task,
                    description: 'Task requires complex reasoning beyond NAL capabilities'
                });
            }

            // Check if there are no results from either system (but only if both were attempted)
            if (validNalResults.length === 0 && validLmResults.length === 0) {
                gaps.push({
                    type: 'no_results',
                    requiresLM: true,
                    target: task,
                    description: 'Neither system produced results'
                });
            }

            return gaps;
        } catch (error) {
            this.logger.error('Error in gap detection:', error);
            // Return empty array on error to prevent cascading failures
            return [];
        }
    }

    /**
     * Applies LM reasoning to fill identified gaps
     */
    async _applyLMForGap(task, gap, context) {
        if (!this.lm) return [];

        try {
            // Create a targeted prompt based on the gap
            const prompt = this._createGapFillingPrompt(gap, task);

            // Generate response using LM
            const lmResponse = await this.lm.process(prompt, {
                temperature: 0.7,
                maxTokens: 200
            });

            // Process the response (in a real system, this would parse LM output to tasks)
            this.logger.info(`LM filled gap: ${gap.description}`);

            return []; // Placeholder - would convert LM response to tasks in real implementation
        } catch (error) {
            this.logger.error('Error filling gap with LM:', error);
            return [];
        }
    }

    /**
     * Creates a prompt for LM to fill the reasoning gap
     */
    _createGapFillingPrompt(gap, task) {
        switch (gap.type) {
            case 'low_confidence_nal':
                return `The following NAL reasoning produced low-confidence results: ${gap.target.map(r => r.toString()).join(', ')}. Can you provide a better reasoning path or explanation?`;
            case 'complex_reasoning':
                return `The following complex task requires reasoning: ${task.term?.toString() || task.toString()}. Please provide insights or conclusions.`;
            case 'no_results':
                return `The following task has not been resolved: ${task.term?.toString() || task.toString()}. Please provide relevant reasoning or conclusions.`;
            default:
                return `Task: ${task.term?.toString() || task.toString()}. Context: ${JSON.stringify({}).substring(0, 100)}. Please provide reasoning.`;
        }
    }

    /**
     * Applies NAL reasoning to fill identified gaps
     */
    async _applyNALForGap(task, gap, context) {
        if (!this.nalEngine) return [];

        try {
            // Apply more comprehensive NAL reasoning for validation
            this.logger.info(`NAL validating LM result: ${gap.description}`);
            return await this._applyNALReasoning(task, {...context, validationMode: true});
        } catch (error) {
            this.logger.error('Error validating with NAL:', error);
            return [];
        }
    }

    /**
     * Cross-validates results between NAL and LM systems
     */
    async _crossValidate(nalResults, lmResults, context = {}) {
        try {
            // Validate inputs
            if (!Array.isArray(nalResults)) {
                this.logger.warn('NAL results is not an array in cross-validation');
                nalResults = [];
            }

            if (!Array.isArray(lmResults)) {
                this.logger.warn('LM results is not an array in cross-validation');
                lmResults = [];
            }

            const validated = [];

            // Compare NAL and LM results for consistency
            for (const nalResult of nalResults) {
                if (!nalResult || typeof nalResult !== 'object' || !nalResult.term) continue; // Skip invalid results

                for (const lmResult of lmResults) {
                    if (!lmResult || typeof lmResult !== 'object' || !lmResult.term) continue; // Skip invalid results

                    try {
                        const similarity = this._calculateSemanticSimilarity(nalResult, lmResult);

                        if (typeof similarity !== 'number' || isNaN(similarity)) {
                            this.logger.warn('Invalid similarity value calculated');
                            continue;
                        }

                        if (similarity > this.config.confidenceThreshold) {
                            // Results are consistent, boost confidence
                            const enhancedResult = this._boostConsistentResult(nalResult, lmResult);
                            if (enhancedResult) validated.push(enhancedResult);
                        } else {
                            // Results differ, flag for conflict resolution
                            this.logger.debug(`Potential consistency issue detected between NAL and LM results with similarity: ${similarity}`);
                        }
                    } catch (similarityError) {
                        this.logger.error('Error calculating similarity during cross-validation:', similarityError);
                        // Continue with other comparisons
                    }
                }
            }

            return validated;
        } catch (error) {
            this.logger.error('Error in cross-validation:', error);
            // Return empty array on error to prevent system failure
            return [];
        }
    }

    /**
     * Calculates semantic similarity between two results
     */
    _calculateSemanticSimilarity(result1, result2) {
        // Simple term similarity check (in reality, this would be more sophisticated)
        if (result1.term?.id === result2.term?.id) {
            return 1.0; // Same term
        }

        // Check for semantic similarity in term structure
        const commonComplexity = Math.min(result1.term?.complexity || 0, result2.term?.complexity || 0);
        const difference = Math.abs((result1.term?.complexity || 0) - (result2.term?.complexity || 0));

        // Simple similarity calculation (would be more sophisticated in real implementation)
        return commonComplexity > 0 ? (commonComplexity / (commonComplexity + difference)) : 0.1;
    }

    /**
     * Boosts confidence when NAL and LM results are consistent
     */
    _boostConsistentResult(nalResult, lmResult) {
        // Combine truth values when results are consistent
        const combinedTruth = {
            f: ((nalResult.truth?.f || 0.5) + (lmResult.truth?.f || 0.5)) / 2,
            c: Math.min(0.95, (nalResult.truth?.c || 0.5) + (lmResult.truth?.c || 0.5))
        };

        // Return a new task with boosted confidence
        return {
            ...nalResult,
            truth: combinedTruth
        };
    }

    /**
     * Selects the optimal reasoning path based on task characteristics
     */
    selectReasoningPath(task, context = {}) {
        // Factors to consider:
        // - Task complexity
        // - Available knowledge in memory
        // - Task type (question, belief, goal)
        // - Confidence requirements

        const isComplex = task.term?.complexity > 3;
        const isQuestion = task.type === 'QUESTION';
        const isSimple = task.term?.complexity <= 2 && task.term?.isAtomic;

        if (isSimple) {
            return 'nal'; // Use NAL for simple, atomic tasks
        } else if (isQuestion) {
            return 'hybrid'; // Questions often benefit from both systems
        } else if (isComplex) {
            return 'hybrid'; // Complex tasks benefit from combined reasoning
        } else {
            return 'nal'; // Default to NAL for most tasks
        }
    }

    /**
     * Gets hybrid reasoning metrics
     */
    getMetrics() {
        return {
            nalEngine: this.nalEngine ? this.nalEngine.metrics : null,
            lmStats: this.lm ? this.lm.getMetrics() : null,
            feedbackLoopCount: this.feedbackLoops.size,
            conflictResolverStats: this.conflictResolver.getStats()
        };
    }
}