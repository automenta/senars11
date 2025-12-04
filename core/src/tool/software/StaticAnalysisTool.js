/**
 * @file src/tools/analysis/StaticAnalysisTool.js
 * @description Tool for performing static code analysis
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import {StaticAnalyzer} from './analyzers/StaticAnalyzer.js';

/**
 * Tool for performing static code analysis
 */
export class StaticAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'StaticAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes static code metrics including file counts, size, complexity, and structure';
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
                maxDepth: {
                    type: 'number',
                    description: 'Maximum directory depth to analyze',
                    default: 10
                }
            },
            required: []
        };
    }

    /**
     * Perform the static analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const analyzer = new StaticAnalyzer(params, params.verbose || false);
        return await analyzer.analyze();
    }
}