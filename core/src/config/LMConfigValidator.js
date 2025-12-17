import { z } from 'zod';
import { lmProviderConfigSchema } from './ConfigSchemas.js';

export const validateLMConfig = (config) => {
    const errors = [];

    if (!config) {
        return { isValid: false, errors: ['Configuration is required'] };
    }

    // Basic validation
    if (!config.provider) {
        errors.push('provider is required');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
        errors.push('temperature must be between 0 and 1');
    }

    // Provider-specific validation
    if (config.provider === 'openai') {
        if (!config.apiKey) errors.push('apiKey is required for OpenAI');
        if (!config.modelName) errors.push('modelName is required for OpenAI');
    } else if (config.provider === 'ollama') {
        if (!config.modelName) errors.push('modelName is required for Ollama');
    } else if (config.provider && !['openai', 'ollama', 'anthropic', 'dummy'].includes(config.provider)) {
        errors.push(`Unknown provider: ${config.provider}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};