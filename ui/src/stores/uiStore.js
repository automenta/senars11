import {create} from 'zustand';

// Helper functions to reduce duplication
const findItemIndex = (list, item, idField = 'id') => 
  list?.findIndex?.(i => i?.[idField] === item?.[idField]) ?? -1;

const createListSetter = (listName) => (item, idField = 'id') => (state) => {
  const currentList = state[listName] || [];
  const existingIndex = findItemIndex(currentList, item, idField);
  
  if (existingIndex !== -1) {
    const newList = [...currentList];
    newList[existingIndex] = item;
    return {[listName]: newList};
  } else {
    return {[listName]: [...currentList, item]};
  }
};

const createLimitedListSetter = (listName, limit) => (item, idField = 'id') => (state) => ({
  [listName]: [...(state[listName] || []), item].slice(-limit)
});

const createItemUpdater = (listName, key) => (keyValue, updates) => (state) => {
  const currentList = state[listName];
  const index = currentList?.findIndex?.(item => item?.[key] === keyValue);
  
  if (index === -1) return {[listName]: currentList}; // Item not found, return unchanged
  
  const newList = [...currentList];
  newList[index] = { ...newList[index], ...updates };
  return {[listName]: newList};
};

const createItemRemover = (listName, key) => (keyValue) => (state) => {
  const currentList = state[listName];
  const indexToRemove = currentList?.findIndex?.(item => item?.[key] === keyValue);
  
  if (indexToRemove === -1) return {[listName]: currentList}; // Item not found, return unchanged
  
  const newList = [...currentList];
  if (indexToRemove !== -1) newList.splice(indexToRemove, 1);
  return {[listName]: newList};
};

const createObjectSetter = (objName) => (key, value) => (prev) => ({
  [objName]: {...(prev[objName] || {}), [key]: value}
});

// Batch update function to update multiple related properties at once
const batchUpdate = (set, updates) => {
  if (!updates || typeof updates !== 'object') return;
  
  set(prevState => {
    const newState = {...prevState};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'function') {
        newState[key] = value(newState); // If it's a function, call it with current state
      } else {
        newState[key] = value; // Otherwise, set the value directly
      }
    }
    return newState;
  });
};

// Selectors for memoized access to parts of state
const selectors = {
  getWebSocketState: (state) => ({wsConnected: state.wsConnected, wsService: state.wsService}),
  getLayoutState: (state) => ({layout: state.layout, savedLayouts: state.savedLayouts}),
  getUiStatus: (state) => ({error: state.error, isLoading: state.isLoading, theme: state.theme}),
  getNotificationState: (state) => ({notifications: state.notifications}),
  getDemoState: (state) => ({demos: state.demos, demoStates: state.demoStates, demoSteps: state.demoSteps}),
};

// Action creators for consistent state updates
const actions = {
  // WebSocket actions
  setWebSocketConnected: (connected) => ({wsConnected: connected}),
  setWebSocketService: (service) => ({wsService: service}),
  
  // Layout actions
  setLayout: (layout) => ({layout}),
  saveLayout: (name, layout) => (state) => ({
    savedLayouts: {...state.savedLayouts, [name]: layout}
  }),
  
  // Notification actions (kept for backward compatibility if needed)
  addNotification: (notification) => (state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  }),
  
  // Reset action
  resetStore: () => ({
    layout: null,
    savedLayouts: {},
    wsConnected: false,
    wsService: null,
    panels: {},
    reasoningSteps: [],
    tasks: [],
    concepts: [],
    cycles: [],
    systemMetrics: null,
    demos: [],
    demoStates: {},
    demoSteps: [],
    demoMetrics: {},
    activeSession: null,
    error: null,
    isLoading: false,
    theme: 'light',
    notifications: []
  })
};

// Combined state management with logical groupings
const useUiStore = create((set, get) => ({
  // UI state
  layout: null,
  setLayout: (layout) => set(actions.setLayout(layout)),
  savedLayouts: {},
  saveLayout: (name, layout) => set(actions.saveLayout(name, layout)),
  loadLayout: (name) => get().savedLayouts?.[name],

  // WebSocket state
  wsConnected: false,
  setWsConnected: (connected) => set(actions.setWebSocketConnected(connected)),
  wsService: null,
  setWsService: (wsService) => set(actions.setWebSocketService(wsService)),

  // Panel management
  panels: {},
  addPanel: (id, config) => set(state => ({
    panels: {...state.panels, [id]: config}
  })),
  updatePanel: (id, config) => set(state => ({
    panels: {...state.panels, [id]: {...state.panels[id], ...config}}
  })),
  removePanel: (id) => set(state => {
    const newPanels = {...state.panels};
    delete newPanels[id];
    return {panels: newPanels};
  }),

  // Reasoning engine state
  reasoningSteps: [],
  addReasoningStep: (step) => set(createListSetter('reasoningSteps')(step, 'id')),
  updateReasoningStep: (id, updates) => set(createItemUpdater('reasoningSteps', 'id')(id, updates)),
  clearReasoningSteps: () => set({reasoningSteps: []}),

  // Task state
  tasks: [],
  addTask: (task) => set(createListSetter('tasks')(task, 'id')),
  updateTask: (id, updates) => set(createItemUpdater('tasks', 'id')(id, updates)),
  removeTask: (id) => set(createItemRemover('tasks', 'id')(id)),
  clearTasks: () => set({tasks: []}),

  // Concept state
  concepts: [],
  addConcept: (concept) => set(createListSetter('concepts')(concept, 'term')),
  updateConcept: (term, updates) => set(createItemUpdater('concepts', 'term')(term, updates)),
  removeConcept: (term) => set(createItemRemover('concepts', 'term')(term)),
  clearConcepts: () => set({concepts: []}),

  // Cycle state
  cycles: [],
  addCycle: (cycle) => set(createLimitedListSetter('cycles', 50)(cycle, 'id')),
  clearCycles: () => set({cycles: []}),

  // System metrics
  systemMetrics: null,
  setSystemMetrics: (metrics) => set({systemMetrics: metrics}),
  clearSystemMetrics: () => set({systemMetrics: null}),

  // Demo-related state
  demos: [],
  setDemoList: (demos) => set({demos}),
  
  demoStates: {},
  setDemoState: createObjectSetter('demoStates'),
  setDemoStateDirect: (demoId, state) => set(prev => ({
    demoStates: {...prev.demoStates, [demoId]: state}
  })),
  updateDemoState: (demoId, updates) => set(state => ({
    demoStates: {
      ...state.demoStates,
      [demoId]: {...state.demoStates[demoId], ...updates}
    }
  })),

  demoSteps: [],
  addDemoStep: (step) => set(createLimitedListSetter('demoSteps', 100)(step, 'id')),
  clearDemoSteps: () => set({demoSteps: []}),

  demoMetrics: {},
  setDemoMetrics: createObjectSetter('demoMetrics'),
  updateDemoMetrics: (demoId, updates) => set(state => ({
    demoMetrics: {
      ...state.demoMetrics,
      [demoId]: {...state.demoMetrics[demoId], ...updates}
    }
  })),
  clearDemoMetrics: () => set({demoMetrics: {}}),

  // Session state
  activeSession: null,
  setActiveSession: (session) => set({activeSession: session}),
  endSession: () => set({activeSession: null}),

  // UI status state
  error: null,
  setError: (error) => set({error}),
  clearError: () => set({error: null}),

  isLoading: false,
  setLoading: (loading) => set({isLoading: loading}),

  theme: 'light',
  setTheme: (theme) => set({theme}),
  toggleTheme: () => set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),

  // Notification state
  notifications: [],
  addNotification: (notification) => set(state => ({
    notifications: [...state.notifications, { ...notification, id: notification.id || Date.now() + Math.random() }]
  })),
  updateNotification: (id, updates) => set(createItemUpdater('notifications', 'id')(id, updates)),
  removeNotification: (id) => set(createItemRemover('notifications', 'id')(id)),
  clearNotifications: () => set({notifications: []}),

  // LM configuration state - store the test result temporarily
  lmTestResult: null,
  setLMTestResult: (result) => set({lmTestResult: result}),

  // Batch update function for multiple state changes
  batchUpdate: (updates) => batchUpdate(set, updates),

  // Selector functions for memoized access
  selectors: selectors,
  
  // Utility functions
  resetStore: () => set(actions.resetStore())
}));

export default useUiStore;