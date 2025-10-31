import {create} from 'zustand';

// Helper functions to reduce duplication
const createListSetter = (listName) => (item) => (state) => {
  const existingIndex = state[listName].findIndex(i => i.id === item.id || i.term === item.term);
  const updatedList = existingIndex !== -1
    ? [...state[listName].slice(0, existingIndex), item, ...state[listName].slice(existingIndex + 1)]
    : [...state[listName], item];
  return {[listName]: updatedList};
};

const createLimitedListSetter = (listName, limit) => (item) => (state) => ({
  [listName]: [...state[listName], item].slice(-limit)
});

const createItemRemover = (listName, key) => (keyValue) => (state) => ({
  [listName]: state[listName].filter(item => item[key] !== keyValue)
});

const createListClearer = (listName) => () => ({[listName]: []});

const createObjectSetter = (objName) => (key, value) => (prev) => ({
  [objName]: {...prev[objName], [key]: value}
});

const createObjectClearer = (objName) => () => ({[objName]: {}});

// Batch update function to update multiple related properties at once
const batchUpdate = (set, updates) => {
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

// Selector functions for memoized access to parts of state
const selectors = {
  getWebSocketState: (state) => ({wsConnected: state.wsConnected, wsService: state.wsService}),
  getLayoutState: (state) => ({layout: state.layout, savedLayouts: state.savedLayouts}),
  getUiStatus: (state) => ({error: state.error, isLoading: state.isLoading, theme: state.theme}),
  getNotificationState: (state) => ({notifications: state.notifications}),
  getDemoState: (state) => ({demos: state.demos, demoStates: state.demoStates, demoSteps: state.demoSteps}),
};

// Combined state management with logical groupings
const useUiStore = create((set, get) => ({
  // UI state
  layout: null,
  setLayout: (layout) => set({layout}),
  savedLayouts: {},
  saveLayout: (name, layout) => set(state => ({
    savedLayouts: {...state.savedLayouts, [name]: layout}
  })),
  loadLayout: (name) => get().savedLayouts[name],

  // WebSocket state
  wsConnected: false,
  setWsConnected: (connected) => set({wsConnected: connected}),
  wsService: null,
  setWsService: (wsService) => set({wsService}),

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
  addReasoningStep: (step) => set(createListSetter('reasoningSteps')(step)),
  updateReasoningStep: (id, updates) => set(state => ({
    reasoningSteps: state.reasoningSteps.map(step => 
      step.id === id ? {...step, ...updates} : step
    )
  })),
  clearReasoningSteps: () => set({reasoningSteps: []}),

  // Task state
  tasks: [],
  addTask: (task) => set(createListSetter('tasks')(task)),
  updateTask: (id, updates) => set(state => ({
    tasks: state.tasks.map(task => 
      task.id === id ? {...task, ...updates} : task
    )
  })),
  removeTask: (id) => set(createItemRemover('tasks', 'id')(id)),
  clearTasks: () => set({tasks: []}),

  // Concept state
  concepts: [],
  addConcept: (concept) => set(createListSetter('concepts')(concept)),
  updateConcept: (term, updates) => set(state => ({
    concepts: state.concepts.map(concept => 
      concept.term === term ? {...concept, ...updates} : concept
    )
  })),
  removeConcept: (term) => set(createItemRemover('concepts', 'term')(term)),
  clearConcepts: () => set({concepts: []}),

  // Cycle state
  cycles: [],
  addCycle: (cycle) => set(createLimitedListSetter('cycles', 50)(cycle)),
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
  addDemoStep: createLimitedListSetter('demoSteps', 100),
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
    notifications: [...state.notifications, {...notification, id: Date.now()}]
  })),
  updateNotification: (id, updates) => set(state => ({
    notifications: state.notifications.map(n => 
      n.id === id ? {...n, ...updates} : n
    )
  })),
  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  clearNotifications: () => set({notifications: []}),

  // Batch update function for multiple state changes
  batchUpdate: (updates) => batchUpdate(set, updates),

  // Selector functions for memoized access
  selectors: selectors,
  
  // Utility functions
  resetStore: () => set({
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
}));

export default useUiStore;