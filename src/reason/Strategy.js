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
      
      // Default: return an empty array (no secondary premises)
      return [];
    } catch (error) {
      console.error('Error in selectSecondaryPremises:', error);
      // Return empty array to continue processing instead of failing
      return [];
    }
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