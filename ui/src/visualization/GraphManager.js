import {Config} from '../config/Config.js';

/**
 * GraphManager handles the Cytoscape instance and graph operations
 */
export class GraphManager {
    constructor(uiElements = null) {
        this.cy = null;
        this.uiElements = uiElements;
        this.graphData = {
            nodes: new Map(),
            edges: new Map()
        };

        // Debouncing for layout updates to improve performance
        this.layoutTimeout = null;
        this.pendingLayout = false;
        this.layoutDebounceTime = 300; // milliseconds
        this.updatesEnabled = false; // Disabled by default (since sidebar is hidden by default)

        // Bind event handlers to preserve 'this' context
        this._onNodeTap = this._onNodeTap.bind(this);
        this._onEdgeTap = this._onEdgeTap.bind(this);
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
        if (!this._validateInitialization()) return false;

        try {
            this._initializeCytoscape();
            this._setupEventListeners();
            return true;
        } catch (error) {
            console.error('Failed to initialize Cytoscape:', error);
            return false;
        }
    }

    /**
     * Validate initialization requirements
     */
    _validateInitialization() {
        if (!this.uiElements?.graphContainer) {
            console.error('Graph container element not found');
            return false;
        }
        return true;
    }

    /**
     * Initialize the Cytoscape instance
     */
    _initializeCytoscape() {
        this.cy = cytoscape({
            container: this.uiElements.graphContainer,
            style: Config.getGraphStyle(),
            layout: Config.getGraphLayout()
        });
    }

    /**
     * Setup graph event listeners
     */
    _setupEventListeners() {
        this.cy.on('tap', 'node', this._onNodeTap);
        this.cy.on('tap', 'edge', this._onEdgeTap);
    }

    /**
     * Handle node tap event
     */
    _onNodeTap(event) {
        const node = event.target;
        this.updateGraphDetails({
            type: 'node',
            label: node.data('label'),
            id: node.id(),
            nodeType: node.data('type') || 'unknown',
            weight: node.data('weight') || 0,
            fullData: node.data('fullData')
        });
    }

    /**
     * Handle edge tap event
     */
    _onEdgeTap(event) {
        const edge = event.target;
        this.updateGraphDetails({
            type: 'edge',
            label: edge.data('label') || 'Relationship',
            source: edge.data('source'),
            target: edge.data('target'),
            edgeType: edge.data('type') || 'unknown'
        });
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
        if (!this.cy || this._nodeExists(nodeData)) return false;

        const node = this._createNodeObject(nodeData);
        this.cy.add(node);

        if (runLayout) {
            this.scheduleLayout();
        }
        return true;
    }

    /**
     * Check if a node already exists
     */
    _nodeExists(nodeData) {
        const nodeId = nodeData.id || `concept_${Date.now()}`;
        return this.cy.getElementById(nodeId).length > 0;
    }

    /**
     * Create node object from node data
     */
    _createNodeObject(nodeData) {
        const {id, label, term, type: nodeType, nodeType: nodeTypeOverride} = nodeData;
        const nodeId = id || `concept_${Date.now()}`;

        let displayLabel = label || term || id;
        if (nodeData.truth) {
            const {frequency, confidence} = nodeData.truth;
            const freq = typeof frequency === 'number' ? frequency.toFixed(2) : '0.00';
            const conf = typeof confidence === 'number' ? confidence.toFixed(2) : '0.00';
            displayLabel += `\n{${freq}, ${conf}}`;
        }

        return {
            group: 'nodes',
            data: {
                id: nodeId,
                label: displayLabel,
                type: nodeTypeOverride || nodeType || 'concept',
                weight: this.getNodeWeight(nodeData),
                fullData: nodeData
            }
        };
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
        if (!this.cy || this._edgeExists(edgeData)) return false;

        const edge = this._createEdgeObject(edgeData);
        this.cy.add(edge);

        if (runLayout) {
            this.scheduleLayout();
        }
        return true;
    }

    /**
     * Check if an edge already exists
     */
    _edgeExists(edgeData) {
        const edgeId = edgeData.id || `edge_${Date.now()}_${edgeData.source}_${edgeData.target}`;
        return this.cy.getElementById(edgeId).length > 0;
    }

    /**
     * Create edge object from edge data
     */
    _createEdgeObject(edgeData) {
        const {id, source, target, label, type: edgeType, edgeType: edgeTypeOverride} = edgeData;
        const edgeId = id || `edge_${Date.now()}_${source}_${target}`;

        return {
            group: 'edges',
            data: {
                id: edgeId,
                source,
                target,
                label: label || 'Relationship',
                type: edgeTypeOverride || edgeType || 'relationship'
            }
        };
    }

    /**
     * Update graph from a memory snapshot
     */
    updateFromSnapshot(payload) {
        if (!this.cy || !payload?.concepts) return;

        this.cy.elements().remove();

        const concepts = payload.concepts || [];
        if (concepts.length > 0) {
            const nodes = this._createNodesFromConcepts(concepts);
            this.cy.add(nodes);
        }

        this.scheduleLayout();
    }

    /**
     * Create nodes array from concepts array
     */
    _createNodesFromConcepts(concepts) {
        return concepts.map((concept, index) => ({
            group: 'nodes',
            data: {
                id: concept.id || `concept_${index}`,
                label: concept.term || `Concept ${index}`,
                type: concept.type || 'concept',
                weight: concept.truth?.confidence ? concept.truth.confidence * 100 : 50,
                fullData: concept
            }
        }));
    }

    /**
     * Update graph based on incoming message
     */
    updateFromMessage(message) {
        if (!this.cy || !this.updatesEnabled) return;

        const updateFn = this._getMessageUpdateFunction(message);
        if (updateFn) {
            updateFn();

            if (this.shouldRunLayoutAfterMessage(message.type)) {
                this.scheduleLayout();
            }
        }
    }

    /**
     * Get the update function for a specific message type
     */
    _getMessageUpdateFunction(message) {
        const messageUpdates = {
            'concept.created': () => this.addNodeWithPayload(message.payload, false),
            'concept.added': () => this.addNodeWithPayload(message.payload, false),
            'task.added': () => this.addNodeWithPayload({...message.payload, nodeType: 'task'}, false),
            'task.input': () => this.addNodeWithPayload({...message.payload, nodeType: 'task'}, false),
            'question.answered': () => this.addQuestionNode(message.payload),
            'memorySnapshot': () => this.updateFromSnapshot(message.payload)
        };

        return messageUpdates[message.type];
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
        const layoutMessageTypes = [
            'concept.created', 'concept.added',
            'task.added', 'task.input',
            'question.answered'
        ];
        return layoutMessageTypes.includes(messageType);
    }

    /**
     * Schedule a graph layout run with debouncing to improve performance
     * This prevents excessive layout calculations when multiple graph changes occur rapidly
     */
    scheduleLayout() {
        this.pendingLayout = true;

        if (this.layoutTimeout) {
            clearTimeout(this.layoutTimeout);
        }

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
        tasks.style('display', visible ? 'element' : 'none');
    }

    /**
     * Create content for node details
     */
    createNodeDetailsContent(details) {
        const data = details.fullData || {};
        let html = this._createNodeBasicDetails(details);

        if (data.truth) {
            html += this._createTruthDetails(data.truth);
        }

        if (data.budget) {
            html += this._createBudgetDetails(data.budget);
        }

        html += `<div style="margin-top:4px; font-size:0.8em; color:#666">ID: ${details.id}</div>`;
        return html;
    }

    /**
     * Create basic node details HTML
     */
    _createNodeBasicDetails(details) {
        return [
            `<div style="margin-bottom:4px"><strong>Type:</strong> ${details.nodeType}</div>`,
            `<div style="margin-bottom:4px"><strong>Term:</strong> <span style="color:#4ec9b0; font-family:monospace">${details.label}</span></div>`
        ].join('');
    }

    /**
     * Create truth value details HTML
     */
    _createTruthDetails(truth) {
        const {frequency, confidence} = truth;
        const freq = typeof frequency === 'number' ? frequency.toFixed(2) : '0.00';
        const conf = typeof confidence === 'number' ? confidence.toFixed(2) : '0.00';
        return `<div style="margin-bottom:4px"><strong>Truth:</strong> <span style="color:#ce9178; font-family:monospace">{${freq}, ${conf}}</span></div>`;
    }

    /**
     * Create budget details HTML
     */
    _createBudgetDetails(budget) {
        const {priority} = budget;
        const pri = typeof priority === 'number' ? priority.toFixed(2) : '0.00';
        return `<div style="margin-bottom:4px"><strong>Priority:</strong> ${pri}</div>`;
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