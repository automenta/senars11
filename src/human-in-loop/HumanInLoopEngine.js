/**
 * Human-in-the-Loop Engine
 * Implements mechanisms for human cooperation in system evolution
 */
export class HumanInLoopEngine {
    constructor(nar, config = {}) {
        this.nar = nar;
        this.config = {
            enabled: config.enabled !== false,
            feedbackCollectionInterval: config.feedbackCollectionInterval || 30000,
            humanValidationRequired: config.humanValidationRequired !== false,
            collaborationMode: config.collaborationMode || 'adaptive', // 'adaptive', 'active', 'passive'
            feedbackWeight: config.feedbackWeight || 0.7, // How much to weight human feedback vs system metrics
            ...config
        };

        this.isRunning = false;
        this.feedbackCollectionIntervalId = null;
        this.humanFeedbackQueue = [];
        this.humanValidationQueue = [];
        this.collaborationHistory = [];
        this.userPreferences = new Map();
        this.expertRules = new Map(); // Rules provided by human experts
        this.suggestedChanges = new Map(); // System changes humans can approve/reject
        this.validationCallbacks = new Map(); // Callbacks for validation results

        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.nar._eventBus) return;

        // Listen for system events that might need human review
        this.nar._eventBus.on('rule.executed', (data) => {
            this._considerHumanReview('rule_execution', data);
        });

        this.nar._eventBus.on('task.processed', (data) => {
            this._considerHumanReview('task_processing', data);
        });

        this.nar._eventBus.on('concept.created', (data) => {
            this._considerHumanReview('concept_formation', data);
        });

        this.nar._eventBus.on('system.suggestion', (data) => {
            this._handleSystemSuggestion(data);
        });
    }

    start() {
        if (this.isRunning) return false;
        
        this.isRunning = true;
        
        // Start feedback collection if enabled
        if (this.config.feedbackCollectionInterval > 0) {
            this.feedbackCollectionIntervalId = setInterval(() => {
                this._collectAndProcessFeedback();
            }, this.config.feedbackCollectionInterval);
        }
        
        console.log('Human-in-the-loop engine started');
        return true;
    }

    stop() {
        if (!this.isRunning) return false;
        
        if (this.feedbackCollectionIntervalId) {
            clearInterval(this.feedbackCollectionIntervalId);
            this.feedbackCollectionIntervalId = null;
        }
        
        this.isRunning = false;
        console.log('Human-in-the-loop engine stopped');
        return true;
    }

    _considerHumanReview(eventType, eventData) {
        // Determine if human review is needed for this event
        const reviewThresholds = {
            'rule_execution': 0.1, // 10% of rule executions
            'task_processing': 0.05, // 5% of task processing
            'concept_formation': 0.3, // 30% of concept formations
        };

        const threshold = reviewThresholds[eventType] || 0.05;
        
        // Add random factor and importance to determine if review is needed
        const shouldReview = Math.random() < threshold || 
                           this._isEventImportant(eventType, eventData);
        
        if (shouldReview) {
            this._requestHumanReview(eventType, eventData);
        }
    }

    _isEventImportant(eventType, eventData) {
        // Determine if an event is particularly important to review
        switch (eventType) {
            case 'rule_execution':
                // Important if it creates a new concept or has high confidence change
                return eventData.newConceptCreated || 
                       (eventData.truthChange && Math.abs(eventData.truthChange) > 0.5);
                       
            case 'task_processing':
                // Important if it's a complex task or affects many concepts
                return eventData.complexity > 0.7 || 
                       eventData.affectedConcepts > 5;
                       
            case 'concept_formation':
                // Important concept formations (e.g., high-level categories)
                return eventData.isHighLevel || 
                       eventData.stability > 0.8;
                       
            default:
                return false;
        }
    }

    _requestHumanReview(eventType, eventData) {
        // Create a human review request
        const reviewRequest = {
            id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            eventType,
            eventData,
            status: 'pending',
            reviewer: null,
            verdict: null,
            feedback: null
        };

        // Add to validation queue
        this.humanValidationQueue.push(reviewRequest);
        
        // Emit event to UI or external systems
        this.nar._eventBus.emit('human.review.requested', reviewRequest);
        
        console.log(`Human review requested for ${eventType}`);
        
        return reviewRequest;
    }

    _handleSystemSuggestion(suggestion) {
        // Handle system-generated suggestions that need human input
        const suggestionId = `suggestion_${Date.now()}`;
        
        this.suggestedChanges.set(suggestionId, {
            ...suggestion,
            id: suggestionId,
            proposed: Date.now(),
            status: 'awaiting_approval',
            approvals: [],
            rejections: []
        });

        // Notify about the suggestion
        this.nar._eventBus.emit('human.suggestion.proposed', {
            suggestionId,
            ...suggestion
        });
    }

    _collectAndProcessFeedback() {
        // Process any pending human feedback
        if (this.humanFeedbackQueue.length > 0) {
            const feedbackBatch = this.humanFeedbackQueue.splice(0, 10); // Process 10 at a time
            this._processFeedbackBatch(feedbackBatch);
        }
    }

    _processFeedbackBatch(feedbackBatch) {
        for (const feedback of feedbackBatch) {
            this._applyHumanFeedback(feedback);
        }
    }

    _applyHumanFeedback(feedback) {
        // Apply human feedback to adjust system behavior
        this.collaborationHistory.push({
            type: 'feedback_applied',
            feedback,
            timestamp: Date.now()
        });

        // Adjust system parameters based on feedback
        switch (feedback.type) {
            case 'parameter_preference':
                this._adjustParameterBasedOnFeedback(feedback);
                break;
                
            case 'behavior_guidance':
                this._adjustBehaviorBasedOnFeedback(feedback);
                break;
                
            case 'rule_suggestion':
                this._addExpertRule(feedback);
                break;
                
            case 'validation_result':
                this._handleValidationResult(feedback);
                break;
                
            case 'optimization_goal':
                this._updateOptimizationGoals(feedback);
                break;
                
            default:
                console.log(`Unknown feedback type: ${feedback.type}`);
        }

        // Update user preferences if user is identified
        if (feedback.userId) {
            this._updateUserPreferences(feedback.userId, feedback);
        }
    }

    _adjustParameterBasedOnFeedback(feedback) {
        // Adjust system parameters based on human preference
        if (!feedback.parameter || feedback.value === undefined) return;
        
        const adjustment = {
            parameter: feedback.parameter,
            originalValue: this._getParameterValue(feedback.parameter),
            newValue: feedback.value,
            reason: feedback.reason || 'human_preference',
            timestamp: Date.now()
        };
        
        // Apply the adjustment
        this._setParameterValue(feedback.parameter, feedback.value);
        
        // Record the adjustment
        this.collaborationHistory.push({
            type: 'parameter_adjustment',
            adjustment,
            source: 'human_feedback'
        });
    }

    _adjustBehaviorBasedOnFeedback(feedback) {
        // Adjust system behavior based on guidance
        if (!feedback.behavior || !feedback.guidance) return;
        
        switch (feedback.behavior) {
            case 'reasoning_aggressiveness':
                // Adjust how aggressively the system forms new beliefs
                const currentThreshold = this.nar.config.reasoning?.inferenceThreshold || 0.5;
                const newThreshold = currentThreshold + (feedback.guidance === 'more_conservative' ? 0.1 : -0.1);
                this._setParameterValue('reasoning.inferenceThreshold', Math.max(0.1, Math.min(0.9, newThreshold)));
                break;
                
            case 'concept_formation':
                // Adjust concept formation sensitivity
                const currentRatio = this.nar.config.memory?.conceptForgottenRatio || 0.1;
                const newRatio = currentRatio + (feedback.guidance === 'more_concepts' ? -0.05 : 0.05);
                this._setParameterValue('memory.conceptForgottenRatio', Math.max(0.01, Math.min(0.5, newRatio)));
                break;
                
            default:
                console.log(`Unknown behavior to adjust: ${feedback.behavior}`);
        }
    }

    _addExpertRule(feedback) {
        // Add rule suggested by human expert
        if (!feedback.ruleExpression) return;
        
        const rule = {
            id: `expert_rule_${Date.now()}`,
            expression: feedback.ruleExpression,
            source: 'human_expert',
            confidence: feedback.confidence || 0.8,
            timestamp: Date.now(),
            active: true
        };
        
        this.expertRules.set(rule.id, rule);
        
        // Add to rule engine if available
        if (this.nar._ruleEngine && this.nar._ruleEngine.addRule) {
            try {
                this.nar._ruleEngine.addRule(rule);
            } catch (error) {
                console.error('Error adding expert rule:', error);
                rule.active = false;
            }
        }
        
        this.collaborationHistory.push({
            type: 'expert_rule_added',
            rule,
            addedBy: feedback.userId || 'unknown'
        });
    }

    _handleValidationResult(feedback) {
        // Handle validation result for a specific item
        if (!feedback.validatedId) return;
        
        // Look up the validation request
        const validationRequest = this.humanValidationQueue.find(v => v.id === feedback.validatedId);
        if (validationRequest) {
            validationRequest.status = 'completed';
            validationRequest.verdict = feedback.verdict;
            validationRequest.feedback = feedback.comments || null;
            validationRequest.reviewer = feedback.userId || 'anonymous';
            
            // Execute appropriate action based on verdict
            if (feedback.verdict === 'approved') {
                // Continue with the action
                this._executeApprovedAction(validationRequest);
            } else if (feedback.verdict === 'rejected') {
                // Reverse or cancel the action
                this._executeRejectedAction(validationRequest);
            }
            
            // Execute any associated callbacks
            const callback = this.validationCallbacks.get(validationRequest.id);
            if (callback) {
                callback(validationRequest);
                this.validationCallbacks.delete(validationRequest.id);
            }
        }
    }

    _executeApprovedAction(validationRequest) {
        // Execute action when approved
        this.collaborationHistory.push({
            type: 'action_approved',
            request: validationRequest,
            timestamp: Date.now()
        });
    }

    _executeRejectedAction(validationRequest) {
        // Execute action when rejected (e.g., undo the change)
        this.collaborationHistory.push({
            type: 'action_rejected',
            request: validationRequest,
            timestamp: Date.now()
        });
        
        // Potentially reverse the action that was requested
        if (validationRequest.eventData.undoAction) {
            try {
                validationRequest.eventData.undoAction();
            } catch (error) {
                console.error('Error executing undo action:', error);
            }
        }
    }

    _updateOptimizationGoals(feedback) {
        // Update optimization goals based on human priorities
        if (!feedback.goal || !feedback.priority) return;
        
        this.nar._eventBus.emit('optimization.goals.updated', {
            goal: feedback.goal,
            priority: feedback.priority,
            source: 'human_input',
            timestamp: Date.now()
        });
    }

    _updateUserPreferences(userId, feedback) {
        // Update preferences for a specific user
        if (!this.userPreferences.has(userId)) {
            this.userPreferences.set(userId, {
                parameterPreferences: new Map(),
                behaviorPreferences: new Map(),
                interactionHistory: [],
                feedbackCount: 0
            });
        }
        
        const userPrefs = this.userPreferences.get(userId);
        userPrefs.feedbackCount++;
        userPrefs.interactionHistory.push({
            ...feedback,
            timestamp: Date.now()
        });
        
        // Store parameter preferences
        if (feedback.type === 'parameter_preference' && feedback.parameter) {
            userPrefs.parameterPreferences.set(feedback.parameter, feedback.value);
        }
        
        // Store behavior preferences
        if (feedback.type === 'behavior_guidance' && feedback.behavior) {
            userPrefs.behaviorPreferences.set(feedback.behavior, feedback.guidance);
        }
    }

    _getParameterValue(parameterPath) {
        // Helper to get parameter value using dot notation
        return parameterPath.split('.').reduce((current, key) => current && current[key] !== undefined ? current[key] : undefined, this.nar.config.toJSON());
    }

    _setParameterValue(parameterPath, value) {
        // Helper to set parameter value using dot notation
        const config = this.nar.config.toJSON();
        const keys = parameterPath.split('.');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // Update NAR config
        this.nar._config._config = config;
    }

    // Public API for human feedback
    submitFeedback(feedback) {
        feedback.submittedAt = Date.now();
        this.humanFeedbackQueue.push(feedback);
        
        // Emit event for UI or other systems to handle
        this.nar._eventBus.emit('human.feedback.received', feedback);
        
        return { success: true, id: feedback.submittedAt };
    }

    requestHumanValidation(eventData, callback) {
        // Request human validation for specific event data
        const reviewRequest = this._requestHumanReview('general_validation', eventData);
        
        if (callback) {
            this.validationCallbacks.set(reviewRequest.id, callback);
        }
        
        return reviewRequest.id;
    }

    approveSuggestedChange(suggestionId, userId) {
        // Approve a system-suggested change
        const suggestion = this.suggestedChanges.get(suggestionId);
        if (!suggestion) return { success: false, error: 'Suggestion not found' };
        
        suggestion.status = 'approved';
        suggestion.approvals.push({
            userId,
            timestamp: Date.now()
        });
        
        // Apply the suggested change
        this._applySuggestedChange(suggestion);
        
        return { success: true, suggestion };
    }

    rejectSuggestedChange(suggestionId, userId, reason) {
        // Reject a system-suggested change
        const suggestion = this.suggestedChanges.get(suggestionId);
        if (!suggestion) return { success: false, error: 'Suggestion not found' };
        
        suggestion.status = 'rejected';
        suggestion.rejections.push({
            userId,
            reason,
            timestamp: Date.now()
        });
        
        return { success: true, suggestion };
    }

    _applySuggestedChange(suggestion) {
        // Apply an approved system suggestion
        switch (suggestion.type) {
            case 'parameter_tuning':
                this._setParameterValue(suggestion.parameter, suggestion.value);
                break;
            case 'rule_modification':
                if (this.nar._ruleEngine && this.nar._ruleEngine.modifyRule) {
                    this.nar._ruleEngine.modifyRule(suggestion.ruleId, suggestion.modifications);
                }
                break;
            case 'heuristic_adjustment':
                // Apply heuristic adjustment
                break;
            default:
                console.log(`Unknown suggestion type to apply: ${suggestion.type}`);
        }
        
        this.collaborationHistory.push({
            type: 'suggested_change_applied',
            suggestion,
            appliedAt: Date.now()
        });
    }

    addExpertRule(expression, metadata = {}) {
        // Add an expert rule directly (for human experts)
        const rule = {
            id: `expert_rule_${Date.now()}`,
            expression,
            source: 'human_expert',
            confidence: metadata.confidence || 0.9,
            description: metadata.description,
            timestamp: Date.now(),
            active: true
        };
        
        this.expertRules.set(rule.id, rule);
        
        // Add to rule engine if available
        if (this.nar._ruleEngine && this.nar._ruleEngine.addRule) {
            try {
                this.nar._ruleEngine.addRule(rule);
                return { success: true, rule };
            } catch (error) {
                console.error('Error adding expert rule:', error);
                rule.active = false;
                return { success: false, error: error.message, rule };
            }
        }
        
        return { success: true, rule };
    }

    suggestParameterChange(parameter, newValue, reason, userId) {
        // Suggest a parameter change for human review
        const suggestionId = `param_suggestion_${Date.now()}`;
        
        const suggestion = {
            id: suggestionId,
            type: 'parameter_tuning',
            parameter,
            newValue,
            reason,
            suggestedBy: userId || 'system',
            currentValue: this._getParameterValue(parameter),
            timestamp: Date.now(),
            status: 'awaiting_approval',
            approvals: [],
            rejections: []
        };
        
        this.suggestedChanges.set(suggestionId, suggestion);
        
        // Emit event to notify about the suggestion
        this.nar._eventBus.emit('parameter.change.suggested', suggestion);
        
        return suggestionId;
    }

    setCollaborationMode(mode) {
        // Change the collaboration mode
        this.config.collaborationMode = mode;
        
        // Adjust behavior based on mode
        switch (mode) {
            case 'active':
                // Increase human review requests
                break;
            case 'passive':
                // Decrease human review requests
                break;
            case 'adaptive':
                // Use adaptive approach based on system uncertainty
                break;
        }
    }

    getUserPreferences(userId) {
        // Get preferences for a specific user
        return this.userPreferences.get(userId) || null;
    }

    getExpertRules() {
        // Get all expert rules
        return Array.from(this.expertRules.values());
    }

    getCollaborationStatus() {
        // Get overall collaboration status
        return {
            totalFeedback: this.humanFeedbackQueue.length + this.collaborationHistory.filter(h => h.type === 'feedback_applied').length,
            pendingValidations: this.humanValidationQueue.length,
            suggestedChanges: Array.from(this.suggestedChanges.values()),
            expertRulesCount: this.expertRules.size,
            userCount: this.userPreferences.size,
            collaborationMode: this.config.collaborationMode
        };
    }

    // Methods for system evolution collaboration
    async evolveWithHumanGuidance(evolutionType, constraints = {}) {
        // Evolve the system with human guidance
        const evolutionStrategies = {
            'parameter_optimization': async () => this._guidedParameterOptimization(constraints),
            'rule_refinement': async () => this._guidedRuleRefinement(constraints),
            'heuristic_adjustment': async () => this._guidedHeuristicAdjustment(constraints),
            'architecture_modification': async () => this._guidedArchitectureModification(constraints)
        };

        const strategy = evolutionStrategies[evolutionType];
        if (strategy) {
            return await strategy();
        } else {
            throw new Error(`Unknown evolution type: ${evolutionType}`);
        }
    }

    async _guidedParameterOptimization(constraints) {
        // Parameter optimization with human guidance
        const result = {
            type: 'parameter_optimization',
            changes: [],
            humanInput: [],
            timestamp: Date.now()
        };

        // Apply any human-suggested parameter changes first
        for (const [suggestionId, suggestion] of this.suggestedChanges) {
            if (suggestion.type === 'parameter_tuning' && 
                suggestion.status === 'awaiting_approval' && 
                !constraints.excludeHumanSuggestions) {
                
                // Ask for human validation if not already approved
                if (this.config.humanValidationRequired) {
                    const validationId = this.requestHumanValidation({
                        type: 'parameter_change',
                        suggestion: suggestion
                    });
                    
                    // Wait for validation (in a real system, this would be async)
                    result.humanInput.push({validationId, status: 'awaiting'});
                } else {
                    // Apply if validation not required
                    this._setParameterValue(suggestion.parameter, suggestion.newValue);
                    suggestion.status = 'applied';
                    result.changes.push(suggestion);
                }
            }
        }

        return result;
    }

    async _guidedRuleRefinement(constraints) {
        // Rule refinement with human guidance
        const result = {
            type: 'rule_refinement',
            changes: [],
            humanInput: [],
            timestamp: Date.now()
        };

        // Consider expert rules
        for (const [ruleId, rule] of this.expertRules) {
            if (rule.active && !rule.obsolete) {
                result.changes.push({
                    type: 'rule_added',
                    ruleId: rule.id,
                    expression: rule.expression,
                    source: 'human_expert'
                });
            }
        }

        return result;
    }

    async _guidedHeuristicAdjustment(constraints) {
        // Heuristic adjustment with human guidance
        return {
            type: 'heuristic_adjustment',
            changes: [],
            humanInput: [],
            timestamp: Date.now()
        };
    }

    async _guidedArchitectureModification(constraints) {
        // Architecture modification with human guidance
        return {
            type: 'architecture_modification', 
            changes: [],
            humanInput: [],
            timestamp: Date.now()
        };
    }

    // Integration with self-tuning and self-teaching
    integrateWithSelfTuning(selfTuningEngine) {
        // Provide feedback to self-tuning based on human inputs
        if (!selfTuningEngine) return false;

        // Check if the selfTuningEngine has an event system before trying to use it
        if (typeof selfTuningEngine.on === 'function') {
            // Listen to self-tuning suggestions and allow human validation
            selfTuningEngine.on('tuning.suggested', (suggestion) => {
                if (this.config.humanValidationRequired) {
                    this.requestHumanValidation({
                        type: 'tuning_suggestion',
                        suggestion
                    });
                }
            });
        }

        return true;
    }

    integrateWithSelfTeaching(selfTeachingEngine) {
        // Use human feedback to improve self-teaching
        if (!selfTeachingEngine) return false;

        // Check if the selfTeachingEngine has an event system before trying to use it
        if (typeof selfTeachingEngine.on === 'function') {
            // Listen to teaching interactions and collect feedback
            selfTeachingEngine.on('teaching.interaction', (interaction) => {
                // Could be used to improve teaching effectiveness based on human responses
            });
        }

        return true;
    }

    // Methods for UI integration
    getPendingHumanTasks() {
        // Get all pending tasks that require human attention
        return {
            validationRequests: this.humanValidationQueue,
            pendingSuggestions: Array.from(this.suggestedChanges.values()).filter(s => s.status === 'awaiting_approval'),
            feedbackRequests: [] // Could include any feedback requests
        };
    }

    getEvolutionSuggestions() {
        // Get system-generated suggestions for evolution
        const suggestions = [];

        // Suggest parameter optimizations based on performance
        suggestions.push({
            id: 'param_opt_suggestion',
            type: 'optimization',
            category: 'performance',
            description: 'Suggest parameter tuning for better performance',
            priority: 0.8,
            confidence: 0.7,
            actions: [
                { type: 'tune_parameters', target: 'memory', adjustment: 'increase_capacity_if_needed' }
            ]
        });

        return suggestions;
    }
}