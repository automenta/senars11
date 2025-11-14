import { useEffect, useCallback, useMemo } from 'react';
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

// Optimized hook to get UI data from store with memoization
export const useUiData = () => {
  return useMemo(() => {
    return Object.fromEntries(
      Object.entries(UI_DATA_SELECTORS).map(([key, selector]) => [key, useUiStore(selector)])
    );
  }, []);
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

// Optimized hook to get data operation functions from store with memoization
export const useDataOperations = () => {
  return useMemo(() => {
    return Object.fromEntries(
      Object.entries(DATA_OPERATIONS).flatMap(([category, ops]) =>
        Object.entries(ops).map(([opName, selector]) => [
          `${category}${opName.charAt(0).toUpperCase() + opName.slice(1)}`,
          useUiStore(selector)
        ])
      )
    );
  }, []);
};