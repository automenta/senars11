/**
 * ExhaustiveStrategy: For a given task, find all related beliefs and apply all matching rules.
 * This strategy performs comprehensive reasoning by exploring all possible premise combinations
 * that could be relevant to the current primary premise.
 */
import { Strategy } from '../Strategy.js';

export class ExhaustiveStrategy extends Strategy {
  /**
   * @param {object} config - Configuration options
   * @param {Function} config.relevanceFunction - Function to determine relevance between tasks
   * @param {number} config.maxSearchDepth - Maximum search depth for finding related tasks
   */
  constructor(config = {}) {
    super({
      relevanceFunction: config.relevanceFunction || null,
      maxSearchDepth: config.maxSearchDepth || 3,
      ...config
    });
  }

  /**
   * Generate premise pairs using exhaustive search to find all related beliefs
   * @param {AsyncGenerator<Task>} premiseStream - Stream of primary premises
   * @returns {AsyncGenerator<Array<Task>>} - Stream of premise pairs [primary, secondary]
   */
  async *generatePremisePairs(premiseStream) {
    try {
      for await (const primaryPremise of premiseStream) {
        try {
          // Find ALL related secondary premises for this primary premise
          const secondaryPremises = await this.findRelatedPremises(primaryPremise);
          
          // Yield pairs of primary and secondary premises
          for (const secondaryPremise of secondaryPremises) {
            yield [primaryPremise, secondaryPremise];
          }
        } catch (error) {
          console.error('Error processing primary premise in ExhaustiveStrategy:', error);
          // Continue to next premise rather than failing completely
          continue;
        }
      }
    } catch (error) {
      console.error('Error in ExhaustiveStrategy generatePremisePairs:', error);
      // Re-throw to allow upstream handling
      throw error;
    }
  }

  /**
   * Find all related premises for a given primary premise
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of all related secondary premises
   */
  async findRelatedPremises(primaryPremise) {
    try {
      let allRelatedTasks = [];

      // Get tasks from focus that are related to the primary premise
      if (this.focus) {
        const focusTasks = this.focus.getTasks();  // Get all tasks from focus
        allRelatedTasks = this.filterRelatedTasks(primaryPremise, focusTasks);
      } else if (this.memory && typeof this.memory.getAllConcepts === 'function') {
        // Get tasks from memory concepts that are related to the primary premise
        const memoryTasks = this.memory.getAllConcepts()
          .flatMap(concept => concept.getTasks ? concept.getTasks() : []);
        allRelatedTasks = this.filterRelatedTasks(primaryPremise, memoryTasks);
      }

      // Additional search for related premises using term structure analysis
      const structuralRelatedTasks = await this.findStructurallyRelatedTasks(primaryPremise, allRelatedTasks);
      allRelatedTasks = [...new Set([...allRelatedTasks, ...structuralRelatedTasks])]; // Combine and deduplicate

      // Ensure no self-matching
      allRelatedTasks = allRelatedTasks.filter(task => task !== primaryPremise);
      
      return allRelatedTasks;
    } catch (error) {
      console.error('Error in findRelatedPremises:', error);
      return [];
    }
  }

  /**
   * Filter tasks based on relevance to the primary premise
   * @param {Task} primaryPremise - The primary premise
   * @param {Array<Task>} tasks - Array of tasks to filter
   * @returns {Array<Task>} - Filtered array of related tasks
   */
  filterRelatedTasks(primaryPremise, tasks) {
    try {
      if (this.config.relevanceFunction) {
        return tasks.filter(task => 
          task && 
          task !== primaryPremise &&
          this.config.relevanceFunction(primaryPremise, task)
        );
      }

      // Default relevance: check for common terms, variables, or structural similarity
      return tasks.filter(task => {
        if (!task || task === primaryPremise || !task.term || !primaryPremise.term) {
          return false;
        }

        // Check for common variables or shared structural elements
        const hasCommonVariable = this.hasCommonVariable(primaryPremise.term, task.term);
        
        // Check for term similarity (e.g., same predicate, different arguments)
        const hasStructuralSimilarity = this.hasStructuralSimilarity(primaryPremise.term, task.term);
        
        // Check for direct term inclusion (one term contains the other)
        const hasTermInclusion = this.hasTermInclusion(primaryPremise.term, task.term);
        
        return hasCommonVariable || hasStructuralSimilarity || hasTermInclusion;
      });
    } catch (error) {
      console.error('Error in filterRelatedTasks:', error);
      return [];
    }
  }

  /**
   * Check if two terms have common variables
   * @param {Term} term1 - First term
   * @param {Term} term2 - Second term
   * @returns {boolean} - True if terms have common variables
   */
  hasCommonVariable(term1, term2) {
    // This is a simplified check - in a real system, you'd have better variable extraction
    const term1Str = term1.toString();
    const term2Str = term2.toString();
    
    // Look for variables (typically start with #, $, etc.)
    const varPattern = /[\$#][a-zA-Z0-9_]+/g;
    const vars1 = term1Str.match(varPattern) || [];
    const vars2 = term2Str.match(varPattern) || [];
    
    return vars1.some(v => vars2.includes(v));
  }

  /**
   * Check if two terms have structural similarity
   * @param {Term} term1 - First term
   * @param {Term} term2 - Second term
   * @returns {boolean} - True if terms have structural similarity
   */
  hasStructuralSimilarity(term1, term2) {
    const str1 = term1.toString();
    const str2 = term2.toString();
    
    // Check if they have the same basic structure (e.g., both implications, both conjunctions)
    if (str1.includes('==>') && str2.includes('==>')) return true;
    if (str1.includes('&&') && str2.includes('&&')) return true;
    if (str1.includes('||') && str2.includes('||')) return true;
    
    // Check if they have the same predicate name with different arguments
    const predPattern = /^[\w]+/;
    const pred1 = str1.match(predPattern)?.[0];
    const pred2 = str2.match(predPattern)?.[0];
    
    return pred1 && pred2 && pred1 === pred2;
  }

  /**
   * Check if one term contains the other
   * @param {Term} term1 - First term
   * @param {Term} term2 - Second term
   * @returns {boolean} - True if one term contains the other
   */
  hasTermInclusion(term1, term2) {
    const str1 = term1.toString();
    const str2 = term2.toString();
    
    return str1.includes(str2) || str2.includes(str1);
  }

  /**
   * Find structurally related tasks
   * @param {Task} primaryPremise - The primary premise
   * @param {Array<Task>} allTasks - Array of all tasks to consider
   * @returns {Array<Task>} - Array of structurally related tasks
   */
  async findStructurallyRelatedTasks(primaryPremise, allTasks) {
    // For now, return the already filtered tasks
    // In a more sophisticated implementation, this would perform deeper structural analysis
    return allTasks;
  }

  /**
   * Select secondary premises (override parent method)
   * @param {Task} primaryPremise - The primary premise
   * @returns {Promise<Array<Task>>} - Array of secondary premises
   */
  async selectSecondaryPremises(primaryPremise) {
    return this.findRelatedPremises(primaryPremise);
  }

  /**
   * Get status information about the strategy
   * @returns {object} Status information
   */
  getStatus() {
    return {
      ...super.getStatus(),
      type: 'ExhaustiveStrategy',
      maxSearchDepth: this.config.maxSearchDepth
    };
  }
}