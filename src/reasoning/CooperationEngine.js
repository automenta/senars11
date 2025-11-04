import {Logger} from '../util/Logger.js';

/**
 * CooperationEngine: A modular component that handles cooperation between different rule types
 * This extracts the cooperation logic from CoordinatedReasoningStrategy for better reusability
 */
export class CooperationEngine {
    constructor(config = {}) {
        this.config = {
            crossValidationEnabled: config.crossValidationEnabled !== false,
            feedbackEnabled: config.feedbackEnabled !== false,
            confidenceThreshold: config.confidenceThreshold || 0.1,
            maxCooperationDepth: config.maxCooperationDepth || 2,
            ...config
        };
        this.logger = Logger;
        this.feedbackRegistry = new Map(); // Tracks feedback between rule types
    }

    /**
     * Performs cooperative reasoning where LM and NAL rules enhance each other
     */
    async performCooperativeReasoning(initialTask, ruleEngine, memory, termFactory) {
        const results = {
            initialTask,
            lmGenerated: [],
            nalGenerated: [],
            crossValidated: [],
            feedbackEvents: [],
            finalResults: []
        };

        try {
            // Step 1: Apply LM rules to initial task
            const lmResults = ruleEngine.applyLMRules(initialTask, null, memory);
            results.lmGenerated = [...lmResults];

            // Log LM processing event
            if (this.logger) {
                this.logger.debug(`LM processing completed for task, generated ${lmResults.length} results`);
            }

            // Step 2: Apply NAL rules to initial task
            const nalResults = ruleEngine.applyNALRules(initialTask, null, memory);
            results.nalGenerated = [...nalResults];

            // Log NAL processing event
            if (this.logger) {
                this.logger.debug(`NAL processing completed for task, generated ${nalResults.length} results`);
            }

            // Step 3: Cross-validation with enhanced validation and feedback
            if (this.config.crossValidationEnabled) {
                const crossValidationResults = await this.performEnhancedCrossValidation(
                    lmResults,
                    nalResults,
                    ruleEngine,
                    memory
                );

                results.crossValidated = [...crossValidationResults.results];
                results.feedbackEvents.push(...crossValidationResults.feedbackEvents);
            }

            // Step 4: Apply deeper cooperation if enabled with validation
            if (this.config.maxCooperationDepth > 1) {
                const deeperResults = await this.performDeeperCooperation(
                    [...lmResults, ...nalResults, ...results.crossValidated],
                    ruleEngine,
                    memory,
                    termFactory
                );
                results.crossValidated.push(...deeperResults);
            }

            // Step 5: Apply feedback mechanisms to enhance cooperation
            const feedbackEnhancedResults = this.applyCrossTypeFeedback(
                [...results.lmGenerated, ...results.crossValidated.filter(r => r._ruleType === 'LM')],
                [...results.nalGenerated, ...results.crossValidated.filter(r => r._ruleType === 'NAL')]
            );

            // Step 6: Combine and filter results with enhanced validation
            results.finalResults = this.combineAndFilterResults(
                {
                    ...results,
                    crossValidated: feedbackEnhancedResults
                },
                memory
            );

        } catch (error) {
            // In case of error, still try to return best effort results
            this.logger.error('Error in cooperative reasoning:', error);

            // Combine all generated results as fallback
            results.finalResults = [
                ...results.lmGenerated,
                ...results.nalGenerated,
                ...results.crossValidated
            ];
        }

        return results;
    }

    /**
     * Performs enhanced cross-validation with detailed feedback tracking
     */
    async performEnhancedCrossValidation(lmResults, nalResults, ruleEngine, memory) {
        const crossValidated = [];
        const feedbackEvents = [];

        // Process LM results with NAL validation
        await this._processCrossValidation(lmResults, nalResults, ruleEngine, memory, 'LM', 'NAL', crossValidated, feedbackEvents);
        
        // Process NAL results with LM validation
        await this._processCrossValidation(nalResults, lmResults, ruleEngine, memory, 'NAL', 'LM', crossValidated, feedbackEvents);

        return { results: crossValidated, feedbackEvents };
    }
    
    /**
     * Helper method to process cross-validation between rule types
     */
    async _processCrossValidation(sourceResults, targetResults, ruleEngine, memory, sourceType, targetType, crossValidated, feedbackEvents) {
        for (const sourceResult of sourceResults) {
            try {
                const targetOnSource = sourceType === 'LM' 
                    ? ruleEngine.applyNALRules(sourceResult, null, memory)
                    : ruleEngine.applyLMRules(sourceResult, null, memory);

                for (const targetResult of targetOnSource) {
                    const feedbackEvent = {
                        sourceType,
                        targetType,
                        sourceResult,
                        targetResult,
                        timestamp: Date.now()
                    };

                    // Check for agreement or disagreement
                    if (this.resultsAgree(sourceResult, targetResult)) {
                        feedbackEvent.type = 'agreement';
                        // Boost confidence for agreeing results
                        const enhancedResult = this.boostTaskConfidence(sourceResult, targetResult);
                        enhancedResult._cooperationEnhanced = true;
                        crossValidated.push(enhancedResult);
                    } else {
                        feedbackEvent.type = 'disagreement';
                        // Apply conflict resolution for disagreeing results
                        const resolvedResult = this.resolveResultConflict(sourceResult, targetResult);
                        resolvedResult._cooperationEnhanced = true;
                        crossValidated.push(resolvedResult);
                    }

                    feedbackEvents.push(feedbackEvent);
                }
            } catch (error) {
                this.logger.warn(`Error applying ${targetType} rules to ${sourceType} result:`, error.message);
                // Still include the original source result
                crossValidated.push(sourceResult);
            }
        }
    }

    /**
     * Checks if two results agree
     */
    resultsAgree(result1, result2) {
        if (!result1.term || !result2.term) return false;

        // Check if terms match
        const termsMatch = this.termsMatch(result1.term, result2.term);
        if (!termsMatch) return false;

        // If terms match, check truth value similarity
        if (result1.truth && result2.truth) {
            return this.truthValueSimilarity(result1.truth, result2.truth) > 0.7; // Consider agreeing if >70% similar
        }

        // If no truth values, consider as agreement
        return true;
    }

    /**
     * Resolves conflicts between two disagreeing results
     */
    resolveResultConflict(result1, result2) {
        // Prefer result with higher confidence
        const conf1 = result1.truth?.c || 0;
        const conf2 = result2.truth?.c || 0;

        const higherResult = conf1 >= conf2 ? result1 : result2;
        const lowerResult = conf1 >= conf2 ? result2 : result1;
        
        // Enhance the higher confidence result slightly if both are reasonable
        return conf1 > 0.1 && conf2 > 0.1
            ? { ...higherResult, truth: { 
                f: (result1.truth.f + result2.truth.f) / 2,
                c: Math.min(0.9, (conf1 >= conf2 ? conf1 : conf2) * 1.1) // Boost slightly but not too much
            }}
            : higherResult;
    }

    /**
     * Performs deeper cooperation between rule types
     */
    async performDeeperCooperation(tasks, ruleEngine, memory, termFactory) {
        if (this.config.maxCooperationDepth <= 1) return [];

        const deeperResults = [];
        for (const task of tasks) {
            // Apply both rule types to each task to find more inferences
            const [lmMore, nalMore] = [
                ruleEngine.applyLMRules(task, null, memory),
                ruleEngine.applyNALRules(task, null, memory)
            ];

            deeperResults.push(...lmMore, ...nalMore);

            // If we have more cooperation depth, continue the process
            if (this.config.maxCooperationDepth > 2) {
                const evenDeeper = await this.performDeeperCooperation(
                    [...lmMore, ...nalMore],
                    ruleEngine,
                    memory,
                    termFactory
                );
                deeperResults.push(...evenDeeper);
            }
        }

        return deeperResults;
    }

    /**
     * Combines and filters results based on configuration
     */
    combineAndFilterResults(results, memory) {
        const allResults = [
            ...results.lmGenerated,
            ...results.nalGenerated,
            ...results.crossValidated
        ];

        // Filter by confidence threshold if configured
        return this.config.confidenceThreshold > 0
            ? allResults.filter(task => task.truth?.c !== undefined && task.truth.c >= this.config.confidenceThreshold)
            : allResults;
    }

    /**
     * Applies feedback between rule types
     * For example: if LM generates a result that NAL validates, boost confidence
     */
    applyCrossTypeFeedback(lmResults, nalResults) {
        const enhancedResults = [];

        // Enhanced feedback with conflict detection and resolution
        for (const lmResult of lmResults) {
            const matchingNalResults = nalResults.filter(nalResult => this.termsMatch(lmResult.term, nalResult.term));

            if (matchingNalResults.length > 0) {
                // Multiple matches possible, so we need to handle conflicts
                const validMatches = matchingNalResults.filter(nalResult => this.isValidResult(nalResult));

                if (validMatches.length > 0) {
                    // Check for consistency and potential conflicts
                    const consistentMatches = this.filterConsistentResults(lmResult, validMatches);

                    if (consistentMatches.length > 0) {
                        // Results are consistent - boost confidence due to cross-validation
                        const enhancedTask = this.boostTaskConfidence(lmResult, consistentMatches[0]);
                        enhancedResults.push(enhancedTask);
                        // Record feedback event
                        this.recordFeedbackEvent(lmResult, consistentMatches[0], 'cross_validation');
                    } else {
                        // Results are contradictory but consistent in meaning - apply cautious enhancement
                        const cautiousTask = this.applyCautiousEnhancement(lmResult, matchingNalResults[0]);
                        enhancedResults.push(cautiousTask);
                        this.recordFeedbackEvent(lmResult, matchingNalResults[0], 'cross_validation_cautionary');
                    }
                } else {
                    // Add the LM result with a note about lack of NAL validation
                    enhancedResults.push(lmResult);
                }
            } else {
                // No matching NAL result, keep original LM result
                enhancedResults.push(lmResult);
            }
        }

        // Process NAL results that didn't have LM matches (to preserve all reasoning)
        enhancedResults.push(...nalResults.filter(nalResult => 
            !lmResults.some(lmResult => this.termsMatch(nalResult.term, lmResult.term))
        ));

        // Apply advanced conflict resolution for any contradictory results
        return this.resolveConflicts(enhancedResults);
    }

    /**
     * Checks if a reasoning result is valid
     */
    isValidResult(result) {
        if (!result || !result.truth) return false;

        const {f: frequency, c: confidence} = result.truth;
        // Check for valid truth values
        return frequency !== undefined && confidence !== undefined && 
               frequency >= 0 && frequency <= 1 && confidence >= 0 && confidence <= 1;
    }

    /**
     * Filters results that are consistent with the source result
     */
    filterConsistentResults(sourceResult, candidateResults) {
        if (!sourceResult?.truth) return candidateResults;

        // For now, consider results consistent if truth values are close
        // A more sophisticated approach would consider other factors
        return candidateResults.filter(candidate => 
            candidate?.truth && this.truthValueSimilarity(sourceResult.truth, candidate.truth) > 0.7 // Consider consistent if >70% similar
        );
    }

    /**
     * Calculates similarity between truth values
     */
    truthValueSimilarity(truth1, truth2) {
        const freqDiff = Math.abs((truth1.f || 0.5) - (truth2.f || 0.5));
        const confDiff = Math.abs((truth1.c || 0.5) - (truth2.c || 0.5));

        // Average the inverse of differences (higher similarity = lower difference)
        return 1 - ((freqDiff + confDiff) / 2);
    }

    /**
     * Applies cautious enhancement when results are found but have inconsistencies
     */
    applyCautiousEnhancement(baseResult, validationResult) {
        // Apply minimal confidence boost for cautious enhancement
        return {
            ...baseResult,
            truth: {
                f: (baseResult.truth.f + validationResult.truth.f) / 2,
                c: Math.min(0.7, (baseResult.truth.c + validationResult.truth.c) / 2)
            }
        };
    }

    /**
     * Resolves conflicts between contradictory results
     */
    resolveConflicts(results) {
        if (results.length <= 1) return results;

        // Group results by term to identify potential conflicts
        const groupedByTerm = new Map();
        results.forEach(result => {
            const termKey = result.term ? result.term.toString() : 'unknown';
            (groupedByTerm.get(termKey) || groupedByTerm.set(termKey, []).get(termKey)).push(result);
        });

        const resolvedResults = [];
        for (const [termKey, termResults] of groupedByTerm) {
            resolvedResults.push(termResults.length === 1 ? termResults[0] : this.resolveConflictsForTerm(termResults));
        }

        return resolvedResults;
    }

    /**
     * Resolves conflicts between multiple results for the same term
     */
    resolveConflictsForTerm(results) {
        // For now, select the result with highest confidence
        // More sophisticated approaches could consider other factors
        return results.reduce((best, current) => 
            (!best.truth || !current.truth) ? current : 
            ((current.truth.c || 0) > (best.truth.c || 0) ? current : best)
        );
    }

    /**
     * Records a feedback event between rule types
     */
    recordFeedbackEvent(result1, result2, type) {
        const feedbackId = `${result1.term?.id || 'unknown'}_${result2.term?.id || 'unknown'}_${Date.now()}`;
        this.feedbackRegistry.set(feedbackId, {
            timestamp: Date.now(),
            type,
            result1,
            result2,
            enhanced: true
        });
    }

    /**
     * Checks if two terms match semantically
     */
    termsMatch(term1, term2) {
        if (!term1 || !term2) return false;
        //return term1.equals(term2);
        return term1.toString() === term2.toString();
    }

    /**
     * Boosts the confidence of a task based on cross-validation
     */
    boostTaskConfidence(task1, task2) {
        return {
            ...task1,
            truth: {
                f: ((task1.truth?.f || 0.5) + (task2.truth?.f || 0.5)) / 2,
                c: Math.min(0.95, (task1.truth?.c || 0.5) + (task2.truth?.c || 0.5))
            }
        };
    }

    /**
     * Gets feedback statistics
     */
    getFeedbackStats() {
        return {
            totalFeedbackEvents: this.feedbackRegistry.size,
            feedbackTypes: this.getFeedbackTypeCounts(),
            recentFeedback: Array.from(this.feedbackRegistry.values()).slice(-10)
        };
    }

    /**
     * Gets counts by feedback type
     */
    getFeedbackTypeCounts() {
        const counts = {};
        for (const feedback of this.feedbackRegistry.values()) {
            counts[feedback.type] = (counts[feedback.type] || 0) + 1;
        }
        return counts;
    }

    /**
     * Clears feedback history
     */
    clearFeedbackHistory() {
        this.feedbackRegistry.clear();
    }
}