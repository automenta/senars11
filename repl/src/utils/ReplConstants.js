/**
 * @file ReplConstants.js
 * @description Common constants for REPL implementations
 */

// Define reusable constants for logging and UI
export const LOG_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    ERROR: 'error',
    USER: 'user',
    TOOL_CALL: 'tool_call'
};

export const COLORS = {
    ERROR: 'red',
    INFO: 'blue',
    SUCCESS: 'green',
    USER: 'yellow',
    TOOL_CALL: 'cyan'
};

export const DEFAULT_MODELS = {
    OLLAMA: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
    OPENAI: 'gpt-4',
    ANTHROPIC: 'claude-3-sonnet-20240229'
};

export const DEFAULT_CONFIG = {
    OLLAMA: {
        modelName: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M',
        baseUrl: 'http://localhost:11434',
        temperature: 0
    }
};