export class SeNARSError extends Error {
    constructor(message, type = 'General', originalError = null) {
        super(message);
        this.name = `SeNARSError.${type}`;
        this.type = type;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();

        if (originalError && originalError.stack) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}

export class ConnectionError extends SeNARSError {
    constructor(message, originalError = null) {
        super(message, 'Connection', originalError);
    }
}

export class ModelNotFoundError extends SeNARSError {
    constructor(modelName, originalError = null) {
        super(`Model '${modelName}' not found. Please make sure the model is available.`, 'ModelNotFound', originalError);
        this.modelName = modelName;
    }
}

export class ParseError extends SeNARSError {
    constructor(message, originalError = null) {
        super(message, 'Parse', originalError);
    }
}

export class ConfigurationError extends SeNARSError {
    constructor(message, originalError = null) {
        super(message, 'Configuration', originalError);
    }
}

export class AnalyzerError extends SeNARSError {
    constructor(message, code = 'ANALYZER_ERROR', originalError = null) {
        super(message, 'Analyzer', originalError);
        this.name = 'AnalyzerError';
        this.code = code;
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
