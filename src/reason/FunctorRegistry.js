/**
 * FunctorRegistry for managing functors in the evaluation system
 */
import { ReasonerError, logError } from './utils/error.js';

export class FunctorRegistry {
  constructor() {
    this.functors = new Map();
    this.aliases = new Map();
    
    // Add performance monitoring BEFORE initializing default functors
    this.executionStats = new Map();
    
    this._initDefaultFunctors();
  }

  _initDefaultFunctors() {
    // Default boolean functors
    this.registerFunctorDynamic('True', () => true, { 
      arity: 0, 
      description: 'Always returns true',
      category: 'boolean'
    });
    this.registerFunctorDynamic('False', () => false, { 
      arity: 0, 
      description: 'Always returns false',
      category: 'boolean'
    });
    this.registerFunctorDynamic('Null', () => null, { 
      arity: 0, 
      description: 'Always returns null',
      category: 'null'
    });
    
    // Default arithmetic functors
    this.registerFunctorDynamic('add', (a, b) => (a !== null && b !== null) ? Number(a) + Number(b) : null, { 
      arity: 2, 
      isCommutative: true, 
      isAssociative: true, 
      description: 'Addition operation',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('subtract', (a, b) => (a !== null && b !== null) ? Number(a) - Number(b) : null, { 
      arity: 2, 
      isCommutative: false, 
      isAssociative: false, 
      description: 'Subtraction operation',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('multiply', (a, b) => (a !== null && b !== null) ? Number(a) * Number(b) : null, { 
      arity: 2, 
      isCommutative: true, 
      isAssociative: true, 
      description: 'Multiplication operation',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('divide', (a, b) => (a !== null && b !== null && Number(b) !== 0) ? Number(a) / Number(b) : null, { 
      arity: 2, 
      isCommutative: false, 
      isAssociative: false, 
      description: 'Division operation',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('cmp', (a, b) => (a !== null && b !== null) ? (Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0) : null, { 
      arity: 2, 
      description: 'Comparison operation',
      category: 'comparison'
    });
    
    // Additional useful functors
    this.registerFunctorDynamic('min', Math.min, { 
      arity: 2, 
      isCommutative: true, 
      description: 'Minimum of two values',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('max', Math.max, { 
      arity: 2, 
      isCommutative: true, 
      description: 'Maximum of two values',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('pow', Math.pow, { 
      arity: 2, 
      isCommutative: false, 
      description: 'Power operation',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('sqrt', Math.sqrt, { 
      arity: 1, 
      description: 'Square root',
      category: 'arithmetic'
    });
    this.registerFunctorDynamic('abs', Math.abs, { 
      arity: 1, 
      description: 'Absolute value',
      category: 'arithmetic'
    });
    
    // Logical functors
    this.registerFunctorDynamic('and', (a, b) => Boolean(a) && Boolean(b), { 
      arity: 2, 
      isCommutative: true, 
      description: 'Logical AND',
      category: 'logical'
    });
    this.registerFunctorDynamic('or', (a, b) => Boolean(a) || Boolean(b), { 
      arity: 2, 
      isCommutative: true, 
      description: 'Logical OR',
      category: 'logical'
    });
    this.registerFunctorDynamic('not', a => !Boolean(a), { 
      arity: 1, 
      description: 'Logical NOT',
      category: 'logical'
    });
    
    // String functors
    this.registerFunctorDynamic('concat', (a, b) => String(a) + String(b), { 
      arity: 2, 
      isCommutative: false, 
      description: 'String concatenation',
      category: 'string'
    });
  }

  /**
   * Register a functor with dynamic properties
   */
  registerFunctorDynamic(name, fn, properties = {}) {
    if (typeof fn !== 'function') {
      throw new ReasonerError(`Functor function must be a function, got ${typeof fn}`, 'FUNCTOR_ERROR');
    }

    const functor = {
      name,
      fn,
      arity: properties.arity || 0,
      isCommutative: properties.isCommutative || false,
      isAssociative: properties.isAssociative || false,
      description: properties.description || '',
      category: properties.category || 'general',
      ...properties
    };
    
    this.functors.set(name, functor);
    
    // Register aliases if provided
    if (properties.aliases) {
      for (const alias of properties.aliases) {
        this.aliases.set(alias, name);
      }
    }
    
    // Initialize execution statistics
    this.executionStats.set(name, {
      callCount: 0,
      errorCount: 0,
      totalExecutionTime: 0,
      avgExecutionTime: 0
    });
    
    return functor;
  }

  /**
   * Register a batch of functors
   */
  registerBatch(functorDefinitions) {
    const results = [];
    for (const [name, definition] of Object.entries(functorDefinitions)) {
      const { fn, properties } = definition;
      results.push(this.registerFunctorDynamic(name, fn, properties));
    }
    return results;
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
   * Execute a functor with performance tracking
   */
  execute(name, ...args) {
    const functor = this.get(name);
    if (!functor) {
      throw new ReasonerError(`Functor '${name}' not found`, 'FUNCTOR_NOT_FOUND');
    }
    
    const stats = this.executionStats.get(functor.name) || {
      callCount: 0,
      errorCount: 0,
      totalExecutionTime: 0,
      avgExecutionTime: 0
    };
    
    // Check arity
    if (args.length !== functor.arity && functor.arity !== -1) { // -1 means variable arity
      throw new ReasonerError(
        `Functor '${name}' expects ${functor.arity} arguments, got ${args.length}`,
        'FUNCTOR_ARITY_MISMATCH'
      );
    }
    
    const startTime = Date.now();
    stats.callCount++;
    
    try {
      const result = functor.fn(...args);
      const executionTime = Date.now() - startTime;
      
      stats.totalExecutionTime += executionTime;
      stats.avgExecutionTime = stats.totalExecutionTime / stats.callCount;
      
      this.executionStats.set(functor.name, stats);
      return result;
    } catch (error) {
      stats.errorCount++;
      logError(error, { functor: name, args }, 'error');
      
      this.executionStats.set(functor.name, stats);
      throw new ReasonerError(
        `Error executing functor '${name}': ${error.message}`,
        'FUNCTOR_EXECUTION_ERROR',
        { originalError: error, functorName: name, args }
      );
    }
  }

  /**
   * Execute a functor asynchronously with timeout
   */
  async executeWithTimeout(name, timeoutMs = 1000, ...args) {
    return Promise.race([
      this.execute(name, ...args),
      new Promise((_, reject) => 
        setTimeout(() => reject(new ReasonerError(
          `Functor '${name}' execution timed out after ${timeoutMs}ms`,
          'FUNCTOR_TIMEOUT'
        )), timeoutMs)
      )
    ]);
  }

  /**
   * Get functor properties
   */
  getFunctorProperties(name) {
    const functor = this.get(name);
    if (!functor) return null;
    
    return {
      name: functor.name,
      arity: functor.arity,
      isCommutative: functor.isCommutative,
      isAssociative: functor.isAssociative,
      description: functor.description,
      category: functor.category
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
   * Get functors by category
   */
  getFunctorsByCategory(category) {
    const result = [];
    for (const [name, functor] of this.functors) {
      if (functor.category === category) {
        result.push({...functor, name});
      }
    }
    return result;
  }

  /**
   * Get functors by arity
   */
  getFunctorsByArity(arity) {
    const result = [];
    for (const [name, functor] of this.functors) {
      if (functor.arity === arity) {
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
      
      // Remove execution statistics
      this.executionStats.delete(actualName);
      
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
    const functorNames = Array.from(this.functors.keys());
    const categoryCounts = {};
    
    for (const [name, functor] of this.functors) {
      categoryCounts[functor.category] = (categoryCounts[functor.category] || 0) + 1;
    }
    
    return {
      functorCount: this.functors.size,
      aliasCount: this.aliases.size,
      categoryCounts,
      executionStats: this.getExecutionStats()
    };
  }

  /**
   * Get execution statistics for all functors
   */
  getExecutionStats() {
    const stats = {};
    for (const [name, stat] of this.executionStats) {
      stats[name] = { ...stat };
    }
    return stats;
  }

  /**
   * Get execution statistics for a specific functor
   */
  getFunctorExecutionStats(functorName) {
    return this.executionStats.get(functorName);
  }

  /**
   * Clear all functors
   */
  clear() {
    this.functors.clear();
    this.aliases.clear();
    this.executionStats.clear();
    this._initDefaultFunctors();
  }

  /**
   * Bulk execute multiple functors and return results
   */
  executeBulk(functorCalls) {
    const results = [];
    for (const { name, args } of functorCalls) {
      try {
        const result = this.execute(name, ...(args || []));
        results.push({ name, result, success: true });
      } catch (error) {
        results.push({ name, result: null, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Get functor names by matching pattern
   */
  findFunctors(pattern) {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.functors.keys()).filter(name => regex.test(name));
  }
}