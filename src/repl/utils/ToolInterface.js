/**
 * @file ToolInterface.js
 * @description Interface for creating new tools that can be integrated with the agent system
 */

/**
 * Base interface for all tools
 */
export class BaseTool {
    /**
     * Create a base tool
     * @param {string} name - Name of the tool
     * @param {string} description - Description of what the tool does
     * @param {Object} schema - Zod schema for the tool's parameters
     */
    constructor(name, description, schema) {
        this.name = name;
        this.description = description;
        this.schema = schema;
    }

    /**
     * Execute the tool with the provided arguments
     * @param {Object} args - Arguments for the tool
     * @returns {Promise<any>} Result of the tool execution
     */
    async execute(args) {
        throw new Error('execute() method must be implemented by subclass');
    }
}

/**
 * Interface for creating custom tools that can be registered with the ToolRegistry
 * @typedef {Object} ToolDefinition
 * @property {string} name - Name of the tool
 * @property {Function} factory - Factory function that creates the tool instance
 * @property {Object} [options] - Additional options for the tool
 */

/**
 * Example of how to create a custom tool
 *
 * class CustomTool extends BaseTool {
 *   constructor(nar = null) {
 *     super(
 *       'custom_tool',
 *       'Description of what the custom tool does',
 *       z.object({
 *         // Define the schema for your tool's arguments
 *         param1: z.string().describe('Parameter 1 description'),
 *         param2: z.number().optional().describe('Parameter 2 description')
 *       })
 *     );
 *     this.nar = nar;
 *   }
 *
 *   async execute(args) {
 *     // Implement the tool logic here
 *     return 'Result of the tool execution';
 *   }
 * }
 *
 * // To register the tool:
 * const registry = new ToolRegistry();
 * registry.register('custom_tool', (nar) => new CustomTool(nar));
 */

/**
 * Example factory function for creating tools with optional NAR dependency
 * @param {Function} ToolClass - The tool class to instantiate
 * @returns {Function} Factory function
 */
export const createToolFactory = (ToolClass) => {
    return (nar = null, options = {}) => new ToolClass(nar, options);
};