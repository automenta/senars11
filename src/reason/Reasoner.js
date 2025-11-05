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
      backpressureThreshold: config.backpressureThreshold || 100, // number of queued items to trigger backpressure
      backpressureInterval: config.backpressureInterval || 10, // milliseconds to wait when backpressure detected
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
      cpuThrottleCount: 0,
      backpressureEvents: 0,
      lastBackpressureTime: null
    };
    
    // Performance monitoring
    this.performance = {
      throughput: 0, // derivations per second
      avgProcessingTime: 0, // average processing time in ms
      memoryUsage: 0, // in bytes
      backpressureLevel: 0 // indicator of backpressure severity
    };
    
    // Backpressure detection
    this.outputConsumerSpeed = 0; // derivations per second
    this.lastConsumerCheckTime = Date.now();
    this.consumerDerivationCount = 0;
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
        
        // Update performance metrics periodically and adapt processing rate
        if (this.metrics.totalDerivations % 50 === 0) { // Adapt every 50 derivations instead of 100
          this._updatePerformanceMetrics();
          await this._adaptProcessingRate(); // Apply adaptive rate adjustments
        }
        
        // Check for backpressure and apply if needed
        await this._checkAndApplyBackpressure();
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
    
    // Calculate consumer speed if we can measure it
    const now = Date.now();
    if (this.lastConsumerCheckTime) {
      const timeDiff = (now - this.lastConsumerCheckTime) / 1000; // in seconds
      if (timeDiff > 0) {
        this.outputConsumerSpeed = (this.metrics.totalDerivations - this.consumerDerivationCount) / timeDiff;
        this.performance.backpressureLevel = Math.max(0, this.outputConsumerSpeed - this.performance.throughput);
      }
    }
    
    this.lastConsumerCheckTime = now;
    this.consumerDerivationCount = this.metrics.totalDerivations;
  }

  /**
   * Check for backpressure and apply mitigation if needed
   * @private
   */
  async _checkAndApplyBackpressure() {
    // For now, we'll implement a simple approach based on processing speed vs output speed
    // In a real implementation, we might monitor queue sizes, memory usage, etc.
    
    // Calculate if we're producing faster than consuming
    const now = Date.now();
    const timeDiff = now - this.lastConsumerCheckTime;
    
    if (timeDiff > 1000) { // Check once per second
      this._updatePerformanceMetrics();
      
      // Check if backpressure is detected (producing faster than consuming)
      if (this.performance.backpressureLevel > 10) { // arbitrary threshold
        this.metrics.backpressureEvents++;
        this.metrics.lastBackpressureTime = now;
        
        // Apply backpressure by slowing down processing
        await new Promise(resolve => setTimeout(resolve, this.config.backpressureInterval || 10));
      }
      
      this.lastConsumerCheckTime = now;
    }
  }

  /**
   * Adapt processing rate based on current system conditions
   * @private
   */
  async _adaptProcessingRate() {
    // Update performance metrics to get current state
    this._updatePerformanceMetrics();
    
    // Calculate adaptive adjustments based on current conditions
    let adjustmentFactor = 1.0; // 1.0 = no change, <1.0 = slow down, >1.0 = speed up
    
    // Adjust based on backpressure level
    if (this.performance.backpressureLevel > 20) {
      adjustmentFactor = 0.5; // Slow down significantly under high backpressure
    } else if (this.performance.backpressureLevel > 5) {
      adjustmentFactor = 0.8; // Moderate slowdown under moderate backpressure
    } else if (this.performance.backpressureLevel < -5) { // Consumer is faster than producer
      adjustmentFactor = 1.2; // Speed up when we're underutilized
    }
    
    // Adjust CPU throttle based on the adjustment factor
    const baseThrottle = this.config.cpuThrottleInterval || 0;
    const newThrottle = Math.max(0, baseThrottle / adjustmentFactor);
    
    // Apply a gradual adjustment to avoid sudden changes
    const adjustedThrottle = this.config.cpuThrottleInterval * 0.9 + newThrottle * 0.1;
    this.config.cpuThrottleInterval = adjustedThrottle;
    
    // Also adjust backpressure interval based on conditions
    const baseBackpressureInterval = this.config.backpressureInterval || 10;
    this.config.backpressureInterval = Math.max(1, baseBackpressureInterval / adjustmentFactor);
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
      outputConsumerSpeed: this.outputConsumerSpeed,
      ruleProcessorStats: this.ruleProcessor.getStats ? this.ruleProcessor.getStats() : null
    };
  }

  /**
   * Register a consumer feedback handler to receive notifications about derivation consumption
   * @param {function} handler - Function to call with consumption feedback
   */
  registerConsumerFeedbackHandler(handler) {
    if (!this.consumerFeedbackHandlers) {
      this.consumerFeedbackHandlers = [];
    }
    this.consumerFeedbackHandlers.push(handler);
  }

  /**
   * Notify registered handlers about derivation consumption
   * @param {Task} derivation - The derivation that was consumed
   * @param {number} processingTime - Time it took to consume this derivation
   * @param {object} consumerInfo - Information about the consumer
   */
  notifyConsumption(derivation, processingTime, consumerInfo = {}) {
    if (this.consumerFeedbackHandlers && this.consumerFeedbackHandlers.length > 0) {
      for (const handler of this.consumerFeedbackHandlers) {
        try {
          handler(derivation, processingTime, {
            ...consumerInfo,
            timestamp: Date.now(),
            queueLength: this.metrics.totalDerivations - (this.lastProcessedCount || 0)
          });
        } catch (error) {
          console.error('Error in consumer feedback handler:', error);
        }
      }
    }
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
   * Get the current state of the reasoning pipeline
   * @returns {object} State information
   */
  getState() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      metrics: this.getMetrics(),
      components: {
        premiseSource: this.premiseSource.constructor.name,
        strategy: this.strategy.constructor.name,
        ruleProcessor: this.ruleProcessor.constructor.name
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get detailed component status
   * @returns {object} Detailed status information
   */
  getComponentStatus() {
    return {
      premiseSource: this._getComponentStatus(this.premiseSource, 'PremiseSource'),
      strategy: this._getComponentStatus(this.strategy, 'Strategy'),
      ruleProcessor: this._getComponentStatus(this.ruleProcessor, 'RuleProcessor')
    };
  }

  /**
   * Get status of a specific component
   * @param {object} component - The component to get status for
   * @param {string} componentName - Name of the component
   * @returns {object} Component status
   * @private
   */
  _getComponentStatus(component, componentName) {
    const status = {
      name: componentName,
      type: component.constructor.name
    };
    
    // If the component has its own status method, use it
    if (component.getStatus && typeof component.getStatus === 'function') {
      try {
        return { ...status, ...component.getStatus() };
      } catch (e) {
        console.warn(`Error getting ${componentName} status:`, e.message);
        return { ...status, error: e.message };
      }
    }
    
    return status;
  }

  /**
   * Get debugging information
   * @returns {object} Debugging information
   */
  getDebugInfo() {
    return {
      state: this.getState(),
      config: this.config,
      metrics: this.getMetrics(),
      componentStatus: this.getComponentStatus(),
      internalState: {
        hasOutputStream: !!this._outputStream,
        outputStreamType: this._outputStream ? this._outputStream.constructor.name : null
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get pipeline performance metrics
   * @returns {object} Performance metrics
   */
  getPerformanceMetrics() {
    this._updatePerformanceMetrics();
    return {
      ...this.performance,
      detailed: {
        throughput: this.performance.throughput,
        avgProcessingTime: this.performance.avgProcessingTime,
        memoryUsage: this.performance.memoryUsage,
        cpuThrottleCount: this.metrics.cpuThrottleCount
      },
      timestamp: Date.now()
    };
  }

  /**
   * Receive feedback from consumers about pipeline performance
   * @param {object} feedback - Feedback object from consumers
   * @param {number} feedback.processingSpeed - Derivations processed per second by consumer
   * @param {number} feedback.backlogSize - Number of unprocessed derivations in consumer queue
   * @param {string} feedback.consumerId - Identifier for the consumer
   * @param {object} feedback.performanceMetrics - Additional performance metrics from consumer
   */
  receiveConsumerFeedback(feedback) {
    // Update our understanding of consumer needs based on feedback
    if (typeof feedback.processingSpeed === 'number') {
      this.outputConsumerSpeed = feedback.processingSpeed;
    }
    
    if (typeof feedback.backlogSize === 'number') {
      // Adjust our behavior based on consumer backlog
      if (feedback.backlogSize > this.config.backpressureThreshold) {
        // Consumer is falling behind, reduce our production rate
        this.config.cpuThrottleInterval = Math.min(
          this.config.cpuThrottleInterval * 1.5, 
          this.config.cpuThrottleInterval + 5
        );
      } else if (feedback.backlogSize < this.config.backpressureThreshold / 2) {
        // Consumer is doing well, we can increase our production rate
        this.config.cpuThrottleInterval = Math.max(
          this.config.cpuThrottleInterval * 0.9, 
          Math.max(0, this.config.cpuThrottleInterval - 1)
        );
      }
    }
    
    // Update backpressure level based on feedback
    this.performance.backpressureLevel = feedback.backlogSize || 0;
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