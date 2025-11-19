import { Config } from '../config/Config.js';

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
  }

  /**
   * Initialize the Cytoscape instance
   */
  initialize() {
    if (!this.uiElements?.graphContainer) {
      console.error('Graph container element not found');
      return false;
    }

    this.cy = cytoscape({
      container: this.uiElements.graphContainer,
      style: Config.getGraphStyle(),
      layout: Config.getGraphLayout()
    });

    // Add click event for graph details
    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      this._updateGraphDetails({
        type: 'node',
        label: node.data('label'),
        id: node.id(),
        nodeType: node.data('type') || 'unknown',
        weight: node.data('weight') || 0
      });
    });

    this.cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      this._updateGraphDetails({
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
   */
  addNode(nodeData) {
    if (!this.cy) return false;

    const nodeId = nodeData.id || `concept_${Date.now()}`;
    
    // Don't add duplicate nodes
    if (this.cy.getElementById(nodeId).length) {
      return false;
    }

    const newNode = {
      group: 'nodes',
      data: {
        id: nodeId,
        label: nodeData.label || nodeData.term || nodeData.id,
        type: nodeData.nodeType || nodeData.type || 'concept',
        weight: nodeData.weight || (nodeData.truth?.confidence ? nodeData.truth.confidence * 100 : 50)
      }
    };

    this.cy.add(newNode);
    this._runLayout();
    return true;
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edgeData) {
    if (!this.cy) return false;

    const edgeId = edgeData.id || `edge_${Date.now()}_${edgeData.source}_${edgeData.target}`;
    
    // Don't add duplicate edges
    if (this.cy.getElementById(edgeId).length) {
      return false;
    }

    const newEdge = {
      group: 'edges',
      data: {
        id: edgeId,
        source: edgeData.source,
        target: edgeData.target,
        label: edgeData.label || 'Relationship',
        type: edgeData.edgeType || edgeData.type || 'relationship'
      }
    };

    this.cy.add(newEdge);
    this._runLayout();
    return true;
  }

  /**
   * Update graph from a memory snapshot
   */
  updateFromSnapshot(payload) {
    if (!this.cy || !payload?.concepts) return;

    // Clear existing elements
    this.cy.elements().remove();

    // Add nodes from concepts
    const nodes = [];
    payload.concepts?.forEach((concept, index) => {
      nodes.push({
        group: 'nodes',
        data: {
          id: concept.id || `concept_${index}`,
          label: concept.term || `Concept ${index}`,
          type: concept.type || 'concept',
          weight: concept.truth?.confidence ? concept.truth.confidence * 100 : 50
        }
      });
    });

    // Add nodes to graph if any exist
    if (nodes.length > 0) {
      this.cy.add(nodes);
    }

    // Layout the graph
    this._runLayout();
  }

  /**
   * Update graph based on incoming message
   */
  updateFromMessage(message) {
    if (!this.cy) return;

    switch (message.type) {
      case 'concept.created':
      case 'concept.added':
        if (message.payload) {
          this.addNode(message.payload);
        }
        break;
      case 'task.added':
      case 'task.input':
        if (message.payload) {
          this.addNode({
            ...message.payload,
            nodeType: 'task'
          });
        }
        break;
      case 'question.answered':
        if (message.payload) {
          this.addNode({
            label: message.payload.answer || message.payload.question || 'Answer',
            nodeType: 'question',
            weight: 40
          });
        }
        break;
      case 'memorySnapshot':
        this.updateFromSnapshot(message.payload);
        break;
      // Add other message types as needed
    }
  }

  /**
   * Run the graph layout
   */
  _runLayout() {
    if (this.cy) {
      this.cy.layout(Config.getGraphLayout()).run();
    }
  }

  /**
   * Update the graph details panel
   */
  _updateGraphDetails(details) {
    if (!this.uiElements?.graphDetails) return;

    if (details.type === 'node') {
      this.uiElements.graphDetails.innerHTML = `
        <strong>Node:</strong> ${details.label}<br>
        <strong>ID:</strong> ${details.id}<br>
        <strong>Type:</strong> ${details.nodeType}<br>
        <strong>Weight:</strong> ${details.weight}
      `;
    } else if (details.type === 'edge') {
      this.uiElements.graphDetails.innerHTML = `
        <strong>Edge:</strong> ${details.label}<br>
        <strong>Source:</strong> ${details.source}<br>
        <strong>Target:</strong> ${details.target}<br>
        <strong>Type:</strong> ${details.edgeType}
      `;
    }
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
}