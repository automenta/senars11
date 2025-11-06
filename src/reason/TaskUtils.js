/**
 * @file src/reason/TaskUtils.js
 * @description Utilities for working with NARS tasks, truth values, and terms.
 */

export const Punctuation = {
  JUDGMENT: '.',
  QUESTION: '?',
  GOAL: '!'
};

export class TruthValue {
  constructor(frequency = 0.5, confidence = 0.9) {
    this.f = Math.max(0, Math.min(1, frequency));
    this.c = Math.max(0, Math.min(1, confidence));
  }
  
  static fromObject(obj) {
    if (!obj) return new TruthValue();
    return new TruthValue(obj.frequency ?? obj.f ?? 0.5, obj.confidence ?? obj.c ?? 0.9);
  }
  
  clone() {
    return new TruthValue(this.f, this.c);
  }
}

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

export class Task {
  constructor(term, punctuation = '.', truth = null, budget = null, occurrenceTime = null, priority = 0.5, durability = 0.5, occurrenceSpan = null, metadata = null) {
    this.term = term instanceof Term ? term : new Term(String(term));
    this.punctuation = punctuation;
    this.truth = truth ? TruthValue.fromObject(truth) : new TruthValue();
    this.budget = budget;
    this.stamp = {
      occurrenceTime: occurrenceTime ?? Date.now(),
      occurrenceSpan: occurrenceSpan ?? 0,
      occurrenceOffset: 0
    };
    this.priority = priority;
    this.durability = durability;
    this.metadata = metadata;
  }
  
  getPriority() {
    return this.priority ?? 0;
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

export class TaskDerivation {
  static createDerived(originalTask, modifications = {}) {
    const newTask = originalTask.clone();
    
    for (const [key, value] of Object.entries(modifications)) {
      if (value !== undefined) {
        if (key === 'term') {
          newTask.term = value instanceof Term ? value : new Term(value);
        } else if (key === 'truth') {
          newTask.truth = TruthValue.fromObject(value);
        } else {
          newTask[key] = value;
        }
      }
    }
    
    newTask.metadata = {
      ...newTask.metadata,
      derivedFrom: originalTask.term?.toString?.() ?? 'unknown',
      derivationTime: Date.now(),
      derivationType: modifications.derivationType ?? 'default'
    };
    
    return newTask;
  }
  
  static deriveTruth(originalTruth, confidenceMultiplier = 0.9, frequencyAdjustment = 0) {
    const baseTruth = TruthValue.fromObject(originalTruth);
    const newFrequency = Math.max(0, Math.min(1, baseTruth.f + frequencyAdjustment));
    const newConfidence = Math.max(0, Math.min(1, baseTruth.c * confidenceMultiplier));
    return new TruthValue(newFrequency, newConfidence);
  }
  
  static createFromTemplate(originalTask, term, punctuation = '.', truthOptions = {}) {
    const derivedTruth = this.deriveTruth(originalTask.truth, truthOptions.confidenceMultiplier, truthOptions.frequencyAdjustment);
    
    return new Task(
      term instanceof Term ? term : new Term(term),
      punctuation,
      { 
        frequency: truthOptions.frequency ?? derivedTruth.f,
        confidence: truthOptions.confidence ?? derivedTruth.c
      },
      originalTask.budget,
      Date.now(),
      truthOptions.priority ?? originalTask.priority * 0.9,
      truthOptions.durability ?? originalTask.durability * 0.8
    );
  }
}