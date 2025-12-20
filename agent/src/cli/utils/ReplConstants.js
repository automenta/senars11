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
    OLLAMA: 'llama3.2',
    OPENAI: 'gpt-4',
    ANTHROPIC: 'claude-3-sonnet-20240229'
};

export const DEFAULT_CONFIG = {
    OLLAMA: {
        modelName: 'Xenova/LaMini-Flan-T5-248M',
        baseUrl: 'http://localhost:11434',
        temperature: 0
    }
};