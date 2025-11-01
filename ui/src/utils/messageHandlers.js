import useUiStore from '../stores/uiStore';

const getStore = () => useUiStore.getState();

const createMessageHandler = (action) => (data) => {
  try {
    return getStore()[action]?.(data.payload);
  } catch (error) {
    handleHandlerError(action, error);
  }
};

const createMessageHandlerWithParams = (action) => (data) => {
  try {
    const {id, config} = data.payload;
    return getStore()[action]?.(id, config);
  } catch (error) {
    handleHandlerError(action, error);
  }
};

const createDemoStateHandler = (data) => {
  try {
    const {demoId, ...payload} = data.payload;
    return getStore().setDemoState?.(demoId, payload);
  } catch (error) {
    handleHandlerError('demoState', error);
  }
};

const createDemoMetricsHandler = (data) => {
  try {
    const {demoId, ...payload} = data.payload;
    return getStore().setDemoMetrics?.(demoId, payload);
  } catch (error) {
    handleHandlerError('demoMetrics', error);
  }
};

const createNarseseInputHandler = (data) => {
  try {
    const {input, success, message: msg} = data.payload;
    const notification = {
      type: success ? 'success' : 'error',
      title: success ? 'Narsese Input Success' : 'Narsese Input Error',
      message: success ? `Processed: ${input}` : (msg || 'Failed to process input'),
      timestamp: Date.now()
    };
    return getStore().addNotification?.(notification);
  } catch (error) {
    handleHandlerError('narseseInput', error);
  }
};

const createSessionUpdateHandler = (data) => {
  try {
    const {action, session} = data.payload;
    return action === 'start'
      ? getStore().setActiveSession?.(session)
      : getStore().endSession?.();
  } catch (error) {
    handleHandlerError('sessionUpdate', error);
  }
};

const createConceptUpdateHandler = (data) => {
  try {
    const {concept, changeType} = data.payload;
    return changeType === 'removed'
      ? getStore().removeConcept?.(concept.term)
      : getStore().addConcept?.(concept);
  } catch (error) {
    handleHandlerError('conceptUpdate', error);
  }
};

const createLogHandler = ({level = 'log', data: logData}) => {
  try {
    console[level]?.(...(logData || []));
  } catch (error) {
    console.error('Error handling log:', error);
  }
};

const handleHandlerError = (action, error) => {
  console.error(`Error handling ${action}:`, error);
  getStore().addNotification?.({
    type: 'error',
    title: `Error handling ${action}`,
    message: error?.message || 'Unknown error occurred',
    timestamp: Date.now()
  });
};

export {
  createMessageHandler,
  createMessageHandlerWithParams,
  createDemoStateHandler,
  createDemoMetricsHandler,
  createNarseseInputHandler,
  createSessionUpdateHandler,
  createConceptUpdateHandler,
  createLogHandler,
  handleHandlerError,
  getStore
};