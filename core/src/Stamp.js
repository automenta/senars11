import {v4 as uuidv4} from 'uuid';

export class Stamp {
    constructor() {
        if (this.constructor === Stamp) throw new Error("Abstract classes can't be instantiated.");
    }

    static createInput = () => new ArrayStamp({source: 'INPUT', depth: 0});
    static derive = (parentStamps = [], depth = 0) => {
        const allDerivations = parentStamps.flatMap(s => s.derivations ? [s.id, ...s.derivations] : [s.id]);
        const maxParentDepth = parentStamps.length > 0 ? Math.max(...parentStamps.map(s => s.depth || 0)) : 0;
        return new ArrayStamp({derivations: [...new Set(allDerivations)], depth: maxParentDepth + 1});
    };
}

export class ArrayStamp extends Stamp {
    constructor({id = uuidv4(), creationTime = Date.now(), source = 'DERIVED', derivations = [], depth = 0} = {}) {
        super();
        Object.assign(this, {id, creationTime, source, derivations: Object.freeze([...new Set(derivations)]), depth});
        Object.freeze(this);
    }

    get occurrenceTime() {
        return this.creationTime;
    }

    equals = other => other instanceof ArrayStamp && this.id === other.id;
    toString = () => `Stamp(${this.id},${this.creationTime},${this.source})`;
}

export class BloomStamp extends Stamp {
    constructor() {
        super();
        throw new Error("BloomStamp is not yet implemented.");
    }
}