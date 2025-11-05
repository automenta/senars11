import { sleep, mergeConfig } from './utils/common.js';
import { ReasonerError, logError } from './utils/error.js';

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
    
    // Use utility to merge configuration properly
    this.config = mergeConfig({
      maxDerivationDepth: 10,
      backpressureThreshold: 50, // queue size threshold
      backpressureInterval: 5, // ms to wait when backpressure detected
      maxChecks: 100, // Prevent infinite loops when waiting for async results
      asyncWaitInterval: 10, // ms to wait between checking for async results
      termFactory: null // Default to null, will be provided by parent
    }, config);
    
    // Queue for async results
    this.asyncResultsQueue = [];
    
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
              // Pass an enhanced context that includes termFactory if available from parent NAR
              const ruleContext = {
                termFactory: this.config.termFactory ?? this.config.context?.termFactory ?? null,
                ...this.config.context  // Pass through any other context properties
              };
              const results = this.ruleExecutor.executeRule(rule, primaryPremise, secondaryPremise, ruleContext);
              
              // Yield synchronous results immediately using for...of for better performance
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
            logError(error, { 
              ruleId: rule.id ?? rule.name, 
              context: 'rule_processing' 
            }, 'warn');
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
      let hasAsyncResults = true;
      let checkCount = 0;
      
      while (hasAsyncResults && checkCount < this.config.maxChecks) {
        hasAsyncResults = false;
        checkCount++;
        
        // Small timeout to allow pending async operations to complete
        await sleep(this.config.asyncWaitInterval);
        
        // Yield any results that became available during the wait
        let result;
        while ((result = this.asyncResultsQueue.shift()) !== undefined) {
          hasAsyncResults = true;
          // Check for backpressure before yielding results
          await this._checkAndApplyBackpressure();
          
          yield result;
        }
      }
    } catch (error) {
      logError(error, { context: 'rule_processor_stream' });
      // Re-throw to allow upstream handling
      throw new ReasonerError(`Error in RuleProcessor process: ${error.message}`, 'STREAM_ERROR', { originalError: error });
    }
  }

  /**
   * Check if a rule is synchronous
   * @private
   */
  _isSynchronousRule(rule) {
    // For now, assume rules with 'nal' type are synchronous and others are async
    // This could be expanded based on rule metadata
    return (rule.type ?? '').toLowerCase().includes('nal');
  }

  /**
   * Dispatch an asynchronous rule
   * @private
   */
  _dispatchAsyncRule(rule, primaryPremise, secondaryPremise) {
    this.asyncRuleExecutions++;
    
    // Execute the async rule in the background without awaiting
    this._executeAsyncRule(rule, primaryPremise, secondaryPremise)
      .catch(error => {
        logError(error, { ruleId: rule.id ?? rule.name, context: 'async_rule_execution' }, 'error');
      });
  }
  
  /**
   * Execute an asynchronous rule and add results to queue
   * @private
   */
  async _executeAsyncRule(rule, primaryPremise, secondaryPremise) {
    try {
      // Execute the async rule
      const results = await (rule.applyAsync?.(primaryPremise, secondaryPremise, this.config.context) ?? 
                     rule.apply?.(primaryPremise, secondaryPremise, this.config.context)) ?? [];
      
      const resultArray = Array.isArray(results) ? results : [results];
      
      // Process each result and add to the queue
      for (const result of resultArray) {
        const processedResult = this._processDerivation(result);
        if (processedResult) {
          this.asyncResultsQueue.push(processedResult);
        }
      }
    } catch (error) {
      logError(error, { ruleId: rule.id ?? rule.name, context: 'async_rule_execution' }, 'error');
      // Don't re-throw, just log - errors shouldn't break the async execution chain
    }
  }

  /**
   * Process a derivation result (apply derivation depth limits, etc.)
   * @private
   */
  _processDerivation(result) {
    try {
      if (!result?.stamp) {
        return result;
      }

      // Get the derivation depth from the result's stamp
      const derivationDepth = result.stamp.depth ?? 0;

      // Check max derivation depth limit
      if (derivationDepth > this.config.maxDerivationDepth) {
        console.debug(`Discarding derivation - exceeds max depth (${derivationDepth} > ${this.config.maxDerivationDepth})`);
        return null; // Discard if exceeds depth limit
      }

      return result;
    } catch (error) {
      logError(error, { context: 'derivation_processing' }, 'error');
      return null; // Discard problematic results
    }
  }

  /**
   * Check for backpressure and apply mitigation if needed
   * @private
   */
  async _checkAndApplyBackpressure() {
    // Track queue size for monitoring
    this.maxQueueSize = Math.max(this.maxQueueSize, this.asyncResultsQueue.length);
    
    // Check if queue size exceeds threshold
    if (this.asyncResultsQueue.length > this.config.backpressureThreshold) {
      // Apply backpressure by yielding control to event loop
      await sleep(this.config.backpressureInterval);
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