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

        // Cross-validate: apply NAL rules to LM results
        for (const lmResult of lmResults) {
            try {
                const nalOnLM = ruleEngine.applyNALRules(lmResult, null, memory);
                
                for (const nalResult of nalOnLM) {
                    const feedbackEvent = {
                        sourceType: 'LM',
                        targetType: 'NAL',
                        sourceResult: lmResult,
                        targetResult: nalResult,
                        timestamp: Date.now()
                    };
                    
                    // Check for agreement or disagreement
                    if (this.resultsAgree(lmResult, nalResult)) {
                        feedbackEvent.type = 'agreement';
                        // Boost confidence for agreeing results
                        const enhancedResult = this.boostTaskConfidence(lmResult, nalResult);
                        enhancedResult._cooperationEnhanced = true;
                        crossValidated.push(enhancedResult);
                    } else {
                        feedbackEvent.type = 'disagreement';
                        // Apply conflict resolution for disagreeing results
                        const resolvedResult = this.resolveResultConflict(lmResult, nalResult);
                        resolvedResult._cooperationEnhanced = true;
                        crossValidated.push(resolvedResult);
                    }
                    
                    feedbackEvents.push(feedbackEvent);
                }
            } catch (error) {
                this.logger.warn('Error applying NAL rules to LM result:', error.message);
                // Still include the original LM result
                crossValidated.push(lmResult);
            }
        }

        // Cross-validate: apply LM rules to NAL results
        for (const nalResult of nalResults) {
            try {
                const lmOnNAL = ruleEngine.applyLMRules(nalResult, null, memory);
                
                for (const lmResult of lmOnNAL) {
                    const feedbackEvent = {
                        sourceType: 'NAL', 
                        targetType: 'LM',
                        sourceResult: nalResult,
                        targetResult: lmResult,
                        timestamp: Date.now()
                    };
                    
                    // Check for agreement or disagreement
                    if (this.resultsAgree(nalResult, lmResult)) {
                        feedbackEvent.type = 'agreement';
                        // Boost confidence for agreeing results
                        const enhancedResult = this.boostTaskConfidence(nalResult, lmResult);
                        enhancedResult._cooperationEnhanced = true;
                        crossValidated.push(enhancedResult);
                    } else {
                        feedbackEvent.type = 'disagreement';
                        // Apply conflict resolution for disagreeing results
                        const resolvedResult = this.resolveResultConflict(nalResult, lmResult);
                        resolvedResult._cooperationEnhanced = true;
                        crossValidated.push(resolvedResult);
                    }
                    
                    feedbackEvents.push(feedbackEvent);
                }
            } catch (error) {
                this.logger.warn('Error applying LM rules to NAL result:', error.message);
                // Still include the original NAL result
                crossValidated.push(nalResult);
            }
        }

        return {
            results: crossValidated,
            feedbackEvents
        };
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
            const similarity = this.truthValueSimilarity(result1.truth, result2.truth);
            return similarity > 0.7; // Consider agreeing if >70% similar
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
        
        if (conf1 >= conf2) {
            // Enhance the higher confidence result slightly if both are reasonable
            if (conf1 > 0.1 && conf2 > 0.1) {
                const enhancedTruth = {
                    f: (result1.truth.f + result2.truth.f) / 2,
                    c: Math.min(0.9, conf1 * 1.1) // Boost slightly but not too much
                };
                return {...result1, truth: enhancedTruth};
            }
            return result1;
        } else {
            if (conf1 > 0.1 && conf2 > 0.1) {
                const enhancedTruth = {
                    f: (result1.truth.f + result2.truth.f) / 2,
                    c: Math.min(0.9, conf2 * 1.1)
                };
                return {...result2, truth: enhancedTruth};
            }
            return result2;
        }
    }

    /**
     * Performs deeper cooperation between rule types
     */
    async performDeeperCooperation(tasks, ruleEngine, memory, termFactory) {
        if (this.config.maxCooperationDepth <= 1) return [];

        const deeperResults = [];
        for (const task of tasks) {
            // Apply both rule types to each task to find more inferences
            const lmMore = ruleEngine.applyLMRules(task, null, memory);
            const nalMore = ruleEngine.applyNALRules(task, null, memory);

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
        if (this.config.confidenceThreshold > 0) {
            return allResults.filter(task =>
                task.truth?.c !== undefined && task.truth.c >= this.config.confidenceThreshold
            );
        }

        return allResults;
    }

    /**
     * Applies feedback between rule types
     * For example: if LM generates a result that NAL validates, boost confidence
     */
    applyCrossTypeFeedback(lmResults, nalResults) {
        const enhancedResults = [];

        // Enhanced feedback with conflict detection and resolution
        for (const lmResult of lmResults) {
            const matchingNalResults = nalResults.filter(nalResult =>
                this.termsMatch(lmResult.term, nalResult.term)
            );

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

        // Process NAL results with LM context
        for (const nalResult of nalResults) {
            const matchingLmResults = lmResults.filter(lmResult =>
                this.termsMatch(nalResult.term, lmResult.term)
            );
            
            const matchingLmResult = matchingLmResults.length > 0 ? matchingLmResults[0] : null;

            if (matchingLmResult) {
                // Already processed above (in LM results), so skip to avoid duplication
                continue;
            } else {
                // Add NAL results that didn't have LM matches (to preserve all reasoning)
                enhancedResults.push(nalResult);
            }
        }

        // Apply advanced conflict resolution for any contradictory results
        return this.resolveConflicts(enhancedResults);
    }

    /**
     * Checks if a reasoning result is valid
     */
    isValidResult(result) {
        if (!result || !result.truth) return false;
        
        const {f: frequency, c: confidence} = result.truth;
        if (frequency === undefined || confidence === undefined) return false;
        
        // Check for valid truth values
        return frequency >= 0 && frequency <= 1 && confidence >= 0 && confidence <= 1;
    }

    /**
     * Filters results that are consistent with the source result
     */
    filterConsistentResults(sourceResult, candidateResults) {
        if (!sourceResult?.truth) return candidateResults;
        
        // For now, consider results consistent if truth values are close
        // A more sophisticated approach would consider other factors
        return candidateResults.filter(candidate => {
            if (!candidate?.truth) return false;
            
            const similarity = this.truthValueSimilarity(sourceResult.truth, candidate.truth);
            return similarity > 0.7; // Consider consistent if >70% similar
        });
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
        const enhancedTruth = {
            f: (baseResult.truth.f + validationResult.truth.f) / 2,
            c: Math.min(0.7, (baseResult.truth.c + validationResult.truth.c) / 2)
        };

        return {
            ...baseResult,
            truth: enhancedTruth
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
            if (!groupedByTerm.has(termKey)) {
                groupedByTerm.set(termKey, []);
            }
            groupedByTerm.get(termKey).push(result);
        });

        const resolvedResults = [];
        for (const [termKey, termResults] of groupedByTerm) {
            if (termResults.length === 1) {
                resolvedResults.push(termResults[0]);
            } else {
                // Multiple results for the same term - resolve conflicts
                const resolved = this.resolveConflictsForTerm(termResults);
                resolvedResults.push(resolved);
            }
        }

        return resolvedResults;
    }

    /**
     * Resolves conflicts between multiple results for the same term
     */
    resolveConflictsForTerm(results) {
        // For now, select the result with highest confidence
        // More sophisticated approaches could consider other factors
        return results.reduce((best, current) => {
            if (!best.truth || !current.truth) return current;
            return (current.truth.c || 0) > (best.truth.c || 0) ? current : best;
        });
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
        const combinedTruth = {
            f: ((task1.truth?.f || 0.5) + (task2.truth?.f || 0.5)) / 2,
            c: Math.min(0.95, (task1.truth?.c || 0.5) + (task2.truth?.c || 0.5))
        };

        return {
            ...task1,
            truth: combinedTruth
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