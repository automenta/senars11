/**
 * Custom error classes for SeNARS Self-Analyzer
 */

export class AnalyzerError extends Error {
    constructor(message, code = 'ANALYZER_ERROR', originalError = null) {
        super(message);
        this.name = 'AnalyzerError';
        this.code = code;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();

        // Capture the stack trace
        if (originalError && originalError.stack) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}

export class ConfigurationError extends AnalyzerError {
    constructor(message, originalError = null) {
        super(message, 'CONFIG_ERROR', originalError);
        this.name = 'ConfigurationError';
    }
}

export class AnalysisError extends AnalyzerError {
    constructor(message, analysisType = 'unknown', originalError = null) {
        super(message, `ANALYSIS_ERROR_${analysisType.toUpperCase()}`, originalError);
        this.name = 'AnalysisError';
        this.analysisType = analysisType;
    }
}

export class ValidationError extends AnalyzerError {
    constructor(message, field = null, originalError = null) {
        super(message, 'VALIDATION_ERROR', originalError);
        this.name = 'ValidationError';
        this.field = field;
    }
}