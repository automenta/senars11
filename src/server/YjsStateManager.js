import * as Y from 'yjs';
import { YjsDocServer } from './YjsDocServer.js';

/**
 * Y.js State Manager for CRDT-based synchronization
 * Manages the shared document that contains all NAR state
 */
class YjsStateManager {
  constructor(options = {}) {
    this.options = {
      websocketPort: options.websocketPort || 1234, // Default Y.js WebSocket port
      documentId: options.documentId || 'senars-document'
    };

    // These properties will be accessible from outside
    this.port = this.options.websocketPort;
    this.documentId = this.options.documentId;

    // Create the YjsDocServer to handle WebSocket connections
    this.server = new YjsDocServer({
      port: this.options.websocketPort,
      documentId: this.options.documentId
    });

    // Get or create the document
    this.ydoc = this.server.getDocument(this.options.documentId);
    if (!this.ydoc) {
      // Document should be created by the yjs server, but if not, we create it
      this.ydoc = new Y.Doc();
      // Initialize shared types for different data structures
      this.ydoc.getMap('tasks');
      this.ydoc.getMap('concepts');
      this.ydoc.getMap('systemMetrics');
      this.ydoc.getArray('cycles');
      this.ydoc.getArray('reasoningSteps');
      this.ydoc.getArray('notifications');

      // Store in yjs server
      this.server.documents.set(this.options.documentId, this.ydoc);
    }

    // Get references to shared types
    this.sharedState = {
      tasks: this.ydoc.getMap('tasks'),
      concepts: this.ydoc.getMap('concepts'),
      systemMetrics: this.ydoc.getMap('systemMetrics'),
      cycles: this.ydoc.getArray('cycles'),
      reasoningSteps: this.ydoc.getArray('reasoningSteps'),
      notifications: this.ydoc.getArray('notifications')
    };

    console.log(`Y.js document server started at ws://localhost:${this.port}/${this.documentId}`);

    // Track current NAR instance to listen to its events
    this.nar = null;
    this.listeners = new Set();
  }

  /**
   * Connect this state manager to a NAR instance
   */
  async listenToNAR(nar) {
    this.nar = nar;

    // Listen to NAR events and update shared state accordingly
    // Subscribe to all relevant events from the NAR using the correct event names
    if (nar.on) {
      // Task-related events (beliefs, goals are also tasks)
      nar.on('task.input', (data, metadata) => {
        const task = data.task || data;
        if (task) this.updateTask(task);
      });
      nar.on('task.added', (data, metadata) => {
        const task = data.task || data;
        if (task) this.updateTask(task);
      });
      nar.on('task.processed', (data, metadata) => {
        const task = data.task || data;
        if (task) this.updateTask(task);
      });

      // Concept-related events
      nar.on('concept.created', (data, metadata) => {
        const concept = data.concept || data;
        if (concept) this.updateConcept(concept);
      });
      // Note: concept.updated might not exist, but we'll try to listen to it

      // System events
      nar.on('reasoning.step', (data, metadata) => {
        const step = data || { timestamp: Date.now(), content: 'reasoning step' };
        this.addReasoningStep(step);
      });

      // Cycle events
      nar.on('cycle.start', (data, metadata) => {
        const cycleData = data || { id: Date.now(), timestamp: Date.now(), type: 'cycle.start' };
        this.addCycle(cycleData);
      });
      nar.on('cycle.complete', (data, metadata) => {
        const cycleData = data || { id: Date.now(), timestamp: Date.now(), type: 'cycle.complete' };
        this.addCycle(cycleData);
      });

      // Memory reset events
      nar.on('system.reset', () => this.resetState());
    }
  }

  /**
   * Update task in shared state
   */
  updateTask(task) {
    if (!task) {
      console.warn('Task update with null/undefined task');
      return;
    }

    // Generate ID if task doesn't have one - using stamp.id or creating from term and timestamp
    let taskId = task.id || task.stamp?.id;
    if (!taskId && task.term) {
      // Create an ID based on the task's term hash and timestamp
      taskId = `${task.term._hash || task.term.toString()}_${Date.now()}`;
    } else if (!taskId) {
      taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Use the server to update the document safely with proper Yjs transaction
    this.server.updateDocument(this.options.documentId, (doc) => {
      const tasksMap = doc.getMap('tasks');

      // Convert task to serializable format and store in Y.Map
      const taskData = {
        id: taskId,
        content: task.content || (task.term ? task.term.toString() : ''),
        priority: task.priority || task.budget?.priority || 0,
        type: task.type || this._inferTaskType(task),
        creationTime: task.creation ? Date.parse(task.creation) || task.creationTime || Date.now() : Date.now(),
        occurrenceTime: task.occurrenceTime || Date.now(),
        truth: task.truth || task.truthValue || null,
        budget: task.budget || null,
        termHash: task.term?._hash,
        termString: task.term?.toString(),
        stamp: task.stamp ? {
          id: task.stamp.id,
          creationTime: task.stamp.creationTime,
          source: task.stamp.source
        } : null,
        ...task // Spread any other properties
      };

      tasksMap.set(taskId, taskData);
    });
  }

  /**
   * Infer task type from its content or properties
   */
  _inferTaskType(task) {
    const content = task.content || task.term || task.task?.content || '';
    if (content.endsWith('?')) return 'question';
    if (content.endsWith('!')) return 'goal';
    return 'belief'; // default
  }

  /**
   * Update concept in shared state
   */
  updateConcept(concept) {
    if (!concept) {
      console.warn('Concept update with null/undefined concept');
      return;
    }

    // Generate term key if concept doesn't have one
    const term = concept.term ? (typeof concept.term.toString === 'function' ? concept.term.toString() : concept.term) :
                 concept.key || `concept_${Date.now()}`;

    // Use the server to update the document safely with proper Yjs transaction
    this.server.updateDocument(this.options.documentId, (doc) => {
      const conceptsMap = doc.getMap('concepts');

      const conceptData = {
        term: term,
        priority: concept.priority || concept.activation || 0,
        occurrenceTime: concept.occurrenceTime || Date.now(),
        taskCount: concept.taskCount || concept.totalTasks || 0,
        beliefCount: concept.beliefCount || 0,
        questionCount: concept.questionCount || 0,
        lastAccess: concept.lastAccess || Date.now(),
        useCount: concept.useCount || 0,
        quality: concept.quality || 0,
        activation: concept.activation || 0,
        ...concept // spread any other properties
      };

      conceptsMap.set(term, conceptData);
    });
  }

  /**
   * Add cycle data to shared state
   */
  addCycle(cycleData) {
    // Use the server to update the document safely with proper Yjs transaction
    this.server.updateDocument(this.options.documentId, (doc) => {
      const cyclesArray = doc.getArray('cycles');
      const cycle = {
        id: cycleData.id || Date.now(),
        timestamp: cycleData.timestamp || Date.now(),
        type: cycleData.type || 'cycle',
        metrics: cycleData.metrics || {},
        ...cycleData
      };

      cyclesArray.push([cycle]);
    });
  }

  /**
   * Add reasoning step to shared state
   */
  addReasoningStep(step) {
    // Use the server to update the document safely with proper Yjs transaction
    this.server.updateDocument(this.options.documentId, (doc) => {
      const reasoningStepsArray = doc.getArray('reasoningSteps');
      const reasoningStep = {
        id: step.id || Date.now(),
        timestamp: step.timestamp || Date.now(),
        content: step.content || step.inference || '',
        ...step
      };

      reasoningStepsArray.push([reasoningStep]);
    });
  }

  /**
   * Reset all shared state
   */
  resetState() {
    // Use the server to update the document safely with proper Yjs transaction
    this.server.updateDocument(this.options.documentId, (doc) => {
      const tasks = doc.getMap('tasks');
      const concepts = doc.getMap('concepts');
      const cycles = doc.getArray('cycles');
      const reasoningSteps = doc.getArray('reasoningSteps');

      // Clear all shared types
      tasks.clear();
      concepts.clear();
      cycles.delete(0, cycles.length);
      reasoningSteps.delete(0, reasoningSteps.length);
    });
  }

  /**
   * Get current state snapshot
   */
  getState() {
    return {
      tasks: this._getYMapAsObject(this.ydoc.getMap('tasks')),
      concepts: this._getYMapAsObject(this.ydoc.getMap('concepts')),
      systemMetrics: this._getYMapAsObject(this.ydoc.getMap('systemMetrics')),
      cycles: this._getYArrayAsArray(this.ydoc.getArray('cycles')),
      reasoningSteps: this._getYArrayAsArray(this.ydoc.getArray('reasoningSteps'))
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
   * Helper to convert Y.Array to regular array
   */
  _getYArrayAsArray(yArray) {
    return yArray.toArray().map(item => Array.isArray(item) ? item[0] : item);
  }

  /**
   * Destroy the server and clean up
   */
  destroy() {
    if (this.server) {
      this.server.close();
    }
    if (this.ydoc) {
      this.ydoc.destroy();
    }
  }

  /**
   * Start the WebSocket server for Y.js (no-op since server starts with construction)
   */
  async startServer() {
    // Server is already started when created
    return Promise.resolve();
  }

  /**
   * Get the Y.Doc instance
   */
  getDoc() {
    return this.ydoc;
  }

  /**
   * Get the shared state maps
   */
  getSharedState() {
    return {
      tasks: this.ydoc.getMap('tasks'),
      concepts: this.ydoc.getMap('concepts'),
      systemMetrics: this.ydoc.getMap('systemMetrics'),
      cycles: this.ydoc.getArray('cycles'),
      reasoningSteps: this.ydoc.getArray('reasoningSteps'),
      notifications: this.ydoc.getArray('notifications')
    };
  }
}

export { YjsStateManager };