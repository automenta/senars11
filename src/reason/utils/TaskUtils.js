/**
 * @file src/reason/TaskUtils.js
 * @description Utilities for working with NARS tasks, truth values, and terms.
 */

import {Term} from '../../term/Term.js';
import {TermFactory} from '../../term/TermFactory.js';
import {Truth} from '../../Truth.js';

const termFactory = new TermFactory();

export const Punctuation = {
    BELIEF: '.',
    QUESTION: '?',
    GOAL: '!'
};

function createTruth(obj) {
    if (obj instanceof Truth) return obj;
    if (!obj) return new Truth();
    return new Truth(obj.frequency ?? obj.f ?? 0.5, obj.confidence ?? obj.c ?? 0.9);
}

// Export Truth for backward compatibility or direct usage
export { Truth as TruthValue };

export class Task {
    constructor(term, punctuation = '.', truth = null, budget = null, occurrenceTime = null, priority = 0.5, durability = 0.5, occurrenceSpan = null, metadata = null) {
        this.term = term instanceof Term ? term : termFactory.atomic(String(term));
        this.punctuation = punctuation;
        this.truth = truth ? createTruth(truth) : new Truth();
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
            this.term, // Term is immutable
            this.punctuation,
            this.truth, // Truth is immutable
            this.budget,
            this.stamp.occurrenceTime,
            this.priority,
            this.durability,
            this.stamp.occurrenceSpan,
            {...this.metadata}
        );
    }
}

export class TaskDerivation {
    static createDerived(originalTask, modifications = {}) {
        const newTask = originalTask.clone();

        for (const [key, value] of Object.entries(modifications)) {
            if (value !== undefined) {
                if (key === 'term') {
                    newTask.term = value instanceof Term ? value : termFactory.atomic(String(value));
                } else if (key === 'truth') {
                    newTask.truth = createTruth(value);
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
        const baseTruth = createTruth(originalTruth);
        const newFrequency = Math.max(0, Math.min(1, baseTruth.f + frequencyAdjustment));
        const newConfidence = Math.max(0, Math.min(1, baseTruth.c * confidenceMultiplier));
        return new Truth(newFrequency, newConfidence);
    }

    static createFromTemplate(originalTask, term, punctuation = '.', truthOptions = {}) {
        const derivedTruth = this.deriveTruth(originalTask.truth, truthOptions.confidenceMultiplier, truthOptions.frequencyAdjustment);

        return new Task(
            term instanceof Term ? term : termFactory.atomic(String(term)),
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
