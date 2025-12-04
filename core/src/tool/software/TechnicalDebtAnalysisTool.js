/**
 * @file src/tools/analysis/TechnicalDebtAnalysisTool.js
 * @description Tool for analyzing technical debt metrics
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import {TechnicalDebtAnalyzer} from './analyzers/TechnicalDebtAnalyzer.js';

/**
 * Tool for analyzing technical debt metrics
 */
export class TechnicalDebtAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'TechnicalDebtAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes code for technical debt indicators including code smells, complexity, and maintainability metrics';
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
                threshold: {
                    type: 'number',
                    description: 'Debt threshold for highlighting high-risk files',
                    default: 50
                }
            },
            required: []
        };
    }

    /**
     * Perform the technical debt analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const analyzer = new TechnicalDebtAnalyzer(params, params.verbose || false);
        return await analyzer.analyze();
    }
}