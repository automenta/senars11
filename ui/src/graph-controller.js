/**
 * GraphController - Coordinates between the GraphView (Cytoscape instance), StateStore, and WebSocketService
 */
export default class GraphController {
    constructor(cy, store, service) {
        this.cy = cy;
        this.store = store;
        this.service = service;
        this.unsubscribe = null;
        this.isUpdatingGraph = false;
        this.init();
    }

    init() {
        this.unsubscribe = this.store.subscribe((state, action) => {
            this.handleStoreChange(state, action);
        });
    }

    handleStoreChange(state, action) {
        if (!state.isLiveUpdateEnabled && !action.type.startsWith('SET_GRAPH_')) {
            return;
        }

        this.cy.batch(() => {
            const actionHandlers = {
                'ADD_NODE': (payload) => this.addNode(payload),
                'UPDATE_NODE': (payload) => this.updateNode(payload),
                'REMOVE_NODE': (payload) => this.removeNode(payload),
                'ADD_EDGE': (payload) => this.addEdge(payload),
                'UPDATE_EDGE': (payload) => this.updateEdge(payload),
                'REMOVE_EDGE': (payload) => this.removeEdge(payload),
                'SET_GRAPH_SNAPSHOT': (payload) => this.setGraphSnapshot(payload),
                'CLEAR_GRAPH': () => this.clearGraph(),
                'PROCESS_EVENT_BATCH': (payload) => this.processEventBatch(payload)
            };

            const handler = actionHandlers[action.type];
            if (handler) handler(action.payload);
        });
    }

    addNode(nodeData) {
        if (!this.cy.getElementById(nodeData.id)) {
            this.cy.add(this.createElement('nodes', nodeData));
        }
    }

    updateNode(nodeData) {
        const node = this.cy.getElementById(nodeData.id);
        if (node) {
            node.data({ ...node.data(), ...nodeData });
        }
    }

    removeNode(nodeData) {
        const node = this.cy.getElementById(nodeData.id);
        if (node) node.remove();
    }

    addEdge(edgeData) {
        if (!this.cy.getElementById(edgeData.id)) {
            this.cy.add(this.createElement('edges', edgeData));
        }
    }

    updateEdge(edgeData) {
        const edge = this.cy.getElementById(edgeData.id);
        if (edge) {
            edge.data({ ...edge.data(), ...edgeData });
        }
    }

    removeEdge(edgeData) {
        const edge = this.cy.getElementById(edgeData.id);
        if (edge) edge.remove();
    }

    setGraphSnapshot(snapshot) {
        this.clearGraph();

        if (snapshot.nodes?.length) {
            this.cy.add(snapshot.nodes.map(node => this.createElement('nodes', node)));
        }

        if (snapshot.edges?.length) {
            this.cy.add(snapshot.edges.map(edge => this.createElement('edges', edge)));
        }
    }

    createElement(group, data) {
        return { group, data, id: data.id };
    }

    clearGraph() {
        this.cy.elements().remove();
    }

    processEventBatch(eventBatch) {
        const { events } = eventBatch;
        for (const event of events) {
            const innerEvents = event.type === 'eventBatch' ? event.data : [event];
            innerEvents.forEach(this.processSingleEvent.bind(this));
        }
    }

    processSingleEvent(event) {
        const eventHandlers = {
            'concept.created': (data) => {
                const id = data.term?.toString() ?? `concept_${Date.now()}`;
                this.addNode({
                    id,
                    label: data.term?.toString() ?? 'Unknown Concept',
                    type: 'concept',
                    data
                });
            },
            'task.added': (data) => {
                this.createTaskNode(data, 'task');
            },
            'belief.added': (data) => {
                this.createTaskNode(data, 'belief');
            }
        };

        const handler = eventHandlers[event.type];
        if (handler) handler(event.data);
    }

    createTaskNode(data, type) {
        const id = data.task?.id ?? data.id ?? `task_${Date.now()}`;
        this.addNode({
            id,
            label: data.task?.toString() ?? data.toString() ?? 'Unknown Task',
            type,
            data
        });
    }

    requestRefresh() {
        this.store.dispatch({ type: 'SET_LOADING_SNAPSHOT', payload: true });
        this.service.sendMessage('control/refresh', {});
    }

    handleRefreshResponse(payload) {
        this.store.dispatch({
            type: 'SET_GRAPH_SNAPSHOT',
            payload: {
                nodes: payload.concepts.map(concept => ({
                    id: concept.term?.toString() ?? `concept_${Date.now()}`,
                    label: concept.term?.toString() ?? 'Unknown Concept',
                    type: 'concept',
                    ...concept
                })),
                edges: []
            }
        });

        this.store.dispatch({ type: 'SET_LOADING_SNAPSHOT', payload: false });
    }

    destroy() {
        this.unsubscribe?.();
    }
}