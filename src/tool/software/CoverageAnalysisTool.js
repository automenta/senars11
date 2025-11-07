/**
 * @file src/tools/analysis/CoverageAnalysisTool.js
 * @description Tool for analyzing code coverage metrics
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import {CoverageAnalyzer} from './analyzers/CoverageAnalyzer.js';

/**
 * Tool for analyzing code coverage metrics
 */
export class CoverageAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'CoverageAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes code coverage metrics including lines, functions, and branch coverage';
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
                }
            },
            required: []
        };
    }

    /**
     * Perform the coverage analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const analyzer = new CoverageAnalyzer(params, params.verbose || false);
        return await analyzer.analyze();
    }
}