/**
 * @file src/tools/ToolIntegration.js
 * @description Integration layer between tools and reasoning core
 */

import {ToolEngine} from './ToolEngine.js';
import {ToolRegistry} from './ToolRegistry.js';
import {BaseComponent} from '../util/BaseComponent.js';

/**
 * Integration layer that connects tools to the reasoning core
 */
export class ToolIntegration extends BaseComponent {
    /**
     * @param {object} config - Configuration for tool integration
     */
    constructor(config = {}) {
        super({
            enableRegistry: true,
            enableDiscovery: true,
            ...config
        }, 'ToolIntegration');

        this.engine = new ToolEngine(this.config.engine ?? {});
        this.registry = this.config.enableRegistry ? new ToolRegistry(this.engine) : null;
        this.reasoningCore = null;
        this.toolUsageHistory = [];
    }

    /**
     * Connect to the reasoning core
     * @param {object} reasoner - The reasoning core instance
     */
    connectToReasoningCore(reasoner) {
        this.reasoningCore = reasoner;
        this.logger.info('Connected tools to reasoning core');
        return this;
    }

    /**
     * Register all tools for the NAR system
     */
    async initializeTools() {
        if (!this.registry) throw new Error('Tool registry not enabled');

        try {
            const toolModules = await import('./index.js');
            const toolConfigs = this._getToolConfigs();

            for (const config of toolConfigs) {
                const toolClass = toolModules[config.className];
                if (toolClass) {
                    try {
                        const tool = new toolClass();
                        this.registry.registerTool(config.id, tool, {
                            category: config.category,
                            description: config.description
                        });
                    } catch (toolError) {
                        this.logger.warn(`Failed to instantiate tool ${config.id}, skipping:`, toolError.message);
                    }
                }
            }

            this.logger.info('Tools initialization completed', {
                toolCount: this.engine.getAvailableTools().length
            });
        } catch (error) {
            this.logger.warn('Tool initialization partially failed:', error.message);
        }
        return this;
    }

    _getToolConfigs() {
        return [
            {
                id: 'file-operations', className: 'FileOperationsTool', category: 'file-operations',
                description: 'File operations including read, write, append, delete, list, and stat'
            },
            {
                id: 'command-executor', className: 'CommandExecutorTool', category: 'command-execution',
                description: 'Safe command execution in sandboxed environment'
            },
            {
                id: 'web-automation', className: 'WebAutomationTool', category: 'web-automation',
                description: 'Web automation including fetch, scrape, and check operations'
            },
            {
                id: 'media-processing', className: 'MediaProcessingTool', category: 'media-processing',
                description: 'Media processing including PDF, image, and text extraction'
            },
            {
                id: 'embedding', className: 'EmbeddingTool', category: 'embedding',
                description: 'Text embedding, similarity, and comparison operations'
            }
        ];
    }

    /**
     * Execute a tool as part of reasoning process
     * @param {string} toolId - Tool ID to execute
     * @param {object} params - Tool parameters
     * @param {object} context - Reasoning context
     * @returns {object} - Tool execution result
     */
    async executeTool(toolId, params, context = {}) {
        const startTime = Date.now();
        let result;

        try {
            result = await this.engine.executeTool(toolId, params, {reasoningContext: context});
        } catch (error) {
            this.logger.error(`Tool execution failed: ${toolId}`, {
                error: error.message,
                params: JSON.stringify(params).substring(0, 200)
            });
            result = {
                success: false,
                error: error.message,
                toolId
            };
        }

        const executionTime = Date.now() - startTime;
        this.toolUsageHistory.push({
            toolId,
            params,
            result,
            executionTime,
            timestamp: Date.now(),
            context
        });

        if (this.toolUsageHistory.length > 1000) {
            this.toolUsageHistory.splice(0, this.toolUsageHistory.length - 500);
        }

        return {...result, executionTime};
    }

    /**
     * Execute multiple tools in sequence as part of reasoning
     * @param {Array<object>} toolCalls - Array of tool call specifications
     * @param {object} context - Reasoning context
     * @returns {Array<object>} - Results from all tool calls
     */
    async executeTools(toolCalls, context = {}) {
        const results = [];

        for (const call of toolCalls) {
            const result = await this.executeTool(call.toolId, call.params, context);
            results.push(result);

            // If a tool fails and we're not instructed to continue, we might want to handle that
            if (!result.success && call.continueOnError !== true) {
                break;
            }
        }

        return results;
    }

    /**
     * Find tools that match certain criteria
     * @param {object} criteria - Tool selection criteria
     * @returns {Array<object>} - Matching tools
     */
    findTools(criteria = {}) {
        if (!this.registry) {
            return [];
        }

        return this.registry.findTools(criteria);
    }

    /**
     * Get all available tools
     * @returns {Array<object>} - Available tool descriptions
     */
    getAvailableTools() {
        return this.engine.getAvailableTools();
    }

    /**
     * Get tool usage statistics
     * @returns {object} - Tool usage statistics
     */
    getUsageStats() {
        const stats = this.engine.getStats();

        // Add our own usage stats
        const totalCalls = this.toolUsageHistory.length;
        const successfulCalls = this.toolUsageHistory.filter(item => item.result.success).length;

        return {
            ...stats,
            totalToolCalls: totalCalls,
            successfulToolCalls: successfulCalls,
            failedToolCalls: totalCalls - successfulCalls,
            lastToolCalls: this.toolUsageHistory.slice(-10) // Last 10 calls
        };
    }

    /**
     * Analyze tool usage patterns for intelligent selection
     * @returns {object} - Tool usage analysis
     */
    analyzeUsagePatterns() {
        const toolUsage = {};

        for (const usage of this.toolUsageHistory) {
            if (!toolUsage[usage.toolId]) {
                toolUsage[usage.toolId] = {
                    totalCalls: 0,
                    successfulCalls: 0,
                    avgExecutionTime: 0,
                    totalExecutionTime: 0
                };
            }

            toolUsage[usage.toolId].totalCalls++;
            if (usage.result.success) {
                toolUsage[usage.toolId].successfulCalls++;
            }
            toolUsage[usage.toolId].totalExecutionTime += usage.executionTime;
        }

        // Calculate averages
        for (const [toolId, data] of Object.entries(toolUsage)) {
            data.avgExecutionTime = data.totalExecutionTime / data.totalCalls;
            data.successRate = data.successfulCalls / data.totalCalls;
        }

        return toolUsage;
    }
}