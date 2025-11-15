/**
 * Initial data generator for Graph UI
 * Provides sample data to populate the graph visualization on load
 */

/**
 * Sends initial data to populate the Graph UI with various data types
 * @param {WebSocketService} wsService - The WebSocket service instance
 */
export const sendGraphInitialData = (wsService) => {
  console.log('Sending initial data for Graph UI');

  const now = Date.now();

  // Send some initial concepts
  const concepts = [
    { term: 'cat', priority: 0.9, occurrenceTime: now, taskCount: 2, beliefCount: 1, questionCount: 1, lastAccess: now },
    { term: 'animal', priority: 0.85, occurrenceTime: now, taskCount: 1, beliefCount: 2, questionCount: 0, lastAccess: now },
    { term: 'mammal', priority: 0.8, occurrenceTime: now, taskCount: 1, beliefCount: 1, questionCount: 0, lastAccess: now },
    { term: 'pet', priority: 0.75, occurrenceTime: now, taskCount: 0, beliefCount: 1, questionCount: 1, lastAccess: now },
    { term: 'dog', priority: 0.7, occurrenceTime: now, taskCount: 1, beliefCount: 1, questionCount: 0, lastAccess: now }
  ];

  concepts.forEach((concept, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: concept,
          changeType: 'added'
        }
      });
    }, index * 100);
  });

  // Send some initial tasks (beliefs, questions, goals)
  const tasks = [
    { id: `task_${now}_1`, term: '<cat --> animal>.', type: 'belief', creationTime: now + 100, occurrenceTime: now + 100,
      truth: { frequency: 0.9, confidence: 0.8 },
      budget: { priority: 0.85, durability: 0.7, quality: 0.75 }
    },
    { id: `task_${now}_2`, term: '<animal --> mammal>.', type: 'belief', creationTime: now + 110, occurrenceTime: now + 110,
      truth: { frequency: 0.85, confidence: 0.75 },
      budget: { priority: 0.82, durability: 0.65, quality: 0.7 }
    },
    { id: `task_${now}_3`, term: '<cat --> pet>?', type: 'question', creationTime: now + 120, occurrenceTime: now + 120,
      truth: { frequency: 0.5, confidence: 0.6 },
      budget: { priority: 0.78, durability: 0.6, quality: 0.65 }
    },
    { id: `task_${now}_4`, term: '<dog --> pet>.', type: 'belief', creationTime: now + 130, occurrenceTime: now + 130,
      truth: { frequency: 0.8, confidence: 0.7 },
      budget: { priority: 0.75, durability: 0.7, quality: 0.65 }
    },
    { id: `task_${now}_5`, term: '<cat --> mammal>?', type: 'question', creationTime: now + 140, occurrenceTime: now + 140,
      truth: { frequency: 0.6, confidence: 0.55 },
      budget: { priority: 0.72, durability: 0.55, quality: 0.6 }
    },
    { id: `task_${now}_6`, term: '<become_loved --> pet>!', type: 'goal', creationTime: now + 150, occurrenceTime: now + 150,
      truth: { frequency: 0.95, confidence: 0.85 },
      budget: { priority: 0.90, durability: 0.85, quality: 0.9 }
    }
  ];

  tasks.forEach((task, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'taskUpdate',
        payload: {
          task: task,
          changeType: 'input'
        }
      });
    }, index * 100 + 200);
  });

  // Send some reasoning steps to show connections
  const reasoningSteps = [
    {
      id: `step_${now}_1`,
      step: 1,
      description: 'Deduction: <cat --> animal>., <animal --> mammal>. => <cat --> mammal>.',
      result: '<cat --> mammal>.',
      timestamp: now + 300,
      metadata: { rule: 'deduction', confidence: 0.8, priority: 0.75 }
    },
    {
      id: `step_${now}_2`,
      step: 2,
      description: 'Induction: <cat --> pet>?, <cat --> animal>. => Implication: <animal --> pet>?',
      result: 'Implication: <animal --> pet>?',
      timestamp: now + 400,
      metadata: { rule: 'induction', confidence: 0.7, priority: 0.7 }
    }
  ];

  reasoningSteps.forEach((step, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'reasoningStep',
        payload: { step }
      });
    }, index * 100 + 500);
  });

  // Send system metrics to show the NAR status
  setTimeout(() => {
    wsService.routeMessage({
      type: 'systemMetrics',
      payload: {
        cycleCount: 100,
        taskCount: tasks.length,
        conceptCount: concepts.length,
        runtime: 5000,
        connectedClients: 1,
        startTime: now - 5000
      }
    });
  }, 700);

  console.log('Initial data sent for Graph UI');
};

/**
 * Checks if WebSocket is connected and sends initial data when ready
 * @param {WebSocketService} wsService - The WebSocket service instance
 * @param {Function} onReady - Optional callback when data is sent
 */
export const setupGraphInitialData = (wsService, onReady = null) => {
  // If already connected, send data immediately
  if (wsService.state === 'connected') {
    sendGraphInitialData(wsService);
    if (onReady) onReady();
    return;
  }

  // Otherwise, wait for connection then send data
  const handleOpen = () => {
    // Remove listener after connection
    wsService.ws.removeEventListener('open', handleOpen);

    // Send initial data
    sendGraphInitialData(wsService);

    if (onReady) onReady();
  };

  // Add connection listener if WebSocket exists
  if (wsService.ws) {
    wsService.ws.addEventListener('open', handleOpen);
  }
};