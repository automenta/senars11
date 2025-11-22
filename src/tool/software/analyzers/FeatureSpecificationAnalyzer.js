import fs from 'fs';
import path from 'path';
import {collectTestFiles, isExcludedPath} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class FeatureSpecificationAnalyzer extends BaseAnalyzer {
    constructor(options, verbose) {
        super(options, verbose);
        this.specDir = './specifications';
        this.featureSpecs = new Map();
    }

    async analyze() {
        this.log('Collecting Feature Specifications...');

        return await this.safeAnalyze(async () => {
            // First, look for existing specification files
            if (fs.existsSync(this.specDir)) {
                await this._loadSpecFiles();
            } else {
                // Look for spec files in common locations
                const commonSpecPaths = ['./specs', './spec', './docs/specs', './docs/spec'];
                for (const specPath of commonSpecPaths) {
                    if (fs.existsSync(specPath)) {
                        this.specDir = specPath;
                        await this._loadSpecFiles();
                        break;
                    }
                }
            }

            // If no spec files found, create basic analysis from existing sources
            if (this.featureSpecs.size === 0) {
                await this._inferFeatureSpecsFromCode();
            }

            // Connect features to test files
            const testConnections = await this._mapFeaturesToTests();

            // Connect features to implementation
            const implementationConnections = await this._mapFeaturesToImplementation();

            return {
                specificationsFound: this.featureSpecs.size,
                features: Array.from(this.featureSpecs.entries()),
                testConnections,
                implementationConnections,
                coverageByFeature: this._calculateCoverageByFeature(implementationConnections),
                overallFeatureCompliance: this._calculateFeatureCompliance()
            };
        }, 'Feature specification analysis failed');
    }

    async _loadSpecFiles() {
        if (!fs.existsSync(this.specDir)) return;

        const items = fs.readdirSync(this.specDir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(this.specDir, item.name);

            if (item.isFile() && (item.name.endsWith('.json') || item.name.endsWith('.md'))) {
                try {
                    let specContent;
                    if (item.name.endsWith('.json')) {
                        specContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                        // Add as feature spec
                        if (specContent.id && specContent.description) {
                            this.featureSpecs.set(specContent.id, specContent);
                        }
                    } else if (item.name.endsWith('.md')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        // Try to parse markdown for feature specifications
                        this._parseMarkdownSpec(content, item.name);
                    }
                } catch (parseError) {
                    this.log(`Error parsing spec file ${fullPath}:`, 'warn', {error: parseError.message});
                }
            }
        }
    }

    _parseMarkdownSpec(content, fileName) {
        // Simple parsing for feature specifications in markdown
        const lines = content.split('\n');
        let currentFeature = null;
        let currentSection = '';

        const id = fileName.replace('.md', '');
        const spec = {
            id,
            title: '',
            description: '',
            requirements: [],
            status: 'defined',
            implementationStatus: 'not_started',
            testStatus: 'not_tested'
        };

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('# ')) {
                spec.title = trimmed.substring(2);
            } else if (trimmed.startsWith('## ') && trimmed.includes('Description')) {
                currentSection = 'description';
            } else if (trimmed.startsWith('## ') && trimmed.includes('Requirements')) {
                currentSection = 'requirements';
            } else if (trimmed.startsWith('## ') && trimmed.includes('Status')) {
                currentSection = 'status';
            } else {
                if (currentSection === 'description' && trimmed && !trimmed.startsWith('##')) {
                    spec.description += trimmed + ' ';
                } else if (currentSection === 'requirements' && trimmed.startsWith('- ')) {
                    spec.requirements.push(trimmed.substring(2));
                } else if (currentSection === 'status') {
                    if (trimmed.includes('Implementation:')) {
                        spec.implementationStatus = trimmed.split(':')[1].trim().toLowerCase();
                    } else if (trimmed.includes('Test:')) {
                        spec.testStatus = trimmed.split(':')[1].trim().toLowerCase();
                    }
                }
            }
        }

        this.featureSpecs.set(id, spec);
    }

    async _inferFeatureSpecsFromCode() {
        // Infer features from README, package.json, and other documentation
        const readmePath = './README.md';
        if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');

            // Extract features from README as requirements
            const features = [
                {
                    id: 'core-knowledge-representation', title: 'Core Knowledge Representation',
                    description: 'System for representing knowledge using Terms and Tasks',
                    requirements: ['Term class implementation', 'Task class implementation', 'Truth value handling'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'reasoning-engine', title: 'NARS Reasoner Engine',
                    description: 'Core reasoning engine (NAR) for processing tasks and knowledge',
                    requirements: ['NAR implementation', 'Inference mechanisms', 'Concept handling'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'memory-management', title: 'Memory and Focus Management',
                    description: 'System for managing concepts and tasks in memory',
                    requirements: ['Concept memory', 'Event buffer', 'Focus control'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'parsing', title: 'Parser System',
                    description: 'System for parsing Narsese input',
                    requirements: ['Narsese parser', 'Input handling', 'Syntax validation'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                }
            ];

            for (const feature of features) {
                this.featureSpecs.set(feature.id, feature);
            }
        }
    }

    async _mapFeaturesToTests() {
        const testFiles = collectTestFiles();
        const connections = [];

        for (const testFile of testFiles) {
            try {
                const content = fs.readFileSync(testFile, 'utf8');

                for (const [featureId, spec] of this.featureSpecs.entries()) {
                    // Check if test file relates to feature (by name matching)
                    const featureRelated = spec.title.toLowerCase().includes(path.basename(testFile, '.js')) ||
                        spec.requirements.some(req =>
                            content.toLowerCase().includes(req.toLowerCase()) ||
                            content.toLowerCase().includes(featureId.toLowerCase()));

                    if (featureRelated) {
                        connections.push({
                            featureId,
                            testFile,
                            testContent: content.substring(0, 200) + '...' // First 200 chars
                        });
                    }
                }
            } catch (e) {
                this.log(`Could not read test file ${testFile}:`, 'warn', {error: e.message});
            }
        }

        return connections;
    }

    async _mapFeaturesToImplementation() {
        const connections = [];

        // Look through src directory for implementation files
        const srcDir = './src';
        if (!fs.existsSync(srcDir)) return connections;

        await this._traverseAndMapFeatures(srcDir, connections);

        return connections;
    }

    async _traverseAndMapFeatures(dir, connections) {
        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                await this._traverseAndMapFeatures(fullPath, connections);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                const relativePath = path.relative('.', fullPath);

                // Skip excluded files using global exclusion
                if (isExcludedPath(relativePath)) {
                    this.log(`Excluding file from feature mapping: ${relativePath}`, 'warn');
                    continue;
                }

                try {
                    const content = fs.readFileSync(fullPath, 'utf8');

                    for (const [featureId, spec] of this.featureSpecs.entries()) {
                        // Check if implementation file relates to feature
                        const featureRelated = spec.title.toLowerCase().includes(path.basename(item.name, '.js')) ||
                            spec.requirements.some(req =>
                                content.toLowerCase().includes(req.toLowerCase()) ||
                                content.toLowerCase().includes(featureId.toLowerCase()));

                        if (featureRelated) {
                            connections.push({
                                featureId,
                                implementationFile: relativePath,
                                implementationContent: content.substring(0, 200) + '...'
                            });
                        }
                    }
                } catch (e) {
                    this.log(`Could not read implementation file ${fullPath}:`, 'warn', {error: e.message});
                }
            }
        }
    }

    _calculateCoverageByFeature(implementationConnections) {
        const coverageByFeature = new Map();

        for (const [featureId, spec] of this.featureSpecs.entries()) {
            const implementations = implementationConnections.filter(conn => conn.featureId === featureId);
            const implemented = implementations.length > 0;

            coverageByFeature.set(featureId, {
                featureId,
                title: spec.title,
                implemented,
                implementationCount: implementations.length,
                requirementsCount: spec.requirements.length
            });
        }

        return Object.fromEntries(coverageByFeature);
    }

    _calculateFeatureCompliance() {
        let implementedCount = 0;
        let totalCount = this.featureSpecs.size;

        for (const [, spec] of this.featureSpecs.entries()) {
            if (spec.implementationStatus === 'completed' || spec.implementationStatus === 'in_progress') {
                implementedCount++;
            }
        }

        return totalCount > 0 ? Math.round((implementedCount / totalCount) * 100) : 0;
    }
}
