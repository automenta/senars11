import {create} from 'zustand';
import {
  createCollectionManager,
  createObjectManager,
  batchUpdate
} from '../utils/CollectionManager.js';

// Predefined collection managers - consolidated for efficiency
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

// Memoized selectors for consistent access patterns
const selectors = Object.freeze({
  getWebSocketState: (state) => ({wsConnected: state.wsConnected, wsService: state.wsService}),
  getLayoutState: (state) => ({layout: state.layout, savedLayouts: state.savedLayouts}),
  getUiStatus: (state) => ({error: state.error, isLoading: state.isLoading, theme: state.theme}),
  getNotificationState: (state) => ({notifications: state.notifications}),
  getDemoState: (state) => ({demos: state.demos, demoStates: state.demoStates, demoSteps: state.demoSteps}),
});

// Initial state - using Object.freeze for performance
const initialState = Object.freeze({
  layout: null,
  savedLayouts: Object.create(null),
  wsConnected: false,
  wsService: null,
  panels: Object.create(null),
  reasoningSteps: [],
  tasks: [],
  concepts: [],
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

// Main store definition with optimized methods
const useUiStore = create((set, get) => ({
  // Initial state
  ...initialState,

  // UI state management
  setLayout: (layout) => set({layout}),
  saveLayout: (name, layout) => set(savedLayoutsManager.set(name, layout)),
  loadLayout: (name) => get().savedLayouts?.[name],

  // WebSocket state management
  setWsConnected: (connected) => set({wsConnected: connected}),
  setWsService: (wsService) => set({wsService}),

  // Meta-cognitive state management
  setNar: (nar) => set({nar}),
  setReasoningState: (state) => set({reasoningState: state}),
  setMetaCognitiveResults: (results) => set({metaCognitiveResults: results}),
  setCorrections: (corrections) => set({corrections}),
  addCorrection: (correction) => set(state => ({corrections: [...state.corrections, correction]})),
  clearCorrections: () => set({corrections: []}),

  // Panel management with optimized updates
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

  // Optimized collection management with unified patterns
  addReasoningStep: (step) => set(reasoningStepsManager.add(step, 'id')),
  updateReasoningStep: (id, updates) => set(reasoningStepsManager.update(id, 'id', updates)),
  clearReasoningSteps: () => set(reasoningStepsManager.clear()),

  addTask: (task) => set(tasksManager.add(task, 'id')),
  updateTask: (id, updates) => set(tasksManager.update(id, 'id', updates)),
  removeTask: (id) => set(tasksManager.remove(id, 'id')),
  clearTasks: () => set(tasksManager.clear()),

  addConcept: (concept) => set(conceptsManager.add(concept, 'term')),
  updateConcept: (term, updates) => set(conceptsManager.update(term, 'term', updates)),
  removeConcept: (term) => set(conceptsManager.remove(term, 'term')),
  clearConcepts: () => set(conceptsManager.clear()),

  addCycle: (cycle) => set(cyclesManager.addLimited(cycle, 50, 'id')),
  clearCycles: () => set(cyclesManager.clear()),

  // System state management
  setSystemMetrics: (metrics) => set({systemMetrics: metrics}),
  clearSystemMetrics: () => set({systemMetrics: null}),

  // Demo management
  setDemoList: (demos) => set({demos}),
  setDemoState: (key, value) => set(demoStatesManager.set(key, value)),
  setDemoStateDirect: (demoId, state) => set(prev => ({
    demoStates: {...prev.demoStates, [demoId]: state}
  })),
  updateDemoState: (demoId, updates) => set(demoStatesManager.update(demoId, updates)),

  addDemoStep: (step) => set(demoStepsManager.addLimited(step, 100, 'id')),
  clearDemoSteps: () => set(demoStepsManager.clear()),

  setDemoMetrics: demoMetricsManager.set,
  updateDemoMetrics: (demoId, updates) => set(demoMetricsManager.update(demoId, updates)),
  clearDemoMetrics: () => set(demoMetricsManager.clear()),

  // Session management
  setActiveSession: (session) => set({activeSession: session}),
  endSession: () => set({activeSession: null}),

  // UI status
  setError: (error) => set({error}),
  clearError: () => set({error: null}),
  setLoading: (loading) => set({isLoading: loading}),
  setTheme: (theme) => set({theme}),
  toggleTheme: () => set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),

  // Notifications with optimized ID generation
  addNotification: (notification) => set(state => {
    const id = notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { notifications: [...state.notifications, { ...notification, id }] };
  }),
  updateNotification: (id, updates) => set(notificationsManager.update(id, 'id', updates)),
  removeNotification: (id) => set(notificationsManager.remove(id, 'id')),
  clearNotifications: () => set(notificationsManager.clear()),

  // Configuration state
  setLMTestResult: (result) => set({lmTestResult: result}),

  // Utility methods
  batchUpdate: (updates) => batchUpdate(set, updates),
  selectors,
  resetStore: () => set(initialState)
}));

export default useUiStore;