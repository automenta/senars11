/**
 * New Syllogistic Rule for the stream-based reasoner
 * Implements the inheritance syllogistic deduction rule.
 * Derives (S --> P) from (S --> M) and (M --> P)
 */

import { Rule } from '../Rule.js';
import { Truth } from '../../Truth.js';
import { Task } from '../../task/Task.js';
import { Stamp } from '../../Stamp.js';
import { Term } from '../../term/Term.js';

export class SyllogisticRule extends Rule {
  constructor(config = {}) {
    super('nal-syllogistic-deduction', 'nal', 1.0, config);
  }

  /**
   * Determine if this rule can be applied to the given premises
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @returns {boolean} - Whether the rule can be applied
   */
  canApply(primaryPremise, secondaryPremise, context) {
    if (!primaryPremise || !secondaryPremise) return false;
    
    // Both premises need to be inheritance statements (-->)
    // Check if we have patterns like (S --> M) and (M --> P) or (M --> P) and (S --> M)
    const term1 = primaryPremise.term;
    const term2 = secondaryPremise.term;
    
    if (!term1?.isCompound || !term2?.isCompound) return false;
    
    // Look for inheritance relations (-->)
    const isTerm1Inheritance = term1.operator === '-->';
    const isTerm2Inheritance = term2.operator === '-->';
    
    if (!isTerm1Inheritance || !isTerm2Inheritance) return false;
    
    // Check for syllogistic pattern: (S --> M) + (M --> P) => (S --> P)
    // This means the middle term of one premise matches the subject or predicate of the other
    const comp1 = term1.components;
    const comp2 = term2.components;
    
    if (comp1.length !== 2 || comp2.length !== 2) return false;
    
    // Find potential matching middle terms
    // Pattern 1: (S --> M) + (M --> P) where comp1[1] === comp2[0]
    // Pattern 2: (M --> P) + (S --> M) where comp2[1] === comp1[0]
    const matchesPattern1 = comp1[1].equals(comp2[0]); // term1.object === term2.subject
    const matchesPattern2 = comp2[1].equals(comp1[0]); // term2.object === term1.subject
    
    return matchesPattern1 || matchesPattern2;
  }

  /**
   * Apply the syllogistic rule to derive new tasks
   * @param {Task} primaryPremise - The primary premise
   * @param {Task} secondaryPremise - The secondary premise
   * @returns {Array<Task>} - Array of derived tasks
   */
  apply(primaryPremise, secondaryPremise, context) {
    if (!this.canApply(primaryPremise, secondaryPremise, context)) {
      return [];
    }

    const term1 = primaryPremise.term;
    const term2 = secondaryPremise.term;
    
    // Identify the syllogistic pattern
    const comp1 = term1.components;
    const comp2 = term2.components;
    
    let subject, middle, predicate;
    
    // Pattern 1: (S --> M) + (M --> P) => (S --> P)
    if (comp1[1].equals(comp2[0])) {
      subject = comp1[0];    // S
      middle = comp1[1];     // M (from first premise)
      predicate = comp2[1];  // P (from second premise)
    }
    // Pattern 2: (M --> P) + (S --> M) => (S --> P)  
    else if (comp2[1].equals(comp1[0])) {
      subject = comp2[0];    // S (from second premise)
      middle = comp2[1];     // M 
      predicate = comp1[1];  // P (from first premise)
    }
    else {
      return []; // No valid pattern found
    }

    // Create the conclusion term
    const conclusionTerm = context.termFactory.create({
      operator: '-->',
      components: [subject, predicate]
    });

    if (!conclusionTerm) {
      return [];
    }

    // Calculate truth value using NAL deduction
    const truth1 = primaryPremise.truth;
    const truth2 = secondaryPremise.truth;
    
    if (!truth1 || !truth2) {
      return [];
    }
    
    const derivedTruth = Truth.deduction(truth1, truth2);
    if (!derivedTruth) {
      return [];
    }

    // Create new stamp combining both premise stamps
    const newStamp = Stamp.derive([primaryPremise.stamp, secondaryPremise.stamp]);
    
    // Calculate priority (simplified)
    const priority = (primaryPremise.budget?.priority || 0.5) * (secondaryPremise.budget?.priority || 0.5) * this.priority;

    // Create derived task
    const derivedTask = new Task({
      term: conclusionTerm,
      punctuation: '.',  // Belief
      truth: derivedTruth,
      stamp: newStamp,
      budget: {
        priority: priority,
        durability: Math.min(primaryPremise.budget?.durability || 0.5, secondaryPremise.budget?.durability || 0.5),
        quality: Math.min(primaryPremise.budget?.quality || 0.5, secondaryPremise.budget?.quality || 0.5)
      }
    });

    return [derivedTask];
  }
}

export default SyllogisticRule;