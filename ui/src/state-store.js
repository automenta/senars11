import configManager from './config/config-manager.js';
import {
  SET_CONNECTION_STATUS, SET_LIVE_UPDATE_ENABLED, ADD_NODE, UPDATE_NODE, REMOVE_NODE,
  ADD_EDGE, UPDATE_EDGE, REMOVE_EDGE, SET_GRAPH_SNAPSHOT, CLEAR_GRAPH, ADD_LOG_ENTRY,
  SET_LOADING_SNAPSHOT, PROCESS_EVENT_BATCH, CLEAR_LOG, QUEUE_EVENT
} from './constants/actions.js';

const MAX_LOG_ENTRIES = configManager.getMaxLogEntries();

// Initial State Structure
const INITIAL_STATE = {
  connectionStatus: 'disconnected',
  isLiveUpdateEnabled: true,
  logEntries: [],
  graph: {
    nodes: new Map(),
    edges: new Map()
  },
  loadingSnapshot: false,
  eventQueue: []
};

class StateStore {
  constructor() {
    this.state = this._getFreshState();
    this.listeners = [];
  }

  _getFreshState() {
    const state = { ...INITIAL_STATE };
    state.graph.nodes = new Map();
    state.graph.edges = new Map();
    return state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  getState() {
    return { ...this.state };
  }

  dispatch(action) {
    const newState = this._reduce(this.state, action);

    if (newState !== this.state) {
      this.state = newState;
      this._notifyListeners(action);
    }
  }

  _notifyListeners(action) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, action);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    }
  }

  _reduce(state, action) {
    const handlers = this._getActionHandlers();
    const handler = handlers[action.type];
    return handler ? handler(state, action.payload) : state;
  }

  _getActionHandlers() {
    return {
      [SET_CONNECTION_STATUS]: (s, payload) => ({ ...s, connectionStatus: payload }),
      [SET_LIVE_UPDATE_ENABLED]: (s, payload) => ({ ...s, isLiveUpdateEnabled: payload }),
      [CLEAR_LOG]: (s) => ({ ...s, logEntries: [] }),
      [CLEAR_GRAPH]: (s) => ({ ...s, graph: { nodes: new Map(), edges: new Map() } }),
      [SET_LOADING_SNAPSHOT]: (s, payload) => ({
        ...s,
        loadingSnapshot: payload,
        eventQueue: payload === false ? [] : s.eventQueue
      }),
      [QUEUE_EVENT]: (s, payload) =>
        s.loadingSnapshot
          ? { ...s, eventQueue: [...s.eventQueue, payload] }
          : s,
      [ADD_LOG_ENTRY]: (s, payload) => {
        const logEntry = { timestamp: Date.now(), content: payload.content, type: payload.type };
        let newLogEntries = [logEntry, ...s.logEntries];
        if (newLogEntries.length > MAX_LOG_ENTRIES) {
          newLogEntries = newLogEntries.slice(0, MAX_LOG_ENTRIES);
        }
        return { ...s, logEntries: newLogEntries };
      },
      [PROCESS_EVENT_BATCH]: (s, payload) => this._processEventBatch(s, payload),
      [SET_GRAPH_SNAPSHOT]: (s, payload) => ({
        ...s,
        graph: {
          nodes: new Map(payload.nodes?.map(node => [node.id, node]) || []),
          edges: new Map(payload.edges?.map(edge => [edge.id, edge]) || [])
        },
        loadingSnapshot: false
      }),
      // Graph operations that respect live update setting
      [ADD_NODE]: (s, payload) =>
        s.isLiveUpdateEnabled ? this._addNode(s, payload) : s,
      [UPDATE_NODE]: (s, payload) =>
        s.isLiveUpdateEnabled && s.graph.nodes.has(payload.id) ? this._updateNode(s, payload) : s,
      [REMOVE_NODE]: (s, payload) =>
        s.isLiveUpdateEnabled ? this._removeNode(s, payload) : s,
      [ADD_EDGE]: (s, payload) =>
        s.isLiveUpdateEnabled ? this._addEdge(s, payload) : s,
      [UPDATE_EDGE]: (s, payload) =>
        s.isLiveUpdateEnabled && s.graph.edges.has(payload.id) ? this._updateEdge(s, payload) : s,
      [REMOVE_EDGE]: (s, payload) =>
        s.isLiveUpdateEnabled ? this._removeEdge(s, payload) : s
    };
  }

  // Graph operation helpers
  _addNode(state, payload) {
    const updatedNodes = new Map(state.graph.nodes);
    updatedNodes.set(payload.id, { ...payload });
    return { ...state, graph: { ...state.graph, nodes: updatedNodes } };
  }

  _updateNode(state, payload) {
    const updatedNodes = new Map(state.graph.nodes);
    updatedNodes.set(payload.id, { ...updatedNodes.get(payload.id), ...payload });
    return { ...state, graph: { ...state.graph, nodes: updatedNodes } };
  }

  _removeNode(state, payload) {
    const updatedNodes = new Map(state.graph.nodes);
    updatedNodes.delete(payload.id);
    return { ...state, graph: { ...state.graph, nodes: updatedNodes } };
  }

  _addEdge(state, payload) {
    const updatedEdges = new Map(state.graph.edges);
    updatedEdges.set(payload.id, { ...payload });
    return { ...state, graph: { ...state.graph, edges: updatedEdges } };
  }

  _updateEdge(state, payload) {
    const updatedEdges = new Map(state.graph.edges);
    updatedEdges.set(payload.id, { ...updatedEdges.get(payload.id), ...payload });
    return { ...state, graph: { ...state.graph, edges: updatedEdges } };
  }

  _removeEdge(state, payload) {
    const updatedEdges = new Map(state.graph.edges);
    updatedEdges.delete(payload.id);
    return { ...state, graph: { ...state.graph, edges: updatedEdges } };
  }

  _processEventBatch(state, payload) {
    // If loading snapshot, queue the events
    if (state.loadingSnapshot) {
      return { ...state, eventQueue: [...state.eventQueue, payload] };
    }

    let updatedLogEntries = [...state.logEntries];

    if (payload?.events) {
      for (const event of payload.events) {
        const innerEvents = event.type === 'eventBatch' ? event.data : [event];
        for (const innerEvent of innerEvents) {
          updatedLogEntries = [{
            timestamp: innerEvent.timestamp ?? Date.now(),
            content: JSON.stringify(innerEvent),
            type: 'in'
          }, ...updatedLogEntries];
        }
      }
    }

    if (updatedLogEntries.length > MAX_LOG_ENTRIES) {
      updatedLogEntries = updatedLogEntries.slice(0, MAX_LOG_ENTRIES);
    }

    return { ...state, logEntries: updatedLogEntries };
  }
}

export default StateStore;