import crypto from 'crypto';
import {freeze} from '../util/common.js';

export const TermType = Object.freeze({
    ATOM: 'atom',
    COMPOUND: 'compound',
});

export class Term {
    constructor(type, name, components = [], operator = null) {
        this._type = type;
        this._name = name;
        this._operator = operator;
        this._components = freeze(type === TermType.ATOM && components.length === 0 ? [name] : components);
        this._complexity = this._calculateComplexity();
        this._id = type === TermType.ATOM ? name : `${operator}_${name}`;
        this._hash = Term.hash(this._id);

        return freeze(this);
    }

    get type() { return this._type; }
    get name() { return this._name; }
    get operator() { return this._operator; }
    get components() { return this._components; }
    get complexity() { return this._complexity; }
    get hash() { return this._hash; }
    get isAtomic() { return this._type === TermType.ATOM; }
    get isCompound() { return this._type === TermType.COMPOUND; }

    static hash(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    _calculateComplexity() {
        return this._type === TermType.ATOM
            ? 1
            : 1 + this._components.reduce((sum, c) => sum + (c?.complexity || 0), 0);
    }

    equals(other) {
        if (!(other instanceof Term) ||
            this._type !== other._type ||
            this._operator !== other._operator ||
            this._name !== other._name) return false;

        if (this._type === TermType.COMPOUND) {
            if (this._components.length !== other._components.length) return false;
            for (let i = 0; i < this._components.length; i++) {
                if (!this._components[i].equals(other._components[i])) return false;
            }
        }
        return true;
    }

    toString() {
        return this.name;
    }
}
