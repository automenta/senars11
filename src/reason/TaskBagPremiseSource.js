import { PremiseSource } from './PremiseSource.js';

/**
 * A PremiseSource that draws from a TaskBag with configurable sampling objectives.
 */
export class TaskBagPremiseSource extends PremiseSource {
  /**
   * @param {Memory} memory - The memory to draw from (should contain a taskBag).
   * @param {object} samplingObjectives - Configuration for the sampling strategy.
   * Supported objectives:
   * - priority: Sample tasks based on their priority value (default: true)
   * - recency: Favor tasks that have been recently activated (default: false)
   * - punctuation: Focus on Goals or Questions (default: false)
   * - novelty: Favor tasks that have participated in fewer reasoning steps (default: false)
   */
  constructor(memory, samplingObjectives) {
    // Set default sampling objectives if not provided
    const defaults = {
      priority: true,
      recency: false,
      punctuation: false,
      novelty: false,
      ...samplingObjectives
    };
    
    super(memory, defaults);
    this.taskBag = memory?.taskBag || memory?.bag || null;
    if (!this.taskBag) {
      throw new Error('TaskBagPremiseSource requires a memory object with a taskBag or bag property');
    }
  }

  /**
   * Returns an async stream of premises sampled from the task bag.
   * @returns {AsyncGenerator<Task>}
   */
  async *stream() {
    // Implement different sampling strategies based on objectives
    while (true) {
      try {
        const task = await this._sampleTask();
        if (task) {
          yield task;
        } else {
          // If no task is available, wait a bit before trying again
          // We can add a mechanism to detect if the stream should end
          await this._waitForTask();
        }
      } catch (error) {
        console.error('Error in TaskBagPremiseSource stream:', error);
        // Wait before continuing to avoid tight error loop
        await this._waitForTask();
        continue;
      }
    }
  }
  
  /**
   * Attempt to get a task without waiting indefinitely
   * @returns {Promise<Task|null>}
   */
  async tryGetTask() {
    return await this._sampleTask();
  }

  /**
   * Sample a task from the bag based on sampling objectives
   * @returns {Promise<Task|null>}
   */
  async _sampleTask() {
    try {
      // For now, implement priority-based sampling as the default strategy
      // The taskBag should be a PriorityBag that naturally handles priority-based sampling
      if (this.taskBag.take) {
        // If the bag has a take method (like PriorityBag) - this typically handles priority
        return this.taskBag.take();
      } else if (this.taskBag.pop) {
        // If it has a pop method
        return this.taskBag.pop();
      } else if (this.taskBag.get) {
        // If it has a get method with optional index
        return this.taskBag.get(0);
      }
      return null;
    } catch (error) {
      console.error('Error in _sampleTask:', error);
      return null;
    }
  }

  /**
   * Wait for a task to become available
   * @returns {Promise<void>}
   */
  async _waitForTask() {
    try {
      // Simple timeout-based wait
      return new Promise(resolve => setTimeout(resolve, 10)); // 10ms wait
    } catch (error) {
      console.error('Error in _waitForTask:', error);
      // Fallback - just wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}