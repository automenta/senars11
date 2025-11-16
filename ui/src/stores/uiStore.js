import { create } from 'zustand';
import { batchUpdate, createCollectionManager, createObjectManager } from '../utils/CollectionManager.js';

/**
 * Zustand store for UI state management
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, DRY
 */

// Predefined collection managers - consolidated for efficiency
const COLLECTION_MANAGERS = Object.freeze({
  reasoningSteps: createCollectionManager('reasoningSteps'),
  tasks: createCollectionManager('tasks'),
  concepts: createCollectionManager('concepts'),
  cycles: createCollectionManager('cycles'),
  demoSteps: createCollectionManager('demoSteps'),
  notifications: createCollectionManager('notifications')
});

// Predefined object managers
const OBJECT_MANAGERS = Object.freeze({
  demoStates: createObjectManager('demoStates'),
  demoMetrics: createObjectManager('demoMetrics'),
  savedLayouts: createObjectManager('savedLayouts')
});

// Initial state - using Object.freeze for performance
const INITIAL_STATE = Object.freeze({
  layout: null,
  savedLayouts: Object.create(null),
  wsConnected: false,
  wsService: null,
  panels: Object.create(null),
  reasoningSteps: [],
  tasks: [],
  concepts: [],
  beliefs: [],
  goals: [],
  cycles: [],
  systemMetrics: null,
  demos: [],
  demoStates: Object.create(null),
  demoSteps: [],
  demoMetrics: Object.create(null),
  activeSession: null,
  error: null,
  isLoading: false,
  theme: 'light',
  notifications: [],
  lmTestResult: null,
  reasoningState: null,
  metaCognitiveResults: null,
  corrections: [],
  nar: null
});

// Create optimized selectors
const createSelectors = (useStore) => {
  return Object.freeze({
    // Connection state selectors
    getWebSocketState: () => ({ wsConnected: useStore.getState().wsConnected, wsService: useStore.getState().wsService }),

    // Layout state selectors
    getLayoutState: () => ({ layout: useStore.getState().layout, savedLayouts: useStore.getState().savedLayouts }),

    // UI status selectors
    getUiStatus: () => ({ error: useStore.getState().error, isLoading: useStore.getState().isLoading, theme: useStore.getState().theme }),

    // Notification selectors
    getNotificationState: () => ({ notifications: useStore.getState().notifications }),

    // Demo state selectors
    getDemoState: () => ({ demos: useStore.getState().demos, demoStates: useStore.getState().demoStates, demoSteps: useStore.getState().demoSteps }),

    // Data collection selectors
    getTasks: () => useStore.getState().tasks,
    getConcepts: () => useStore.getState().concepts,
    getBeliefs: () => useStore.getState().beliefs,
    getGoals: () => useStore.getState().goals,
    getReasoningSteps: () => useStore.getState().reasoningSteps,
    getCycles: () => useStore.getState().cycles,
    getCycleCount: () => useStore.getState().cycles.length,

    // System state selectors
    getActiveSession: () => useStore.getState().activeSession,
    getTheme: () => useStore.getState().theme,
    getError: () => useStore.getState().error,
    isLoading: () => useStore.getState().isLoading,
    getWsConnected: () => useStore.getState().wsConnected,
    getWsService: () => useStore.getState().wsService,
    getNotifications: () => useStore.getState().notifications,
    getDemos: () => useStore.getState().demos,
    getDemoState: () => useStore.getState().demoStates,
    getDemoSteps: () => useStore.getState().demoSteps,
    getSystemMetrics: () => useStore.getState().systemMetrics,
    getNar: () => useStore.getState().nar,
    getReasoningState: () => useStore.getState().reasoningState,
    getMetaCognitiveResults: () => useStore.getState().metaCognitiveResults,
    getCorrections: () => useStore.getState().corrections,
    getLMTestResult: () => useStore.getState().lmTestResult
  });
};

// Create action creators organized by domain
const createActions = (set, get) => {
  // Utility function to create simple state setters
  const createSimpleSetter = (key) => (value) => set({ [key]: value });

  return {
    // Initial state
    ...INITIAL_STATE,

    // WebSocket and connection management
    setWsConnected: createSimpleSetter('wsConnected'),
    setWsService: createSimpleSetter('wsService'),

    // Y.js synchronization management - prevent conflicts with Y.js updates
    // When Y.js is active, these functions should be used carefully
    setYjsService: createSimpleSetter('yjsService'),

    // Layout management
    setLayout: createSimpleSetter('layout'),
    saveLayout: (name, layout) => set(OBJECT_MANAGERS.savedLayouts.set(name, layout)),
    loadLayout: (name) => get().savedLayouts?.[name],

    // Panel management with optimized updates
    addPanel: (id, config) => set(state => ({
      panels: { ...state.panels, [id]: config }
    })),
    updatePanel: (id, config) => set(state => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], ...config } }
    })),
    removePanel: (id) => set(state => ({
      panels: Object.fromEntries(Object.entries(state.panels).filter(([key]) => key !== id))
    })),

    // Collection operations - using managers for consistency
    // Reasoning steps
    addReasoningStep: (step) => set(COLLECTION_MANAGERS.reasoningSteps.add(step, 'id')),
    updateReasoningStep: (id, updates) => set(COLLECTION_MANAGERS.reasoningSteps.update(id, 'id', updates)),
    removeReasoningStep: (id) => set(COLLECTION_MANAGERS.reasoningSteps.remove(id, 'id')),
    clearReasoningSteps: () => set(COLLECTION_MANAGERS.reasoningSteps.clear()),

    // Task operations
    addTask: (task) => set(COLLECTION_MANAGERS.tasks.add(task, 'id')),
    updateTask: (id, updates) => set(COLLECTION_MANAGERS.tasks.update(id, 'id', updates)),
    removeTask: (id) => set(COLLECTION_MANAGERS.tasks.remove(id, 'id')),
    clearTasks: () => set(COLLECTION_MANAGERS.tasks.clear()),

    // Concept operations
    addConcept: (concept) => set(COLLECTION_MANAGERS.concepts.add(concept, 'term')),
    updateConcept: (term, updates) => set(COLLECTION_MANAGERS.concepts.update(term, 'term', updates)),
    removeConcept: (term) => set(COLLECTION_MANAGERS.concepts.remove(term, 'term')),
    clearConcepts: () => set(COLLECTION_MANAGERS.concepts.clear()),

    // Belief operations - direct array manipulation for performance
    addBelief: (belief) => set(state => ({ beliefs: [...state.beliefs, belief] })),
    updateBelief: (id, updates) => set(state => ({
      beliefs: state.beliefs.map(belief => belief.id === id ? { ...belief, ...updates } : belief)
    })),
    removeBelief: (id) => set(state => ({
      beliefs: state.beliefs.filter(belief => belief.id !== id)
    })),
    clearBeliefs: createSimpleSetter('beliefs'),

    // Goal operations - direct array manipulation
    addGoal: (goal) => set(state => ({ goals: [...state.goals, goal] })),
    updateGoal: (id, updates) => set(state => ({
      goals: state.goals.map(goal => goal.id === id ? { ...goal, ...updates } : goal)
    })),
    removeGoal: (id) => set(state => ({
      goals: state.goals.filter(goal => goal.id !== id)
    })),
    clearGoals: createSimpleSetter('goals'),

    // Cycle operations - with size limit
    addCycle: (cycle) => set(COLLECTION_MANAGERS.cycles.addLimited(cycle, 50, 'id')),
    clearCycles: createSimpleSetter('cycles'),

    // System state management
    setSystemMetrics: createSimpleSetter('systemMetrics'),
    clearSystemMetrics: createSimpleSetter('systemMetrics'),

    // Demo management - using managers for consistent patterns
    setDemoList: createSimpleSetter('demos'),
    setDemoState: (key, value) => set(OBJECT_MANAGERS.demoStates.set(key, value)),
    setDemoStateDirect: (demoId, state) => set(prev => ({
      demoStates: { ...prev.demoStates, [demoId]: state }
    })),
    updateDemoState: (demoId, updates) => set(OBJECT_MANAGERS.demoStates.update(demoId, updates)),
    addDemoStep: (step) => set(COLLECTION_MANAGERS.demoSteps.addLimited(step, 100, 'id')),
    clearDemoSteps: () => set(COLLECTION_MANAGERS.demoSteps.clear()),
    setDemoMetrics: OBJECT_MANAGERS.demoMetrics.set,
    updateDemoMetrics: (demoId, updates) => set(OBJECT_MANAGERS.demoMetrics.update(demoId, updates)),
    clearDemoMetrics: () => set(OBJECT_MANAGERS.demoMetrics.clear()),

    // Meta-cognitive state management
    setNar: createSimpleSetter('nar'),
    setReasoningState: createSimpleSetter('reasoningState'),
    setMetaCognitiveResults: createSimpleSetter('metaCognitiveResults'),
    setCorrections: createSimpleSetter('corrections'),
    addCorrection: (correction) => set(state => ({ corrections: [...state.corrections, correction] })),
    clearCorrections: createSimpleSetter('corrections'),

    // Session management
    setActiveSession: createSimpleSetter('activeSession'),
    endSession: () => set({ activeSession: null }),

    // UI status management
    setError: createSimpleSetter('error'),
    clearError: () => set({ error: null }),
    setLoading: createSimpleSetter('isLoading'),
    setTheme: createSimpleSetter('theme'),
    toggleTheme: () => set(state => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

    // Notification management with optimized ID generation
    addNotification: (notification) => set(state => {
      const id = notification?.id ?? `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      return { notifications: [...state.notifications, { ...notification, id }] };
    }),
    updateNotification: (id, updates) => set(COLLECTION_MANAGERS.notifications.update(id, 'id', updates)),
    removeNotification: (id) => set(COLLECTION_MANAGERS.notifications.remove(id, 'id')),
    clearNotifications: () => set(COLLECTION_MANAGERS.notifications.clear()),

    // Configuration state
    setLMTestResult: createSimpleSetter('lmTestResult'),

    // Utility and batch operations
    batchUpdate: (updates) => batchUpdate(set, updates),
    resetStore: () => set(INITIAL_STATE)
  };
};

// Main store definition with optimized methods
const useUiStore = create((set, get) => createActions(set, get));

// Create and attach selectors to the store
useUiStore.selectors = createSelectors(useUiStore);

export default useUiStore;