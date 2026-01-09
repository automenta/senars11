/**
 * StdlibLoader.js - MeTTa Standard Library Loader
 * 
 * Manages loading of standard library .metta files into the interpreter space.
 * Handles file reading, parsing, and loading in dependency order.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * StdlibLoader - Manages standard library loading
 */
export class StdlibLoader {
    /**
     * @param {MeTTaInterpreter} interpreter - Interpreter instance
     * @param {Object} options - Loading options
     * @param {string} options.stdlibDir - Custom stdlib directory path
     * @param {Array<string>} options.modules - Modules to load (default: all)
     */
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.stdlibDir = options.stdlibDir || path.join(__dirname, '.');
        this.modules = options.modules || ['core', 'list', 'match', 'types'];
        this.loadedModules = new Set();
    }

    /**
     * Load all stdlib modules in dependency order
     * @returns {Object} Stats about loaded modules
     */
    load() {
        const stats = {
            loaded: [],
            failed: [],
            atomsAdded: 0
        };

        for (const moduleName of this.modules) {
            try {
                const result = this.loadModule(moduleName);
                stats.loaded.push(moduleName);
                stats.atomsAdded += result.atomCount;
                this.loadedModules.add(moduleName);
            } catch (error) {
                stats.failed.push({ module: moduleName, error: error.message });
                console.warn(`Failed to load stdlib module '${moduleName}':`, error.message);
            }
        }

        return stats;
    }

    /**
     * Load a single stdlib module
     * @param {string} moduleName - Module name (without .metta extension)
     * @returns {Object} Loading result
     */
    loadModule(moduleName) {
        const filePath = path.join(this.stdlibDir, `${moduleName}.metta`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Stdlib module not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const beforeCount = this.interpreter.space.size ? this.interpreter.space.size() : 0;

        // Use interpreter's load method to parse and add to space
        this.interpreter.load(content);

        const afterCount = this.interpreter.space.size ? this.interpreter.space.size() : 0;
        const atomCount = afterCount - beforeCount;

        return {
            module: moduleName,
            atomCount,
            filePath
        };
    }

    /**
     * Check if a module is loaded
     * @param {string} moduleName - Module name
     * @returns {boolean} True if loaded
     */
    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Get list of loaded modules
     * @returns {Array<string>} Loaded module names
     */
    getLoadedModules() {
        return Array.from(this.loadedModules);
    }

    /**
     * Reload all modules (clear and reload)
     */
    reload() {
        this.loadedModules.clear();
        return this.load();
    }

    /**
     * Get stdlib directory path
     * @returns {string} Directory path
     */
    getStdlibDir() {
        return this.stdlibDir;
    }
}

/**
 * Convenience function to load stdlib into an interpreter
 * @param {MeTTaInterpreter} interpreter - Interpreter instance
 * @param {Object} options - Loading options
 * @returns {Object} Loading stats
 */
export function loadStdlib(interpreter, options = {}) {
    const loader = new StdlibLoader(interpreter, options);
    return loader.load();
}
