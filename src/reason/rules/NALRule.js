import { Rule } from '../Rule.js';
import { Truth } from '../../../Truth.js';

/**
 * Base class for NAL rules in the stream reasoner system.
 * Provides common functionality for NAL rule implementations.
 */
export class NALRule extends Rule {
  constructor(id, ruleType = 'NAL') {
    super(id, ruleType);
    this.truthFunction = null; // To be set by subclasses
  }

  /**
   * Create a derived task with proper NAL semantics
   * @protected
   */
  createNALDerivedTask(term, truth, parentTasks, context, punctuation = '.') {
    return {
      term,
      truth,
      punctuation,
      budget: { priority: 0.1 }, // Default priority for derived tasks
      stamp: this.createNALStamp(parentTasks, context)
    };
  }

  /**
   * Create a stamp that tracks NAL derivation history
   * @protected
   */
  createNALStamp(parentTasks, context) {
    const currentDepth = Math.max(...parentTasks.map(p => p.stamp?.depth || 0)) + 1;
    return {
      id: `${this.id}_${Date.now()}_${Math.random()}`,
      creationTime: Date.now(),
      depth: currentDepth,
      parentIds: parentTasks.map(p => p.stamp?.id || 'unknown'),
      source: this.id,
      evidentialBase: this.getEvidentialBase(parentTasks)
    };
  }

  /**
   * Get evidential base from parent tasks
   * @private
   */
  getEvidentialBase(parentTasks) {
    // Combine evidential base from all parent tasks
    return parentTasks.flatMap(p => p.stamp?.evidentialBase || [p.stamp?.id || 'unknown']);
  }
}