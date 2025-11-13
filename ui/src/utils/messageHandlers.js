import useUiStore from '../stores/uiStore';

const getStore = () => useUiStore.getState();

const withErrorHandler = (action, handler) => (data) => {
  try {
    return handler(data);
  } catch (error) {
    handleHandlerError(action, error);
  }
};

const createMessageHandler = (action) =>
  withErrorHandler(action, (data) => getStore()[action]?.(data.payload));

const createMessageHandlerWithParams = (action) =>
  withErrorHandler(action, (data) => {
    const {id, config} = data.payload;
    return getStore()[action]?.(id, config);
  });

const createDemoStateHandler = withErrorHandler('demoState', (data) => {
  const {demoId, ...payload} = data.payload;
  return getStore().setDemoState?.(demoId, payload);
});

const createDemoMetricsHandler = withErrorHandler('demoMetrics', (data) => {
  const {demoId, ...payload} = data.payload;
  return getStore().setDemoMetrics?.(demoId, payload);
});

const createNarseseInputHandler = withErrorHandler('narseseInput', (data) => {
  const {input, success, message: msg} = data.payload;
  return getStore().addNotification?.({
    type: success ? 'success' : 'error',
    title: success ? 'Narsese Input Success' : 'Narsese Input Error',
    message: success ? `Processed: ${input}` : (msg || 'Failed to process input'),
    timestamp: Date.now()
  });
});

const createSessionUpdateHandler = withErrorHandler('sessionUpdate', (data) => {
  const {action, session} = data.payload;
  return action === 'start'
    ? getStore().setActiveSession?.(session)
    : getStore().endSession?.();
});

const createConceptUpdateHandler = withErrorHandler('conceptUpdate', (data) => {
  const {concept, changeType} = data.payload;
  return changeType === 'removed'
    ? getStore().removeConcept?.(concept.term)
    : getStore().addConcept?.(concept);
});

const createLogHandler = withErrorHandler('log', ({level = 'log', data: logData}) => {
  console[level]?.(...(logData || []));
});

const createConnectionHandler = withErrorHandler('connection', (data) => {
  // Handle connection message - could be used for client identification or other connection-related tasks
  console.log('WebSocket connection established with server', data.data);
  // Update store with connection status if needed
  if (data.data?.status) {
    getStore().setWsConnected?.(data.data.status === 'connected');
  }
});

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
  createConnectionHandler,
  handleHandlerError,
  getStore
};