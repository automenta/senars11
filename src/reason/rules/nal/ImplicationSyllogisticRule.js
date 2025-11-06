import { Rule } from '../../Rule.js';
import { Truth } from '../../../Truth.js';
import { Task } from '../../../task/Task.js';
import { Stamp } from '../../../Stamp.js';
import { Term, TermType } from '../../../term/Term.js';
import { RuleExecutionError, logError } from '../../utils/error.js';

/**
 * Implements the implication syllogistic deduction rule for the stream reasoner.
 * Derives (a ==> c) from (a ==> b) and (b ==> c)
 * 
 * Premise 1: (a ==> b) {f1, c1}
 * Premise 2: (b ==> c) {f2, c2}
 * Conclusion: (a ==> c) {F_ded}
 */
export class ImplicationSyllogisticRule extends Rule {
  constructor(config = {}) {
    super('nal-implication-syllogism', 'nal', 1.0, config);
  }

  /**
   * Check if this rule can be applied to the given premise pair
   * @param {Task} primaryPremise - The first premise
   * @param {Task} secondaryPremise - The second premise
   * @param {Object} context - Context object that may contain termFactory
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(primaryPremise, secondaryPremise, context) {
    if (!primaryPremise || !secondaryPremise) return false;
    
    // Both premises must be implications
    const isImplication = (term) => term.operator === '==>';
    if (!isImplication(primaryPremise.term) || !isImplication(secondaryPremise.term)) {
      return false;
    }
    
    const term1 = primaryPremise.term;
    const term2 = secondaryPremise.term;
    
    // Check for syllogistic pattern: (a ==> b) and (b ==> c) => (a ==> c)
    // This means the consequent of one matches the antecedent of the other
    const isSyllogistic = (t1, t2) => {
      if (!t1.components || !t2.components) return false;
      // t1 is (a ==> b), t2 is (b ==> c) - the middle terms match
      return t1.components[1] && t2.components[0] && t1.components[1].equals(t2.components[0]);
    };
    
    // Either (primary ==> secondary) or (secondary ==> primary) forms a syllogism
    return isSyllogistic(term1, term2) || isSyllogistic(term2, term1);
  }

  /**
   * Apply the rule to generate conclusions
   * @param {Task} primaryPremise - The first premise
   * @param {Task} secondaryPremise - The second premise
   * @param {Object} context - Context object that may contain termFactory
   * @returns {Array<Task>} Array of derived tasks
   */
  apply(primaryPremise, secondaryPremise, context = {}) {
    if (!this.canApply(primaryPremise, secondaryPremise, context)) {
      return [];
    }

    try {
      // Determine which is the first implication and which is the second
      let firstImp, secondImp;
      if (primaryPremise.term.components[1].equals(secondaryPremise.term.components[0])) {
        // primary is (a ==> b), secondary is (b ==> c)
        firstImp = primaryPremise;
        secondImp = secondaryPremise;
      } else if (secondaryPremise.term.components[1].equals(primaryPremise.term.components[0])) {
        // secondary is (a ==> b), primary is (b ==> c)
        firstImp = secondaryPremise;
        secondImp = primaryPremise;
      } else {
        return [];
      }

      // Extract components: firstImp is (a ==> b), secondImp is (b ==> c)
      const a = firstImp.term.components[0];  // Antecedent of first
      const b = firstImp.term.components[1];  // Consequent of first / Antecedent of second
      const c = secondImp.term.components[1]; // Consequent of second
      
      const firstTruth = firstImp.truth;
      const secondTruth = secondImp.truth;

      // Apply deduction truth function
      const newTruth = Truth.deduction(firstTruth, secondTruth);

      // Create the new implication term (a ==> c) using the Term class
      const newTermName = `(==>, ${a._name || a.name || 'a'}, ${c._name || c.name || 'c'})`;
      const newTerm = new Term(TermType.COMPOUND, newTermName, [a, c], '==>');

      // Create new stamp combining both premise stamps
      const newStamp = Stamp.derive([primaryPremise.stamp, secondaryPremise.stamp]);
      
      // Calculate priority (simplified)
      const priority = (primaryPremise.budget?.priority || 0.5) * (secondaryPremise.budget?.priority || 0.5) * this.priority;

      // Create derived task
      const derivedTask = new Task({
        term: newTerm,
        punctuation: '.',  // Belief
        truth: newTruth,
        stamp: newStamp,
        budget: {
          priority: priority,
          durability: Math.min(primaryPremise.budget?.durability || 0.5, secondaryPremise.budget?.durability || 0.5),
          quality: Math.min(primaryPremise.budget?.quality || 0.5, secondaryPremise.budget?.quality || 0.5)
        }
      });

      return [derivedTask];
    } catch (error) {
      logError(error, { 
        ruleId: this.id, 
        context: 'implication_syllogistic_rule_application' 
      }, 'error');
      return [];
    }
  }
}