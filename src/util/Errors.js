export class SeNARSError extends Error {
    constructor(message, type = 'General') {
        super(message);
        this.name = `SeNARSError.${type}`;
        this.type = type;
    }
}

export class ConnectionError extends SeNARSError {
    constructor(message) {
        super(message, 'Connection');
    }
}

export class ModelNotFoundError extends SeNARSError {
    constructor(modelName) {
        super(`Model '${modelName}' not found. Please make sure the model is available.`, 'ModelNotFound');
        this.modelName = modelName;
    }
}

export class ParseError extends SeNARSError {
    constructor(message) {
        super(message, 'Parse');
    }
}

export class ConfigurationError extends SeNARSError {
    constructor(message) {
        super(message, 'Configuration');
    }
}
