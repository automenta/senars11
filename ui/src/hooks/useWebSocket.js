import { useEffect, useCallback } from 'react';
import useUiStore from '../stores/uiStore.js';

// Custom hook for managing WebSocket connections
export const useWebSocket = () => {
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);
  const setWsConnected = useUiStore(state => state.setWsConnected);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message) => {
    if (wsService && wsConnected) {
      return wsService.sendMessage(message);
    } else {
      console.warn('WebSocket not connected, message queued');
      return Promise.reject(new Error('WebSocket not connected'));
    }
  }, [wsService, wsConnected]);

  // Register a message handler - check if wsService has the method
  const registerHandler = useCallback((type, handler) => {
    if (wsService && typeof wsService.registerHandler === 'function') {
      wsService.registerHandler(type, handler);
    } else if (wsService && typeof wsService.addListener === 'function') {
      // Fallback to addListener if registerHandler is not available
      wsService.addListener(type, handler);
    }
  }, [wsService]);

  // Listen for specific message types
  const useMessageListener = useCallback((type, handler, deps = []) => {
    useEffect(() => {
      if (wsService) {
        wsService.registerHandler(type, handler);
        return () => wsService.unregisterHandler(type, handler);
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

// Hook for accessing UI store data with common selectors
export const useUiData = () => {
  return {
    // State accessors
    wsConnected: useUiStore(state => state.wsConnected),
    tasks: useUiStore(state => state.tasks),
    concepts: useUiStore(state => state.concepts),
    reasoningSteps: useUiStore(state => state.reasoningSteps),
    systemMetrics: useUiStore(state => state.systemMetrics),
    demos: useUiStore(state => state.demos),
    beliefs: useUiStore(state => state.beliefs),
    goals: useUiStore(state => state.goals),
    cycles: useUiStore(state => state.cycles),
    reasoningState: useUiStore(state => state.reasoningState),
    corrections: useUiStore(state => state.corrections),
    activeSession: useUiStore(state => state.activeSession),
    theme: useUiStore(state => state.theme),
    notifications: useUiStore(state => state.notifications),
    
    // Actions
    addNotification: useUiStore(state => state.addNotification),
    removeNotification: useUiStore(state => state.removeNotification),
    setError: useUiStore(state => state.setError),
    setLoading: useUiStore(state => state.setLoading),
    setTheme: useUiStore(state => state.setTheme),
    toggleTheme: useUiStore(state => state.toggleTheme),
  };
};

// Hook for common data operations
export const useDataOperations = () => {
  return {
    // Task operations
    addTask: useUiStore(state => state.addTask),
    updateTask: useUiStore(state => state.updateTask),
    removeTask: useUiStore(state => state.removeTask),
    
    // Concept operations
    addConcept: useUiStore(state => state.addConcept),
    updateConcept: useUiStore(state => state.updateConcept),
    removeConcept: useUiStore(state => state.removeConcept),
    
    // Reasoning operations
    addReasoningStep: useUiStore(state => state.addReasoningStep),
    clearReasoningSteps: useUiStore(state => state.clearReasoningSteps),
    
    // Belief operations
    addBelief: useUiStore(state => state.addBelief),
    updateBelief: useUiStore(state => state.updateBelief),
    removeBelief: useUiStore(state => state.removeBelief),
    
    // Goal operations
    addGoal: useUiStore(state => state.addGoal),
    updateGoal: useUiStore(state => state.updateGoal),
    removeGoal: useUiStore(state => state.removeGoal),
    
    // Notification operations
    addNotification: useUiStore(state => state.addNotification),
    removeNotification: useUiStore(state => state.removeNotification),
    clearNotifications: useUiStore(state => state.clearNotifications),
  };
};