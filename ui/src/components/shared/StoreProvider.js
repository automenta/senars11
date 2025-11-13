/**
 * Store Provider: Context provider for state management
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, { createContext, useContext, useMemo } from 'react';
import useUiStore from '../../stores/uiStore.js';

const StoreContext = createContext();

export const StoreProvider = ({ children, ...props }) => {
  const store = useUiStore();

  const value = useMemo(() => ({
    // State accessors
    wsConnected: store.wsConnected,
    tasks: store.tasks,
    concepts: store.concepts,
    reasoningSteps: store.reasoningSteps,
    systemMetrics: store.systemMetrics,
    demos: store.demos,
    beliefs: store.beliefs,
    goals: store.goals,
    cycles: store.cycles,
    reasoningState: store.reasoningState,
    corrections: store.corrections,
    activeSession: store.activeSession,
    theme: store.theme,
    notifications: store.notifications,

    // Actions
    setWsConnected: store.setWsConnected,
    setWsService: store.setWsService,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    setError: store.setError,
    setLoading: store.setLoading,
    setTheme: store.setTheme,
    toggleTheme: store.toggleTheme,
    
    // Task operations
    addTask: store.addTask,
    updateTask: store.updateTask,
    removeTask: store.removeTask,

    // Concept operations
    addConcept: store.addConcept,
    updateConcept: store.updateConcept,
    removeConcept: store.removeConcept,

    // Reasoning operations
    addReasoningStep: store.addReasoningStep,
    clearReasoningSteps: store.clearReasoningSteps,

    // Belief operations
    addBelief: store.addBelief,
    updateBelief: store.updateBelief,
    removeBelief: store.removeBelief,

    // Goal operations
    addGoal: store.addGoal,
    updateGoal: store.updateGoal,
    removeGoal: store.removeGoal,

    // Notification operations
    clearNotifications: store.clearNotifications,

    // Direct store access
    store,
    useStore: useUiStore
  }), [store]);

  return React.createElement(
    StoreContext.Provider,
    { value, ...props },
    children
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};