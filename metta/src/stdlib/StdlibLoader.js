/**
 * MeTTa Standard Library Loader
 * Manages loading stdlib .metta files in dependency order
 * Supports both Node.js (fs/path) and browser (virtual files)
 */

const DEFAULT_MODULES = ['core', 'list', 'match', 'types', 'truth', 'nal', 'attention', 'control', 'search', 'learn'];

export class StdlibLoader {
    constructor(interpreter, options = {}) {
        this.interpreter = interpreter;
        this.stdlibDir = options.stdlibDir || '';
        this.modules = options.modules || DEFAULT_MODULES;
        this.virtualFiles = options.virtualFiles || {}; // { 'core.metta': '...' }
        this.loadedModules = new Set();
    }

    async load() {
        const stats = { loaded: [], failed: [], atomsAdded: 0 };

        for (const mod of this.modules) {
            try {
                const res = await this.loadModule(mod);
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

    async loadModule(name) {
        let content = '';
        const fileName = `${name}.metta`;

        // 1. Try virtual files first (browser-friendly)
        if (this.virtualFiles[fileName]) {
            content = this.virtualFiles[fileName];
        }
        // 2. Fallback to Node.js fs if available
        else if (typeof process !== 'undefined' && process.versions?.node) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const { fileURLToPath } = await import('url');

                const currentDir = path.dirname(fileURLToPath(import.meta.url));
                const stdlibDir = this.stdlibDir || currentDir;
                const filePath = path.join(stdlibDir, fileName);

                if (fs.existsSync(filePath)) {
                    content = fs.readFileSync(filePath, 'utf-8');
                } else {
                    throw new Error(`Stdlib module not found on disk: ${filePath}`);
                }
            } catch (e) {
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

    async reload() {
        this.loadedModules.clear();
        return this.load();
    }
}

export const loadStdlib = (interpreter, options) => new StdlibLoader(interpreter, options).load();
