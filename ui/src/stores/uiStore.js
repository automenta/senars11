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
  removePanel: (id) => set(state => {
    const newPanels = {...state.panels};
    delete newPanels[id];
    return {panels: newPanels};
  }),

  // Reasoning engine state
  reasoningSteps: [],
  addReasoningStep: (step) => set(createListSetter('reasoningSteps')(step)),
  clearReasoningSteps: createListClearer('reasoningSteps'),

  // Task state
  tasks: [],
  addTask: (task) => set(createListSetter('tasks')(task)),
  clearTasks: createListClearer('tasks'),

  // Concept state
  concepts: [],
  addConcept: (concept) => set(createListSetter('concepts')(concept)),
  removeConcept: (term) => set(createItemRemover('concepts', 'term')(term)),
  clearConcepts: createListClearer('concepts'),

  // Cycle state
  cycles: [],
  addCycle: (cycle) => set(createLimitedListSetter('cycles', 50)(cycle)),
  clearCycles: createListClearer('cycles'),

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

  demoSteps: [],
  addDemoStep: createLimitedListSetter('demoSteps', 100),
  clearDemoSteps: createListClearer('demoSteps'),

  demoMetrics: {},
  setDemoMetrics: createObjectSetter('demoMetrics'),
  clearDemoMetrics: createObjectClearer('demoMetrics'),

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
  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  clearNotifications: createListClearer('notifications'),
}));

export default useUiStore;