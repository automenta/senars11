/**
 * Abstract base class for immutable objects with optional validation.
 * Enforces immutability via Object.freeze after construction.
 */
export class Base {
    constructor(props = {}, validator = null) {
        // Prevent direct instantiation of abstract class
        if (this.constructor === Base) {
            throw new Error('Base is abstract and cannot be instantiated directly');
        }

        // Assign properties and validate if validator provided
        Object.assign(this, props);
        validator?.(this);
        
        // Enforce immutability
        return Object.freeze(this);
    }
}
