import {freeze} from '../util/common.js';
import {TraceId} from '../infra/TraceId.js';

export class Stamp {
    constructor(id, creationTime, derivations = []) {
        this.id = id || TraceId.generate();
        this.creationTime = creationTime || Date.now();
        this.derivations = derivations; // Array of parent Stamp IDs
        return freeze(this);
    }

    static merge(stamps) {
        // For future: Logic to merge derivation histories
        const allDerivations = stamps.flatMap(s => [s.id, ...s.derivations]);
        return new Stamp(TraceId.generate(), Date.now(), [...new Set(allDerivations)]);
    }
}
