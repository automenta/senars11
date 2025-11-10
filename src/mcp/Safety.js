import { z } from 'zod';

/**
 * Safety layer for unified validation across MCP client/server operations
 * Implements unified safety standards as described in the plan
 */
export class Safety {
  constructor() {
    this.config = {};
    this.inputValidators = new Map();
    this.outputValidators = new Map();
    this.toolValidators = new Map();
  }

  /**
   * Initialize safety configuration
   */
  async initialize(config = {}) {
    this.config = {
      // Default safety configuration
      inputSanitization: config.inputSanitization !== false,
      outputValidation: config.outputValidation !== false,
      rateLimiting: config.rateLimiting || { enabled: true, requests: 100, windowMs: 60000 },
      piiDetection: config.piiDetection !== false,
      schemaValidation: config.schemaValidation !== false,
      sandboxExecution: config.sandboxExecution !== false,
      ...config
    };

    // Initialize validators
    await this.setupValidators();
  }

  /**
   * Setup various validators
   */
  async setupValidators() {
    // Setup basic schema validators
    this.basicInputSchema = z.object({
      toolName: z.string().min(1).max(100),
      parameters: z.record(z.unknown()).optional().default({})
    });

    this.basicOutputSchema = z.object({
      success: z.boolean().optional().default(true),
      data: z.unknown().optional(),
      error: z.string().optional()
    });
  }

  /**
   * Validate client connection options
   */
  async validateClientOptions(options) {
    // Define schema for client options
    const clientOptionsSchema = z.object({
      endpoint: z.string().url(),
      timeout: z.number().positive().optional(),
      retryAttempts: z.number().int().nonnegative().optional(),
      headers: z.record(z.string()).optional()
    }).partial();

    try {
      // Apply schema validation if enabled
      if (this.config.schemaValidation) {
        const validated = clientOptionsSchema.parse(options);
        return { ...options, ...validated };
      }
      return options;
    } catch (error) {
      throw new Error(`Invalid client options: ${error.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Validate server options
   */
  async validateServerOptions(options) {
    const serverOptionsSchema = z.object({
      port: z.number().int().positive(),
      host: z.string().optional(),
      cors: z.boolean().optional(),
      rateLimit: z.object({
        requests: z.number().int().positive(),
        windowMs: z.number().int().positive()
      }).optional()
    }).partial();

    try {
      if (this.config.schemaValidation) {
        const validated = serverOptionsSchema.parse(options);
        return { ...options, ...validated };
      }
      return options;
    } catch (error) {
      throw new Error(`Invalid server options: ${error.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Validate input parameters for a specific tool
   */
  async validateInput(toolName, input) {
    // Apply general input validation first
    if (this.config.inputSanitization) {
      input = this.sanitizeInput(input);
    }

    // Apply PII detection if enabled
    if (this.config.piiDetection) {
      input = this.detectAndTokenizePII(input);
    }

    // Apply tool-specific validation if available
    if (this.inputValidators.has(toolName)) {
      try {
        const validator = this.inputValidators.get(toolName);
        if (typeof validator === 'function') {
          return await validator(input);
        } else if (validator instanceof z.Schema) {
          return validator.parse(input);
        }
      } catch (error) {
        throw new Error(`Input validation failed for tool "${toolName}": ${error.errors?.[0]?.message || error.message}`);
      }
    }

    return input;
  }

  /**
   * Validate output from a specific tool
   */
  async validateOutput(toolName, output) {
    // Apply general output validation
    if (this.config.outputValidation) {
      output = this.validateOutputStructure(output);
    }

    // Apply tool-specific validation if available
    if (this.outputValidators.has(toolName)) {
      try {
        const validator = this.outputValidators.get(toolName);
        if (typeof validator === 'function') {
          return await validator(output);
        } else if (validator instanceof z.Schema) {
          return validator.parse(output);
        }
      } catch (error) {
        throw new Error(`Output validation failed for tool "${toolName}": ${error.errors?.[0]?.message || error.message}`);
      }
    }

    return output;
  }

  /**
   * Validate tool registration
   */
  async validateToolRegistration(toolName, config) {
    const toolRegistrationSchema = z.object({
      description: z.string().min(1).max(500),
      inputSchema: z.object({}).passthrough().optional(),
      outputSchema: z.object({}).passthrough().optional(),
      handler: z.function()
    });

    try {
      if (this.config.schemaValidation) {
        // Validate the basic structure
        toolRegistrationSchema.parse(config);
      }

      // Validate tool name format
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolName)) {
        throw new Error('Tool name must start with a letter and contain only letters, numbers, hyphens, and underscores');
      }

      // Store validators for this tool if schemas are provided
      if (config.inputSchema) {
        this.inputValidators.set(toolName, z.object(config.inputSchema));
      }
      if (config.outputSchema) {
        this.outputValidators.set(toolName, z.object(config.outputSchema));
      }

      return config;
    } catch (error) {
      throw new Error(`Invalid tool registration for "${toolName}": ${error.errors?.[0]?.message || error.message}`);
    }
  }

  /**
   * Validate code execution request
   */
  async validateCodeExecution(code, context) {
    // Check if sandbox execution is enabled
    if (!this.config.sandboxExecution) {
      throw new Error('Code execution is disabled for security reasons');
    }

    // Validate code (basic security checks)
    if (typeof code !== 'string' || code.length === 0) {
      throw new Error('Code must be a non-empty string');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/,
      /import\(/,
      /require\(/,
      /process\./,
      /global\./,
      /constructor/,
      /__proto__/,
      /__defineGetter__/,
      /__defineSetter__/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Potentially dangerous code pattern detected: ${pattern}`);
      }
    }

    // Validate context
    if (context && typeof context !== 'object') {
      throw new Error('Context must be an object');
    }

    // Limit code size
    if (code.length > (this.config.maxCodeSize || 10000)) {
      throw new Error(`Code size exceeds limit of ${this.config.maxCodeSize || 10000} characters`);
    }

    return {
      code,
      context: context || {},
      timeout: this.config.codeTimeout || 30000
    };
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      // Basic sanitization for strings
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    } else if (typeof input === 'object' && input !== null) {
      // Recursively sanitize object properties
      const sanitized = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  /**
   * Detect and tokenize PII in input
   */
  detectAndTokenizePII(input) {
    if (typeof input === 'string') {
      // Basic PII detection patterns
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const ssnPattern = /\d{3}-\d{2}-\d{4}/g;
      const creditCardPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

      let result = input;

      // Replace emails with tokens
      let emailCount = 0;
      result = result.replace(emailPattern, () => {
        emailCount++;
        return `[EMAIL_${emailCount}]`;
      });

      // Replace phone numbers with tokens
      let phoneCount = 0;
      result = result.replace(phonePattern, () => {
        phoneCount++;
        return `[PHONE_${phoneCount}]`;
      });

      // Replace SSNs with tokens
      let ssnCount = 0;
      result = result.replace(ssnPattern, () => {
        ssnCount++;
        return `[SSN_${ssnCount}]`;
      });

      // Replace credit card numbers with tokens
      let ccCount = 0;
      result = result.replace(creditCardPattern, () => {
        ccCount++;
        return `[CREDIT_CARD_${ccCount}]`;
      });

      return result;
    } else if (typeof input === 'object' && input !== null) {
      // Recursively tokenize PII in objects
      const tokenized = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        tokenized[key] = this.detectAndTokenizePII(value);
      }
      return tokenized;
    }
    return input;
  }

  /**
   * Validate general output structure
   */
  validateOutputStructure(output) {
    // Ensure output doesn't contain potentially harmful content
    if (typeof output === 'string') {
      // Basic check for potentially harmful content
      if (output.includes('<script') || output.includes('javascript:')) {
        throw new Error('Output contains potentially harmful content');
      }
    } else if (typeof output === 'object' && output !== null) {
      // Recursively validate structure
      for (const [key, value] of Object.entries(output)) {
        this.validateOutputStructure(value);
      }
    }
    return output;
  }

  /**
   * Apply rate limiting (placeholder implementation)
   */
  async applyRateLimit(identifier) {
    if (!this.config.rateLimiting?.enabled) {
      return true;
    }

    // In a real implementation, this would use a rate limiter like express-rate-limit
    // For now, we'll just return true to indicate the request is allowed
    return true;
  }

  /**
   * Validate resource access permissions
   */
  async validateAccessPermissions(subject, resource, action) {
    // In a real implementation, this would check permissions
    // For now, we'll allow everything
    return true;
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, details) {
    console.log(`[SECURITY] ${eventType}:`, details);
    // In a production system, this would send events to a security monitoring system
  }

  /**
   * Update safety configuration
   */
  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if needed
    if (newConfig.resetValidators) {
      await this.setupValidators();
      this.inputValidators.clear();
      this.outputValidators.clear();
      this.toolValidators.clear();
    }
  }
}