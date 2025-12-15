import {Truth} from '../Truth.js';
import {ArrayStamp} from '../Stamp.js';
import {Term} from '../term/Term.js';

export const Punctuation = Object.freeze({
    BELIEF: '.',
    GOAL: '!',
    QUESTION: '?'
});

const PUNCTUATION_TO_TYPE = Object.freeze({
    [Punctuation.BELIEF]: 'BELIEF',
    [Punctuation.GOAL]: 'GOAL',
    [Punctuation.QUESTION]: 'QUESTION'
});
const TYPE_TO_PUNCTUATION = Object.freeze({
    'BELIEF': Punctuation.BELIEF,
    'GOAL': Punctuation.GOAL,
    'QUESTION': Punctuation.QUESTION
});
const DEFAULT_BUDGET = Object.freeze({priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10});

export class Task {
    constructor({
                    term,
                    punctuation = '.',
                    truth = null,
                    budget = DEFAULT_BUDGET,
                    stamp = null,
                    metadata = null
                }) {
        if (!(term instanceof Term)) throw new Error('Task must be initialized with a valid Term object.');

        let finalTerm = term;
        let finalTruth = truth;

        // Handle negation: (--, T) -> T with inverted truth
        if (finalTerm.operator === '--' && finalTerm.components && finalTerm.components.length === 1) {
            finalTerm = finalTerm.components[0];
            if (finalTruth) {
                // Invert truth: f' = 1 - f, c' = c
                // Or for NARS: negation of (f, c) is (1-f, c)
                if (finalTruth instanceof Truth) {
                    finalTruth = new Truth(1.0 - finalTruth.f, finalTruth.c);
                } else if (finalTruth.frequency !== undefined) {
                    finalTruth = {
                        frequency: 1.0 - finalTruth.frequency,
                        confidence: finalTruth.confidence
                    };
                }
            }
        }

        this.term = finalTerm;
        this.type = PUNCTUATION_TO_TYPE[punctuation] ?? 'BELIEF';

        // Validate truth value based on task type
        const hasValidTruthForType = this.type === 'QUESTION'
            ? (finalTruth === null)
            : (finalTruth !== null);

        if (!hasValidTruthForType) {
            const errorMsg = this.type === 'QUESTION'
                ? 'Questions cannot have truth values'
                : `${this.type} tasks must have valid truth values`;
            throw new Error(errorMsg);
        }

        this.truth = this._createTruth(finalTruth);
        this.budget = Object.freeze({...budget});
        this.stamp = stamp ?? ArrayStamp.createInput();
        this.metadata = metadata;
        Object.freeze(this);
    }

    get punctuation() {
        return TYPE_TO_PUNCTUATION[this.type];
    }

    static fromJSON(data) {
        if (!data) {
            throw new Error('Task.fromJSON requires valid data object');
        }

        const reconstructedTerm = data.term ?
            (typeof data.term === 'string' ?
                {toString: () => data.term, equals: (other) => other.toString && other.toString() === data.term} :
                data.term) :
            null;

        return new Task({
            term: reconstructedTerm,
            punctuation: data.punctuation,
            truth: data.truth ? new Truth(data.truth.frequency || data.truth.f, data.truth.confidence || data.truth.c) : null,
            budget: data.budget || {priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10}
        });
    }

    _createTruth(truth) {
        if (truth instanceof Truth) return truth;
        if (!truth) return null;

        // Handle format: {frequency, confidence}
        if (truth.frequency !== undefined && truth.confidence !== undefined) {
            return new Truth(truth.frequency, truth.confidence);
        }

        return null;
    }

    clone(overrides = {}) {
        return new Task({
            term: this.term,
            punctuation: this.punctuation,
            truth: this.truth,
            budget: {...this.budget}, // Shallow copy budget to avoid reference issues
            stamp: this.stamp,
            ...overrides,
        });
    }

    isBelief = () => this.type === 'BELIEF';

    isGoal = () => this.type === 'GOAL';

    isQuestion = () => this.type === 'QUESTION';

    equals(other) {
        if (!(other instanceof Task) || this.type !== other.type) return false;

        // Check term equality first (early exit if terms don't match)
        if (this.term !== other.term && !this.term.equals(other.term)) return false;

        const thisHasTruth = this.truth !== null;
        const otherHasTruth = other.truth !== null;

        // Check truth existence first (early exit if truth existence differs)
        if (thisHasTruth !== otherHasTruth) return false;

        // If both have truth, check truth equality
        if (thisHasTruth && otherHasTruth && !this.truth.equals(other.truth)) return false;

        return true;
    }

    toString() {
        const truthStr = this.truth ? ` ${this.truth.toString()}` : '';
        return `${this.term.toString()}${this.punctuation}${truthStr}`;
    }

    serialize() {
        return {
            term: this.term.serialize ? this.term.serialize() : this.term.toString(),
            punctuation: this.punctuation,
            type: this.type,
            truth: this.truth ? this.truth.serialize ? this.truth.serialize() : {
                f: this.truth.f,
                c: this.truth.c
            } : null,
            budget: this.budget,
            stamp: this.stamp.serialize ? this.stamp.serialize() : null,
            version: '1.0.0'
        };
    }
}