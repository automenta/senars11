/**
 * Abstract Functor interface for atomic operations in the SeNARS system.
 */
export class Functor {
    constructor(name, execute, config = {}) {
        if (this.constructor === Functor) {
            throw new TypeError('Cannot instantiate abstract class Functor directly');
        }

        this.name = name;
        this.execute = execute;
        this.config = config;
        this.arity = config.arity ?? 0;
        this.isCommutative = config.isCommutative || false;
        this.isAssociative = config.isAssociative || false;
    }

    call(...args) {
        if (args.length !== this.arity && this.arity !== -1) {
            throw new Error(`Functor ${this.name} expected ${this.arity} arguments, got ${args.length}`);
        }
        return this.execute(...args);
    }

    validate(...args) {
        return this.arity === -1 || args.length === this.arity;
    }
}

/**
 * Concrete implementation of Functor to wrap simple functions
 */
export class ConcreteFunctor extends Functor {
    constructor(name, execute, config = {}) {
        super(name, execute, config);
    }
}

// Private utilities for FunctorRegistry
const extractArity = aliases => aliases.length > 0 && Array.isArray(aliases[aliases.length - 1]) ? aliases.pop() : 0;
const addAliases = (registry, aliases, functorName) => aliases.forEach(alias => registry.aliases.set(alias, functorName));
const removeAliases = (registry, functorName) => {
    for (const [alias, name] of registry.aliases.entries()) {
        if (name === functorName) registry.aliases.delete(alias);
    }
};
const areFunctionallyEquivalent = (existingFunctor, newFunctor) => 
    existingFunctor &&
    existingFunctor.execute.toString() === newFunctor.execute.toString() &&
    existingFunctor.arity === newFunctor.arity &&
    existingFunctor.isCommutative === newFunctor.isCommutative &&
    existingFunctor.isAssociative === newFunctor.isAssociative;

/**
 * FunctorRegistry - A system for registering and managing Functors
 */
export class FunctorRegistry {
    constructor() {
        this.functors = new Map();
        this.aliases = new Map();
    }

    register(name, functor, aliases = []) {
        const aliasesCopy = Array.isArray(aliases) ? [...aliases] : [];
        functor = typeof functor === 'function' 
            ? new ConcreteFunctor(name, functor, {arity: extractArity(aliasesCopy)}) 
            : functor;

        if (this.functors.has(name) && !areFunctionallyEquivalent(this.functors.get(name), functor)) {
            this.logger?.warn(`Functor ${name} is already registered, replacing it.`);
        }

        this.functors.set(name, functor);
        addAliases(this, aliasesCopy, name);

        return true;
    }

    get(name) {
        const actualName = this.aliases.get(name) || name;
        return this.functors.get(actualName) || null;
    }

    execute(name, ...args) {
        const functor = this.get(name);
        if (!functor) throw new Error(`Functor ${name} is not registered`);
        if (!functor.validate(...args)) throw new Error(`Invalid arguments for functor ${name}`);
        return functor.call(...args);
    }

    has(name) {
        const actualName = this.aliases.get(name) || name;
        return this.functors.has(actualName);
    }

    unregister(name) {
        const actualName = this.aliases.get(name) || name;
        if (!this.functors.has(actualName)) return false;

        removeAliases(this, actualName);
        return this.functors.delete(actualName);
    }

    getFunctorNames() { return Array.from(this.functors.keys()); }
    getAliases() { return Array.from(this.aliases.keys()); }

    getStats() {
        return {
            functorCount: this.functors.size,
            aliasCount: this.aliases.size,
            functors: this.getFunctorNames(),
            aliases: this.getAliases()
        };
    }

    clear() {
        this.functors.clear();
        this.aliases.clear();
    }

    // Enhanced registration method with configuration options
    registerFunctor(name, execute, config = {}) {
        const functor = new ConcreteFunctor(name, execute, config);

        if (this.functors.has(name)) {
            this.logger?.warn(`Functor ${name} is already registered, replacing it.`);
        }

        this.functors.set(name, functor);

        return functor;
    }

    // Dynamic registration method for use at runtime
    registerFunctorDynamic(name, execute, config = {}) {
        return this.registerFunctor(name, execute, {
            arity: config.arity || 2,
            isCommutative: config.isCommutative || false,
            isAssociative: config.isAssociative || false,
            description: config.description || 'Dynamic functor',
            ...config
        });
    }

    // Get functor properties
    getFunctorProperties(name) {
        const functor = this.get(name);
        return functor ? {
            name: functor.name,
            arity: functor.arity,
            isCommutative: functor.isCommutative,
            isAssociative: functor.isAssociative,
            config: functor.config
        } : null;
    }

    // Check if a functor has specific properties
    hasProperty(name, property) {
        const functor = this.get(name);
        if (!functor) return false;

        switch (property) {
            case 'commutative': return functor.isCommutative;
            case 'associative': return functor.isAssociative;
            default: return functor.config[property] === true;
        }
    }

    // Get all functors with a specific property
    getFunctorsWithProperty(property) {
        const isPropertyMatch = functor => {
            switch (property) {
                case 'commutative': return functor.isCommutative;
                case 'associative': return functor.isAssociative;
                default: return functor.config[property] === true;
            }
        };

        return Array.from(this.functors.entries())
            .filter(([, functor]) => isPropertyMatch(functor))
            .map(([name, functor]) => ({name, functor}));
    }
}