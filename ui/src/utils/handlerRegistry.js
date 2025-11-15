import {
  createConceptUpdateHandler,
  createConnectionHandler,
  createDemoMetricsHandler,
  createDemoStateHandler,
  createLogHandler,
  createMessageHandler,
  createMessageHandlerWithParams,
  createNarseseInputHandler,
  createSessionUpdateHandler,
  getStore
} from './messageHandlers';

const createOptimizedMessageHandlers = () => Object.freeze({
  layoutUpdate: createMessageHandler('setLayout'),
  panelUpdate: createMessageHandlerWithParams('addPanel'),
  reasoningStep: createMessageHandler('addReasoningStep'),
  sessionUpdate: createSessionUpdateHandler,
  notification: createMessageHandler('addNotification'),
  error: createMessageHandler('setError'),
  conceptUpdate: createConceptUpdateHandler,
  taskUpdate: (data) => {
    // Extract the task object from payload, not the entire payload
    if (data?.payload?.task) {
      getStore().addTask(data.payload.task);
    } else {
      getStore().addTask(data.payload);
    }
  },
  beliefUpdate: createMessageHandler('addBelief'),
  goalUpdate: createMessageHandler('addGoal'),
  cycleUpdate: createMessageHandler('addCycle'),
  systemMetrics: createMessageHandler('setSystemMetrics'),
  log: createLogHandler,
  connection: createConnectionHandler,
  demoState: createDemoStateHandler,
  demoStep: createMessageHandler('addDemoStep'),
  demoMetrics: createDemoMetricsHandler,
  demoList: createMessageHandler('setDemoList'),
  narseseInput: createNarseseInputHandler,
  testLMConnection: createMessageHandler('setLMTestResult'),
  reasoningState: createMessageHandler('setReasoningState'),
  metaCognitiveAnalysis: createMessageHandler('setMetaCognitiveResults'),
  selfCorrection: createMessageHandler('setCorrections'),
  narInstance: createMessageHandler('setNar'),
});

export const createHandlerRegistry = () => {
  const handlers = new Map();

  Object.entries(createOptimizedMessageHandlers()).forEach(([type, handler]) => {
    handlers.set(type, handler);
  });

  return {
    register: (type, handler) => {
      handlers.set(type, handler);
      return () => handlers.delete(type);
    },
    get: (type) => handlers.get(type),
    has: (type) => handlers.has(type),
    getAll: () => handlers,
    process: (data) => {
      if (!data || typeof data !== 'object') {
        console.warn('Received invalid message data:', data);
        return false;
      }

      const {type} = data;
      if (!type) {
        console.debug('Received message without type (this may be expected for certain message types):', data);
        return false;
      }

      const handler = handlers.get(type);
      if (handler) {
        handler(data);
        return true;
      }
      return false;
    }
  };
};