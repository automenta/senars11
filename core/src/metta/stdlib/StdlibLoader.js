/**
 * MeTTa Standard Library Loader
 * Manages loading stdlib .metta files in dependency order
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MODULES = ['core', 'list', 'match', 'types', 'truth', 'nal', 'attention', 'control', 'search', 'learn'];

export class StdlibLoader {
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.stdlibDir = options.stdlibDir ?? __dirname;
        this.modules = options.modules ?? DEFAULT_MODULES;
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
        const filePath = path.join(this.stdlibDir, `${name}.metta`);
        if (!fs.existsSync(filePath)) throw new Error(`Stdlib module not found: ${filePath}`);

        const content = fs.readFileSync(filePath, 'utf-8');
        const countBefore = this.interpreter.space?.size?.() ?? 0;

        this.interpreter.load(content);

        const countAfter = this.interpreter.space?.size?.() ?? 0;
        return { module: name, atomCount: countAfter - countBefore, filePath };
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
