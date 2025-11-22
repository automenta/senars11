import {freeze} from '../util/common.js';
import {Truth} from './Truth.js';
import {Stamp} from './Stamp.js';

export const TaskType = Object.freeze({
    BELIEF: 'BELIEF',
    GOAL: 'GOAL',
    QUESTION: 'QUESTION'
});

export class Task {
    constructor(term, type, truth = null, stamp = null, budget = null) {
        this.term = term;
        this.type = type;
        this.truth = truth || (type === TaskType.BELIEF ? Truth.TRUE : null);
        this.stamp = stamp || new Stamp();
        this.budget = budget || { priority: 0.9, durability: 0.9, quality: 0.9 };

        return freeze(this);
    }

    toString() {
        const punc = this.type === TaskType.BELIEF ? '.' : (this.type === TaskType.GOAL ? '!' : '?');
        const truthStr = this.truth ? this.truth.toString() : '';
        return `${this.term.name}${punc}${truthStr}`;
    }
}
