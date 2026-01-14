/**
 * StdlibLoader.js - Standard Library Loader
 * Handles module loading for Node.js and Browser environments.
 */

import { createRequire } from 'module';

const DEFAULT_MODULES = ['core', 'list', 'match', 'types'];

export class StdlibLoader {
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.options = options;
        this.stdlibDir = options.stdlibDir || '';
        this.modules = options.modules || DEFAULT_MODULES;
        this.virtualFiles = options.virtualFiles || {};
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
                console.warn(`Failed to load '${mod}': ${err.message}`);
            }
        }
        return stats;
    }

    loadModule(name) {
        let content = '';
        const fileName = `${name}.metta`;

        if (this.virtualFiles[fileName]) {
            content = this.virtualFiles[fileName];
        } else if (typeof process !== 'undefined' && process.versions?.node) {
            try {
                const require = createRequire(import.meta.url);
                const fs = require('fs');
                const path = require('path');
                const { fileURLToPath } = require('url');

                const currentDir = path.dirname(fileURLToPath(import.meta.url));
                const primary = this.stdlibDir || currentDir;
                const paths = this.options.searchPaths || [primary];
                if (!paths.includes(primary)) paths.unshift(primary);

                let filePath = null;
                for (const dir of paths) {
                    const p = path.join(dir, fileName);
                    if (fs.existsSync(p)) { filePath = p; break; }
                }

                if (!filePath) throw new Error(`Module '${name}' not found in: ${paths.join(', ')}`);
                content = fs.readFileSync(filePath, 'utf-8');
            } catch (e) {
                throw new Error(e.message.startsWith('Module') ? e.message : `FS load failed for '${name}': ${e.message}`);
            }
        } else {
            throw new Error(`Module '${name}' not found (virtual/fs unavailable)`);
        }

        const sizeBefore = this.interpreter.space?.size?.() ?? 0;
        this.interpreter.load(content);
        return { module: name, atomCount: (this.interpreter.space?.size?.() ?? 0) - sizeBefore };
    }

    getLoadedModules() { return Array.from(this.loadedModules); }
    reload() { this.loadedModules.clear(); return this.load(); }
}

export const loadStdlib = (interpreter, options) => new StdlibLoader(interpreter, options).load();
