#!/usr/bin/env node

/**
 * Configuration utilities for autonomous development and other parameterized processes
 */

/**
 * Generate random value within a range
 */
const randomInRange = (min, max) => Math.random() * (max - min) + min;

/**
 * Generate a unique ID using timestamp and random components
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Parse string from value
 */
const parseString = (value) => String(value);

/**
 * Parse integer from value
 */
const parseInt = (value) => parseInt(value, 10);

/**
 * Parse float from value
 */
const parseFloat = (value) => parseFloat(value);

/**
 * Parse boolean from value
 */
const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1' || str === 'yes';
};

export const ConfigUtils = {
    /**
     * Create a configuration by combining defaults with custom values
     */
    createConfig: (defaults, customValues = {}) => {
        const config = { ...defaults };
        
        for (const [key, value] of Object.entries(customValues)) {
            if (config.hasOwnProperty(key)) {
                config[key] = value;
            }
        }
        
        return config;
    },

    /**
     * Parse command line arguments into key-value pairs
     */
    parseArgs: (args, specs) => {
        const result = {};
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (specs[arg] && args[i + 1]) {
                const key = specs[arg].key || arg.replace(/^--/, '');
                result[key] = specs[arg].parser 
                    ? specs[arg].parser(args[i + 1]) 
                    : args[i + 1];
                i++; // Skip the next argument since it's the value
            } else if (arg.startsWith('--no-')) {
                const key = arg.replace(/^--no-/, '');
                result[key] = false;
            } else if (arg.startsWith('--')) {
                const key = arg.replace(/^--/, '');
                if (specs[arg]?.boolean || specs[`--no-${key}`]) {
                    result[key] = true;
                }
            }
        }
        
        return result;
    },

    generateId,
    randomInRange,
    parseString,
    parseInt,
    parseFloat,
    parseBoolean
};

export default ConfigUtils;