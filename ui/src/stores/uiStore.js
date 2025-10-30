import { create } from 'zustand';

// UI state slice
const uiSlice = (set, get) => ({
  layout: null,
  setLayout: (layout) => set({ layout }),
  savedLayouts: {},
  saveLayout: (name, layout) => set(state => ({
    savedLayouts: { ...state.savedLayouts, [name]: layout }
  })),
  loadLayout: (name) => get().savedLayouts[name],
});

// WebSocket state slice
const webSocketSlice = (set) => ({
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
});

// Panel management slice
const panelSlice = (set) => ({
  panels: {},
  addPanel: (id, config) => set(state => ({
    panels: { ...state.panels, [id]: config }
  })),
  removePanel: (id) => set(state => {
    const newPanels = { ...state.panels };
    delete newPanels[id];
    return { panels: newPanels };
  }),
});

// Reasoning engine state slice
const reasoningSlice = (set) => ({
  reasoningSteps: [],
  addReasoningStep: (step) => set(state => ({
    reasoningSteps: [...state.reasoningSteps, step]
  })),
  clearReasoningSteps: () => set({ reasoningSteps: [] }),
});

// Session management slice
const sessionSlice = (set) => ({
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  endSession: () => set({ activeSession: null }),
});

// Error handling slice
const errorSlice = (set) => ({
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
});

// Loading state slice
const loadingSlice = (set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
});

// Theme management slice
const themeSlice = (set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set(state => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
});

// Notification system slice
const notificationSlice = (set) => ({
  notifications: [],
  addNotification: (notification) => set(state => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  })),
  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  clearNotifications: () => set({ notifications: [] }),
});

const useUiStore = create((set, get) => ({
  ...uiSlice(set, get),
  ...webSocketSlice(set),
  ...panelSlice(set),
  ...reasoningSlice(set),
  ...sessionSlice(set),
  ...errorSlice(set),
  ...loadingSlice(set),
  ...themeSlice(set, get),
  ...notificationSlice(set),
}));

export default useUiStore;