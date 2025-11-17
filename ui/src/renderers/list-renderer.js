import BaseRenderer from './base-renderer.js';

/**
 * ListRenderer - A renderer that displays nodes and edges as lists
 */
export default class ListRenderer extends BaseRenderer {
  constructor() {
    super();
    this.container = null;
    this.nodes = new Map();
    this.edges = new Map();
    this.nodesListElement = null;
    this.edgesListElement = null;
  }

  init(container) {
    this.container = container;

    // Create container for the list view
    const listContainer = document.createElement('div');
    listContainer.id = 'list-container';
    listContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #ccc;
    `;

    // Create sections for nodes and edges
    const nodesSection = document.createElement('div');
    nodesSection.innerHTML = '<h3>Nodes</h3>';
    this.nodesListElement = document.createElement('div');
    this.nodesListElement.style.cssText = 'margin-bottom: 20px; max-height: 40vh; overflow-y: auto;';
    nodesSection.appendChild(this.nodesListElement);

    const edgesSection = document.createElement('div');
    edgesSection.innerHTML = '<h3>Edges</h3>';
    this.edgesListElement = document.createElement('div');
    edgesSection.appendChild(this.edgesListElement);

    listContainer.appendChild(nodesSection);
    listContainer.appendChild(edgesSection);

    container.appendChild(listContainer);

    return this;
  }

  addNode(nodeData) {
    this.nodes.set(nodeData.id, nodeData);
    this._updateNodesList();
  }

  updateNode(nodeData) {
    if (this.nodes.has(nodeData.id)) {
      this.nodes.set(nodeData.id, { ...this.nodes.get(nodeData.id), ...nodeData });
      this._updateNodesList();
    }
  }

  removeNode(nodeData) {
    this.nodes.delete(nodeData.id);
    this._updateNodesList();
  }

  addEdge(edgeData) {
    this.edges.set(edgeData.id, edgeData);
    this._updateEdgesList();
  }

  updateEdge(edgeData) {
    if (this.edges.has(edgeData.id)) {
      this.edges.set(edgeData.id, { ...this.edges.get(edgeData.id), ...edgeData });
      this._updateEdgesList();
    }
  }

  removeEdge(edgeData) {
    this.edges.delete(edgeData.id);
    this._updateEdgesList();
  }

  setGraphSnapshot(snapshot) {
    this.clear();
    
    if (Array.isArray(snapshot.nodes)) {
      snapshot.nodes.forEach(node => this.addNode(node));
    }

    if (Array.isArray(snapshot.edges)) {
      snapshot.edges.forEach(edge => this.addEdge(edge));
    }
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this._updateNodesList();
    this._updateEdgesList();
  }

  _updateNodesList() {
    if (!this.nodesListElement) return;

    this.nodesListElement.innerHTML = '';
    
    for (const [id, node] of this.nodes) {
      const nodeElement = document.createElement('div');
      nodeElement.style.cssText = `
        padding: 5px;
        margin: 2px 0;
        background-color: #e9ecef;
        border-radius: 3px;
        border-left: 3px solid #007bff;
      `;
      nodeElement.innerHTML = `
        <strong>${node.label || id}</strong> 
        <span style="font-size: 0.8em; color: #6c757d;">(${node.type || 'unknown'})</span>
        <div style="font-size: 0.8em; margin-top: 3px;">ID: ${id}</div>
      `;
      this.nodesListElement.appendChild(nodeElement);
    }
  }

  _updateEdgesList() {
    if (!this.edgesListElement) return;

    this.edgesListElement.innerHTML = '';
    
    for (const [id, edge] of this.edges) {
      const edgeElement = document.createElement('div');
      edgeElement.style.cssText = `
        padding: 5px;
        margin: 2px 0;
        background-color: #f8f9fa;
        border-radius: 3px;
        border-left: 3px solid #28a745;
      `;
      edgeElement.innerHTML = `
        <strong>${edge.source}</strong> → <strong>${edge.target}</strong>
        <div style="font-size: 0.8em; margin-top: 3px;">ID: ${id}</div>
      `;
      this.edgesListElement.appendChild(edgeElement);
    }
  }

  destroy() {
    this.nodes.clear();
    this.edges.clear();
  }
}