import {Config} from '../config/Config.js';

/**
 * GraphManager handles the Cytoscape instance and graph operations
 */
export class GraphManager {
    constructor(uiElements = null, callbacks = {}) {
        this.cy = null;
        this.uiElements = uiElements;
        this.callbacks = callbacks;
        this.graphData = {
            nodes: new Map(),
            edges: new Map()
        };

        // Debouncing for layout updates to improve performance
        this.layoutTimeout = null;
        this.pendingLayout = false;
        this.layoutDebounceTime = 300; // milliseconds
        this.updatesEnabled = false; // Disabled by default (since sidebar is hidden by default)
    }

    /**
     * Set whether graph updates are enabled
     */
    setUpdatesEnabled(enabled) {
        this.updatesEnabled = enabled;
        if (enabled && this.cy) {
            this.cy.resize();
            this.cy.fit();
            this.scheduleLayout();
        }
    }

    /**
     * Initialize the Cytoscape instance
     */
    initialize() {
        // Guard clause: Check if UI elements are available
        if (!this.uiElements?.graphContainer) {
            console.error('Graph container element not found');
            return false;
        }

        try {
            this.cy = cytoscape({
                container: this.uiElements.graphContainer,
                style: Config.getGraphStyle(),
                layout: Config.getGraphLayout()
            });
        } catch (error) {
            console.error('Failed to initialize Cytoscape:', error);
            return false;
        }

        // Add event delegation for details panel buttons
        if (this.uiElements.graphDetails) {
            this.uiElements.graphDetails.addEventListener('click', (e) => {
                if (e.target.matches('button[data-action]')) {
                    const action = e.target.dataset.action;
                    const nodeId = e.target.dataset.id;
                    const term = e.target.dataset.term;

                    if (this.callbacks.onNodeAction) {
                        this.callbacks.onNodeAction(action, {id: nodeId, term});
                    }
                }
            });
        }

        // Add click event for graph details
        this.cy.on('tap', 'node', (event) => {
            const node = event.target;
            const data = {
                type: 'node',
                label: node.data('label'),
                id: node.id(),
                term: node.data('fullData')?.term || node.data('label'),
                nodeType: node.data('type') || 'unknown',
                weight: node.data('weight') || 0,
                fullData: node.data('fullData')
            };

            this.updateGraphDetails(data);

            if (this.callbacks.onNodeClick) {
                this.callbacks.onNodeClick(data);
            }
        });

        this.cy.on('tap', 'edge', (event) => {
            const edge = event.target;
            this.updateGraphDetails({
                type: 'edge',
                label: edge.data('label') || 'Relationship',
                source: edge.data('source'),
                target: edge.data('target'),
                edgeType: edge.data('type') || 'unknown'
            });
        });

        return true;
    }

    /**
     * Add a node to the graph
     * @param {Object} nodeData - Data for the node to be added
     * @param {string|number} [nodeData.id] - Unique identifier for the node
     * @param {string} [nodeData.label] - Display label for the node
     * @param {string} [nodeData.term] - Alternative term for the node
     * @param {string} [nodeData.type] - Type of the node (concept, task, etc.)
     * @param {string} [nodeData.nodeType] - Alternative property for node type
     * @param {Object} [nodeData.truth] - Truth value data for the node
     * @param {boolean} [runLayout=true] - Whether to run layout after adding the node
     * @returns {boolean} - True if node was successfully added, false otherwise
     */
    addNode(nodeData, runLayout = true) {
        if (!this.cy) return false;

        const {id, label, term, type: nodeType, nodeType: nodeTypeOverride} = nodeData;
        const nodeId = id || `concept_${Date.now()}`;

        // Don't add duplicate nodes
        if (this.cy.getElementById(nodeId).length) {
            return false;
        }

        // Create node data object efficiently
        let displayLabel = label || term || id;
        if (nodeData.truth) {
            const {frequency, confidence} = nodeData.truth;
            const freq = typeof frequency === 'number' ? frequency.toFixed(2) : '0.00';
            const conf = typeof confidence === 'number' ? confidence.toFixed(2) : '0.00';
            displayLabel += `\n{${freq}, ${conf}}`;
        }

        const newNode = {
            group: 'nodes',
            data: {
                id: nodeId,
                label: displayLabel,
                type: nodeTypeOverride || nodeType || 'concept',
                weight: this.getNodeWeight(nodeData),
                fullData: nodeData
            }
        };

        this.cy.add(newNode);

        if (runLayout) {
            this.scheduleLayout();
        }
        return true;
    }

    /**
     * Calculate node weight based on input data
     */
    getNodeWeight(nodeData) {
        const {truth, weight} = nodeData;
        return weight || (truth?.confidence ? truth.confidence * 100 : Config.getConstants().DEFAULT_NODE_WEIGHT);
    }

    /**
     * Add an edge to the graph
     */
    addEdge(edgeData, runLayout = true) {
        if (!this.cy) return false;

        const {id, source, target, label, type: edgeType, edgeType: edgeTypeOverride} = edgeData;
        const edgeId = id || `edge_${Date.now()}_${source}_${target}`;

        // Don't add duplicate edges
        if (this.cy.getElementById(edgeId).length) {
            return false;
        }

        const newEdge = {
            group: 'edges',
            data: {
                id: edgeId,
                source,
                target,
                label: label || 'Relationship',
                type: edgeTypeOverride || edgeType || 'relationship'
            }
        };

        this.cy.add(newEdge);

        if (runLayout) {
            this.scheduleLayout();
        }
        return true;
    }

    /**
     * Update graph from a memory snapshot
     */
    updateFromSnapshot(payload) {
        if (!this.cy || !payload?.concepts) return;

        // Clear existing elements
        this.cy.elements().remove();

        // Add nodes from concepts in batch
        const concepts = payload.concepts || [];
        if (concepts.length > 0) {
            const nodes = concepts.map((concept, index) => ({
                group: 'nodes',
                data: {
                    id: concept.id || `concept_${index}`,
                    label: concept.term || `Concept ${index}`,
                    type: concept.type || 'concept',
                    weight: concept.truth?.confidence ? concept.truth.confidence * 100 : 50,
                    fullData: concept
                }
            }));
            this.cy.add(nodes);
        }

        // Layout the graph
        this.scheduleLayout();
    }

    /**
     * Update graph based on incoming message
     */
    updateFromMessage(message) {
        if (!this.cy || !this.updatesEnabled) return;

        const messageUpdates = {
            'concept.created': () => this.addNodeWithPayload(message.payload, false),
            'concept.added': () => this.addNodeWithPayload(message.payload, false),
            'task.added': () => this.addNodeWithPayload({...message.payload, nodeType: 'task'}, false),
            'task.input': () => this.addNodeWithPayload({...message.payload, nodeType: 'task'}, false),
            'question.answered': () => this.addQuestionNode(message.payload),
            'memorySnapshot': () => {
                this.updateFromSnapshot(message.payload);
                // Snapshot updates already run layout
            }
        };

        const updateFn = messageUpdates[message.type];
        if (updateFn) {
            updateFn();

            // Only run layout once after processing the message, if we added nodes/edges
            if (this.shouldRunLayoutAfterMessage(message.type)) {
                this.scheduleLayout();
            }
        }
    }

    /**
     * Helper method to add a node with payload
     */
    addNodeWithPayload(payload, runLayout = true) {
        if (payload) {
            this.addNode(payload, runLayout);
        }
    }

    /**
     * Helper method to add a question node
     */
    addQuestionNode(payload) {
        if (payload) {
            const {answer, question} = payload;
            this.addNode({
                label: answer || question || 'Answer',
                nodeType: 'question',
                weight: Config.getConstants().QUESTION_NODE_WEIGHT
            }, false); // Don't run layout immediately
        }
    }

    /**
     * Determine if layout should run after a specific message type
     */
    shouldRunLayoutAfterMessage(messageType) {
        return ['concept.created', 'concept.added', 'task.added', 'task.input', 'question.answered'].includes(messageType);
    }

    /**
     * Schedule a graph layout run with debouncing to improve performance
     * This prevents excessive layout calculations when multiple graph changes occur rapidly
     */
    scheduleLayout() {
        this.pendingLayout = true;

        // Clear existing timeout to debounce
        if (this.layoutTimeout) {
            clearTimeout(this.layoutTimeout);
        }

        // Schedule layout to run after debounce time
        this.layoutTimeout = setTimeout(() => {
            if (this.pendingLayout && this.cy) {
                this.cy.layout(Config.getGraphLayout()).run();
                this.pendingLayout = false;
            }
        }, this.layoutDebounceTime);
    }

    /**
     * Run the graph layout immediately (without debouncing)
     */
    runLayout() {
        if (this.cy) {
            this.cy.layout(Config.getGraphLayout()).run();
        }
    }

    /**
     * Update the graph details panel
     */
    updateGraphDetails(details) {
        const graphDetailsElement = this.uiElements?.graphDetails;
        if (!graphDetailsElement) return;

        // Create content based on type to avoid duplicate code
        const content = details.type === 'node'
            ? this.createNodeDetailsContent(details)
            : this.createEdgeDetailsContent(details);

        graphDetailsElement.innerHTML = content;
    }

    /**
     * Set visibility of task nodes
     */
    setTaskVisibility(visible) {
        if (!this.cy) return;
        const tasks = this.cy.nodes('[type = "task"]');
        if (visible) {
            tasks.style('display', 'element');
        } else {
            tasks.style('display', 'none');
        }
    }

    /**
     * Create content for node details
     */
    createNodeDetailsContent(details) {
        const data = details.fullData || {};
        let html = [
            `<div style="margin-bottom:4px"><strong>Type:</strong> ${details.nodeType}</div>`,
            `<div style="margin-bottom:4px"><strong>Term:</strong> <span style="color:#4ec9b0; font-family:monospace">${details.label}</span></div>`
        ].join('');

        if (data.truth) {
            const {frequency, confidence} = data.truth;
            const freq = typeof frequency === 'number' ? frequency.toFixed(2) : '0.00';
            const conf = typeof confidence === 'number' ? confidence.toFixed(2) : '0.00';
            html += `<div style="margin-bottom:4px"><strong>Truth:</strong> <span style="color:#ce9178; font-family:monospace">{${freq}, ${conf}}</span></div>`;
        }

        if (data.budget) {
            const {priority} = data.budget;
            const pri = typeof priority === 'number' ? priority.toFixed(2) : '0.00';
            html += `<div style="margin-bottom:4px"><strong>Priority:</strong> ${pri}</div>`;
        }

        html += `<div style="margin-top:4px; font-size:0.8em; color:#666">ID: ${details.id}</div>`;

        // Add actions
        html += `
            <div style="margin-top:8px; display:flex; gap:5px;">
                <button data-action="focus" data-id="${details.id}" data-term="${details.term || details.label}" style="padding:2px 6px; font-size:0.8em; cursor:pointer;">Focus</button>
                <button data-action="inspect" data-id="${details.id}" data-term="${details.term || details.label}" style="padding:2px 6px; font-size:0.8em; cursor:pointer;">Inspect</button>
            </div>
        `;

        return html;
    }

    /**
     * Create content for edge details
     */
    createEdgeDetailsContent(details) {
        return [
            `<strong>Edge:</strong> ${details.label}<br>`,
            `<strong>Source:</strong> ${details.source}<br>`,
            `<strong>Target:</strong> ${details.target}<br>`,
            `<strong>Type:</strong> ${details.edgeType}`
        ].join('');
    }

    /**
     * Get node count
     */
    getNodeCount() {
        return this.cy ? this.cy.nodes().length : 0;
    }

    /**
     * Get task nodes
     */
    getTaskNodes() {
        return this.cy ? this.cy.nodes('[type = "task"]') : null;
    }

    /**
     * Get concept nodes
     */
    getConceptNodes() {
        return this.cy ? this.cy.nodes('[type = "concept"]') : null;
    }

    /**
     * Clear the graph
     */
    clear() {
        if (this.cy) {
            this.cy.elements().remove();
        }
    }

    /**
     * Destroy the graph manager and clean up resources
     */
    destroy() {
        if (this.layoutTimeout) {
            clearTimeout(this.layoutTimeout);
            this.layoutTimeout = null;
        }
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
    }
}