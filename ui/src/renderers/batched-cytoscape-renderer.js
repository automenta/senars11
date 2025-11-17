import BaseRenderer from './base-renderer.js';
import cytoscape from 'cytoscape';
import GraphLayout from '../config/graph-layout.js';

/**
 * BatchedCytoscapeRenderer - A renderer that batches operations for performance
 */
export default class BatchedCytoscapeRenderer extends BaseRenderer {
  constructor() {
    super();
    this.cy = null;
    this.container = null;
    this.nodeCache = new Set();
    this.fitTimeout = null;
    this.isBatching = false;
    this.batchedOperations = [];
  }

  init(container) {
    this.container = container;
    
    // Create the graph container element
    const graphDiv = document.createElement('div');
    Object.assign(graphDiv, { id: 'cy-graph' });
    Object.assign(graphDiv.style, {
      width: '100%',
      height: '100%',
      border: '1px solid #ccc'
    });

    container.appendChild(graphDiv);

    const styleConfig = GraphLayout.getNodeStyleOptions();

    this.cy = cytoscape({
      container: graphDiv,
      style: styleConfig.style,
      layout: GraphLayout.getLayoutOptions()
    });

    // Expose for testing if needed
    window.cy = this.cy;

    // Add event listeners for interactivity
    const detailsPanel = document.getElementById('details-panel') || 
                         document.querySelector('#details-panel') ||
                         this._createDetailsPanel();
    
    if (detailsPanel) {
      this.cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        detailsPanel.innerHTML = `<pre>${JSON.stringify(node.data(), null, 2)}</pre>`;
        detailsPanel.style.display = 'block';
      });

      this.cy.on('tap', (evt) => {
        if (evt.target === this.cy) {
          detailsPanel.style.display = 'none';
        }
      });
    }

    return this.cy;
  }

  _createDetailsPanel() {
    // Create details panel if it doesn't exist
    const panel = document.createElement('div');
    panel.id = 'details-panel';
    panel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.9);
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      display: none;
      max-width: 300px;
      max-height: 90%;
      overflow-y: auto;
      font-family: monospace;
      z-index: 1000;
    `;
    document.body.appendChild(panel);
    return panel;
  }

  _batchOperation(operation) {
    if (this.isBatching) {
      this.batchedOperations.push(operation);
    } else {
      this._executeOperation(operation);
    }
  }

  _executeOperation(operation) {
    operation();
  }

  _executeBatch() {
    if (this.batchedOperations.length === 0) return;

    this.cy.batch(() => {
      this.batchedOperations.forEach(op => this._executeOperation(op));
    });
    
    this.batchedOperations = [];
    this.isBatching = false;
    
    // After batch operations, run layout and fit
    this.fit();
  }

  startBatch() {
    this.isBatching = true;
  }

  endBatch() {
    this._executeBatch();
  }

  addNode(nodeData) {
    this._batchOperation(() => {
      try {
        if (!this.cy.getElementById(nodeData.id)) {
          const elementData = this.createElement('nodes', nodeData);
          this.cy.add(elementData);
          this.nodeCache.add(nodeData.id);

          // Request a fit after adding nodes
          this._requestFit();
        }
      } catch (error) {
        console.error('Error adding node to graph', { error: error.message, nodeData });
      }
    });
  }

  updateNode(nodeData) {
    this._batchOperation(() => {
      try {
        const node = this.cy.getElementById(nodeData.id);
        if (node) {
          node.data({ ...node.data(), ...nodeData });
        }
      } catch (error) {
        console.error('Error updating node in graph', { error: error.message, nodeData });
      }
    });
  }

  removeNode(nodeData) {
    this._batchOperation(() => {
      try {
        const node = this.cy.getElementById(nodeData.id);
        if (node) {
          node.remove();
          this.nodeCache.delete(nodeData.id);
        }
      } catch (error) {
        console.error('Error removing node from graph', { error: error.message, nodeData });
      }
    });
  }

  addEdge(edgeData) {
    this._batchOperation(() => {
      try {
        if (!this.cy.getElementById(edgeData.id)) {
          this.cy.add(this.createElement('edges', edgeData));
          // Also request a fit when edges are added
          this._requestFit();
        }
      } catch (error) {
        console.error('Error adding edge to graph', { error: error.message, edgeData });
      }
    });
  }

  updateEdge(edgeData) {
    this._batchOperation(() => {
      try {
        const edge = this.cy.getElementById(edgeData.id);
        if (edge) {
          edge.data({ ...edge.data(), ...edgeData });
        }
      } catch (error) {
        console.error('Error updating edge in graph', { error: error.message, edgeData });
      }
    });
  }

  removeEdge(edgeData) {
    this._batchOperation(() => {
      try {
        const edge = this.cy.getElementById(edgeData.id);
        if (edge) edge.remove();
      } catch (error) {
        console.error('Error removing edge from graph', { error: error.message, edgeData });
      }
    });
  }

  setGraphSnapshot(snapshot) {
    this._batchOperation(() => {
      try {
        this.clear();
        this.nodeCache.clear();

        if (Array.isArray(snapshot.nodes) && snapshot.nodes.length) {
          snapshot.nodes.forEach(node => this.addNode(node));
        }

        if (Array.isArray(snapshot.edges) && snapshot.edges.length) {
          snapshot.edges.forEach(edge => this.addEdge(edge));
        }

        // Refresh layout after adding all nodes
        this.fit();
      } catch (error) {
        console.error('Error setting graph snapshot', { error: error.message, snapshot });
      }
    });
  }

  clear() {
    this._batchOperation(() => {
      try {
        this.cy.elements().remove();
        this.nodeCache.clear();
      } catch (error) {
        console.error('Error clearing graph', { error: error.message });
      }
    });
  }

  fit() {
    this._batchOperation(() => {
      try {
        // Run the COSE layout and fit to make nodes visible
        this.cy.layout({
          name: 'cose',
          animate: false,
          fit: true,
          padding: 30
        }).run();
      } catch (error) {
        console.error('Error running layout/fit', { error: error.message });
      }
    });
  }

  // Debounced fit function to avoid excessive fitting
  _requestFit() {
    if (this.fitTimeout) {
      clearTimeout(this.fitTimeout);
    }

    // Set a timeout to fit the graph after a short delay
    // This prevents excessive fitting when multiple nodes are added rapidly
    this.fitTimeout = setTimeout(() => {
      try {
        // Run the COSE layout and fit to make nodes visible
        this.cy.layout({
          name: 'cose',
          animate: false,
          fit: true,
          padding: 30
        }).run();
      } catch (error) {
        console.error('Error running layout/fit', { error: error.message });
      }
    }, 100); // 100ms delay to batch multiple operations
  }

  createElement(group, data) {
    return { group, data: { ...data, id: data.id } };
  }

  destroy() {
    try {
      this.nodeCache.clear();
      // Clear any pending fit timeout
      if (this.fitTimeout) {
        clearTimeout(this.fitTimeout);
        this.fitTimeout = null;
      }
      if (this.cy) {
        this.cy.destroy();
        this.cy = null;
      }
    } catch (error) {
      console.error('Error destroying Cytoscape renderer', { error: error.message });
    }
  }
}