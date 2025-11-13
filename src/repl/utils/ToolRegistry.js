/**
 * @file ToolRegistry.js
 * @description Registry for managing agent tools with extensibility support
 */

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolFactories = new Map();  // To support dynamic tool creation
  }

  /**
   * Register a tool with a name and factory function
   * @param {string} name - Name of the tool
   * @param {Function} factory - Factory function that creates the tool instance
   * @param {Object} options - Options for the tool
   */
  register(name, factory, options = {}) {
    this.toolFactories.set(name, { factory, options });
  }

  /**
   * Create and register tools from a list of tool definitions
   * @param {Array} toolDefinitions - Array of {name, factory, options}
   */
  registerMany(toolDefinitions) {
    toolDefinitions.forEach(({ name, factory, options }) => {
      this.register(name, factory, options);
    });
  }

  /**
   * Create and get a tool instance with the provided nar instance
   * @param {string} name - Name of the tool to create
   * @param {*} nar - NAR instance to pass to the tool
   * @returns {Object} Tool instance
   */
  createTool(name, nar = null) {
    const toolFactory = this.toolFactories.get(name);
    if (!toolFactory) {
      throw new Error(`Tool '${name}' not registered`);
    }
    
    return toolFactory.factory(nar, toolFactory.options);
  }

  /**
   * Get all registered tool names
   * @returns {Array<string>} List of tool names
   */
  getToolNames() {
    return Array.from(this.toolFactories.keys());
  }

  /**
   * Create all tools for a nar instance
   * @param {*} nar - NAR instance to pass to the tools
   * @returns {Array} Array of tool instances
   */
  createAllTools(nar = null) {
    return this.getToolNames().map(name => this.createTool(name, nar));
  }

  /**
   * Check if a tool is registered
   * @param {string} name - Name of the tool to check
   * @returns {boolean} True if tool is registered
   */
  hasTool(name) {
    return this.toolFactories.has(name);
  }
}