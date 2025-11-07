import fs from 'fs';
import path from 'path';
import {FileUtils} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class ArchitectureAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Architecture and Dependency Analysis...');

        return await this.safeAnalyze(async () => {
            const srcPath = './src';
            if (!fs.existsSync(srcPath)) {
                this.log('Source directory not found', 'error');
                return {error: 'src directory not found'};
            }

            const architecture = {
                dependencyGraph: {},
                cyclicDependencies: [],
                architecturalLayers: {},
                dependencyComplexity: 0,
                couplingMetrics: {
                    afferent: {}, // incoming dependencies
                    efferent: {}, // outgoing dependencies
                    instability: {} // (efferent)/(efferent + afferent)
                },
                apiEntryPoints: [],
                moduleCohesion: {},
                layerDependencies: {}
            };

            // Build dependency graph
            this._buildDependencyGraph(srcPath, architecture);

            // Analyze architectural layers
            this._analyzeLayers(architecture);

            // Calculate coupling and cohesion metrics
            this._calculateCouplingMetrics(architecture);

            // Identify cyclic dependencies
            this._findCyclicDependencies(architecture);

            // Identify API entry points
            this._identifyEntryPoints(architecture);

            return architecture;
        }, 'Architecture analysis failed');
    }

    _buildDependencyGraph(dir, architecture) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._buildDependencyGraph(fullPath, architecture);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                const relativePath = path.relative('.', fullPath);

                // Skip excluded files using global exclusion
                if (FileUtils.isExcludedPath(relativePath)) {
                    this.log(`Excluding file from architecture analysis: ${relativePath}`, 'warn');
                    continue;
                }

                const content = this._readFileContent(fullPath);

                if (content) {
                    // Extract dependencies from the file
                    const dependencies = this._extractDependencies(content, relativePath);
                    architecture.dependencyGraph[relativePath] = dependencies;
                }
            }
        }
    }

    _extractDependencies(content, currentFile) {
        const dependencies = [];
        const lines = content.split('\n');

        // Extract ES6 imports
        const importRegex = /import\s+.*?\s+from\s+["'](.*?\.(js|ts))["']/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            let depPath = match[1];

            // Convert relative paths to absolute paths relative to current file
            if (depPath.startsWith('./') || depPath.startsWith('../')) {
                const resolvedPath = path.resolve(path.dirname(currentFile), depPath);
                depPath = path.relative('.', resolvedPath);
            }

            // Normalize path separators and remove extensions
            depPath = depPath.replace(/\\/g, '/').replace(/\.(js|ts)$/, '');

            // Only include dependencies in src directory
            if (depPath.includes('src/')) {
                dependencies.push(depPath);
            }
        }

        // Extract require statements
        const requireRegex = /require\(["'](.*?\.(js|ts))["']\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            let depPath = match[1];

            if (depPath.startsWith('./') || depPath.startsWith('../')) {
                const resolvedPath = path.resolve(path.dirname(currentFile), depPath);
                depPath = path.relative('.', resolvedPath);
            }

            depPath = depPath.replace(/\\/g, '/').replace(/\.(js|ts)$/, '');

            if (depPath.includes('src/')) {
                dependencies.push(depPath);
            }
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
    }

    _analyzeLayers(architecture) {
        // Group files by directory to identify architectural layers
        const layers = {};

        for (const [filePath, dependencies] of Object.entries(architecture.dependencyGraph)) {
            const dirPath = path.dirname(filePath);

            if (!layers[dirPath]) {
                layers[dirPath] = {
                    files: [],
                    dependencies: new Set(),
                    dependents: new Set()
                };
            }

            layers[dirPath].files.push(filePath);

            // Record dependencies between layers
            for (const depPath of dependencies) {
                const depDir = path.dirname(depPath);
                if (depDir !== dirPath) {
                    layers[dirPath].dependencies.add(depDir);
                }
            }
        }

        // Find dependents for each layer
        for (const [dirPath, layerInfo] of Object.entries(layers)) {
            for (const [otherDirPath, otherLayerInfo] of Object.entries(layers)) {
                if (otherDirPath !== dirPath && otherLayerInfo.dependencies.has(dirPath)) {
                    layers[dirPath].dependents.add(otherDirPath);
                }
            }
        }

        architecture.architecturalLayers = layers;

        // Identify layer dependencies
        for (const [dirPath, layerInfo] of Object.entries(layers)) {
            architecture.layerDependencies[dirPath] = {
                dependencies: Array.from(layerInfo.dependencies),
                dependents: Array.from(layerInfo.dependents),
                dependencyCount: layerInfo.dependencies.size,
                dependentCount: layerInfo.dependents.size
            };
        }
    }

    _calculateCouplingMetrics(architecture) {
        // Calculate afferent (incoming) and efferent (outgoing) couplings
        const afferent = {}; // incoming dependencies
        const efferent = {}; // outgoing dependencies

        // Initialize with all files from dependency graph
        for (const file of Object.keys(architecture.dependencyGraph)) {
            afferent[file] = 0;
            efferent[file] = architecture.dependencyGraph[file].length;
        }

        // Count afferent (incoming) dependencies
        for (const [file, dependencies] of Object.entries(architecture.dependencyGraph)) {
            for (const dep of dependencies) {
                if (afferent.hasOwnProperty(dep)) {
                    afferent[dep]++;
                }
            }
        }

        // Calculate instability (I = efferent / (efferent + afferent))
        const instability = {};
        for (const file of Object.keys(architecture.dependencyGraph)) {
            const aff = afferent[file] || 0;
            const eff = efferent[file] || 0;
            const total = aff + eff;

            instability[file] = total > 0 ? eff / total : 0;
        }

        architecture.couplingMetrics = {afferent, efferent, instability};
    }

    _findCyclicDependencies(architecture) {
        const visited = new Set();
        const recStack = new Set();
        const path = [];
        const cycles = [];

        // For each unvisited node, perform DFS to find cycles
        for (const node of Object.keys(architecture.dependencyGraph)) {
            if (!visited.has(node)) {
                this._dfsCycles(node, architecture.dependencyGraph, visited, recStack, path, cycles);
            }
        }

        architecture.cyclicDependencies = cycles;
    }

    _dfsCycles(node, graph, visited, recStack, path, cycles) {
        visited.add(node);
        recStack.add(node);
        path.push(node);

        for (const neighbor of graph[node] || []) {
            if (!visited.has(neighbor)) {
                this._dfsCycles(neighbor, graph, visited, recStack, path, cycles);
            } else if (recStack.has(neighbor)) {
                // Found a cycle
                const cycleStart = path.indexOf(neighbor);
                const cycle = path.slice(cycleStart).concat([neighbor]);
                cycles.push(cycle);
            }
        }

        recStack.delete(node);
        path.pop();
    }

    _identifyEntryPoints(architecture) {
        // Entry points are files with no incoming dependencies (afferent = 0)
        // that are not just dependency-only files
        const entryPoints = [];

        for (const [file, deps] of Object.entries(architecture.dependencyGraph)) {
            // A file with no incoming dependencies could be an entry point
            if (architecture.couplingMetrics.afferent[file] === 0 && deps.length > 0) {
                entryPoints.push(file);
            }
        }

        architecture.apiEntryPoints = entryPoints;
    }
}