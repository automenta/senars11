/**
 * MessageValidator - Validates WebSocket messages for proper structure and content
 */
class MessageValidator {
    static validate(message) {
        if (!message || typeof message !== 'object') {
            return { valid: false, error: 'Message must be an object' };
        }

        if (typeof message.type !== 'string' || !message.type.trim()) {
            return { valid: false, error: 'Message type must be a non-empty string' };
        }

        const validators = {
            'narseseInput': this._validateNarseseInput,
            'task.added': this._validateTask,
            'belief.added': this._validateBelief,
            'concept.created': this._validateConcept,
            'memorySnapshot': this._validateMemorySnapshot,
            'eventBatch': this._validateEventBatch,
            'control/refresh': this._validateControl,
            'control/ack': this._validateControlAck,
            'error': this._validateError
        };

        const validator = validators[message.type] || this._validateGeneric;
        return validator(message);
    }

    static _validateGeneric(message) {
        return { valid: true, message };
    }

    static _validateNarseseInput(message) {
        if (!message.payload?.input) {
            return { valid: false, error: 'narseseInput requires payload.input' };
        }
        if (typeof message.payload.input !== 'string') {
            return { valid: false, error: 'payload.input must be a string' };
        }
        return { valid: true, message };
    }

    static _validateTask(message) {
        const data = message.data || message.payload;
        if (!data) {
            return { valid: false, error: 'Task message requires data or payload' };
        }
        return { valid: true, message };
    }

    static _validateBelief(message) {
        const data = message.data || message.payload;
        if (!data) {
            return { valid: false, error: 'Belief message requires data or payload' };
        }
        return { valid: true, message };
    }

    static _validateConcept(message) {
        if (!message.data?.term) {
            return { valid: false, error: 'Concept message requires data.term' };
        }
        return { valid: true, message };
    }

    static _validateMemorySnapshot(message) {
        if (!message.payload?.concepts) {
            return { valid: false, error: 'MemorySnapshot requires payload.concepts' };
        }
        if (!Array.isArray(message.payload.concepts)) {
            return { valid: false, error: 'payload.concepts must be an array' };
        }
        return { valid: true, message };
    }

    static _validateEventBatch(message) {
        if (!message.data) {
            return { valid: false, error: 'EventBatch requires data' };
        }
        if (!Array.isArray(message.data) && typeof message.data !== 'object') {
            return { valid: false, error: 'EventBatch data must be an array or object' };
        }
        return { valid: true, message };
    }

    static _validateControl(message) {
        if (!message.payload?.command) {
            return { valid: false, error: 'Control message requires payload.command' };
        }
        return { valid: true, message };
    }

    static _validateControlAck(message) {
        if (!message.payload?.command || !message.payload?.status) {
            return { valid: false, error: 'Control acknowledgment requires payload.command and payload.status' };
        }
        return { valid: true, message };
    }

    static _validateError(message) {
        // Error messages can have the error message in 'payload.error', 'data.error', or 'payload.message', 'data.message'
        if (!message.payload?.message &&
            !message.data?.message &&
            !message.payload?.error &&
            !message.data?.error) {
            return { valid: false, error: 'Error message requires a message or error in payload or data' };
        }
        return { valid: true, message };
    }
}

export default MessageValidator;