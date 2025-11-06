/**
 * Strategy component handles premise pairing and budget management.
 */
export class Strategy {
  /**
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      maxSecondaryPremises: config.maxSecondaryPremises || 10,
      ...config
    };
    
    // Store the focus or memory reference if provided in config
    this.focus = config.focus || null;
    this.memory = config.memory || null;
  }

  /**
   * Generate premise pairs from a stream of primary premises
   * @param {AsyncGenerator<Task>} premiseStream - Stream of primary premises
   * @returns {AsyncGenerator<Array<Task>>} - Stream of premise pairs [primary, secondary]
   */
  async *generatePremisePairs(premiseStream) {
    try {
      for await (const primaryPremise of premiseStream) {
        try {
          // Select secondary premises based on strategy
          const secondaryPremises = await this.selectSecondaryPremises(primaryPremise);
          
          // Yield pairs of primary and secondary premises
          for (const secondaryPremise of secondaryPremises) {
            yield [primaryPremise, secondaryPremise];
          }
        } catch (error) {
          console.error('Error processing primary premise in Strategy:', error);
          // Continue to next premise rather than failing completely
          continue;
        }
      }
    } catch (error) {
      console.error('Error in Strategy generatePremisePairs:', error);
      // Re-throw to allow upstream handling
      throw error;
    }
  }

  /**
   * Select secondary premises for a given primary premise
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of secondary premises
   */
  async selectSecondaryPremises(primaryPremise) {
    try {
      // For now, implement a simple strategy
      // In the future, this would use more sophisticated premise selection logic
      if (this.config.premiseSelector) {
        return await this.config.premiseSelector.select(primaryPremise);
      }
      
      // Default strategy: get tasks from focus or memory that could pair with the primary premise
      // We need to access other tasks in the system to form premise pairs
      let allTasks = this._getAvailableTasks();
      
      // Filter tasks to find those that could be meaningfully paired with the primary premise
      const validSecondaryTasks = allTasks.filter(task => 
        task && 
        task !== primaryPremise &&  // Don't pair a task with itself
        task.term &&  // Has a valid term
        task.term !== primaryPremise.term  // Different terms
      );
      
      // Prioritize secondary premises that are likely to form syllogistic patterns
      // with the primary premise by looking for matching terms
      const prioritizedTasks = this._prioritizeCompatibleTasks(primaryPremise, validSecondaryTasks);
      
      // Limit to maxSecondaryPremises if specified
      return prioritizedTasks.slice(0, this.config.maxSecondaryPremises || 20); // Increased default
    } catch (error) {
      console.error('Error in selectSecondaryPremises:', error);
      // Return empty array to continue processing instead of failing
      return [];
    }
  }
  
  /**
   * Get tasks from focus or memory based on availability
   * @private
   */
  _getAvailableTasks() {
    // Try to get tasks from focus first (higher priority tasks)
    if (this.focus) {
      return this.focus.getTasks(this.config.maxSecondaryPremises || 20); // Increased default from 10 to 20
    } 
    // Get tasks from memory concepts if focus is not available
    else if (this.memory && typeof this.memory.getAllConcepts === 'function') {
      return this.memory.getAllConcepts()
        .flatMap(concept => concept.getTasks ? concept.getTasks() : [])
        .slice(0, this.config.maxSecondaryPremises || 20); // Increased default from 10 to 20
    }
    
    return [];
  }
  
  /**
   * Prioritize tasks that are compatible with the primary premise for rule application
   * @param {Task} primaryPremise - The primary premise
   * @param {Array<Task>} secondaryTasks - Array of potential secondary premises
   * @returns {Array<Task>} - Prioritized array of compatible tasks
   */
  _prioritizeCompatibleTasks(primaryPremise, secondaryTasks) {
    if (!primaryPremise?.term?.components || !Array.isArray(secondaryTasks)) {
      return secondaryTasks;
    }
    
    // Identify the syllogistic compatibility based on matching terms
    const primaryComponents = primaryPremise.term.components;
    if (primaryComponents?.length !== 2) {
      return secondaryTasks;
    }
    
    const [primarySubject, primaryObject] = primaryComponents;
    
    // Use reduce to categorize tasks in a single pass for better performance
    const { highlyCompatible, compatible, lessCompatible } = secondaryTasks.reduce(
      (acc, task) => {
        const category = this._categorizeTaskCompatibility(task, primarySubject, primaryObject);
        acc[category].push(task);
        return acc;
      },
      { highlyCompatible: [], compatible: [], lessCompatible: [] }
    );
    
    // Return in order: highly compatible first, then compatible, then less compatible
    return [...highlyCompatible, ...compatible, ...lessCompatible];
  }
  
  /**
   * Check if two terms are equal using proper Term comparison
   * @private
   */
  _termsEqual(t1, t2) {
    if (!t1 || !t2) return false;
    if (typeof t1.equals === 'function') {
      return t1.equals(t2);
    }
    // Fallback for non-Term objects
    const name1 = t1.name || t1._name || t1.toString?.() || '';
    const name2 = t2.name || t2._name || t2.toString?.() || '';
    return name1 === name2;
  }
  
  /**
   * Categorize a task's compatibility with the primary premise
   * @private
   */
  _categorizeTaskCompatibility(task, primarySubject, primaryObject) {
    if (!task?.term?.components || task.term.components.length !== 2) {
      return 'lessCompatible';
    }
    
    const [secondarySubject, secondaryObject] = task.term.components;
    
    // Check for syllogistic patterns: 
    // Pattern 1: primary=(S->M), secondary=(M->P) where primaryObject = secondarySubject (M term matches)
    // Pattern 2: primary=(M->P), secondary=(S->M) where primarySubject = secondaryObject (M term matches)
    const pattern1 = this._termsEqual(primaryObject, secondarySubject);  // primary ends where secondary starts
    const pattern2 = this._termsEqual(primarySubject, secondaryObject);  // primary starts where secondary ends
    
    if (pattern1 || pattern2) {
      return 'highlyCompatible';  // These are most likely to generate syllogistic derivations
    }
    
    // Check for other types of compatibility
    const hasCommonTerms = this._termsEqual(primarySubject, secondarySubject) || 
                          this._termsEqual(primarySubject, secondaryObject) || 
                          this._termsEqual(primaryObject, secondarySubject) || 
                          this._termsEqual(primaryObject, secondaryObject);
    
    return hasCommonTerms ? 'compatible' : 'lessCompatible';
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