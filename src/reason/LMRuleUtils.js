/**
 * @file src/reason/LMRuleUtils.js
 * @description Utilities for working with LM rules, with patterns adapted from v9 implementation.
 */

import { LMRule } from './LMRule.js';
import { Task, Punctuation } from './TaskUtils.js';
import { 
  isGoal, 
  isQuestion, 
  isJudgment, 
  hasPattern, 
  KeywordPatterns,
  parseSubGoals,
  cleanSubGoal,
  isValidSubGoal 
} from './RuleHelpers.js';

/**
 * Utility class for common LM rule patterns adapted from v9 implementation
 */
export class LMRuleUtils {
  /**
   * Creates a basic conditional rule based on task punctuation
   */
  static createPunctuationBasedRule(config) {
    const { id, lm, name, description, priority, punctuation, conditionFn, ...rest } = config;
    
    return LMRule.create({
      id,
      lm,
      name: name || `${punctuation}-based rule`,
      description: description || `Rule for ${punctuation} tasks`,
      priority: priority || 0.5,
      
      condition: (primaryPremise, secondaryPremise, context) => {
        if (conditionFn) {
          return conditionFn(primaryPremise, secondaryPremise, context);
        }
        // Default condition based on punctuation
        if (!primaryPremise) return false;
        return primaryPremise.punctuation === punctuation;
      },
      
      ...rest
    });
  }
  
  /**
   * Creates a priority-based conditional rule
   */
  static createPriorityBasedRule(config) {
    const { id, lm, name, description, priority, minPriority, ...rest } = config;
    
    return LMRule.create({
      id,
      lm,
      name: name || 'Priority-based rule',
      description: description || 'Rule that triggers based on task priority',
      priority: priority || 0.5,
      
      condition: (primaryPremise, secondaryPremise, context) => {
        if (!primaryPremise) return false;
        const taskPriority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
        return taskPriority >= (minPriority || 0.5);
      },
      
      ...rest
    });
  }
  
  /**
   * Creates a pattern-based conditional rule using keyword patterns
   */
  static createPatternBasedRule(config) {
    const { 
      id, lm, name, description, priority, 
      patternType, minPriority = 0.5, ...rest 
    } = config;
    
    let patterns;
    switch (patternType) {
      case 'problemSolving':
        patterns = KeywordPatterns.problemSolving;
        break;
      case 'conflict':
        patterns = KeywordPatterns.conflict;
        break;
      case 'narrative':
        patterns = KeywordPatterns.narrative;
        break;
      case 'temporalCausal':
        patterns = KeywordPatterns.temporalCausal;
        break;
      case 'uncertainty':
        patterns = KeywordPatterns.uncertainty;
        break;
      case 'ambiguous':
        patterns = KeywordPatterns.ambiguous;
        break;
      case 'complexity':
        patterns = KeywordPatterns.complexity;
        break;
      default:
        patterns = [];
    }
    
    return LMRule.create({
      id,
      lm,
      name: name || `${patternType}-based rule`,
      description: description || `Rule for tasks matching ${patternType} patterns`,
      priority: priority || 0.6,
      
      condition: (primaryPremise, secondaryPremise, context) => {
        if (!primaryPremise) return false;
        const taskPriority = primaryPremise.getPriority?.() || primaryPremise.priority || 0;
        const termStr = primaryPremise.term?.toString?.() || String(primaryPremise.term || '');
        return taskPriority >= minPriority && hasPattern(primaryPremise, patterns);
      },
      
      ...rest
    });
  }
  
  /**
   * Helper to create common prompt templates
   */
  static createPromptTemplate(templateType, options = {}) {
    switch (templateType) {
      case 'goalDecomposition':
        return `Decompose the following goal into ${options.minSubGoals || 2} to ${options.maxSubGoals || 5} smaller, actionable sub-goals.

Goal: "{{taskTerm}}"

Output: List of subgoals, one per line`;
      
      case 'hypothesisGeneration':
        return `Based on the following belief, what is a plausible and testable hypothesis?

Belief: "{{taskTerm}}"

The hypothesis should explore a potential cause, effect, or related phenomenon.
State the hypothesis as a clear, single statement.`;
      
      case 'causalAnalysis':
        return `Analyze the causal relationships in the following statement:
"{{taskTerm}}"

Identify the cause and the effect. Express their relationship as a formal implication (e.g., "cause --> effect").`;
      
      case 'explanation':
        return `Translate the following formal logic statement into a clear, simple, natural language explanation.

Statement: "{{taskTerm}}"

Focus on conveying the core meaning and implication of the statement.`;
        
      default:
        return `Process the following task: "{{taskTerm}}"`;
    }
  }
  
  /**
   * Helper to create common response processors
   */
  static createResponseProcessor(processorType, options = {}) {
    switch (processorType) {
      case 'list':
        return (lmResponse) => {
          if (!lmResponse) return [];
          const items = parseSubGoals(lmResponse);
          const minLen = options.minLength || 1;
          const maxLen = options.maxLength || 200;
          const maxItems = options.maxItems || 10;
          
          return items
            .map(cleanSubGoal)
            .filter(goal => isValidSubGoal(goal, minLen, maxLen))
            .slice(0, maxItems);
        };
      
      case 'single':
        return (lmResponse) => {
          return lmResponse?.trim?.().replace(/^[^:]*:\s*/, '') || '';
        };
      
      case 'number':
        return (lmResponse) => {
          const match = lmResponse?.match(/(\d\.\d+)/);
          if (match) {
            const num = parseFloat(match[1]);
            if (!isNaN(num) && num >= 0 && num <= 1) {
              return num;
            }
          }
          return null;
        };
      
      default:
        return (lmResponse) => lmResponse || '';
    }
  }
  
  /**
   * Helper to create common task generators
   */
  static createTaskGenerator(generatorType, options = {}) {
    switch (generatorType) {
      case 'multipleSubTasks':
        return (processedOutput, originalTask) => {
          if (!Array.isArray(processedOutput) || processedOutput.length === 0) return [];
          
          return processedOutput.map(output => {
            return new Task(
              output,
              originalTask.punctuation,
              {
                frequency: originalTask.truth.f,
                confidence: originalTask.truth.c * (options.confidenceMultiplier || 0.9)
              },
              null,
              null,
              Math.max(0.1, (originalTask.priority || 0.5) * (options.priorityMultiplier || 0.9)),
              originalTask.durability * (options.durabilityMultiplier || 0.8)
            );
          });
        };
      
      case 'singleTask':
        return (processedOutput, originalTask) => {
          if (!processedOutput) return [];
          
          // Determine punctuation for the new task based on options or keep original
          const punctuation = options.punctuation || originalTask.punctuation;
          
          return [new Task(
            processedOutput,
            punctuation,
            {
              frequency: options.frequency !== undefined ? options.frequency : originalTask.truth.f,
              confidence: options.confidence !== undefined ? options.confidence : originalTask.truth.c * (options.confidenceMultiplier || 1.0)
            },
            null,
            null,
            options.priority !== undefined ? options.priority : originalTask.priority * (options.priorityMultiplier || 1.0),
            options.durability !== undefined ? options.durability : originalTask.durability
          )];
        };
      
      default:
        return (processedOutput, originalTask) => {
          if (!processedOutput) return [];
          return [new Task(processedOutput, originalTask.punctuation, originalTask.truth)];
        };
    }
  }
}