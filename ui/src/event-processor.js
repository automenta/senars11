import Logger from './utils/logger.js';
import MessageValidator from './utils/message-validator.js';
import NodeFactory from './utils/node-factory.js';
import DataTransformer from './utils/data-transformer.js';

/**
 * EventProcessor - Centralized module for processing NARS events and dispatching UI actions
 */
class EventProcessor {
    constructor(store) {
        this.store = store;
        this.handlers = this._initializeHandlers();
    }

    _initializeHandlers() {
        return new Map([
            ['concept.created', this._handleConceptCreated.bind(this)],
            ['task.added', this._handleTaskAdded.bind(this)],
            ['belief.added', this._handleBeliefAdded.bind(this)],
            ['task.processed', this._handleTaskProcessed.bind(this)],
            ['task.input', this._handleTaskInput.bind(this)],
            ['question.answered', this._handleQuestionAnswered.bind(this)],
            ['reasoning.derivation', this._handleDerivation.bind(this)],
            ['reasoning.step', this._handleReasoningStep.bind(this)],
            ['memorySnapshot', this._handleMemorySnapshot.bind(this)],
            ['eventBatch', this._handleEventBatch.bind(this)]
        ]);
    }

    process(message) {
        try {
            // Validate the message
            const validation = MessageValidator.validate(message);
            if (!validation.valid) {
                Logger.warn(`Invalid message received: ${validation.error}`, { message });
                return;
            }

            const handler = this.handlers.get(message.type);
            if (handler) {
                handler(message);
            } else {
                this._handleUnknownEvent(message);
            }
        } catch (error) {
            Logger.error(`Error processing message of type ${message.type}`, { error: error.message, message });
        }
    }

    _handleConceptCreated(message) {
        try {
            const transformedData = DataTransformer.transformEventData('concept.created', message.data);
            const node = NodeFactory.createConcept(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling concept.created event', { error: error.message, message });
        }
    }

    _handleTaskAdded(message) {
        try {
            const transformedData = DataTransformer.transformEventData('task.added', message.data);
            const node = NodeFactory.createTask(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling task.added event', { error: error.message, message });
        }
    }

    _handleBeliefAdded(message) {
        try {
            const transformedData = DataTransformer.transformEventData('belief.added', message.data);
            const node = NodeFactory.createBelief(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling belief.added event', { error: error.message, message });
        }
    }

    _handleTaskProcessed(message) {
        try {
            const transformedData = DataTransformer.transformEventData('task.processed', message.data);
            const node = NodeFactory.createProcessedTask(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling task.processed event', { error: error.message, message });
        }
    }

    _handleTaskInput(message) {
        try {
            const transformedData = DataTransformer.transformEventData('task.input', message.data);
            const node = NodeFactory.createInputTask(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling task.input event', { error: error.message, message });
        }
    }

    _handleQuestionAnswered(message) {
        try {
            const transformedData = DataTransformer.transformEventData('question.answered', message.data);
            const node = NodeFactory.createQuestion(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling question.answered event', { error: error.message, message });
        }
    }

    _handleDerivation(message) {
        try {
            const transformedData = DataTransformer.transformEventData('reasoning.derivation', message.data);
            const node = NodeFactory.createDerivation(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling reasoning.derivation event', { error: error.message, message });
        }
    }

    _handleReasoningStep(message) {
        try {
            const transformedData = DataTransformer.transformEventData('reasoning.step', message.data);
            const node = NodeFactory.createReasoningStep(transformedData);

            this.store.dispatch({
                type: 'ADD_NODE',
                payload: node
            });
        } catch (error) {
            Logger.error('Error handling reasoning.step event', { error: error.message, message });
        }
    }

    _handleMemorySnapshot(message) {
        try {
            const transformedData = DataTransformer.transformEventData('memorySnapshot', message.payload);

            this.store.dispatch({
                type: 'SET_GRAPH_SNAPSHOT',
                payload: {
                    nodes: transformedData.concepts.map(concept => NodeFactory.createConcept(concept)),
                    edges: []
                }
            });
        } catch (error) {
            Logger.error('Error handling memorySnapshot event', { error: error.message, message });
        }
    }

    _handleEventBatch(message) {
        try {
            const events = Array.isArray(message.data) ? message.data : [message.data];
            for (const event of events) {
                this.process(event); // Recursive processing
            }
        } catch (error) {
            Logger.error('Error handling eventBatch event', { error: error.message, message });
        }
    }

    _handleUnknownEvent(message) {
        try {
            // Only log specific message types, not all unknown events
            if (['error', 'log', 'connection'].includes(message.type)) {
                this.store.dispatch({
                    type: 'ADD_LOG_ENTRY',
                    payload: {
                        content: message.payload?.message || JSON.stringify(message),
                        type: 'in'
                    }
                });
            }
        } catch (error) {
            Logger.error('Error handling unknown event', { error: error.message, message });
        }
    }
}

export default EventProcessor;