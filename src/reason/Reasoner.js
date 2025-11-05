/**
 * The main Reasoner class that manages the continuous reasoning pipeline.
 */
export class Reasoner {
  /**
   * @param {PremiseSource} premiseSource - The source of premises
   * @param {Strategy} strategy - The strategy for premise pairing
   * @param {RuleProcessor} ruleProcessor - The processor for rules
   * @param {object} config - Configuration options
   */
  constructor(premiseSource, strategy, ruleProcessor, config = {}) {
    this.premiseSource = premiseSource;
    this.strategy = strategy;
    this.ruleProcessor = ruleProcessor;
    this.config = {
      maxDerivationDepth: config.maxDerivationDepth || 10,
      cpuThrottleInterval: config.cpuThrottleInterval || 0, // milliseconds to yield CPU
      ...config
    };
    
    this.isRunning = false;
    this._outputStream = null;
    
    // Metrics tracking
    this.metrics = {
      totalDerivations: 0,
      startTime: null,
      lastDerivationTime: null,
      totalProcessingTime: 0,
      cpuThrottleCount: 0
    };
    
    // Performance monitoring
    this.performance = {
      throughput: 0, // derivations per second
      avgProcessingTime: 0, // average processing time in ms
      memoryUsage: 0 // in bytes
    };
  }

  /**
   * Get the output stream of newly derived tasks
   * @returns {AsyncGenerator<Task>}
   */
  get outputStream() {
    if (!this._outputStream) {
      this._outputStream = this._createOutputStream();
    }
    return this._outputStream;
  }

  /**
   * Create the main output stream
   * @private
   */
  async *_createOutputStream() {
    // Get the premise stream from the source
    const premiseStream = this.premiseSource.stream();
    
    // Generate premise pairs using the strategy
    const premisePairStream = this.strategy.generatePremisePairs(premiseStream);
    
    // Process the pairs through rules
    const derivationStream = this.ruleProcessor.process(premisePairStream);
    
    // Yield results from the derivation stream
    for await (const derivation of derivationStream) {
      // Apply CPU throttle if configured
      if (this.config.cpuThrottleInterval > 0) {
        await this._cpuThrottle();
        this.metrics.cpuThrottleCount++;
      }
      
      yield derivation;
    }
  }

  /**
   * Start the continuous reasoning process
   */
  start() {
    if (this.isRunning) {
      console.warn('Reasoner is already running');
      return;
    }
    
    this.isRunning = true;
    this.metrics.startTime = Date.now();
    
    // Start the reasoning pipeline by consuming the output stream
    this._runPipeline();
  }

  /**
   * Stop the continuous reasoning process
   */
  async stop() {
    this.isRunning = false;
    
    // Wait briefly to allow any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Executes a single reasoning step. Useful for debugging and iterative mode.
   */
  async step(timeoutMs = 100) {
    // Get one derivation from the stream with a timeout
    const outputStream = this.outputStream;
    
    // Create a timeout promise
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => resolve({done: true, value: null}), timeoutMs);
    });
    
    // Race between getting a result and the timeout
    const result = await Promise.race([
      outputStream.next(),
      timeoutPromise
    ]);
    
    if (!result.done) {
      return result.value;
    }
    return null;
  }

  /**
   * Apply CPU throttling to prevent blocking the event loop
   * @private
   */
  async _cpuThrottle() {
    if (this.config.cpuThrottleInterval > 0) {
      return new Promise(resolve => setTimeout(resolve, this.config.cpuThrottleInterval));
    }
  }

  /**
   * Run the reasoning pipeline continuously
   * @private
   */
  async _runPipeline() {
    try {
      for await (const derivation of this.outputStream) {
        if (!this.isRunning) {
          break;
        }
        
        // Start timing for this derivation
        const startTime = Date.now();
        
        // Process the derivation (can be extended to do additional work)
        this._processDerivation(derivation);
        
        // Update metrics
        this._updateMetrics(startTime);
        
        // Update performance metrics periodically
        if (this.metrics.totalDerivations % 100 === 0) {
          this._updatePerformanceMetrics();
        }
      }
    } catch (error) {
      console.error('Error in reasoning pipeline:', error);
    } finally {
      this.isRunning = false;
      
      // Final metrics update
      this._updatePerformanceMetrics();
    }
  }

  /**
   * Update metrics after processing a derivation
   * @private
   */
  _updateMetrics(startTime) {
    this.metrics.totalDerivations++;
    this.metrics.lastDerivationTime = Date.now();
    
    const processingTime = this.metrics.lastDerivationTime - startTime;
    this.metrics.totalProcessingTime += processingTime;
  }

  /**
   * Update performance metrics based on current state
   * @private
   */
  _updatePerformanceMetrics() {
    if (this.metrics.startTime && this.metrics.totalDerivations > 0) {
      const elapsed = (this.metrics.lastDerivationTime - this.metrics.startTime) / 1000; // in seconds
      this.performance.throughput = elapsed > 0 ? this.metrics.totalDerivations / elapsed : 0;
      
      this.performance.avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.totalDerivations;
    }
    
    // Monitor memory usage if available (Node.js specific)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.performance.memoryUsage = memUsage.heapUsed;
    }
  }

  /**
   * Process a derivation (can be extended)
   * @private
   */
  _processDerivation(derivation) {
    // Can implement additional processing of derivations
    // For example: storing in memory, logging, etc.
  }

  /**
   * Get current metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    this._updatePerformanceMetrics();
    return {
      ...this.metrics,
      ...this.performance,
      ruleProcessorStats: this.ruleProcessor.getStats ? this.ruleProcessor.getStats() : null
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      totalDerivations: 0,
      startTime: this.isRunning ? Date.now() : null,
      lastDerivationTime: null,
      totalProcessingTime: 0,
      cpuThrottleCount: 0
    };
    
    this.performance = {
      throughput: 0,
      avgProcessingTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.stop();
    this._outputStream = null;
    this.resetMetrics();
  }
}