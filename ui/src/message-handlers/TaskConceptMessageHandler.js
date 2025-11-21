import {BaseMessageHandler} from './BaseMessageHandler.js';
import {FormattingUtils} from '/src/util/FormattingUtils.js';

/**
 * Handler for task and concept related messages
 */
export class TaskConceptMessageHandler extends BaseMessageHandler {
    /**
     * Create a task-related message
     */
    handleTaskMessage(message) {
        const payload = message.payload || {};
        let content;

        if (payload.term) {
            // Use shared formatting logic if we have a term/task structure
            content = FormattingUtils.formatTask(payload);
        } else {
            content = JSON.stringify(payload);
        }

        return this._formatMessage(payload, content, 'task', '📥');
    }

    /**
     * Create a concept-related message
     */
    handleConceptMessage(message) {
        const payload = message.payload || {};
        const term = payload.term ? payload.term.toString() : JSON.stringify(payload);
        return this._formatMessage(payload, `Concept: ${term}`, 'concept', '🧠');
    }
}
