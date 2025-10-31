import {create} from 'zustand';

// Helper functions to reduce duplication
const findItemIndex = (list, item) => list.findIndex(i => i.id === item.id || i.term === item.term);

const createListSetter = (listName) => (item) => (state) => {
  const currentList = state[listName];
  const existingIndex = findItemIndex(currentList, item);
  
  if (existingIndex !== -1) {
    // Update existing item - use spread to create new array but only change the one item
    const newList = [...currentList];
    newList[existingIndex] = item;
    return {[listName]: newList};
  } else {
    // Add new item
    return {[listName]: [...currentList, item]};
  }
};

const createLimitedListSetter = (listName, limit) => (item) => (state) => ({
  [listName]: [...state[listName], item].slice(-limit)
});

const createItemUpdater = (listName, key) => (keyValue, updates) => (state) => {
  const currentList = state[listName];
  const index = currentList.findIndex(item => item[key] === keyValue);
  
  if (index === -1) return {[listName]: currentList}; // Item not found, return unchanged
  
  const newList = [...currentList];
  newList[index] = { ...newList[index], ...updates };
  return {[listName]: newList};
};

const createItemRemover = (listName, key) => (keyValue) => (state) => {
  const currentList = state[listName];
  const indexToRemove = currentList.findIndex(item => item[key] === keyValue);
  
  if (indexToRemove === -1) return {[listName]: currentList}; // Item not found, return unchanged
  
  // Create new array without the item to remove
  const newList = [...currentList];
  newList.splice(indexToRemove, 1);
  return {[listName]: newList};
};

const createObjectSetter = (objName) => (key, value) => (prev) => ({
  [objName]: {...prev[objName], [key]: value}
});

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

  // Viewer state tracking (for automated demo plan)
  viewerState: {
    id: null,
    interactions: [],
    knowledgeLevel: 'unknown', // 'beginner', 'intermediate', 'advanced', 'expert', 'unknown'
    preferences: {},
    sessionHistory: [],
    engagementMetrics: {
      totalTime: 0,
      activeTime: 0,
      interactionCount: 0,
      demoCompletionRate: 0,
      conceptFocusTime: {}, // { conceptId: totalFocusTime }
      panelFocusTime: {},   // { panelId: totalFocusTime }
    },
    currentSession: {
      startTime: null,
      lastInteraction: null,
      panelsVisited: [],
      demosStarted: [],
      currentFocusArea: null,
      navigationPath: [],
    }
  },
  initializeViewer: (viewerId = null) => set(state => ({
    viewerState: {
      ...state.viewerState,
      id: viewerId || `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentSession: {
        ...state.viewerState.currentSession,
        startTime: Date.now(),
        lastInteraction: Date.now(),
      }
    }
  })),
  updateViewerInteraction: (interactionType, details) => set(state => {
    const interaction = {
      id: `interaction_${Date.now()}`,
      type: interactionType,
      timestamp: Date.now(),
      details,
      duration: null
    };
    
    // Add to interactions array (limit to last 1000 interactions to prevent memory issues)
    const newInteractions = [...state.viewerState.interactions.slice(-999), interaction];
    
    // Update engagement metrics
    const updatedEngagementMetrics = {
      ...state.viewerState.engagementMetrics,
      interactionCount: state.viewerState.engagementMetrics.interactionCount + 1,
    };
    
    // Update concept focus time if applicable
    if (details.conceptId) {
      updatedEngagementMetrics.conceptFocusTime = {
        ...state.viewerState.engagementMetrics.conceptFocusTime,
        [details.conceptId]: (state.viewerState.engagementMetrics.conceptFocusTime[details.conceptId] || 0) + (details.duration || 1000)
      };
    }
    
    // Update panel focus time if applicable
    if (details.panelId) {
      updatedEngagementMetrics.panelFocusTime = {
        ...state.viewerState.engagementMetrics.panelFocusTime,
        [details.panelId]: (state.viewerState.engagementMetrics.panelFocusTime[details.panelId] || 0) + (details.duration || 1000)
      };
    }
    
    // Update current session
    const updatedSession = {
      ...state.viewerState.currentSession,
      lastInteraction: Date.now(),
      navigationPath: [...state.viewerState.currentSession.navigationPath, {type: interactionType, timestamp: Date.now(), details}]
    };
    
    // If this is a panel visit, add to panelsVisited
    if (interactionType === 'panelView' && details.panelId) {
      const newPanelsVisited = state.viewerState.currentSession.panelsVisited.includes(details.panelId)
        ? state.viewerState.currentSession.panelsVisited
        : [...state.viewerState.currentSession.panelsVisited, details.panelId];
      updatedSession.panelsVisited = newPanelsVisited;
    }
    
    // If this is a demo start, add to demosStarted
    if (interactionType === 'demoStart' && details.demoId) {
      const newDemosStarted = state.viewerState.currentSession.demosStarted.includes(details.demoId)
        ? state.viewerState.currentSession.demosStarted
        : [...state.viewerState.currentSession.demosStarted, details.demoId];
      updatedSession.demosStarted = newDemosStarted;
    }
    
    return {
      viewerState: {
        ...state.viewerState,
        interactions: newInteractions,
        engagementMetrics: updatedEngagementMetrics,
        currentSession: updatedSession
      }
    };
  }),
  updateKnowledgeLevel: (level) => set(state => ({
    viewerState: {
      ...state.viewerState,
      knowledgeLevel: level,
      preferences: {
        ...state.viewerState.preferences,
        knowledgeLevel: level
      }
    }
  })),
  addSessionToHistory: () => set(state => {
    const currentSession = state.viewerState.currentSession;
    const sessionDuration = currentSession.startTime 
      ? Date.now() - currentSession.startTime 
      : 0;
    
    const newSession = {
      id: `session_${Date.now()}`,
      startTime: currentSession.startTime,
      endTime: Date.now(),
      duration: sessionDuration,
      panelsVisited: [...currentSession.panelsVisited],
      demosStarted: [...currentSession.demosStarted],
      interactionsCount: state.viewerState.engagementMetrics.interactionCount,
      engagementMetrics: {...state.viewerState.engagementMetrics}
    };
    
    return {
      viewerState: {
        ...state.viewerState,
        sessionHistory: [...state.viewerState.sessionHistory.slice(-99), newSession], // Keep last 100 sessions
        currentSession: {
          startTime: null,
          lastInteraction: null,
          panelsVisited: [],
          demosStarted: [],
          currentFocusArea: null,
          navigationPath: [],
        },
        engagementMetrics: {
          totalTime: 0,
          activeTime: 0,
          interactionCount: 0,
          demoCompletionRate: 0,
          conceptFocusTime: {},
          panelFocusTime: {}
        }
      }
    };
  }),
  updateDemoCompletion: (demoId, completed) => set(state => {
    const updatedEngagementMetrics = {...state.viewerState.engagementMetrics};
    if (completed) {
      updatedEngagementMetrics.demoCompletionRate = 
        (updatedEngagementMetrics.demoCompletionRate * 
          (state.viewerState.sessionHistory.length + state.viewerState.currentSession.demosStarted.length - 1) + 1) / 
        (state.viewerState.sessionHistory.length + state.viewerState.currentSession.demosStarted.length);
    }
    
    return {
      viewerState: {
        ...state.viewerState,
        engagementMetrics: updatedEngagementMetrics
      }
    };
  }),
  getViewerAnalytics: () => {
    const state = get();
    return {
      currentViewer: state.viewerState.id,
      knowledgeLevel: state.viewerState.knowledgeLevel,
      engagement: {
        totalInteractions: state.viewerState.engagementMetrics.interactionCount,
        totalTime: state.viewerState.engagementMetrics.totalTime,
        focusedConcepts: Object.entries(state.viewerState.engagementMetrics.conceptFocusTime)
          .sort(([,a], [,b]) => b - a) // Sort by focus time, descending
          .slice(0, 10), // Top 10 concepts
        focusedPanels: Object.entries(state.viewerState.engagementMetrics.panelFocusTime)
          .sort(([,a], [,b]) => b - a) // Sort by focus time, descending
          .slice(0, 10), // Top 10 panels
      },
      session: state.viewerState.currentSession,
      preferences: state.viewerState.preferences
    };
  },

  // Reasoning engine state
  reasoningSteps: [],
  addReasoningStep: (step) => set(createListSetter('reasoningSteps')(step)),
  updateReasoningStep: (id, updates) => set(state => {
    const index = state.reasoningSteps.findIndex(step => step.id === id);
    if (index === -1) return { reasoningSteps: state.reasoningSteps }; // Not found, return unchanged
    
    const newList = [...state.reasoningSteps];
    newList[index] = { ...newList[index], ...updates };
    return { reasoningSteps: newList };
  }),
  clearReasoningSteps: () => set({reasoningSteps: []}),

  // Task state
  tasks: [],
  addTask: (task) => set(createListSetter('tasks')(task)),
  updateTask: (id, updates) => set(createItemUpdater('tasks', 'id')(id, updates)),
  removeTask: (id) => set(createItemRemover('tasks', 'id')(id)),
  clearTasks: () => set({tasks: []}),

  // Concept state
  concepts: [],
  addConcept: (concept) => set(createListSetter('concepts')(concept)),
  updateConcept: (term, updates) => set(createItemUpdater('concepts', 'term')(term, updates)),
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
  addNotification: (notification) => set(state => {
    const newNotification = { ...notification, id: Date.now() };
    return { notifications: [...state.notifications, newNotification] };
  }),
  updateNotification: (id, updates) => set(createItemUpdater('notifications', 'id')(id, updates)),
  removeNotification: (id) => set(createItemRemover('notifications', 'id')(id)),
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
    notifications: [],
    // Viewer state initialization
    viewerState: {
      id: null,
      interactions: [],
      knowledgeLevel: 'unknown',
      preferences: {},
      sessionHistory: [],
      engagementMetrics: {
        totalTime: 0,
        activeTime: 0,
        interactionCount: 0,
        demoCompletionRate: 0,
        conceptFocusTime: {},
        panelFocusTime: {},
      },
      currentSession: {
        startTime: null,
        lastInteraction: null,
        panelsVisited: [],
        demosStarted: [],
        currentFocusArea: null,
        navigationPath: [],
      }
    }
  })
}));

export default useUiStore;