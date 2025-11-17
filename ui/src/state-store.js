import { MAX_LOG_ENTRIES } from './config.js';

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
        this.state = this._deepCloneInitialState();
        this.listeners = [];
    }

    _deepCloneInitialState() {
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
            this.listeners.forEach(listener => {
                try {
                    listener(this.state, action);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            });
        }
    }

    _reduce(state, action) {
        const actionHandlers = {
            'SET_CONNECTION_STATUS': (s, payload) => ({ ...s, connectionStatus: payload }),
            'SET_LIVE_UPDATE_ENABLED': (s, payload) => ({ ...s, isLiveUpdateEnabled: payload }),
            'CLEAR_LOG': (s) => ({ ...s, logEntries: [] }),
            'CLEAR_GRAPH': (s) => ({ ...s, graph: { nodes: new Map(), edges: new Map() } }),
            'SET_LOADING_SNAPSHOT': (s, payload) => ({
                ...s,
                loadingSnapshot: payload,
                eventQueue: payload === false ? [] : s.eventQueue
            }),
            'QUEUE_EVENT': (s, payload) => {
                if (s.loadingSnapshot) {
                    return { ...s, eventQueue: [...s.eventQueue, payload] };
                }
                return s;
            },
            'ADD_LOG_ENTRY': (s, payload) => {
                const logEntry = { timestamp: Date.now(), content: payload.content, type: payload.type };
                let newLogEntries = [logEntry, ...s.logEntries];
                if (newLogEntries.length > MAX_LOG_ENTRIES) {
                    newLogEntries = newLogEntries.slice(0, MAX_LOG_ENTRIES);
                }
                return { ...s, logEntries: newLogEntries };
            },
            'PROCESS_EVENT_BATCH': (s, payload) => {
                if (s.loadingSnapshot) {
                    return { ...s, eventQueue: [...s.eventQueue, payload] };
                }

                const { events } = payload;
                let updatedLogEntries = [...s.logEntries];
                let updatedNodes = new Map(s.graph.nodes);
                let updatedEdges = new Map(s.graph.edges);

                for (const event of events) {
                    const innerEvents = event.type === 'eventBatch' ? event.data : [event];
                    for (const innerEvent of innerEvents) {
                        // Add to logs
                        updatedLogEntries = [{
                            timestamp: innerEvent.timestamp ?? Date.now(),
                            content: JSON.stringify(innerEvent),
                            type: 'in'
                        }, ...updatedLogEntries];

                        // Update graph
                        updatedNodes = this._updateGraphFromEvent(updatedNodes, updatedEdges, innerEvent);
                    }
                }

                if (updatedLogEntries.length > MAX_LOG_ENTRIES) {
                    updatedLogEntries = updatedLogEntries.slice(0, MAX_LOG_ENTRIES);
                }

                return {
                    ...s,
                    logEntries: updatedLogEntries,
                    graph: { nodes: updatedNodes, edges: updatedEdges }
                };
            },
            'SET_GRAPH_SNAPSHOT': (s, payload) => ({
                ...s,
                graph: {
                    nodes: new Map(payload.nodes?.map(node => [node.id, node]) || []),
                    edges: new Map(payload.edges?.map(edge => [edge.id, edge]) || [])
                },
                loadingSnapshot: false
            })
        };

        // Handle graph operations (ADD_NODE, UPDATE_NODE, etc.) if live updates enabled
        const graphHandlers = {
            'ADD_NODE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                const updatedNodes = new Map(s.graph.nodes);
                updatedNodes.set(payload.id, { ...payload });
                return { ...s, graph: { ...s.graph, nodes: updatedNodes } };
            },
            'UPDATE_NODE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                if (!s.graph.nodes.has(payload.id)) return s;
                const updatedNodes = new Map(s.graph.nodes);
                updatedNodes.set(payload.id, { ...updatedNodes.get(payload.id), ...payload });
                return { ...s, graph: { ...s.graph, nodes: updatedNodes } };
            },
            'REMOVE_NODE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                const updatedNodes = new Map(s.graph.nodes);
                updatedNodes.delete(payload.id);
                return { ...s, graph: { ...s.graph, nodes: updatedNodes } };
            },
            'ADD_EDGE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                const updatedEdges = new Map(s.graph.edges);
                updatedEdges.set(payload.id, { ...payload });
                return { ...s, graph: { ...s.graph, edges: updatedEdges } };
            },
            'UPDATE_EDGE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                if (!s.graph.edges.has(payload.id)) return s;
                const updatedEdges = new Map(s.graph.edges);
                updatedEdges.set(payload.id, { ...updatedEdges.get(payload.id), ...payload });
                return { ...s, graph: { ...s.graph, edges: updatedEdges } };
            },
            'REMOVE_EDGE': (s, payload) => {
                if (!s.isLiveUpdateEnabled) return s;
                const updatedEdges = new Map(s.graph.edges);
                updatedEdges.delete(payload.id);
                return { ...s, graph: { ...s.graph, edges: updatedEdges } };
            }
        };

        const handler = actionHandlers[action.type] || graphHandlers[action.type];
        return handler ? handler(state, action.payload) : state;
    }

    _updateGraphFromEvent(nodes, edges, event) {
        const eventHandlers = {
            'concept.created': (data) => {
                const id = data.term?.toString() ?? `concept_${Date.now()}`;
                if (!nodes.has(id)) {
                    nodes.set(id, {
                        id,
                        label: data.term?.toString() ?? 'Unknown Concept',
                        type: 'concept',
                        data
                    });
                }
            },
            'task.added': (data) => {
                this._addTaskNode(nodes, data, 'task');
            },
            'belief.added': (data) => {
                this._addTaskNode(nodes, data, 'belief');
            }
        };

        const handler = eventHandlers[event.type];
        if (handler) handler(event.data);
        return nodes;
    }

    _addTaskNode(nodes, data, type) {
        const id = data.task?.id ?? data.id ?? `task_${Date.now()}`;
        if (!nodes.has(id)) {
            nodes.set(id, {
                id,
                label: data.task?.toString() ?? data.toString() ?? 'Unknown Task',
                type,
                data
            });
        }
    }
}

export default StateStore;