import {create} from 'zustand';

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

    // Store reference to WebSocket service for components that need to send messages
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

    // SeNARS reasoning engine state
    reasoningSteps: [],
    addReasoningStep: (step) => set(state => ({
        reasoningSteps: [...state.reasoningSteps, step]
    })),
    clearReasoningSteps: () => set({reasoningSteps: []}),

    tasks: [],
    addTask: (task) => set(state => {
        // Check if task already exists
        const existingIndex = state.tasks.findIndex(t => t.id === task.id);
        const tasks = existingIndex !== -1
            ? [...state.tasks.slice(0, existingIndex), task, ...state.tasks.slice(existingIndex + 1)]
            : [...state.tasks, task];
        return {tasks};
    }),
    clearTasks: () => set({tasks: []}),

    concepts: [],
    addConcept: (concept) => set(state => {
        // Check if concept already exists
        const existingIndex = state.concepts.findIndex(c => c.term === concept.term);
        const concepts = existingIndex !== -1
            ? [...state.concepts.slice(0, existingIndex), concept, ...state.concepts.slice(existingIndex + 1)]
            : [...state.concepts, concept];
        return {concepts};
    }),
    removeConcept: (term) => set(state => ({
        concepts: state.concepts.filter(c => c.term !== term)
    })),
    clearConcepts: () => set({concepts: []}),

    cycles: [],
    addCycle: (cycle) => set(state => ({
        cycles: [...state.cycles, cycle].slice(-50) // Keep only last 50 cycles
    })),
    clearCycles: () => set({cycles: []}),

    systemMetrics: null,
    setSystemMetrics: (metrics) => set({systemMetrics: metrics}),
    clearSystemMetrics: () => set({systemMetrics: null}),

    // Demo-related state
    demos: [],
    setDemoList: (demos) => set({demos}),
    demoStates: {},
    setDemoState: (demoId, state) => set(prev => ({
        demoStates: {...prev.demoStates, [demoId]: state}
    })),
    demoSteps: [],
    addDemoStep: (step) => set(state => ({
        demoSteps: [...state.demoSteps, step].slice(-100) // Keep only last 100 steps
    })),
    clearDemoSteps: () => set({demoSteps: []}),
    demoMetrics: {},
    setDemoMetrics: (demoId, metrics) => set(prev => ({
        demoMetrics: {...prev.demoMetrics, [demoId]: metrics}
    })),
    clearDemoMetrics: () => set({demoMetrics: {}}),

    // Session and application state
    activeSession: null,
    setActiveSession: (session) => set({activeSession: session}),
    endSession: () => set({activeSession: null}),

    // Status and UI state
    error: null,
    setError: (error) => set({error}),
    clearError: () => set({error: null}),

    isLoading: false,
    setLoading: (loading) => set({isLoading: loading}),

    theme: 'light',
    setTheme: (theme) => set({theme}),
    toggleTheme: () => set(state => ({theme: state.theme === 'light' ? 'dark' : 'light'})),

    notifications: [],
    addNotification: (notification) => set(state => ({
        notifications: [...state.notifications, {...notification, id: Date.now()}]
    })),
    removeNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),
    clearNotifications: () => set({notifications: []}),
}));

export default useUiStore;