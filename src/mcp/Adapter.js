/**
 * Adapter for translating between SeNARS and MCP formats
 * Bridges SeNARS' internal logic to MCP's universal format
 */
export class Adapter {
  constructor() {
    // MCP to SeNARS type mappings
    this.mcpToSenarsTypeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
      'integer': 'number',
      'null': 'null'
    };
    
    // SeNARS to MCP type mappings
    this.senarsToMcpTypeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
      'null': 'null'
    };
  }

  /**
   * Convert MCP tool definition to SeNARS-compatible format
   */
  normalizeMCPTool(mcpTool) {
    return {
      name: mcpTool.name || mcpTool.id,
      description: mcpTool.description || mcpTool.info?.description || '',
      parameters: this.normalizeMCPParameters(mcpTool.inputSchema || mcpTool.parameters),
      returns: this.normalizeMCPParameters(mcpTool.outputSchema || mcpTool.returns || {}),
      schema: mcpTool.inputSchema || mcpTool.parameters,
      outputSchema: mcpTool.outputSchema || mcpTool.returns
    };
  }

  /**
   * Normalize MCP parameter definitions
   */
  normalizeMCPParameters(parameters) {
    if (!parameters) return { type: 'object', properties: {}, required: [] };
    
    const normalized = { ...parameters };
    
    // Ensure properties exists
    if (!normalized.properties) {
      normalized.properties = {};
    }
    
    // Ensure required exists
    if (!normalized.required) {
      normalized.required = [];
    }
    
    return normalized;
  }

  /**
   * Convert SeNARS data format to MCP-compatible format
   */
  toMCPFormat(senarsData, context = null) {
    // For basic data types, return as-is
    if (typeof senarsData !== 'object' || senarsData === null) {
      return senarsData;
    }

    // If it's an array, process each element
    if (Array.isArray(senarsData)) {
      return senarsData.map(item => this.toMCPFormat(item, context));
    }

    // For objects, we might need to transform based on context
    const mcpData = {};
    
    for (const [key, value] of Object.entries(senarsData)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        mcpData[key] = this.toMCPFormat(value, context);
      } else {
        mcpData[key] = value;
      }
    }
    
    return mcpData;
  }

  /**
   * Convert MCP response format to SeNARS-compatible format
   */
  fromMCPFormat(mcpData, context = null) {
    // For basic data types, return as-is
    if (typeof mcpData !== 'object' || mcpData === null) {
      return mcpData;
    }

    // If it's an array, process each element
    if (Array.isArray(mcpData)) {
      return mcpData.map(item => this.fromMCPFormat(item, context));
    }

    // For objects, we might need to transform based on context
    const senarsData = {};
    
    for (const [key, value] of Object.entries(mcpData)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        senarsData[key] = this.fromMCPFormat(value, context);
      } else {
        senarsData[key] = value;
      }
    }
    
    return senarsData;
  }

  /**
   * Adapt SeNARS task format for MCP tool execution
   */
  adaptTaskForMCP(task) {
    const adapted = {
      toolName: task.operation || task.type || task.name,
      parameters: this.adaptParametersForMCP(task.arguments || task.params || task.content || {})
    };

    // Map common SeNARS task properties to MCP equivalents
    if (task.id) adapted.id = task.id;
    if (task.priority) adapted.priority = task.priority;
    if (task.expirationTime) adapted.timeout = task.expirationTime;
    
    return adapted;
  }

  /**
   * Adapt parameters for MCP compatibility
   */
  adaptParametersForMCP(params) {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const adapted = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Handle special SeNARS data types or structures
      if (key === 'truth' && typeof value === 'object') {
        // Convert SeNARS truth values to MCP-compatible format
        adapted[key] = {
          frequency: value.frequency || value.f || 0.5,
          confidence: value.confidence || value.c || 0.1
        };
      } 
      else if (key === 'stamp' && Array.isArray(value)) {
        // Convert SeNARS stamp to MCP-compatible format
        adapted[key] = value.map(s => s.id || s);
      }
      else if (typeof value === 'object' && value !== null) {
        adapted[key] = this.adaptParametersForMCP(value);
      } 
      else {
        adapted[key] = value;
      }
    }
    
    return adapted;
  }

  /**
   * Adapt MCP result to SeNARS task format
   */
  adaptResultForSenars(result, originalTask = null) {
    // If the result is already in a format SeNARS expects, return as-is
    if (result && typeof result === 'object' && result.task) {
      return result;
    }

    // Create a SeNARS-compatible result task
    const adaptedResult = {
      type: 'result',
      content: result,
      source: 'mcp',
      timestamp: Date.now(),
      originalTask: originalTask || null
    };

    // If original task had truth values, preserve them appropriately
    if (originalTask && originalTask.truth) {
      adaptedResult.truth = originalTask.truth;
    }

    return adaptedResult;
  }

  /**
   * Map MCP schema types to SeNARS types
   */
  mapSchemaTypes(mcpSchema, targetType = 'senars') {
    if (!mcpSchema) return mcpSchema;
    
    const mapping = targetType === 'senars' ? this.mcpToSenarsTypeMap : this.senarsToMcpTypeMap;
    
    if (typeof mcpSchema !== 'object') {
      return mapping[mcpSchema] || mcpSchema;
    }

    const mappedSchema = { ...mcpSchema };
    
    if (mappedSchema.type) {
      mappedSchema.type = mapping[mappedSchema.type] || mappedSchema.type;
    }
    
    if (mappedSchema.properties) {
      for (const [propName, propSchema] of Object.entries(mappedSchema.properties)) {
        mappedSchema.properties[propName] = this.mapSchemaTypes(propSchema, targetType);
      }
    }
    
    if (mappedSchema.items) {
      mappedSchema.items = this.mapSchemaTypes(mappedSchema.items, targetType);
    }
    
    return mappedSchema;
  }

  /**
   * Create a type adapter based on schema compatibility
   */
  createTypeAdapter(inputSchema, outputSchema) {
    return {
      inputAdapter: (input) => this.adaptParametersForMCP(input),
      outputAdapter: (output) => this.adaptResultForSenars(output),
      validateInput: (input) => this.validateAgainstSchema(input, inputSchema),
      validateOutput: (output) => this.validateAgainstSchema(output, outputSchema)
    };
  }

  /**
   * Validate data against a schema (basic validation)
   */
  validateAgainstSchema(data, schema) {
    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    const errors = [];
    
    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in data)) {
          errors.push(`Missing required field: ${requiredField}`);
        }
      }
    }

    // Basic type checking
    if (schema.type && typeof data !== schema.type && !(schema.type === 'integer' && Number.isInteger(data))) {
      errors.push(`Type mismatch: expected ${schema.type}, got ${typeof data}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform a SeNARS term/operation to an MCP tool call
   */
  transformSenarsToMCP(senarsTerm) {
    // Extract the operation and arguments from the SeNARS term
    const operation = this.extractOperationFromTerm(senarsTerm);
    const argumentsObj = this.extractArgumentsFromTerm(senarsTerm);
    
    return {
      operation,
      arguments: this.adaptParametersForMCP(argumentsObj),
      metadata: {
        source: 'senars',
        originalTerm: senarsTerm
      }
    };
  }

  /**
   * Extract operation from SeNARS term
   */
  extractOperationFromTerm(term) {
    if (typeof term === 'string') {
      // If it's a simple string, try to extract operation
      const match = term.match(/^\w+\(([^)]+)\)/);
      if (match) {
        return match[0].split('(')[0];
      }
      return term;
    } else if (typeof term === 'object' && term) {
      // If it's an object, look for operation indicators
      return term.operation || term.op || term.type || term.name || 'process';
    }
    return 'process';
  }

  /**
   * Extract arguments from SeNARS term
   */
  extractArgumentsFromTerm(term) {
    if (typeof term === 'string') {
      // Parse arguments from string representation
      const argsMatch = term.match(/\(([^)]+)\)/);
      if (argsMatch) {
        try {
          // Try to parse as JSON first, fallback to simple split
          return JSON.parse(`{${argsMatch[1].replace(/(\w+)=/g, '"$1":').replace(/'/g, '"')}}`);
        } catch {
          // Simple parsing: split by comma and try to identify key-value pairs
          const args = {};
          argsMatch[1].split(',').forEach(arg => {
            const parts = arg.trim().split('=');
            if (parts.length === 2) {
              const key = parts[0].trim();
              let value = parts[1].trim();
              // Try to convert to appropriate type
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(value)) value = Number(value);
              args[key] = value;
            }
          });
          return args;
        }
      }
      return {};
    } else if (typeof term === 'object' && term) {
      // If it's an object, extract arguments
      return term.arguments || term.args || {};
    }
    return {};
  }
}