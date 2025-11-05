/**
 * BagStrategy (NARS-style): Priority-sampled bag approach for anytime reasoning.
 * Maintains a priority-sampled bag of tasks and beliefs. In each step, it randomly draws 
 * a task and a belief from the bag and attempts to combine them.
 * This supports "anytime" reasoning under resource constraints.
 */
import { Strategy } from '../Strategy.js';

export class BagStrategy extends Strategy {
  /**
   * @param {object} config - Configuration options
   * @param {number} config.bagSize - Size of the sampling bag
   * @param {Function} config.samplingFunction - Function to sample from the bag (defaults to priority-based)
   */
  constructor(config = {}) {
    super({
      bagSize: config.bagSize || 100,
      samplingFunction: config.samplingFunction || null,
      ...config
    });
    
    // Bag to hold tasks for sampling
    this.bag = [];
    this.bagSize = this.config.bagSize;
  }

  /**
   * Generate premise pairs using bag-based sampling
   * @param {AsyncGenerator<Task>} premiseStream - Stream of primary premises
   * @returns {AsyncGenerator<Array<Task>>} - Stream of premise pairs [primary, secondary]
   */
  async *generatePremisePairs(premiseStream) {
    try {
      for await (const primaryPremise of premiseStream) {
        try {
          // Update the bag with the new primary premise
          this.updateBag(primaryPremise);
          
          // Select secondary premises from the bag using priority sampling
          const secondaryPremises = await this.selectSecondaryPremisesFromBag(primaryPremise);
          
          // Yield pairs of primary and secondary premises
          for (const secondaryPremise of secondaryPremises) {
            yield [primaryPremise, secondaryPremise];
          }
        } catch (error) {
          console.error('Error processing primary premise in BagStrategy:', error);
          // Continue to next premise rather than failing completely
          continue;
        }
      }
    } catch (error) {
      console.error('Error in BagStrategy generatePremisePairs:', error);
      // Re-throw to allow upstream handling
      throw error;
    }
  }

  /**
   * Update the internal bag with a new task
   * @param {Task} task - The task to add to the bag
   */
  updateBag(task) {
    if (!task || !task.budget) {
      return; // Only add tasks with budget information
    }

    // Add task to bag
    this.bag.push(task);

    // Maintain bag size by removing lowest priority items if necessary
    if (this.bag.length > this.bagSize) {
      // Sort by priority (descending) and keep top N
      this.bag.sort((a, b) => (b.budget.priority || 0) - (a.budget.priority || 0));
      this.bag = this.bag.slice(0, this.bagSize);
    }
  }

  /**
   * Select secondary premises from the internal bag
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of secondary premises
   */
  async selectSecondaryPremisesFromBag(primaryPremise) {
    try {
      // Use the configured sampling function or default to priority-based sampling
      if (this.config.samplingFunction) {
        return this.config.samplingFunction(primaryPremise, this.bag);
      }

      // Default: priority-based sampling from the bag
      const validSecondaryTasks = this.bag.filter(task => 
        task && 
        task !== primaryPremise &&  // Don't pair a task with itself
        task.term &&  // Has a valid term
        task.term !== primaryPremise.term &&  // Different terms
        task.budget &&  // Has budget information
        (task.budget.priority || 0) > 0  // Has positive priority
      );

      // Sort by priority (descending) and limit to maxSecondaryPremises
      validSecondaryTasks.sort((a, b) => (b.budget.priority || 0) - (a.budget.priority || 0));
      
      return validSecondaryTasks.slice(0, this.config.maxSecondaryPremises || 10);
    } catch (error) {
      console.error('Error in selectSecondaryPremisesFromBag:', error);
      // Return empty array to continue processing instead of failing
      return [];
    }
  }

  /**
   * Select secondary premises (override parent method)
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of secondary premises
   */
  async selectSecondaryPremises(primaryPremise) {
    return this.selectSecondaryPremisesFromBag(primaryPremise);
  }

  /**
   * Get status information about the strategy
   * @returns {object} Status information
   */
  getStatus() {
    return {
      ...super.getStatus(),
      bagSize: this.bag.length,
      bagCapacity: this.bagSize,
      type: 'BagStrategy'
    };
  }
}