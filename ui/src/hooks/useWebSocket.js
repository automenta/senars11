import { useEffect, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';

// Optimized WebSocket hook with improved performance and consistency
export const useWebSocket = () => {
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);
  const setWsConnected = useUiStore(state => state.setWsConnected);

  // Send a message through the WebSocket with error handling
  const sendMessage = useCallback((message) => {
    if (wsService && wsConnected) {
      return wsService.sendMessage(message);
    } else {
      console.warn('WebSocket not connected, message not sent');
      return Promise.reject(new Error('WebSocket not connected'));
    }
  }, [wsService, wsConnected]);

  // Register a message handler with fallback support
  const registerHandler = useCallback((type, handler) => {
    if (!wsService) return;

    if (typeof wsService.registerHandler === 'function') {
      return wsService.registerHandler(type, handler);
    } else if (typeof wsService.addListener === 'function') {
      // Fallback to addListener if registerHandler is not available
      return wsService.addListener(type, handler);
    }
  }, [wsService]);

  // Listen for specific message types with proper cleanup
  const useMessageListener = useCallback((type, handler, deps = []) => {
    useEffect(() => {
      if (wsService && typeof wsService.addListener === 'function') {
        const unsubscribe = wsService.addListener(type, handler);
        return unsubscribe;
      }

      // Fallback to other handler registration methods
      if (wsService) {
        wsService.registerHandler?.(type, handler);
        return () => wsService.unregisterHandler?.(type, handler);
      }
    }, [wsService, type, handler, ...deps]);
  }, [wsService]);

  return {
    wsService,
    wsConnected,
    sendMessage,
    registerHandler,
    useMessageListener,
    setWsConnected
  };
};

// Selector definitions for useUiData hook
const UI_DATA_SELECTORS = Object.freeze({
  wsConnected: state => state.wsConnected,
  tasks: state => state.tasks,
  concepts: state => state.concepts,
  reasoningSteps: state => state.reasoningSteps,
  systemMetrics: state => state.systemMetrics,
  demos: state => state.demos,
  beliefs: state => state.beliefs,
  goals: state => state.goals,
  cycles: state => state.cycles,
  reasoningState: state => state.reasoningState,
  corrections: state => state.corrections,
  activeSession: state => state.activeSession,
  theme: state => state.theme,
  notifications: state => state.notifications,

  addNotification: state => state.addNotification,
  removeNotification: state => state.removeNotification,
  setError: state => state.setError,
  setLoading: state => state.setLoading,
  setTheme: state => state.setTheme,
  toggleTheme: state => state.toggleTheme,
});

// Optimized hook to get UI data from store with proper hook usage
export const useUiData = () => {
  const wsConnected = useUiStore(UI_DATA_SELECTORS.wsConnected);
  const tasks = useUiStore(UI_DATA_SELECTORS.tasks);
  const concepts = useUiStore(UI_DATA_SELECTORS.concepts);
  const reasoningSteps = useUiStore(UI_DATA_SELECTORS.reasoningSteps);
  const systemMetrics = useUiStore(UI_DATA_SELECTORS.systemMetrics);
  const demos = useUiStore(UI_DATA_SELECTORS.demos);
  const beliefs = useUiStore(UI_DATA_SELECTORS.beliefs);
  const goals = useUiStore(UI_DATA_SELECTORS.goals);
  const cycles = useUiStore(UI_DATA_SELECTORS.cycles);
  const reasoningState = useUiStore(UI_DATA_SELECTORS.reasoningState);
  const corrections = useUiStore(UI_DATA_SELECTORS.corrections);
  const activeSession = useUiStore(UI_DATA_SELECTORS.activeSession);
  const theme = useUiStore(UI_DATA_SELECTORS.theme);
  const notifications = useUiStore(UI_DATA_SELECTORS.notifications);

  const addNotification = useUiStore(UI_DATA_SELECTORS.addNotification);
  const removeNotification = useUiStore(UI_DATA_SELECTORS.removeNotification);
  const setError = useUiStore(UI_DATA_SELECTORS.setError);
  const setLoading = useUiStore(UI_DATA_SELECTORS.setLoading);
  const setTheme = useUiStore(UI_DATA_SELECTORS.setTheme);
  const toggleTheme = useUiStore(UI_DATA_SELECTORS.toggleTheme);

  return {
    wsConnected,
    tasks,
    concepts,
    reasoningSteps,
    systemMetrics,
    demos,
    beliefs,
    goals,
    cycles,
    reasoningState,
    corrections,
    activeSession,
    theme,
    notifications,
    addNotification,
    removeNotification,
    setError,
    setLoading,
    setTheme,
    toggleTheme
  };
};

// Operation definitions for useDataOperations hook
const DATA_OPERATIONS = Object.freeze({
  task: {
    add: state => state.addTask,
    update: state => state.updateTask,
    remove: state => state.removeTask
  },
  concept: {
    add: state => state.addConcept,
    update: state => state.updateConcept,
    remove: state => state.removeConcept
  },
  reasoning: {
    addStep: state => state.addReasoningStep,
    clearSteps: state => state.clearReasoningSteps
  },
  belief: {
    add: state => state.addBelief,
    update: state => state.updateBelief,
    remove: state => state.removeBelief
  },
  goal: {
    add: state => state.addGoal,
    update: state => state.updateGoal,
    remove: state => state.removeGoal
  },
  notification: {
    add: state => state.addNotification,
    remove: state => state.removeNotification,
    clear: state => state.clearNotifications
  }
});

// Optimized hook to get data operation functions from store with proper hook usage
export const useDataOperations = () => {
  // Task operations
  const taskAdd = useUiStore(state => state.addTask);
  const taskUpdate = useUiStore(state => state.updateTask);
  const taskRemove = useUiStore(state => state.removeTask);

  // Concept operations
  const conceptAdd = useUiStore(state => state.addConcept);
  const conceptUpdate = useUiStore(state => state.updateConcept);
  const conceptRemove = useUiStore(state => state.removeConcept);

  // Reasoning operations
  const reasoningAddStep = useUiStore(state => state.addReasoningStep);
  const reasoningClearSteps = useUiStore(state => state.clearReasoningSteps);

  // Belief operations
  const beliefAdd = useUiStore(state => state.addBelief);
  const beliefUpdate = useUiStore(state => state.updateBelief);
  const beliefRemove = useUiStore(state => state.removeBelief);

  // Goal operations
  const goalAdd = useUiStore(state => state.addGoal);
  const goalUpdate = useUiStore(state => state.updateGoal);
  const goalRemove = useUiStore(state => state.removeGoal);

  // Notification operations
  const notificationAdd = useUiStore(state => state.addNotification);
  const notificationRemove = useUiStore(state => state.removeNotification);
  const notificationClear = useUiStore(state => state.clearNotifications);

  return {
    taskAdd,
    taskUpdate,
    taskRemove,
    conceptAdd,
    conceptUpdate,
    conceptRemove,
    reasoningAddStep,
    reasoningClearSteps,
    beliefAdd,
    beliefUpdate,
    beliefRemove,
    goalAdd,
    goalUpdate,
    goalRemove,
    notificationAdd,
    notificationRemove,
    notificationClear
  };
};