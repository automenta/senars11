/**
 * FunctorRegistry for managing functors in the evaluation system
 */
export class FunctorRegistry {
  constructor() {
    this.functors = new Map();
    this.aliases = new Map();
    this._initDefaultFunctors();
  }

  _initDefaultFunctors() {
    // Default boolean functors
    this.registerFunctorDynamic('True', () => true, { 
      arity: 0, 
      description: 'Always returns true' 
    });
    this.registerFunctorDynamic('False', () => false, { 
      arity: 0, 
      description: 'Always returns false' 
    });
    this.registerFunctorDynamic('Null', () => null, { 
      arity: 0, 
      description: 'Always returns null' 
    });
    
    // Default arithmetic functors
    this.registerFunctorDynamic('add', (a, b) => (a !== null && b !== null) ? Number(a) + Number(b) : null, { 
      arity: 2, 
      isCommutative: true, 
      isAssociative: true, 
      description: 'Addition operation' 
    });
    this.registerFunctorDynamic('subtract', (a, b) => (a !== null && b !== null) ? Number(a) - Number(b) : null, { 
      arity: 2, 
      isCommutative: false, 
      isAssociative: false, 
      description: 'Subtraction operation' 
    });
    this.registerFunctorDynamic('multiply', (a, b) => (a !== null && b !== null) ? Number(a) * Number(b) : null, { 
      arity: 2, 
      isCommutative: true, 
      isAssociative: true, 
      description: 'Multiplication operation' 
    });
    this.registerFunctorDynamic('divide', (a, b) => (a !== null && b !== null && Number(b) !== 0) ? Number(a) / Number(b) : null, { 
      arity: 2, 
      isCommutative: false, 
      isAssociative: false, 
      description: 'Division operation' 
    });
    this.registerFunctorDynamic('cmp', (a, b) => (a !== null && b !== null) ? (Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0) : null, { 
      arity: 2, 
      description: 'Comparison operation' 
    });
  }

  /**
   * Register a functor with dynamic properties
   */
  registerFunctorDynamic(name, fn, properties = {}) {
    const functor = {
      name,
      fn,
      arity: properties.arity || 0,
      isCommutative: properties.isCommutative || false,
      isAssociative: properties.isAssociative || false,
      description: properties.description || '',
      ...properties
    };
    
    this.functors.set(name, functor);
    
    // Register aliases if provided
    if (properties.aliases) {
      for (const alias of properties.aliases) {
        this.aliases.set(alias, name);
      }
    }
    
    return functor;
  }

  /**
   * Get a functor by name
   */
  get(name) {
    const actualName = this.aliases.get(name) || name;
    return this.functors.get(actualName);
  }

  /**
   * Check if a functor exists
   */
  has(name) {
    const actualName = this.aliases.get(name) || name;
    return this.functors.has(actualName);
  }

  /**
   * Execute a functor
   */
  execute(name, ...args) {
    const functor = this.get(name);
    if (!functor) {
      throw new Error(`Functor '${name}' not found`);
    }
    
    if (args.length !== functor.arity) {
      throw new Error(`Functor '${name}' expects ${functor.arity} arguments, got ${args.length}`);
    }
    
    try {
      return functor.fn(...args);
    } catch (error) {
      throw new Error(`Error executing functor '${name}': ${error.message}`);
    }
  }

  /**
   * Get functor properties
   */
  getFunctorProperties(name) {
    const functor = this.get(name);
    if (!functor) return null;
    
    return {
      arity: functor.arity,
      isCommutative: functor.isCommutative,
      isAssociative: functor.isAssociative,
      description: functor.description
    };
  }

  /**
   * Get functors with specific property
   */
  getFunctorsWithProperty(property) {
    const result = [];
    for (const [name, functor] of this.functors) {
      if (functor[property]) {
        result.push({...functor, name});
      }
    }
    return result;
  }

  /**
   * Unregister a functor
   */
  unregister(name) {
    const actualName = this.aliases.get(name) || name;
    const functor = this.functors.get(actualName);
    if (functor) {
      this.functors.delete(actualName);
      
      // Remove associated aliases
      for (const [alias, target] of this.aliases) {
        if (target === actualName) {
          this.aliases.delete(alias);
        }
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get all functor names
   */
  getFunctorNames() {
    return Array.from(this.functors.keys());
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      functorCount: this.functors.size,
      aliasCount: this.aliases.size
    };
  }

  /**
   * Clear all functors
   */
  clear() {
    this.functors.clear();
    this.aliases.clear();
    this._initDefaultFunctors(); // Keep default functors
  }
}