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
    
    // Queue for async results - using array with index for efficient removal from front
    this.asyncResultsQueue = [];
    this.asyncResultsQueueStart = 0; // Track start index to avoid shifting
    
    // Track rule execution counts
    this.syncRuleExecutions = 0;
    this.asyncRuleExecutions = 0;
    
    // Track queue stats for backpressure
    this.maxQueueSize = 0;
  }

  /**
   * Process a stream of premise pairs through rules
   * @param {AsyncGenerator<Array<Task>>} premisePairStream - Stream of premise pairs
   * @param {number} timeoutMs - Maximum time to spend processing (0 for no timeout)
   * @returns {AsyncGenerator<Task>} - Stream of derived tasks (both sync and async results)
   */
  async *process(premisePairStream, timeoutMs = 0) {
    const startTime = Date.now();
    try {
      for await (const [primaryPremise, secondaryPremise] of premisePairStream) {
        // Check for timeout
        if (timeoutMs > 0 && (Date.now() - startTime) > timeoutMs) {
          console.debug(`RuleProcessor: timeout reached after ${timeoutMs}ms`);
          break;
        }
        
        // Check for backpressure before processing this premise pair
        await this._checkAndApplyBackpressure();
        
        // Get candidate rules for this premise pair
        const candidateRules = this.ruleExecutor.getCandidateRules(primaryPremise, secondaryPremise);
        
        // Process each rule (both sync and async)
        for (const rule of candidateRules) {
          // Check for timeout again inside the inner loop
          if (timeoutMs > 0 && (Date.now() - startTime) > timeoutMs) {
            console.debug(`RuleProcessor: timeout reached after ${timeoutMs}ms`);
            break;
          }
          
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
        yield* this._yieldAsyncResults();
      }
      
      // After processing all premise pairs, continue yielding any remaining async results
      let checkCount = 0;
      const initialRemainingTime = timeoutMs > 0 ? timeoutMs - (Date.now() - startTime) : 0;
      
      while (checkCount < this.config.maxChecks && (timeoutMs === 0 || initialRemainingTime > 0)) {
        // Check timeout
        if (timeoutMs > 0 && (Date.now() - startTime) > timeoutMs) {
          console.debug(`RuleProcessor: timeout reached after ${timeoutMs}ms (in async results loop)`);
          break;
        }
        
        checkCount++;
        
        // Small timeout to allow pending async operations to complete
        await sleep(this.config.asyncWaitInterval);
        
        // Yield any results that became available during the wait
        const asyncResultsAvailable = this._getAsyncResultsCount() > 0;
        if (asyncResultsAvailable) {
          yield* this._yieldAsyncResults();
        } else if (checkCount >= this.config.maxChecks) {
          // No more results expected, exit early
          break;
        }
      }
    } catch (error) {
      logError(error, { context: 'rule_processor_stream' });
      // Re-throw to allow upstream handling
      throw new ReasonerError(`Error in RuleProcessor process: ${error.message}`, 'STREAM_ERROR', { originalError: error });
    }
  }

  /**
   * Yield all available async results with backpressure checks
   * @private
   */
  async *_yieldAsyncResults() {
    // Process and yield all current async results
    while (this._getAsyncResultsCount() > 0) {
      // Check for backpressure before yielding results
      await this._checkAndApplyBackpressure();
      
      yield this._dequeueAsyncResult();
    }
  }

  /**
   * Get the current count of async results in the queue
   * @returns {number} Count of items in the queue
   * @private
   */
  _getAsyncResultsCount() {
    return this.asyncResultsQueue.length - this.asyncResultsQueueStart;
  }

  /**
   * Dequeue an async result from the front of the queue
   * @returns {any} The dequeued result or undefined if empty
   * @private
   */
  _dequeueAsyncResult() {
    if (this.asyncResultsQueueStart >= this.asyncResultsQueue.length) {
      // Clean up the array if we've consumed most of it
      if (this.asyncResultsQueue.length > 100) {
        this.asyncResultsQueue = this.asyncResultsQueue.slice(this.asyncResultsQueueStart);
        this.asyncResultsQueueStart = 0;
      }
      return undefined;
    }
    
    const result = this.asyncResultsQueue[this.asyncResultsQueueStart];
    this.asyncResultsQueueStart++;
    return result;
  }

  /**
   * Add an async result to the queue
   * @param {any} result - The result to add
   * @private
   */
  _enqueueAsyncResult(result) {
    this.asyncResultsQueue.push(result);
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
          this._enqueueAsyncResult(processedResult);
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
    // Track queue size for monitoring - using actual count instead of array length
    const currentQueueSize = this._getAsyncResultsCount();
    this.maxQueueSize = Math.max(this.maxQueueSize, currentQueueSize);
    
    // Check if queue size exceeds threshold
    if (currentQueueSize > this.config.backpressureThreshold) {
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
    const currentQueueSize = this._getAsyncResultsCount();
    return {
      ruleExecutor: this.ruleExecutor.constructor.name,
      config: this.config,
      stats: this.getStats(),
      internalState: {
        asyncResultsQueueLength: currentQueueSize,
        maxQueueSize: this.maxQueueSize,
        syncRuleExecutions: this.syncRuleExecutions,
        asyncRuleExecutions: this.asyncRuleExecutions
      },
      backpressure: {
        queueLength: currentQueueSize,
        threshold: this.config.backpressureThreshold,
        isApplyingBackpressure: currentQueueSize > this.config.backpressureThreshold
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