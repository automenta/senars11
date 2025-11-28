import {Truth} from '../Truth.js';
import {ArrayStamp} from '../Stamp.js';
import {Term} from '../term/Term.js';
import {ConfigurationError, ParseError} from '../util/Errors.js';

const PUNCTUATION_TO_TYPE = Object.freeze({'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'});
const TYPE_TO_PUNCTUATION = Object.freeze({'BELIEF': '.', 'GOAL': '!', 'QUESTION': '?'});
const DEFAULT_BUDGET = Object.freeze({priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10});

export class Task {
    constructor({
                    term,
                    punctuation = '.',
                    truth = null,
                    budget = DEFAULT_BUDGET,
                    stamp = null
                }) {
        if (!(term instanceof Term)) {
            throw new ConfigurationError(`Task must be initialized with a valid Term object. Received: ${typeof term}, value: ${term}`);
        }

        this.term = term;
        this.type = PUNCTUATION_TO_TYPE[punctuation] || 'BELIEF';

        // Validate truth value based on task type
        if (this.type === 'QUESTION') {
            if (truth !== null) {
                throw new ConfigurationError(`Questions cannot have truth values. Attempted to create ${this.type} task with truth value: ${truth}`);
            }
        } else if (this.type === 'BELIEF' || this.type === 'GOAL') {
            if (truth === null) {
                throw new ConfigurationError(`${this.type} tasks must have valid truth values. Attempted to create ${this.type} task without truth value`);
            }
        }

        this.truth = this._createTruth(truth);
        this.budget = Object.freeze({...budget});
        this.stamp = stamp || ArrayStamp.createInput();
        Object.freeze(this);
    }

    get punctuation() {
        return TYPE_TO_PUNCTUATION[this.type];
    }

    static fromJSON(data) {
        if (!data) {
            throw new ConfigurationError('Task.fromJSON requires valid data object');
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
        if (!truth) return null;
        if (truth instanceof Truth) return truth;
        if (this._isValidTruthFormat(truth)) return new Truth(truth.frequency, truth.confidence);
        return null;
    }

    _isValidTruthFormat(truth) {
        return truth.frequency !== undefined && truth.confidence !== undefined;
    }

    clone(overrides = {}) {
        return new Task({
            term: this.term,
            punctuation: this.punctuation,
            truth: this.truth,
            budget: this.budget,
            stamp: this.stamp,
            ...overrides,
        });
    }

    isBelief = () => this.type === 'BELIEF';

    isGoal = () => this.type === 'GOAL';

    isQuestion = () => this.type === 'QUESTION';

    equals(other) {
        if (!(other instanceof Task)) return false;
        if (this.type !== other.type) return false;
        if (this.term !== other.term && !this.term.equals(other.term)) return false;

        const thisHasTruth = this.truth !== null;
        const otherHasTruth = other.truth !== null;

        if (thisHasTruth !== otherHasTruth) return false;
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