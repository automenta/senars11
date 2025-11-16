import {z} from 'zod';

/**
 * Safety layer for unified validation across MCP client/server operations
 */
export class Safety {
    constructor() {
        this.config = {};
        this.inputValidators = new Map();
        this.outputValidators = new Map();
        this.toolValidators = new Map();
    }

    async initialize(config = {}) {
        this.config = {
            inputSanitization: config.inputSanitization !== false,
            outputValidation: config.outputValidation !== false,
            rateLimiting: config.rateLimiting ?? {enabled: true, requests: 100, windowMs: 60000},
            piiDetection: config.piiDetection !== false,
            schemaValidation: config.schemaValidation !== false,
            sandboxExecution: config.sandboxExecution !== false,
            ...config
        };

        await this.setupValidators();
    }

    async setupValidators() {
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

    async validateClientOptions(options) {
        const clientOptionsSchema = z.object({
            endpoint: z.string().url(),
            timeout: z.number().positive().optional(),
            retryAttempts: z.number().int().nonnegative().optional(),
            headers: z.record(z.string()).optional()
        }).partial();

        return this._validateWithOptions(options, clientOptionsSchema, 'client options');
    }

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

        return this._validateWithOptions(options, serverOptionsSchema, 'server options');
    }

    _validateWithOptions(options, schema, errorContext) {
        try {
            if (this.config.schemaValidation) {
                const validated = schema.parse(options);
                return {...options, ...validated};
            }
            return options;
        } catch (error) {
            throw new Error(`Invalid ${errorContext}: ${error.errors?.[0]?.message ?? error.message}`);
        }
    }

    async validateInput(toolName, input) {
        if (this.config.inputSanitization) {
            input = this.sanitizeInput(input);
        }

        if (this.config.piiDetection) {
            input = this.detectAndTokenizePII(input);
        }

        return this._validateByTool(toolName, input, this.inputValidators, `Input validation failed for tool "${toolName}"`);
    }

    async validateOutput(toolName, output) {
        if (this.config.outputValidation) {
            output = this.validateOutputStructure(output);
        }

        return this._validateByTool(toolName, output, this.outputValidators, `Output validation failed for tool "${toolName}"`);
    }

    async _validateByTool(toolName, data, validatorMap, errorMessage) {
        if (validatorMap.has(toolName)) {
            try {
                const validator = validatorMap.get(toolName);
                return typeof validator === 'function' ? await validator(data) : validator.parse(data);
            } catch (error) {
                throw new Error(`${errorMessage}: ${error.errors?.[0]?.message ?? error.message}`);
            }
        }

        return data;
    }

    async validateToolRegistration(toolName, config) {
        const toolRegistrationSchema = z.object({
            description: z.string().min(1).max(500),
            inputSchema: z.object({}).passthrough().optional(),
            outputSchema: z.object({}).passthrough().optional(),
            handler: z.function()
        });

        try {
            if (this.config.schemaValidation) {
                toolRegistrationSchema.parse(config);
            }

            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolName)) {
                throw new Error('Tool name must start with a letter and contain only letters, numbers, hyphens, and underscores');
            }

            if (config.inputSchema) {
                this.inputValidators.set(toolName, z.object(config.inputSchema));
            }
            if (config.outputSchema) {
                this.outputValidators.set(toolName, z.object(config.outputSchema));
            }

            return config;
        } catch (error) {
            throw new Error(`Invalid tool registration for "${toolName}": ${error.errors?.[0]?.message ?? error.message}`);
        }
    }

    async validateCodeExecution(code, context) {
        if (!this.config.sandboxExecution) {
            throw new Error('Code execution is disabled for security reasons');
        }

        if (typeof code !== 'string' || code.length === 0) {
            throw new Error('Code must be a non-empty string');
        }

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

        if (context && typeof context !== 'object') {
            throw new Error('Context must be an object');
        }

        if (code.length > (this.config.maxCodeSize ?? 10000)) {
            throw new Error(`Code size exceeds limit of ${this.config.maxCodeSize ?? 10000} characters`);
        }

        return {
            code,
            context: context ?? {},
            timeout: this.config.codeTimeout ?? 30000
        };
    }

    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        } else if (typeof input === 'object' && input !== null) {
            return Array.isArray(input)
                ? input.map(item => this.sanitizeInput(item))
                : Object.fromEntries(Object.entries(input).map(([key, value]) => [key, this.sanitizeInput(value)]));
        }
        return input;
    }

    detectAndTokenizePII(input) {
        if (typeof input === 'string') {
            const patterns = [
                {regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'EMAIL'},
                {regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, type: 'PHONE'},
                {regex: /\d{3}-\d{2}-\d{4}/g, type: 'SSN'},
                {regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, type: 'CREDIT_CARD'}
            ];

            let result = input;
            let counters = {EMAIL: 0, PHONE: 0, SSN: 0, CREDIT_CARD: 0};

            for (const {regex, type} of patterns) {
                result = result.replace(regex, () => {
                    counters[type]++;
                    return `[${type}_${counters[type]}]`;
                });
            }

            return result;
        } else if (typeof input === 'object' && input !== null) {
            return Array.isArray(input)
                ? input.map(item => this.detectAndTokenizePII(item))
                : Object.fromEntries(Object.entries(input).map(([key, value]) => [key, this.detectAndTokenizePII(value)]));
        }
        return input;
    }

    validateOutputStructure(output) {
        if (typeof output === 'string' && (output.includes('<script') || output.includes('javascript:'))) {
            throw new Error('Output contains potentially harmful content');
        } else if (typeof output === 'object' && output !== null) {
            for (const value of Object.values(output)) {
                this.validateOutputStructure(value);
            }
        }
        return output;
    }

    async applyRateLimit(identifier) {
        return !(this.config.rateLimiting?.enabled);
    }

    async validateAccessPermissions(subject, resource, action) {
        return true; // Allow everything in this simplified implementation
    }

    logSecurityEvent(eventType, details) {
        console.log(`[SECURITY] ${eventType}:`, details);
    }

    async updateConfiguration(newConfig) {
        this.config = {...this.config, ...newConfig};

        if (newConfig.resetValidators) {
            await this.setupValidators();
            this.inputValidators.clear();
            this.outputValidators.clear();
            this.toolValidators.clear();
        }
    }
}