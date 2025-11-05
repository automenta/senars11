import { Stamp } from '../Stamp.js';

/**
 * RuleProcessor consumes premise pairs and processes them through rules.
 */
export class RuleProcessor {
  /**
   * @param {RuleExecutor} ruleExecutor - The rule executor to use
   * @param {object} config - Configuration options
   */
  constructor(ruleExecutor, config = {}) {
    this.ruleExecutor = ruleExecutor;
    this.config = {
      maxDerivationDepth: config.maxDerivationDepth || 10,
      backpressureThreshold: config.backpressureThreshold || 50, // queue size threshold
      backpressureInterval: config.backpressureInterval || 5, // ms to wait when backpressure detected
      ...config
    };
    
    // Queue for async results
    this.asyncResultsQueue = [];
    this.asyncResultsQueuePromise = null;
    this.asyncResultsQueueResolver = null;
    
    // Track rule execution counts
    this.syncRuleExecutions = 0;
    this.asyncRuleExecutions = 0;
    
    // Track queue stats for backpressure
    this.maxQueueSize = 0;
  }

  /**
   * Process a stream of premise pairs through rules
   * @param {AsyncGenerator<Array<Task>>} premisePairStream - Stream of premise pairs
   * @returns {AsyncGenerator<Task>} - Stream of derived tasks (both sync and async results)
   */
  async *process(premisePairStream) {
    try {
      for await (const [primaryPremise, secondaryPremise] of premisePairStream) {
        // Check for backpressure before processing this premise pair
        await this._checkAndApplyBackpressure();
        
        // Get candidate rules for this premise pair
        const candidateRules = this.ruleExecutor.getCandidateRules(primaryPremise, secondaryPremise);
        
        // Process each rule (both sync and async)
        for (const rule of candidateRules) {
          try {
            // Execute synchronous rules immediately
            if (this._isSynchronousRule(rule)) {
              this.syncRuleExecutions++;
              const results = this.ruleExecutor.executeRule(rule, primaryPremise, secondaryPremise, this.config.context);
              
              // Yield synchronous results immediately
              for (const result of results) {
                const processedResult = this._processDerivation(result);
                if (processedResult) {
                  yield processedResult;
                }
              }
            } else {
              // Dispatch asynchronous rules without awaiting
              this._dispatchAsyncRule(rule, primaryPremise, secondaryPremise);
            }
          } catch (error) {
            console.error(`Error processing rule ${rule.id || rule.name}:`, error);
            // Continue with other rules instead of failing completely
            continue;
          }
        }
        
        // Yield any available async results after processing this premise pair
        while (this.asyncResultsQueue.length > 0) {
          // Check for backpressure before yielding results
          await this._checkAndApplyBackpressure();
          
          yield this.asyncResultsQueue.shift();
        }
      }
      
      // After processing all premise pairs, continue yielding any remaining async results
      // We'll use a timeout-based approach to process remaining async results
      let hasAsyncResults = true;
      let checkCount = 0;
      const maxChecks = 100; // Prevent infinite loops
      
      while (hasAsyncResults && checkCount < maxChecks) {
        hasAsyncResults = false;
        checkCount++;
        
        // Small timeout to allow pending async operations to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Yield any results that became available during the wait
        while (this.asyncResultsQueue.length > 0) {
          hasAsyncResults = true;
          // Check for backpressure before yielding results
          await this._checkAndApplyBackpressure();
          
          yield this.asyncResultsQueue.shift();
        }
      }
    } catch (error) {
      console.error('Error in RuleProcessor process method:', error);
      // Re-throw to allow upstream handling
      throw error;
    }
  }

  /**
   * Check if a rule is synchronous
   * @private
   */
  _isSynchronousRule(rule) {
    // For now, assume rules with 'nal' type are synchronous and others are async
    // This could be expanded based on rule metadata
    return (rule.type || '').toLowerCase().includes('nal');
  }

  /**
   * Dispatch an asynchronous rule
   * @private
   */
  async _dispatchAsyncRule(rule, primaryPremise, secondaryPremise) {
    this.asyncRuleExecutions++;
    try {
      // Execute the async rule
      const results = await rule.applyAsync?.(primaryPremise, secondaryPremise, this.config.context) || 
                     rule.apply?.(primaryPremise, secondaryPremise, this.config.context) || [];
      
      const resultArray = Array.isArray(results) ? results : [results];
      
      // Process each result and add to the queue
      for (const result of resultArray) {
        try {
          const processedResult = this._processDerivation(result);
          if (processedResult) {
            this.asyncResultsQueue.push(processedResult);
            
            // Resolve any waiting promise if one exists
            if (this.asyncResultsQueueResolver) {
              this.asyncResultsQueueResolver();
              this.asyncResultsQueuePromise = null;
              this.asyncResultsQueueResolver = null;
            }
          }
        } catch (resultError) {
          console.error(`Error processing async rule result:`, resultError);
          continue; // Continue with other results
        }
      }
    } catch (error) {
      console.error(`Error in async rule ${rule.id || rule.name}:`, error);
      // Don't rethrow, just log the error and continue
    }
  }

  /**
   * Process a derivation result (apply derivation depth limits, etc.)
   * @private
   */
  _processDerivation(result) {
    try {
      if (!result || !result.stamp) {
        return result;
      }

      // Get the derivation depth from the result's stamp
      const derivationDepth = result.stamp.depth || 0;

      // Check max derivation depth limit
      if (derivationDepth > this.config.maxDerivationDepth) {
        console.debug(`Discarding derivation - exceeds max depth (${derivationDepth} > ${this.config.maxDerivationDepth})`);
        return null; // Discard if exceeds depth limit
      }

      return result;
    } catch (error) {
      console.error('Error in _processDerivation:', error);
      return null; // Discard problematic results
    }
  }

  /**
   * Check for backpressure and apply mitigation if needed
   * @private
   */
  async _checkAndApplyBackpressure() {
    // Track queue size for monitoring
    if (this.asyncResultsQueue.length > this.maxQueueSize) {
      this.maxQueueSize = this.asyncResultsQueue.length;
    }
    
    // Check if queue size exceeds threshold
    if (this.asyncResultsQueue.length > this.config.backpressureThreshold) {
      // Apply backpressure by yielding control to event loop
      await new Promise(resolve => setTimeout(resolve, this.config.backpressureInterval || 5));
    }
  }

  /**
   * Get statistics about rule executions
   */
  getStats() {
    return {
      syncRuleExecutions: this.syncRuleExecutions,
      asyncRuleExecutions: this.asyncRuleExecutions
    };
  }

  /**
   * Get detailed status information
   */
  getStatus() {
    return {
      ruleExecutor: this.ruleExecutor.constructor.name,
      config: this.config,
      stats: this.getStats(),
      internalState: {
        asyncResultsQueueLength: this.asyncResultsQueue.length,
        maxQueueSize: this.maxQueueSize,
        syncRuleExecutions: this.syncRuleExecutions,
        asyncRuleExecutions: this.asyncRuleExecutions
      },
      backpressure: {
        queueLength: this.asyncResultsQueue.length,
        threshold: this.config.backpressureThreshold,
        isApplyingBackpressure: this.asyncResultsQueue.length > this.config.backpressureThreshold
      },
      timestamp: Date.now()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.syncRuleExecutions = 0;
    this.asyncRuleExecutions = 0;
  }
}