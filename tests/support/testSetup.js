/**
 * @file testSetup.js
 * @description Centralized test setup utilities following AGENTS.md guidelines
 * 
 * This file provides common setup patterns to reduce duplication across tests
 */

import { NARTestSetup as BaseNARTestSetup } from './baseTestUtils.js';
import { createTestTask, createTestMemory, createTestTaskBag } from './baseTestUtils.js';

/**
 * Centralized test setup for NAR integration tests
 * @param {Object} config - Configuration options for the test setup
 * @returns {Object} A test setup object with common methods
 */
export const createNARTestSetup = (config = {}) => {
    return new BaseNARTestSetup(config);
};

/**
 * Generic test setup for component testing
 * @param {Function} ComponentClass - The component class to test
 * @param {Object} defaultConfig - Default configuration for the component
 * @returns {Object} A test setup object with lifecycle methods
 */
export const createComponentTestSetup = (ComponentClass, defaultConfig = {}) => {
    return new class {
        constructor(ComponentClass, defaultConfig = {}) {
            this.ComponentClass = ComponentClass;
            this.defaultConfig = defaultConfig;
            this.instance = null;
        }

        setup(config = {}) {
            const finalConfig = { ...this.defaultConfig, ...config };
            this.instance = new this.ComponentClass(finalConfig);
            return this.instance;
        }

        async teardown() {
            if (this.instance?.dispose) {
                await this.instance.dispose();
            }
            this.instance = null;
        }
    }(ComponentClass, defaultConfig);
};

/**
 * Common test lifecycle with automatic cleanup
 * @param {Function} setupFn - Function to create test instance
 * @param {Function} teardownFn - Function to clean up test instance
 * @returns {Object} An object with beforeEach, afterEach, and instance access
 */
export const createTestLifecycle = (setupFn, teardownFn) => ({
    instance: null,
    
    beforeEach: async () => {
        this.instance = typeof setupFn === 'function' ? await setupFn() : setupFn;
    },
    
    afterEach: async () => {
        if (typeof teardownFn === 'function' && this.instance) {
            await teardownFn(this.instance);
        }
        this.instance = null;
    },
    
    get: () => this.instance
});

/**
 * Common assertion patterns to reduce duplication
 */
export const commonAssertions = {
    /**
     * Assert that a value is close to expected within precision
     */
    expectCloseTo: (actual, expected, precision = 5) => 
        expect(actual).toBeCloseTo(expected, precision),
    
    /**
     * Assert that two objects have equal properties
     */
    expectObjectEquals: (actual, expected) => 
        expect(actual).toEqual(expected),
    
    /**
     * Assert that an object is instance of expected class
     */
    expectInstanceOf: (obj, expectedClass) => 
        expect(obj).toBeInstanceOf(expectedClass),
    
    /**
     * Assert that a property exists and is defined
     */
    expectPropertyDefined: (obj, prop) => 
        expect(obj?.[prop]).toBeDefined(),
    
    /**
     * Assert that an array contains at least one element matching a condition
     */
    expectArrayContains: (array, condition) => {
        const found = Array.isArray(array) ? array.some(condition) : false;
        expect(found).toBe(true);
    }
};

/**
 * Common test data factories
 */
export const testFactories = {
    createTask: createTestTask,
    createMemory: createTestMemory,
    createTaskBag: createTestTaskBag
};

/**
 * Common test patterns
 */
export const testPatterns = {
    /**
     * Standard initialization test pattern
     */
    standardInitialization: (Constructor, params, expectedProps = {}) => {
        test('initializes correctly', () => {
            const instance = new Constructor(params);
            expect(instance).toBeDefined();
            
            Object.entries(expectedProps).forEach(([key, value]) => {
                expect(instance[key]).toEqual(value);
            });
        });
    },

    /**
     * Standard lifecycle test pattern
     */
    standardLifecycle: (createInstance, destroyInstance) => {
        let instance;
        
        test('has required lifecycle methods', () => {
            instance = createInstance();
            expect(typeof instance.start).toBe('function');
            expect(typeof instance.stop).toBe('function');
            expect(typeof instance.reset).toBe('function');
        });
        
        test('can be destroyed', () => {
            if (instance) {
                destroyInstance(instance);
                expect(instance).toBeDefined(); // Basic check that destroy doesn't throw
            }
        });
    },

    /**
     * Standard equality test pattern
     */
    standardEquality: (createInstance) => {
        test('should be equal to itself', () => {
            const instance = createInstance();
            expect(instance.equals?.(instance)).toBe(true);
        });

        test('should not be equal to null/undefined', () => {
            const instance = createInstance();
            expect(instance.equals?.(null)).toBe(false);
            expect(instance.equals?.(undefined)).toBe(false);
        });
    }
};