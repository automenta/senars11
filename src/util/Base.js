/**
 * Abstract base class for immutable objects with optional validation.
 * Enforces immutability via Object.freeze after construction.
 */
export class Base {
    /**
     * @param {Object} [props={}] - Properties to assign to the instance
     * @param {Function} [validator=null] - Optional validation function
     */
    constructor(props = {}, validator = null) {
        if (this.constructor === Base) {
            throw new Error('Base is abstract and cannot be instantiated directly');
        }

        Object.assign(this, props);
        validator?.(this);
        Object.freeze(this);
    }
}
