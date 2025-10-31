/**
 * Automation utilities for SeNARS application
 * Shared between UI automation and demo scripts
 */

import { createWebSocketClient, WebSocketClient } from './websocket-client.js';

/**
 * Base automation class for creating various automation scenarios
 */
class BaseAutomation {
  /**
   * Creates a base automation instance
   * @param {WebSocketClient} webSocketClient - The WebSocket client to use
   * @param {Object} options - Configuration options
   */
  constructor(webSocketClient, options = {}) {
    this.client = webSocketClient;
    this.options = {
      updateInterval: 2000, // How often to send updates
      activityProbability: 0.7, // Probability of generating activity
      ...options
    };
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the automation
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.onStarted();
    
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.onUpdate();
      }
    }, this.options.updateInterval);
  }

  /**
   * Stop the automation
   */
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onStopped();
  }

  /**
   * Called when automation starts - override in subclasses
   */
  onStarted() {
    console.log('Automation started');
  }

  /**
   * Called when automation stops - override in subclasses
   */
  onStopped() {
    console.log('Automation stopped');
  }

  /**
   * Called on each update cycle - override in subclasses
   */
  onUpdate() {
    // Override in subclasses
  }

  /**
   * Send a message through the WebSocket client
   */
  send(message) {
    if (this.client) {
      this.client.send(message);
    }
  }
}

/**
 * Demos automation class for simulating demo scenarios
 */
class DemoAutomation extends BaseAutomation {
  constructor(webSocketClient, options = {}) {
    super(webSocketClient, {
      updateInterval: 1500,
      activityProbability: 0.8,
      baseTerms: ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living'],
      ...options
    });
  }

  onStarted() {
    console.log('Demo automation started');
    
    // Send initial demo list
    this.send({
      type: 'demoList',
      payload: [
        { id: 'derivation-demo', name: 'Belief Derivation Demo', description: 'Shows how beliefs are derived from other beliefs' },
        { id: 'priority-demo', name: 'Priority Fluctuation Demo', description: 'Shows how concept priorities change over time' },
        { id: 'reasoning-chain', name: 'Reasoning Chain Demo', description: 'Multi-step reasoning process' }
      ]
    });

    // Send initial system metrics
    this.send({
      type: 'systemMetrics',
      payload: {
        wsConnected: true,
        cpu: 25,
        memory: 30,
        activeTasks: 0,
        reasoningSpeed: 0
      }
    });
  }

  onUpdate() {
    if (Math.random() > this.options.activityProbability) {
      this.generateDerivations();
    }

    if (Math.random() > 0.3) {
      this.generatePriorityFluctuations();
    }

    if (Math.random() > 0.9) { // 10% chance
      this.generateNotification();
    }

    // Send periodic system metrics
    this.send({
      type: 'systemMetrics',
      payload: {
        wsConnected: true,
        cpu: Math.random() * 40 + 10, // 10-50%
        memory: Math.random() * 50 + 20, // 20-70%
        activeTasks: Math.floor(Math.random() * 10),
        reasoningSpeed: Math.floor(Math.random() * 500) + 50
      }
    });
  }

  generateDerivations() {
    const baseTerms = this.options.baseTerms;
    const term1 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
    const term2 = baseTerms[Math.floor(Math.random() * baseTerms.length)];

    if (term1 !== term2) {
      const derivation = {
        type: 'reasoningStep',
        payload: {
          id: 'reasoning_' + Date.now(),
          timestamp: Date.now(),
          input: '<' + term1 + ' --> ' + term2 + '>.', 
          output: '<' + term2 + ' --> ' + term1 + '>?', 
          rule: ['deduction', 'induction', 'abduction', 'comparison'][Math.floor(Math.random() * 4)],
          confidence: Math.random(),
          priority: Math.random()
        }
      };

      this.send(derivation);

      // Also send as a task update
      this.send({
        type: 'taskUpdate',
        payload: {
          id: 'task_' + Date.now(),
          content: derivation.payload.output,
          priority: derivation.payload.priority,
          creationTime: Date.now(),
          type: Math.random() > 0.8 ? 'goal' : Math.random() > 0.5 ? 'question' : 'belief'
        }
      });
    }
  }

  generatePriorityFluctuations() {
    const baseTerms = this.options.baseTerms;
    const concepts = baseTerms.map(term => ({
      term: term,
      priority: Math.random(),
      occurrenceTime: Date.now(),
      truth: { 
        frequency: Math.random(), 
        confidence: Math.random() 
      }
    }));

    concepts.forEach(concept => {
      this.send({
        type: 'conceptUpdate',
        payload: {
          concept: concept,
          changeType: Math.random() > 0.9 ? 'removed' : Math.random() > 0.8 ? 'added' : 'updated'
        }
      });
    });
  }

  generateNotification() {
    this.send({
      type: 'notification',
      payload: {
        type: Math.random() > 0.5 ? 'success' : 'info',
        title: 'Demo Event',
        message: ['Derivation complete', 'Priority updated', 'New concept formed', 'Reasoning step'][Math.floor(Math.random() * 4)],
        timestamp: Date.now()
      }
    });
  }
}

/**
 * Task generation automation
 */
class TaskAutomation extends BaseAutomation {
  constructor(webSocketClient, options = {}) {
    super(webSocketClient, {
      updateInterval: 2000,
      activityProbability: 0.5,
      baseTerms: ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living'],
      ...options
    });
  }

  onStarted() {
    console.log('Task automation started');
  }

  onUpdate() {
    if (Math.random() > this.options.activityProbability) {
      this.generateTask();
    }
  }

  generateTask() {
    const baseTerms = this.options.baseTerms;
    const term1 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
    const term2 = baseTerms[Math.floor(Math.random() * baseTerms.length)];
    const relation = ['-->', '<->', ''][(Math.floor(Math.random() * 3))];
    
    const content = `<${term1} ${relation} ${term2}>${['.', '?', '!'][Math.floor(Math.random() * 3)]}`;
    
    this.send({
      type: 'taskUpdate',
      payload: {
        id: 'task_' + Date.now(),
        content: content,
        priority: Math.random(),
        creationTime: Date.now(),
        type: content.endsWith('?') ? 'question' : 
              content.endsWith('!') ? 'goal' : 'belief'
      }
    });
  }
}

/**
 * Concept management automation
 */
class ConceptAutomation extends BaseAutomation {
  constructor(webSocketClient, options = {}) {
    super(webSocketClient, {
      updateInterval: 1000,
      activityProbability: 0.6,
      baseTerms: ['cat', 'dog', 'bird', 'fish', 'animal', 'mammal', 'pet', 'living'],
      ...options
    });
  }

  onStarted() {
    console.log('Concept automation started');
  }

  onUpdate() {
    if (Math.random() > this.options.activityProbability) {
      this.generateConcept();
    }
  }

  generateConcept() {
    const baseTerms = this.options.baseTerms;
    const term = baseTerms[Math.floor(Math.random() * baseTerms.length)];
    
    this.send({
      type: 'conceptUpdate',
      payload: {
        concept: {
          term: term,
          priority: Math.random(),
          occurrenceTime: Date.now(),
          taskCount: Math.floor(Math.random() * 5),
          beliefCount: Math.floor(Math.random() * 3),
          questionCount: Math.floor(Math.random() * 2),
          lastAccess: Date.now(),
          truth: { 
            frequency: Math.random(), 
            confidence: Math.random() 
          }
        },
        changeType: Math.random() > 0.9 ? 'removed' : 'added'
      }
    });
  }
}

/**
 * Factory function to create automation instances
 */
function createAutomation(type, webSocketClient, options = {}) {
  switch (type) {
    case 'demo':
      return new DemoAutomation(webSocketClient, options);
    case 'task':
      return new TaskAutomation(webSocketClient, options);
    case 'concept':
      return new ConceptAutomation(webSocketClient, options);
    default:
      throw new Error(`Unknown automation type: ${type}`);
  }
}

export {
  BaseAutomation,
  DemoAutomation,
  TaskAutomation,
  ConceptAutomation,
  createAutomation
};

export default createAutomation;