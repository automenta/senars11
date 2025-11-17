import BatchedCytoscapeRenderer from './batched-cytoscape-renderer.js';
import DirectCytoscapeRenderer from './direct-cytoscape-renderer.js';
import ListRenderer from './list-renderer.js';

/**
 * RendererManager - Manages different visualization renderers
 */
export default class RendererManager {
  constructor() {
    this.renderers = new Map();
    this.currentRenderer = null;
    this.container = null;
    
    // Register default renderers
    this.registerRenderer('batched-cytoscape', BatchedCytoscapeRenderer);
    this.registerRenderer('direct-cytoscape', DirectCytoscapeRenderer);
    this.registerRenderer('list', ListRenderer);
  }

  /**
   * Register a new renderer type
   * @param {string} name - The name of the renderer
   * @param {BaseRenderer} rendererClass - The renderer class
   */
  registerRenderer(name, rendererClass) {
    this.renderers.set(name, rendererClass);
  }

  /**
   * Initialize the renderer manager with a container
   * @param {HTMLElement} container - The container element for the visualization
   */
  init(container) {
    this.container = container;
  }

  /**
   * Switch to a different renderer
   * @param {string} rendererName - The name of the renderer to switch to
   * @param {Object} graphData - Optional graph data to preserve during switch
   */
  switchRenderer(rendererName, graphData = null) {
    // Store current renderer's data if provided
    let currentData = null;
    if (this.currentRenderer && graphData) {
      // For now, we'll just use the passed graphData
      currentData = graphData;
    } else if (this.currentRenderer) {
      // In a more sophisticated system, we might extract data from the current renderer
      // For now, we'll just pass an empty snapshot
      currentData = { nodes: [], edges: [] };
    }

    // Destroy current renderer if it exists
    if (this.currentRenderer) {
      this.currentRenderer.destroy();
      // Clear the container
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    }

    // Create and initialize the new renderer
    const RendererClass = this.renderers.get(rendererName);
    if (!RendererClass) {
      throw new Error(`Renderer '${rendererName}' not found`);
    }

    this.currentRenderer = new RendererClass();
    this.currentRenderer.init(this.container);

    // Set the graph data on the new renderer
    if (currentData) {
      this.currentRenderer.setGraphSnapshot(currentData);
    }

    return this.currentRenderer;
  }

  /**
   * Get the current renderer
   */
  getCurrentRenderer() {
    return this.currentRenderer;
  }

  /**
   * Call a method on the current renderer
   * @param {string} method - The method name to call
   * @param {...any} args - Arguments to pass to the method
   */
  callRendererMethod(method, ...args) {
    if (this.currentRenderer && typeof this.currentRenderer[method] === 'function') {
      return this.currentRenderer[method](...args);
    }
    console.warn(`Method '${method}' not found or not implemented on current renderer`);
  }

  /**
   * Destroy the renderer manager and clean up
   */
  destroy() {
    if (this.currentRenderer) {
      this.currentRenderer.destroy();
      this.currentRenderer = null;
    }
  }
}