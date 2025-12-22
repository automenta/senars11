/**
 * Common constants for REPL implementations
 * Uses shared DESIGN_TOKENS from core for consistency with web UI
 */
import {DESIGN_TOKENS} from '@senars/core';

export const LOG_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    ERROR: 'error',
    USER: 'user',
    TOOL_CALL: 'tool_call'
};

// Re-export colors from shared tokens for CLI compatibility
export const COLORS = {
    ERROR: DESIGN_TOKENS.colors.error,
    INFO: DESIGN_TOKENS.colors.info,
    SUCCESS: DESIGN_TOKENS.colors.success,
    USER: DESIGN_TOKENS.colors.user,
    TOOL_CALL: DESIGN_TOKENS.colors.toolCall
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