/**
 * @file Zustand store for managing the SeNARS UI state.
 * This store centralizes all application state and logic for interacting
 * with the NAR engine's data, such as logs, graph visualizations, and
 * user-defined view queries.
 */

import { create } from 'zustand';

/**
 * Helper function to transform a concept or task from the backend into a
 * node that can be displayed by ReactFlow.
 * @param {object} item - The concept or task object.
 * @returns {object} A ReactFlow node object.
 */
const toGraphNode = (item) => ({
  id: item.id.toString(),
  position: { x: Math.random() * 400, y: Math.random() * 400 }, // Position randomly for now
  data: { label: item.term || item.id.toString() },
});

export const useNARStore = create((set, get) => ({
  // State
  viewQuery: {
    limit: 100,
    sortBy: 'priority',
  },
  liveUpdateEnabled: true,
  logEntries: [],
  graphNodes: [],
  graphEdges: [],

  // Actions
  setViewQuery: (query) => set((state) => ({
    viewQuery: { ...state.viewQuery, ...query },
  })),

  toggleLiveUpdate: () => set((state) => ({
    liveUpdateEnabled: !state.liveUpdateEnabled,
  })),

  /**
   * Processes a complete memory snapshot from the server and replaces the
   * current graph state with the new data.
   * @param {object} snapshot - The memory snapshot containing concepts and tasks.
   */
  handleSnapshot: (snapshot) => set({
    graphNodes: (snapshot.concepts || []).map(toGraphNode),
    // Edges can be derived if relationships are provided in the snapshot
    graphEdges: [],
  }),

  /**
   * Processes a batch of events from the server.
   * - All events are appended to the log.
   * - Graph updates only occur for concepts already present in the graph.
   * @param {Array<object>} events - An array of events from the NAR engine.
   */
  handleEventBatch: (events) => {
    const { graphNodes } = get();
    const existingNodeIds = new Set(graphNodes.map(node => node.id));

    // Create log entries for all incoming events
    const newLogEntries = events.map(event => ({
      timestamp: new Date().toISOString(),
      type: event.type,
      // A simple representation of the event payload
      message: JSON.stringify(event),
    }));

    // Filter events to find concepts that should be updated in the graph
    const relevantGraphUpdates = events.reduce((acc, event) => {
      // This logic is a placeholder. A real implementation would need to
      // inspect the event payload to see which concepts it affects.
      // For now, let's assume an event has a `conceptId` field.
      if (event.conceptId && existingNodeIds.has(event.conceptId.toString())) {
        // Here you would transform the event into a node update
        // For example, changing color based on priority.
        // acc.push(...updates);
      }
      return acc;
    }, []);

    set((state) => ({
      logEntries: [...state.logEntries, ...newLogEntries],
      // Apply graph updates if there are any
      // graphNodes: state.graphNodes.map(node => ...),
    }));
  },
}));
