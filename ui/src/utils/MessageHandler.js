import {UI_CONSTANTS} from './Constants.js';

/**
 * Shared utility for handling message formatting and logging.
 */
export class MessageHandler {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Process a message and log it appropriately.
     * @param {Object} message - The message object.
     * @param {string} source - The source of the message (e.g. 'Main', 'Demo').
     * @returns {boolean} - True if handled.
     */
    handleMessage(message, source = 'Main') {
        const type = message.type;
        const payload = message.payload;

        if (type === 'demoMetrics') {
            // Handled by specific UI logic (e.g. updating JSON view), but can be suppressed here
            return true;
        }

        if (type === 'narsese.output') {
            this.logger.log(payload, UI_CONSTANTS.LOG_TYPES.REASONING);
            return true;
        }

        if (type === 'reasoning.derivation' || type === 'reasoning.step') {
            const content = payload ? this._formatObject(payload) : 'Processing...';
            this.logger.log(`[Reasoning] ${content}`, UI_CONSTANTS.LOG_TYPES.REASONING);
            return true;
        }

        if (type === 'task.added' || type.includes('task')) {
            const content = payload ? this._formatObject(payload) : 'Task processed';
            this.logger.log(`[Task] ${content}`, UI_CONSTANTS.LOG_TYPES.TASK);
            return true;
        }

        if (type.includes('question') || type.includes('answer')) {
            const content = payload ? this._formatObject(payload) : 'Question processed';
            this.logger.log(`[Question] ${content}`, UI_CONSTANTS.LOG_TYPES.QUESTION);
            return true;
        }

        if (type.includes('concept')) {
            const content = payload ? this._formatObject(payload) : 'Concept processed';
            this.logger.log(`[Concept] ${content}`, UI_CONSTANTS.LOG_TYPES.CONCEPT);
            return true;
        }

        return false;
    }

    _formatObject(obj) {
        if (typeof obj === 'string') return obj;
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }
}
