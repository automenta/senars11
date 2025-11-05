/**
 * @file src/reason/TaskUtils.js
 * @description Utilities for working with NARS tasks, truth values, and terms.
 */

// Punctuation constants - in a real implementation these would come from the Task module
export const Punctuation = {
  JUDGMENT: '.',
  QUESTION: '?',
  GOAL: '!'
};

/**
 * Represents a truth value with frequency and confidence
 */
export class TruthValue {
  constructor(frequency = 0.5, confidence = 0.9) {
    this.f = Math.max(0, Math.min(1, frequency));      // frequency between 0 and 1
    this.c = Math.max(0, Math.min(1, confidence));     // confidence between 0 and 1
  }
  
  static fromObject(obj) {
    if (!obj) return new TruthValue();
    return new TruthValue(obj.frequency || obj.f || 0.5, obj.confidence || obj.c || 0.9);
  }
  
  clone() {
    return new TruthValue(this.f, this.c);
  }
}

/**
 * Represents a Term in NARS
 */
export class Term {
  constructor(name) {
    this.name = name;
  }
  
  static newAtom(name) {
    return new Term(name);
  }
  
  toString() {
    return this.name;
  }
  
  clone() {
    return new Term(this.name);
  }
}

/**
 * Represents a Task in NARS
 */
export class Task {
  constructor(term, punctuation = '.', truth = null, budget = null, occurrenceTime = null, priority = 0.5, durability = 0.5, occurrenceSpan = null, metadata = null) {
    this.term = term instanceof Term ? term : new Term(String(term));
    this.punctuation = punctuation;
    this.truth = truth ? TruthValue.fromObject(truth) : new TruthValue();
    this.budget = budget;
    this.stamp = {
      occurrenceTime: occurrenceTime || Date.now(),
      occurrenceSpan: occurrenceSpan || 0,
      occurrenceOffset: 0
    };
    this.priority = priority;
    this.durability = durability;
    this.metadata = metadata;
  }
  
  getPriority() {
    return this.priority || 0;
  }
  
  getPunctuation() {
    return this.punctuation;
  }
  
  toString() {
    return `${this.term.toString()}${this.punctuation}`;
  }
  
  clone() {
    return new Task(
      this.term.clone(),
      this.punctuation,
      this.truth.clone(),
      this.budget,
      this.stamp.occurrenceTime,
      this.priority,
      this.durability,
      this.stamp.occurrenceSpan,
      { ...this.metadata }
    );
  }
}

/**
 * Utility functions for creating derived tasks
 */
export class TaskDerivation {
  /**
   * Create a derived task based on an original task with modifications
   */
  static createDerived(originalTask, modifications = {}) {
    const newTask = originalTask.clone();
    
    if (modifications.term !== undefined) {
      newTask.term = modifications.term instanceof Term ? modifications.term : new Term(modifications.term);
    }
    if (modifications.punctuation !== undefined) {
      newTask.punctuation = modifications.punctuation;
    }
    if (modifications.truth !== undefined) {
      newTask.truth = TruthValue.fromObject(modifications.truth);
    }
    if (modifications.priority !== undefined) {
      newTask.priority = modifications.priority;
    }
    if (modifications.durability !== undefined) {
      newTask.durability = modifications.durability;
    }
    if (modifications.metadata !== undefined) {
      newTask.metadata = { ...newTask.metadata, ...modifications.metadata };
    }
    
    // Add derivation tracking
    newTask.metadata = {
      ...newTask.metadata,
      derivedFrom: originalTask.term?.toString?.() || 'unknown',
      derivationTime: Date.now(),
      derivationType: modifications.derivationType || 'default'
    };
    
    return newTask;
  }
  
  /**
   * Create a derived truth value with confidence adjustment
   */
  static deriveTruth(originalTruth, confidenceMultiplier = 0.9, frequencyAdjustment = 0) {
    const baseTruth = TruthValue.fromObject(originalTruth);
    const newFrequency = Math.max(0, Math.min(1, baseTruth.f + frequencyAdjustment));
    const newConfidence = Math.max(0, Math.min(1, baseTruth.c * confidenceMultiplier));
    return new TruthValue(newFrequency, newConfidence);
  }
  
  /**
   * Create a new task based on a template and original task
   */
  static createFromTemplate(originalTask, term, punctuation = '.', truthOptions = {}) {
    const derivedTruth = this.deriveTruth(originalTask.truth, truthOptions.confidenceMultiplier, truthOptions.frequencyAdjustment);
    
    return new Task(
      term instanceof Term ? term : new Term(term),
      punctuation,
      { 
        frequency: truthOptions.frequency !== undefined ? truthOptions.frequency : derivedTruth.f,
        confidence: truthOptions.confidence !== undefined ? truthOptions.confidence : derivedTruth.c
      },
      originalTask.budget,
      Date.now(),
      truthOptions.priority !== undefined ? truthOptions.priority : originalTask.priority * 0.9,
      truthOptions.durability !== undefined ? truthOptions.durability : originalTask.durability * 0.8
    );
  }
}