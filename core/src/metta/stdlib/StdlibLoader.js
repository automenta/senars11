/**
 * MeTTa Standard Library Loader
 * Manages loading stdlib .metta files in dependency order
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Phase 1-2: core, list, match, types
// Phase 3: truth, nal, attention, control
// Phase 4: search, learn
const DEFAULT_MODULES = ['core', 'list', 'match', 'types', 'truth', 'nal', 'attention', 'control', 'search', 'learn'];

export class StdlibLoader {
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.stdlibDir = options.stdlibDir ?? path.join(__dirname, '.');
        this.modules = options.modules ?? DEFAULT_MODULES;
        this.loadedModules = new Set();
    }

    load() {
        const stats = { loaded: [], failed: [], atomsAdded: 0 };

        for (const moduleName of this.modules) {
            console.log(`[DEBUG] Loading module: ${moduleName}`);
            try {
                const result = this.loadModule(moduleName);
                stats.loaded.push(moduleName);
                stats.atomsAdded += result.atomCount;
                this.loadedModules.add(moduleName);
            } catch (error) {
                stats.failed.push({ module: moduleName, error: error.message });
                console.warn(`Failed to load stdlib '${moduleName}': ${error.message}`);
            }
        }

        return stats;
    }

    loadModule(moduleName) {
        const filePath = path.join(this.stdlibDir, `${moduleName}.metta`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Stdlib module not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const beforeCount = this.interpreter.space?.size?.() ?? 0;

        this.interpreter.load(content);

        const afterCount = this.interpreter.space?.size?.() ?? 0;

        return { module: moduleName, atomCount: afterCount - beforeCount, filePath };
    }

    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    getLoadedModules() {
        return Array.from(this.loadedModules);
    }

    reload() {
        this.loadedModules.clear();
        return this.load();
    }

    getStdlibDir() {
        return this.stdlibDir;
    }
}

export function loadStdlib(interpreter, options = {}) {
    return new StdlibLoader(interpreter, options).load();
}
