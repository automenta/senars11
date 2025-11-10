/**
 * Adapter for translating between SeNARS and MCP formats
 */
export class Adapter {
  constructor() {
    this.mcpToSenarsTypeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
      'integer': 'number',
      'null': 'null'
    };

    this.senarsToMcpTypeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
      'null': 'null'
    };
  }

  normalizeMCPTool(mcpTool) {
    return {
      name: mcpTool.name ?? mcpTool.id ?? 'unknown',
      description: mcpTool.description ?? mcpTool.info?.description ?? '',
      parameters: this.normalizeMCPParameters(mcpTool.inputSchema ?? mcpTool.parameters),
      returns: this.normalizeMCPParameters(mcpTool.outputSchema ?? mcpTool.returns ?? {}),
      schema: mcpTool.inputSchema ?? mcpTool.parameters,
      outputSchema: mcpTool.outputSchema ?? mcpTool.returns
    };
  }

  normalizeMCPParameters(parameters) {
    if (!parameters) return { type: 'object', properties: {}, required: [] };

    const normalized = { ...parameters };
    normalized.properties ??= {};
    normalized.required ??= [];

    return normalized;
  }

  toMCPFormat(senarsData, context = null) {
    if (typeof senarsData !== 'object' || senarsData === null) {
      return senarsData;
    }

    if (Array.isArray(senarsData)) {
      return senarsData.map(item => this.toMCPFormat(item, context));
    }

    const mcpData = {};
    for (const [key, value] of Object.entries(senarsData)) {
      mcpData[key] = typeof value === 'object' && value !== null && !Array.isArray(value) 
        ? this.toMCPFormat(value, context) 
        : value;
    }

    return mcpData;
  }

  fromMCPFormat(mcpData, context = null) {
    if (typeof mcpData !== 'object' || mcpData === null) {
      return mcpData;
    }

    if (Array.isArray(mcpData)) {
      return mcpData.map(item => this.fromMCPFormat(item, context));
    }

    const senarsData = {};
    for (const [key, value] of Object.entries(mcpData)) {
      senarsData[key] = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? this.fromMCPFormat(value, context)
        : value;
    }

    return senarsData;
  }

  adaptTaskForMCP(task) {
    const adapted = {
      toolName: task.operation ?? task.type ?? task.name ?? 'unknown',
      parameters: this.adaptParametersForMCP(task.arguments ?? task.params ?? task.content ?? {})
    };

    if (task.id) adapted.id = task.id;
    if (task.priority) adapted.priority = task.priority;
    if (task.expirationTime) adapted.timeout = task.expirationTime;

    return adapted;
  }

  adaptParametersForMCP(params) {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const adapted = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === 'truth' && typeof value === 'object') {
        adapted[key] = {
          frequency: value.frequency ?? value.f ?? 0.5,
          confidence: value.confidence ?? value.c ?? 0.1
        };
      } else if (key === 'stamp' && Array.isArray(value)) {
        adapted[key] = value.map(s => s.id ?? s);
      } else if (typeof value === 'object' && value !== null) {
        adapted[key] = this.adaptParametersForMCP(value);
      } else {
        adapted[key] = value;
      }
    }

    return adapted;
  }

  adaptResultForSenars(result, originalTask = null) {
    if (result?.task) {
      return result;
    }

    const adaptedResult = {
      type: 'result',
      content: result,
      source: 'mcp',
      timestamp: Date.now(),
      originalTask: originalTask ?? null
    };

    if (originalTask?.truth) {
      adaptedResult.truth = originalTask.truth;
    }

    return adaptedResult;
  }

  mapSchemaTypes(mcpSchema, targetType = 'senars') {
    if (!mcpSchema) return mcpSchema;

    const mapping = targetType === 'senars' ? this.mcpToSenarsTypeMap : this.senarsToMcpTypeMap;

    if (typeof mcpSchema !== 'object') {
      return mapping[mcpSchema] ?? mcpSchema;
    }

    const mappedSchema = { ...mcpSchema };

    if (mappedSchema.type) {
      mappedSchema.type = mapping[mappedSchema.type] ?? mappedSchema.type;
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

  createTypeAdapter(inputSchema, outputSchema) {
    return {
      inputAdapter: (input) => this.adaptParametersForMCP(input),
      outputAdapter: (output) => this.adaptResultForSenars(output),
      validateInput: (input) => this.validateAgainstSchema(input, inputSchema),
      validateOutput: (output) => this.validateAgainstSchema(output, outputSchema)
    };
  }

  validateAgainstSchema(data, schema) {
    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    const errors = [];

    if (Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in data)) {
          errors.push(`Missing required field: ${requiredField}`);
        }
      }
    }

    if (schema.type && typeof data !== schema.type && !(schema.type === 'integer' && Number.isInteger(data))) {
      errors.push(`Type mismatch: expected ${schema.type}, got ${typeof data}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  transformSenarsToMCP(senarsTerm) {
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

  extractOperationFromTerm(term) {
    if (typeof term === 'string') {
      const match = term.match(/^\w+\(([^)]+)\)/);
      return match ? match[0].split('(')[0] : term;
    } else if (typeof term === 'object' && term) {
      return term.operation ?? term.op ?? term.type ?? term.name ?? 'process';
    }
    return 'process';
  }

  extractArgumentsFromTerm(term) {
    if (typeof term === 'string') {
      const argsMatch = term.match(/\(([^)]+)\)/);
      if (argsMatch) {
        try {
          return JSON.parse(`{${argsMatch[1].replace(/(\w+)=/g, '"$1":').replace(/'/g, '"')}}`);
        } catch {
          const args = {};
          argsMatch[1].split(',').forEach(arg => {
            const parts = arg.trim().split('=');
            if (parts.length === 2) {
              const key = parts[0].trim();
              let value = parts[1].trim();
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
      return term.arguments ?? term.args ?? {};
    }
    return {};
  }
}