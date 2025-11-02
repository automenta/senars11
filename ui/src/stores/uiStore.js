import {create} from 'zustand';

// Centralized helper functions to reduce duplication
const findItemIndex = (list, item, idField = 'id') => 
  list?.findIndex?.(i => i?.[idField] === item?.[idField]) ?? -1;

// Generic collection management utilities
const createCollectionManager = (collectionName) => {
  return {
    add: (item, idField = 'id') => (state) => {
      const currentList = state[collectionName] || [];
      const existingIndex = findItemIndex(currentList, item, idField);
      
      if (existingIndex !== -1) {
        const newList = [...currentList];
        newList[existingIndex] = { ...newList[existingIndex], ...item };
        return {[collectionName]: newList};
      } else {
        return {[collectionName]: [...currentList, item]};
      }
    },
    
    update: (key, keyField, updates) => (state) => {
      const currentList = state[collectionName];
      if (!currentList) return {[collectionName]: currentList};
      
      const index = currentList?.findIndex?.(item => item?.[keyField] === key);
      if (index === -1) return {[collectionName]: currentList}; // Item not found
      
      const newList = [...currentList];
      newList[index] = { ...newList[index], ...updates };
      return {[collectionName]: newList};
    },
    
    remove: (key, keyField) => (state) => {
      const currentList = state[collectionName];
      if (!currentList) return {[collectionName]: currentList};
      
      const indexToRemove = currentList?.findIndex?.(item => item?.[keyField] === key);
      if (indexToRemove === -1) return {[collectionName]: currentList}; // Item not found
      
      const newList = [...currentList];
      newList.splice(indexToRemove, 1);
      return {[collectionName]: newList};
    },
    
    clear: () => ({[collectionName]: []}),
    
    addLimited: (item, limit, idField = 'id') => (state) => ({
      [collectionName]: [...(state[collectionName] || []), item].slice(-limit)
    })
  };
};

// Specialized utilities for object-based state (like demo states, metrics, etc.)
const createObjectManager = (objectName) => {
  return {
    set: (key, value) => (prev) => ({
      [objectName]: {...(prev[objectName] || {}), [key]: value}
    }),
    
    update: (key, updates) => (state) => ({
      [objectName]: {
        ...state[objectName],
        [key]: {...state[objectName]?.[key], ...updates}
      }
    }),
    
    clear: () => ({[objectName]: {}})
  };
};

// Batch update utility for multiple state changes
const batchUpdate = (set, updates) => {
  if (!updates || typeof updates !== 'object') return;
  
  set(prevState => {
    const newState = {...prevState};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'function') {
        newState[key] = value(newState);
      } else {
        newState[key] = value;
      }
    }
    return newState;
  });
};

// Predefined collection managers
const reasoningStepsManager = createCollectionManager('reasoningSteps');
const tasksManager = createCollectionManager('tasks');
const conceptsManager = createCollectionManager('concepts');
const cyclesManager = createCollectionManager('cycles');
const demoStepsManager = createCollectionManager('demoSteps');
const notificationsManager = createCollectionManager('notifications');

// Predefined object managers
const demoStatesManager = createObjectManager('demoStates');
const demoMetricsManager = createObjectManager('demoMetrics');
const savedLayoutsManager = createObjectManager('savedLayouts');

// Selectors for memoized access to parts of state
const selectors = {
  getWebSocketState: (state) => ({wsConnected: state.wsConnected, wsService: state.wsService}),
  getLayoutState: (state) => ({layout: state.layout, savedLayouts: state.savedLayouts}),
  getUiStatus: (state) => ({error: state.error, isLoading: state.isLoading, theme: state.theme}),
  getNotificationState: (state) => ({notifications: state.notifications}),
  getDemoState: (state) => ({demos: state.demos, demoStates: state.demoStates, demoSteps: state.demoSteps}),
};

// Initial state definition for clarity
const initialState = {
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
  notifications: [],
  lmTestResult: null
};

// Main store definition
const useUiStore = create((set, get) => ({
  // State initialization
  ...initialState,

  // UI state management
  setLayout: (layout) => set({layout}),
  saveLayout: (name, layout) => set(savedLayoutsManager.set(name, layout)),
  loadLayout: (name) => get().savedLayouts?.[name],

  // WebSocket state management
  setWsConnected: (connected) => set({wsConnected: connected}),
  setWsService: (wsService) => set({wsService}),

  // Panel management
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

  // Reasoning engine state management using collection manager
  addReasoningStep: (step) => set(reasoningStepsManager.add(step, 'id')),
  updateReasoningStep: (id, updates) => set(reasoningStepsManager.update(id, 'id', updates)),
  clearReasoningSteps: () => set(reasoningStepsManager.clear()),

  // Task state management using collection manager
  addTask: (task) => set(tasksManager.add(task, 'id')),
  updateTask: (id, updates) => set(tasksManager.update(id, 'id', updates)),
  removeTask: (id) => set(tasksManager.remove(id, 'id')),
  clearTasks: () => set(tasksManager.clear()),

  // Concept state management using collection manager
  addConcept: (concept) => set(conceptsManager.add(concept, 'term')),
  updateConcept: (term, updates) => set(conceptsManager.update(term, 'term', updates)),
  removeConcept: (term) => set(conceptsManager.remove(term, 'term')),
  clearConcepts: () => set(conceptsManager.clear()),

  // Cycle state management using collection manager
  addCycle: (cycle) => set(cyclesManager.addLimited(cycle, 50, 'id')),
  clearCycles: () => set(cyclesManager.clear()),

  // System metrics management
  setSystemMetrics: (metrics) => set({systemMetrics: metrics}),
  clearSystemMetrics: () => set({systemMetrics: null}),

  // Demo-related state management
  setDemoList: (demos) => set({demos}),
  
  setDemoState: demoStatesManager.set,
  setDemoStateDirect: (demoId, state) => set(prev => ({
    demoStates: {...prev.demoStates, [demoId]: state}
  })),
  updateDemoState: (demoId, updates) => set(demoStatesManager.update(demoId, updates)),

  addDemoStep: (step) => set(demoStepsManager.addLimited(step, 100, 'id')),
  clearDemoSteps: () => set(demoStepsManager.clear()),

  setDemoMetrics: demoMetricsManager.set,
  updateDemoMetrics: (demoId, updates) => set(demoMetricsManager.update(demoId, updates)),
  clearDemoMetrics: () => set(demoMetricsManager.clear()),

  // Session state management
  setActiveSession: (session) => set({activeSession: session}),
  endSession: () => set({activeSession: null}),

  // UI status management
  setError: (error) => set({error}),
  clearError: () => set({error: null}),
  setLoading: (loading) => set({isLoading: loading}),
  setTheme: (theme) => set({theme}),
  toggleTheme: () => set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),

  // Notification state management using collection manager
  addNotification: (notification) => set(state => {
    const id = notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { notifications: [...state.notifications, { ...notification, id }] };
  }),
  updateNotification: (id, updates) => set(notificationsManager.update(id, 'id', updates)),
  removeNotification: (id) => set(notificationsManager.remove(id, 'id')),
  clearNotifications: () => set(notificationsManager.clear()),

  // LM configuration state
  setLMTestResult: (result) => set({lmTestResult: result}),

  // Batch update function for multiple state changes
  batchUpdate: (updates) => batchUpdate(set, updates),

  // Selector functions
  selectors: selectors,
  
  // Utility functions
  resetStore: () => set(initialState)
}));

export default useUiStore;