/**
 * MeTTa Standard Library Loader
 * Manages loading stdlib .metta files in dependency order
 * Supports both Node.js (fs/path) and browser (virtual files)
 */

import { createRequire } from 'module';

// General MeTTa stdlib (not NAL-specific)
const DEFAULT_MODULES = ['core', 'list', 'match', 'types'];

export class StdlibLoader {
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.options = options;
        this.stdlibDir = options.stdlibDir || '';
        this.modules = options.modules || DEFAULT_MODULES;
        this.virtualFiles = options.virtualFiles || {}; // { 'core.metta': '...' }
        this.loadedModules = new Set();
    }

    load() {
        const stats = { loaded: [], failed: [], atomsAdded: 0 };

        for (const mod of this.modules) {
            try {
                const res = this.loadModule(mod);
                stats.loaded.push(mod);
                stats.atomsAdded += res.atomCount;
                this.loadedModules.add(mod);
            } catch (err) {
                stats.failed.push({ module: mod, error: err.message });
                console.warn(`Failed to load stdlib '${mod}': ${err.message}`);
            }
        }
        return stats;
    }

    loadModule(name) {
        let content = '';
        const fileName = `${name}.metta`;

        // 1. Try virtual files first (browser-friendly)
        if (this.virtualFiles[fileName]) {
            content = this.virtualFiles[fileName];
        }
        // 2. Fallback to Node.js fs if available
        else if (typeof process !== 'undefined' && process.versions?.node) {
            try {
                const require = createRequire(import.meta.url);
                const fs = require('fs');
                const path = require('path');
                const { fileURLToPath } = require('url');

                const currentDir = path.dirname(fileURLToPath(import.meta.url));
                const primaryDir = this.stdlibDir || currentDir;

                // Allow searchPaths option or default to primary path
                const searchPaths = this.options?.searchPaths || [primaryDir];
                // Ensure primaryDir is included if not explicitly in searchPaths
                if (!searchPaths.includes(primaryDir)) {
                    searchPaths.unshift(primaryDir);
                }

                let filePath = null;
                for (const dir of searchPaths) {
                    const p = path.join(dir, fileName);
                    if (fs.existsSync(p)) {
                        filePath = p;
                        break;
                    }
                }

                if (filePath) {
                    content = fs.readFileSync(filePath, 'utf-8');
                } else {
                    throw new Error(`Stdlib module '${name}' not found in paths: ${searchPaths.join(', ')}`);
                }
            } catch (e) {
                if (e.message.startsWith('Stdlib module')) throw e;
                throw new Error(`Failed to load '${name}' from filesystem: ${e.message}`);
            }
        } else {
            throw new Error(`Stdlib module '${name}' not found in virtualFiles and filesystem is unavailable.`);
        }

        const countBefore = this.interpreter.space?.size?.() ?? 0;
        this.interpreter.load(content);
        const countAfter = this.interpreter.space?.size?.() ?? 0;

        return { module: name, atomCount: countAfter - countBefore };
    }

    getLoadedModules() {
        return Array.from(this.loadedModules);
    }

    reload() {
        this.loadedModules.clear();
        return this.load();
    }
}

export const loadStdlib = (interpreter, options) => new StdlibLoader(interpreter, options).load();
