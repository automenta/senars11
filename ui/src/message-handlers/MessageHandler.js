import {NarseseMessageHandler} from './NarseseMessageHandler.js';
import {TaskConceptMessageHandler} from './TaskConceptMessageHandler.js';
import {QuestionReasoningMessageHandler} from './QuestionReasoningMessageHandler.js';
import {SystemMessageHandler} from './SystemMessageHandler.js';
import {MESSAGE_TYPES} from '/src/util/MessageTypes.js';

/**
 * Main Message Handler class to process different message types
 */
export class MessageHandler {
    constructor(graphManager) {
        this.graphManager = graphManager;
        this.narseseHandler = new NarseseMessageHandler();
        this.taskConceptHandler = new TaskConceptMessageHandler();
        this.questionReasoningHandler = new QuestionReasoningMessageHandler();
        this.systemHandler = new SystemMessageHandler();
        this.handlers = this._initializeHandlers();
    }

    /**
     * Initialize message handlers lookup table
     */
    _initializeHandlers() {
        return {
            [MESSAGE_TYPES.NARSESE_RESULT]: (msg) => this.narseseHandler.handleNarseseResult(msg),
            [MESSAGE_TYPES.NARSESE_ERROR]: (msg) => this.narseseHandler.handleNarseseError(msg),
            [MESSAGE_TYPES.TASK_ADDED]: (msg) => this.taskConceptHandler.handleTaskMessage(msg),
            [MESSAGE_TYPES.TASK_INPUT]: (msg) => this.taskConceptHandler.handleTaskMessage(msg),
            [MESSAGE_TYPES.CONCEPT_CREATED]: (msg) => this.taskConceptHandler.handleConceptMessage(msg),
            [MESSAGE_TYPES.CONCEPT_UPDATED]: (msg) => this.taskConceptHandler.handleConceptMessage(msg),
            [MESSAGE_TYPES.CONCEPT_ADDED]: (msg) => this.taskConceptHandler.handleConceptMessage(msg),
            [MESSAGE_TYPES.QUESTION_ANSWERED]: (msg) => this.questionReasoningHandler.handleQuestionAnswered(msg),
            [MESSAGE_TYPES.REASONING_DERIVATION]: (msg) => this.questionReasoningHandler.handleReasoningDerivation(msg),
            [MESSAGE_TYPES.REASONING_STEP]: (msg) => this.questionReasoningHandler.handleReasoningStep(msg),
            [MESSAGE_TYPES.ERROR]: (msg) => this.systemHandler.handleErrorMessage(msg),
            [MESSAGE_TYPES.ERROR_MESSAGE]: (msg) => this.systemHandler.handleErrorMessage(msg),
            [MESSAGE_TYPES.CONNECTION]: (msg) => this.systemHandler.handleConnection(msg),
            [MESSAGE_TYPES.MEMORY_SNAPSHOT]: (msg) => this.systemHandler.handleMemorySnapshot(this.graphManager, msg),
            [MESSAGE_TYPES.INFO]: (msg) => this.systemHandler.handleInfo(msg),
            [MESSAGE_TYPES.LOG]: (msg) => this.systemHandler.handleLog(msg),
            [MESSAGE_TYPES.CONTROL_RESULT]: (msg) => this.systemHandler.handleControlResult(msg)
        };
    }

    /**
     * Process a message and return content, type, and icon
     */
    processMessage(message) {
        const handler = this.handlers[message.type] || ((msg) => this._createDefaultMessage(msg));
        return typeof handler === 'function' ? handler(message) : this._createDefaultMessage(message);
    }

    /**
     * Create a default message for unknown types
     */
    _createDefaultMessage(message) {
        const content = message.payload || message.data || message;
        return {
            content: `${message.type}: ${JSON.stringify(content)}`,
            type: 'info',
            icon: '📝'
        };
    }
}
