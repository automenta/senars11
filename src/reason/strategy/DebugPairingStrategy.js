/**
 * A debug strategy that systematically pairs all tasks in the focus for syllogistic reasoning
 */
export class DebugPairingStrategy {
  /**
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      maxSecondaryPremises: config.maxSecondaryPremises || 20,  // Allow more secondary premises
      maxCombinationsPerStep: config.maxCombinationsPerStep || 100,  // Max pairs to try per step
      ...config
    };
    
    // Store the focus or memory reference if provided in config
    this.focus = config.focus || null;
    this.memory = config.memory || null;
  }

  /**
   * Generate premise pairs from a stream of primary premises
   * In this debug strategy, we'll generate all possible pairs from focus
   * @param {AsyncGenerator<Task>} premiseStream - Stream of primary premises
   * @returns {AsyncGenerator<Array<Task>>} - Stream of premise pairs [primary, secondary]
   */
  async *generatePremisePairs(premiseStream) {
    try {
      for await (const primaryPremise of premiseStream) {
        try {
          // Get all tasks from the focus that could pair with the primary premise
          const allTasks = this._getAllTasks();
          
          // Create pairs with all other tasks in the focus
          let pairCount = 0;
          for (const secondaryTask of allTasks) {
            if (pairCount >= this.config.maxCombinationsPerStep) {
              break;
            }
            
            if (secondaryTask !== primaryPremise) {
              console.log(`DEBUG: Creating pair: ${primaryPremise.term?.toString?.()} + ${secondaryTask.term?.toString?.()}`);
              yield [primaryPremise, secondaryTask];
              pairCount++;
            }
          }
        } catch (error) {
          console.error('Error processing primary premise in DebugPairingStrategy:', error);
          // Continue to next premise rather than failing completely
          continue;
        }
      }
    } catch (error) {
      console.error('Error in DebugPairingStrategy generatePremisePairs:', error);
      // Re-throw to allow upstream handling
      throw error;
    }
  }

  /**
   * Systematically select secondary premises for a given primary premise
   * This method will be used when the original selectSecondaryPremises is called
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of secondary premises
   */
  async selectSecondaryPremises(primaryPremise) {
    try {
      // Get all tasks from focus to pair with the primary premise
      const allTasks = this._getAllTasks();
      
      // Filter tasks to find those that could be meaningfully paired with the primary premise
      const validSecondaryTasks = allTasks.filter(task => 
        task && 
        task !== primaryPremise &&  // Don't pair a task with itself
        task.term &&  // Has a valid term
        task.term !== primaryPremise.term  // Different terms
      );
      
      console.log(`DEBUG: Found ${validSecondaryTasks.length} tasks to pair with ${primaryPremise.term?.toString?.()}`);
      for (const task of validSecondaryTasks) {
        console.log(`  - Pair with: ${task.term?.toString?.()}`);
      }
      
      // Limit to maxSecondaryPremises if specified
      return validSecondaryTasks.slice(0, this.config.maxSecondaryPremises || 20);
    } catch (error) {
      console.error('Error in DebugPairingStrategy selectSecondaryPremises:', error);
      // Return empty array to continue processing instead of failing
      return [];
    }
  }
  
  /**
   * Get all tasks from focus/memory
   * @private
   */
  _getAllTasks() {
    let allTasks = [];
    
    // Try to get tasks from focus first (higher priority tasks)
    if (this.focus) {
      allTasks = this.focus.getTasks(100); // Get up to 100 tasks
    } else if (this.memory && typeof this.memory.getAllConcepts === 'function') {
      // Get tasks from memory concepts if focus is not available
      allTasks = this.memory.getAllConcepts()
        .flatMap(concept => concept.getTasks ? concept.getTasks() : [])
        .slice(0, 100);
    }
    
    return allTasks;
  }

  /**
   * Get status information about the strategy
   * @returns {object} Status information
   */
  getStatus() {
    return {
      config: this.config,
      type: this.constructor.name,
      timestamp: Date.now()
    };
  }
}