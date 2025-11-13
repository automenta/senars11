/**
 * @file AgentBase.js
 * @description Base class for all agents with common functionality
 */

export class AgentBase {
  /**
   * Create an agent base instance
   * @param {Object} options - Agent configuration options
   */
  constructor(options = {}) {
    this.config = {
      modelName: options.modelName,
      temperature: options.temperature,
      baseUrl: options.baseUrl
    };
    
    this.nar = options.nar ?? null;
    this.model = null;
    this.tools = [];
    this.toolRegistry = null;
    
    // Store additional options
    Object.assign(this, options);
  }

  /**
   * Initialize the agent - must be implemented by subclasses
   */
  async initialize() {
    throw new Error('initialize() method must be implemented by subclass');
  }

  /**
   * Execute streaming - must be implemented by subclasses
   */
  async * streamExecution(input) {
    throw new Error('streamExecution() method must be implemented by subclass');
  }

  /**
   * Start the agent - must be implemented by subclasses
   */
  async start() {
    throw new Error('start() method must be implemented by subclass');
  }

  /**
   * Shutdown the agent - must be implemented by subclasses
   */
  async shutdown() {
    throw new Error('shutdown() method must be implemented by subclass');
  }

  /**
   * Add a tool to the agent
   * @param {Object} tool - Tool to add
   */
  addTool(tool) {
    this.tools.push(tool);
  }

  /**
   * Get all registered tools
   * @returns {Array} Array of tools
   */
  getTools() {
    return [...this.tools];
  }

  /**
   * Set multiple tools at once
   * @param {Array} tools - Array of tools to set
   */
  setTools(tools) {
    this.tools = [...tools];
  }

  /**
   * Get the current NAR instance
   * @returns {*} NAR instance
   */
  getNAR() {
    return this.nar;
  }

  /**
   * Set the NAR instance
   * @param {*} nar - NAR instance to set
   */
  setNAR(nar) {
    this.nar = nar;
  }
}