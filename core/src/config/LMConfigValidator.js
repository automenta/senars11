import { z } from 'zod';

const PROVIDER_REQUIREMENTS = {
    openai: { requiredFields: ['apiKey', 'modelName'], supportsStreaming: true },
    ollama: { requiredFields: ['modelName'], supportsStreaming: true },
    anthropic: { requiredFields: ['apiKey', 'modelName'], supportsStreaming: true },
    dummy: { requiredFields: [], supportsStreaming: false }
};

const VALID_PROVIDERS = Object.keys(PROVIDER_REQUIREMENTS);

export const validateLMConfig = (config) => {
    if (!config) return { isValid: false, errors: ['Configuration is required'] };

    const errors = [];

    // Provider validation
    if (!config.provider) {
        errors.push('provider is required');
    } else if (!VALID_PROVIDERS.includes(config.provider)) {
        errors.push(`Unknown provider: ${config.provider}. Valid providers: ${VALID_PROVIDERS.join(', ')}`);
    } else {
        // Provider-specific validation using mapping
        const requirements = PROVIDER_REQUIREMENTS[config.provider];
        requirements.requiredFields.forEach(field => {
            if (!config[field]) errors.push(`${field} is required for ${config.provider}`);
        });
    }

    // Temperature validation (only if provided)
    if (config.temperature != null && (config.temperature < 0 || config.temperature > 1)) {
        errors.push('temperature must be between 0 and 1');
    }

    return { isValid: errors.length === 0, errors };
};