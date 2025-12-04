/**
 * @file src/tools/analysis/TestAnalysisTool.js
 * @description Tool for analyzing test results and metrics
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import {TestAnalyzer} from './analyzers/TestAnalyzer.js';

/**
 * Tool for analyzing test results and metrics
 */
export class TestAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'TestAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes test results, coverage, and performance metrics';
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
                includeSlowest: {
                    type: 'boolean',
                    description: 'Include slowest tests in results',
                    default: false
                }
            },
            required: []
        };
    }

    /**
     * Perform the test analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const analyzer = new TestAnalyzer(params, params.verbose || false);
        return await analyzer.analyze();
    }
}