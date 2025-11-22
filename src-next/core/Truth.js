import {freeze} from '../util/common.js';

export class Truth {
    constructor(frequency, confidence) {
        this.frequency = frequency;
        this.confidence = confidence;
        return freeze(this);
    }

    toString() {
        return `{${this.frequency.toFixed(2)}, ${this.confidence.toFixed(2)}}`;
    }

    static get TRUE() { return new Truth(1.0, 0.9); }
}
