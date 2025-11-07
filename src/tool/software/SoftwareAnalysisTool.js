/**
 * @file src/tools/analysis/BaseAnalysisTool.js
 * @description Base class for analysis tools
 */

import {BaseTool} from '../BaseTool.js';

/**
 * Base class for all analysis tools
 * Provides common functionality for code analysis operations
 */
export class SoftwareAnalysisTool extends BaseTool {
    /**
     * @param {object} config - Tool configuration
     */
    constructor(config = {}) {
        super(config);
        this.category = 'analysis';
    }

    /**
     * Execute the analysis tool with given parameters
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Tool execution result
     */
    async execute(params, context) {
        await this.beforeExecute(params, context);
        
        // Validate parameters
        const validation = this.validate(params);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Perform the analysis
        const result = await this.performAnalysis(params, context);
        
        const processedResult = await this.afterExecute(result, params, context);
        return processedResult;
    }

    /**
     * Perform the specific analysis - must be implemented by subclasses
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        throw new Error('Analysis tools must implement performAnalysis method');
    }

    /**
     * Get tool category
     * @returns {string} - Tool category
     */
    getCategory() {
        return 'analysis';
    }

    /**
     * Get tool capabilities
     * @returns {Array<string>} - List of tool capabilities
     */
    getCapabilities() {
        return ['analysis', 'code-inspection', 'metrics'];
    }
}