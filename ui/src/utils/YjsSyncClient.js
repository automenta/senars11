import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import useUiStore from '../stores/uiStore.js';

/**
 * Y.js Synchronization Client
 * Manages connection to the shared Y.js document and updates the UI store
 */
class YjsSyncClient {
  constructor(options = {}) {
    this.options = {
      websocketPort: options.websocketPort || 8080, // Same port as main WebSocket now
      documentId: options.documentId || 'senars-document',
      serverUrl: /*options.serverUrl ||*/ '192.168.2.172', //TODO use page URL
      websocketPath: options.websocketPath || '/ws' // Use the same path as main WebSocket
    };

    // Create Y.Doc for synchronization
    this.ydoc = new Y.Doc();

    // Initialize shared data structures
    this.sharedState = {
      tasks: this.ydoc.getMap('tasks'),
      concepts: this.ydoc.getMap('concepts'),
      systemMetrics: this.ydoc.getMap('systemMetrics'),
      cycles: this.ydoc.getArray('cycles'),
      reasoningSteps: this.ydoc.getArray('reasoningSteps'),
      notifications: this.ydoc.getArray('notifications')
    };

    // Initialize provider to connect to the separate Yjs WebSocket server
    // Using the correct y-websocket constructor signature: (serverUrl, room, ydoc, options)
    this.provider = new WebsocketProvider(
      `ws://${this.options.serverUrl}:${this.options.websocketPort}`, // serverUrl
      this.options.documentId,                                         // room name
      this.ydoc,                                                       // Y.Doc instance
      {                                                                // options
        connect: true,
        params: {},
        // Use the awareness instance from the provider
      }
    );
    
    // Bind methods
    this.handleTasksUpdate = this.handleTasksUpdate.bind(this);
    this.handleConceptsUpdate = this.handleConceptsUpdate.bind(this);
    this.handleCyclesUpdate = this.handleCyclesUpdate.bind(this);
    this.handleReasoningStepsUpdate = this.handleReasoningStepsUpdate.bind(this);
    
    // Setup event listeners for updates
    this.setupEventListeners();
    
    // Subscribe to updates to keep Zustand store in sync
    this.subscribeToUpdates();
    
    console.log('YjsSyncClient initialized and connecting to:', 
      `ws://${this.options.serverUrl}:${this.options.websocketPort}/${this.options.documentId}`);
  }

  /**
   * Set up event listeners for Y.js updates
   */
  setupEventListeners() {
    // Listen for connection events
    this.provider.on('status', (event) => {
      console.log('Y.js connection status:', event.status);
      // Update UI store to reflect connection status
      useUiStore.getState().setWsConnected(event.status === 'connected');
    });
  }

  /**
   * Subscribe to Y.js shared structure updates and update Zustand store
   */
  subscribeToUpdates() {
    // Subscribe to tasks map updates
    this.sharedState.tasks.observeDeep(this.handleTasksUpdate);
    
    // Subscribe to concepts map updates
    this.sharedState.concepts.observeDeep(this.handleConceptsUpdate);
    
    // Subscribe to cycles array updates
    this.sharedState.cycles.observe(this.handleCyclesUpdate);
    
    // Subscribe to reasoning steps array updates  
    this.sharedState.reasoningSteps.observe(this.handleReasoningStepsUpdate);
  }

  /**
   * Handle tasks updates from Y.js
   */
  handleTasksUpdate(events) {
    // Get current tasks from the map and update Zustand store
    const tasks = [];
    this.sharedState.tasks.forEach((task, key) => {
      tasks.push({ id: key, ...task });
    });
    
    // Update the Zustand store with the new tasks
    useUiStore.getState().clearTasks();
    tasks.forEach(task => useUiStore.getState().addTask(task));
  }

  /**
   * Handle concepts updates from Y.js
   */
  handleConceptsUpdate(events) {
    // Get current concepts from the map and update Zustand store
    const concepts = [];
    this.sharedState.concepts.forEach((concept, key) => {
      concepts.push({ term: key, ...concept });
    });
    
    // Update the Zustand store with the new concepts
    useUiStore.getState().clearConcepts();
    concepts.forEach(concept => useUiStore.getState().addConcept(concept));
  }

  /**
   * Handle cycles updates from Y.js
   */
  handleCyclesUpdate(event) {
    // Get current cycles from the array and update Zustand store
    const cycles = this.sharedState.cycles.toArray().map(item => 
      Array.isArray(item) ? item[0] : item
    );
    
    // Update the Zustand store with the new cycles
    useUiStore.getState().clearCycles();
    cycles.forEach(cycle => useUiStore.getState().addCycle(cycle));
  }

  /**
   * Handle reasoning steps updates from Y.js
   */
  handleReasoningStepsUpdate(event) {
    // Get current reasoning steps from the array and update Zustand store
    const steps = this.sharedState.reasoningSteps.toArray().map(item => 
      Array.isArray(item) ? item[0] : item
    );
    
    // Update the Zustand store with the new reasoning steps
    useUiStore.getState().clearReasoningSteps();
    steps.forEach(step => useUiStore.getState().addReasoningStep(step));
  }

  /**
   * Get current state snapshot
   */
  getState() {
    const tasks = [];
    this.sharedState.tasks.forEach((task, key) => {
      tasks.push({ id: key, ...task });
    });
    
    const concepts = [];
    this.sharedState.concepts.forEach((concept, key) => {
      concepts.push({ term: key, ...concept });
    });
    
    const cycles = this.sharedState.cycles.toArray().map(item => 
      Array.isArray(item) ? item[0] : item
    );
    
    const steps = this.sharedState.reasoningSteps.toArray().map(item => 
      Array.isArray(item) ? item[0] : item
    );
    
    return {
      tasks,
      concepts,
      systemMetrics: this._getYMapAsObject(this.sharedState.systemMetrics),
      cycles,
      reasoningSteps: steps
    };
  }

  /**
   * Helper to convert Y.Map to regular object
   */
  _getYMapAsObject(yMap) {
    const obj = {};
    yMap.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Destroy the client and clean up resources
   */
  destroy() {
    if (this.provider) {
      this.provider.destroy();
    }
    this.ydoc.destroy();
  }

  /**
   * Get the current Y.Doc instance
   */
  getDoc() {
    return this.ydoc;
  }

  /**
   * Get the shared state maps
   */
  getSharedState() {
    return this.sharedState;
  }
}

export default YjsSyncClient;
