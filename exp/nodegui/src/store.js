import { create } from 'zustand';

export const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  log: [],
  live: true,
  // Update snapshot data
  setSnapshot: (data) => set({
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    edges: Array.isArray(data?.edges) ? data.edges : []
  }),
  // Append log entry with error handling
  appendLog: (entry) => set((state) => {
    // Ensure the log array exists and is an array
    const currentLog = Array.isArray(state.log) ? state.log : [];
    // Add the new entry and keep only the last 500 entries
    const newLog = [...currentLog, entry].slice(-500);
    return { log: newLog };
  }),
  // Toggle live update
  toggleLive: () => set((state) => ({ live: !state.live })),
  // Add multiple entries to log at once
  appendMultipleLogs: (entries) => set((state) => {
    const currentLog = Array.isArray(state.log) ? state.log : [];
    const newLog = [...currentLog, ...entries].slice(-500);
    return { log: newLog };
  }),
  // Clear log
  clearLog: () => set({ log: [] }),
  // Reset all state
  resetState: () => set({ nodes: [], edges: [], log: [], live: true })
}));