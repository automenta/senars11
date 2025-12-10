/**
 * @file src/tools/analysis/ArchitectureAnalysisTool.js
 * @description Tool for analyzing software architecture
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import {ArchitectureAnalyzer} from './analyzers/ArchitectureAnalyzer.js';

/**
 * Tool for analyzing software architecture
 */
export class ArchitectureAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'ArchitectureAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes software architecture including dependencies, coupling, and structural patterns';
    }

    /**
     * Get parameter schema for the tool
     * @returns {object} - Parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                verbose: {
                    type: 'boolean',
                    description: 'Enable verbose output',
                    default: false
                },
                includeDependencies: {
                    type: 'boolean',
                    description: 'Include detailed dependency analysis',
                    default: true
                }
            },
            required: []
        };
    }

    /**
     * Perform the architecture analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const analyzer = new ArchitectureAnalyzer(params, params.verbose || false);
        return await analyzer.analyze();
    }
}