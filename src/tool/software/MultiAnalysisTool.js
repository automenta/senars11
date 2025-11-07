/**
 * @file src/tools/analysis/MultiAnalysisTool.js
 * @description Tool for coordinating multiple analysis tools
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';

/**
 * Tool for coordinating multiple analysis tools
 */
export class MultiAnalysisTool extends SoftwareAnalysisTool {
    constructor(toolEngine, config = {}) {
        super(config);
        this.name = 'MultiAnalysisTool';
        this.toolEngine = toolEngine; // Dependency injection of the tool engine
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Coordinates multiple analysis tools to provide comprehensive codebase insights';
    }

    /**
     * Get parameter schema for the tool
     * @returns {object} - Parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                analyses: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['tests', 'coverage', 'static', 'technicaldebt', 'architecture', 'testcoverage', 'requirements', 'featurespecs', 'project', 'planning']
                    },
                    description: 'List of analyses to run',
                    default: ['tests', 'coverage', 'static', 'technicaldebt', 'architecture']
                },
                verbose: {
                    type: 'boolean',
                    description: 'Enable verbose output',
                    default: false
                },
                concurrency: {
                    type: 'number',
                    description: 'Number of analyses to run concurrently',
                    default: 2
                }
            },
            required: ['analyses']
        };
    }

    /**
     * Perform the multi-analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const {analyses, verbose = false, concurrency = 2} = params;
        const results = {};

        // Analysis to tool mapping
        const analysisMap = {
            'tests': 'test-analysis',
            'coverage': 'coverage-analysis',
            'static': 'static-analysis',
            'technicaldebt': 'technical-debt-analysis',
            'architecture': 'architecture-analysis',
            'testcoverage': 'test-coverage-analysis',
            // These would be added when the tools are created:
            // 'requirements': 'requirements-analysis',
            // 'featurespecs': 'featurespecs-analysis',
            // 'project': 'project-analysis',
            // 'planning': 'planning-analysis'
        };

        // Filter to only requested analyses that have corresponding tools
        const requestedAnalyses = analyses.filter(analysis => analysisMap[analysis]);

        // Log the analyses being run
        if (verbose) {
            console.log(`🔄 Running analyses: ${requestedAnalyses.join(', ')}`);
        }

        // Run analyses with specified concurrency
        for (let i = 0; i < requestedAnalyses.length; i += concurrency) {
            const batch = requestedAnalyses.slice(i, i + concurrency);

            if (verbose) {
                console.log(`🔄 Running batch: ${batch.join(', ')}`);
            }

            const batchPromises = batch.map(async (analysis) => {
                try {
                    const toolId = analysisMap[analysis];
                    const toolData = this.toolEngine.getTool(toolId);

                    if (!toolData) {
                        console.warn(`⚠️  Tool ${toolId} not found for analysis: ${analysis}`);
                        results[analysis] = {error: `Tool ${toolId} not found`};
                        return;
                    }

                    // Get the actual tool instance from the tool data
                    const tool = toolData.instance;
                    if (!tool || typeof tool.execute !== 'function') {
                        console.warn(`⚠️  Tool ${toolId} does not have a valid execute method for analysis: ${analysis}`);
                        results[analysis] = {error: `Tool ${toolId} has no execute method`};
                        return;
                    }

                    if (verbose) {
                        console.log(`🔍 Executing ${analysis} analysis...`);
                    }

                    const result = await tool.execute({verbose}, {...context, analysisType: analysis});
                    results[analysis] = result;

                    if (verbose) {
                        console.log(`✅ ${analysis} analysis completed`);
                    }
                } catch (error) {
                    console.error(`❌ ${analysis} analysis failed:`, error.message);
                    results[analysis] = {error: `Analysis failed: ${error.message}`, details: error};
                }
            });

            await Promise.allSettled(batchPromises);
        }

        // Log summary
        if (verbose) {
            const successCount = Object.values(results).filter(r => !r.error).length;
            console.log(`📊 Analysis summary: ${successCount}/${requestedAnalyses.length} analyses completed successfully`);
        }

        return results;
    }

    /**
     * Validate parameters before execution
     * @param {object} params - Tool parameters to validate
     * @returns {object} - Validation result with valid boolean and optional errors array
     */
    validate(params) {
        const schema = this.getParameterSchema();
        if (!schema) return {isValid: true, errors: []};

        const errors = [];

        // Validate required parameters
        if (Array.isArray(schema.required)) {
            errors.push(
                ...schema.required
                    .filter(requiredParam => !(requiredParam in params))
                    .map(requiredParam => `Missing required parameter: ${requiredParam}`)
            );
        }

        // Validate parameter types and enums
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (!(key in params)) continue;

                const value = params[key];

                // Special handling for array type
                if (propSchema.type === 'array') {
                    if (!Array.isArray(value)) {
                        errors.push(`Parameter '${key}' must be of type array`);
                    } else if (propSchema.items && propSchema.items.enum) {
                        // Validate array items against enum if specified
                        for (const item of value) {
                            if (!propSchema.items.enum.includes(item)) {
                                errors.push(`Array item '${item}' in parameter '${key}' must be one of: ${propSchema.items.enum.join(', ')}`);
                            }
                        }
                    }
                } else if (propSchema.type && typeof value !== propSchema.type) {
                    errors.push(`Parameter '${key}' must be of type ${propSchema.type}`);
                }

                if (Array.isArray(propSchema.enum) && !propSchema.enum.includes(value)) {
                    errors.push(`Parameter '${key}' must be one of: ${propSchema.enum.join(', ')}`);
                }
            }
        }

        return {isValid: errors.length === 0, errors};
    }

    /**
     * Get tool capabilities
     * @returns {Array<string>} - List of tool capabilities
     */
    getCapabilities() {
        return ['analysis', 'code-inspection', 'metrics', 'coordination', 'multi-tool', 'batch-processing'];
    }
}