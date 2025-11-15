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
    { term: 'cat', priority: 0.9, taskCount: 2, beliefCount: 1, questionCount: 1 },
    { term: 'animal', priority: 0.85, taskCount: 1, beliefCount: 2, questionCount: 0 },
    { term: 'mammal', priority: 0.8, taskCount: 1, beliefCount: 1, questionCount: 0 },
    { term: 'pet', priority: 0.75, taskCount: 0, beliefCount: 1, questionCount: 1 },
    { term: 'dog', priority: 0.7, taskCount: 1, beliefCount: 1, questionCount: 0 }
  ];

  concepts.forEach((concept, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'conceptUpdate',
        payload: {
          concept: {
            ...concept,
            occurrenceTime: now + index,
            lastAccess: now + index
          },
          changeType: 'added'
        }
      });
    }, index * 100);
  });

  // Send some initial tasks (beliefs, questions, goals)
  const tasks = [
    { id: `task_${now}_1`, content: '<cat --> animal>.', priority: 0.85, type: 'belief' },
    { id: `task_${now}_2`, content: '<animal --> mammal>.', priority: 0.82, type: 'belief' },
    { id: `task_${now}_3`, content: '<cat --> pet>?', priority: 0.78, type: 'question' },
    { id: `task_${now}_4`, content: '<dog --> pet>.', priority: 0.75, type: 'belief' },
    { id: `task_${now}_5`, content: '<cat --> mammal>?', priority: 0.72, type: 'question' },
    { id: `task_${now}_6`, content: '<become_loved --> pet>!', priority: 0.90, type: 'goal' }
  ];

  tasks.forEach((task, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'taskUpdate',
        payload: {
          task: {
            ...task,
            creationTime: now + index * 10 + 100
          },
          changeType: 'input'
        }
      });
      
      // Also send to the specific collections based on type
      if (task.type === 'belief') {
        wsService.routeMessage({
          type: 'beliefUpdate',
          payload: {
            id: task.id,
            term: task.content,
            priority: task.priority,
            creationTime: now + index * 10 + 100,
            type: task.type,
            truth: { frequency: 0.9, confidence: 0.8 }
          }
        });
      } else if (task.type === 'question') {
        wsService.routeMessage({
          type: 'beliefUpdate', // questions may also be treated as beliefs in some contexts
          payload: {
            id: task.id,
            term: task.content,
            priority: task.priority,
            creationTime: now + index * 10 + 100,
            type: task.type,
            truth: { frequency: 0.5, confidence: 0.6 } // questions have different truth values
          }
        });
      } else if (task.type === 'goal') {
        wsService.routeMessage({
          type: 'goalUpdate',
          payload: {
            id: task.id,
            term: task.content,
            priority: task.priority,
            creationTime: now + index * 10 + 100,
            type: task.type,
            truth: { desire: 0.95, confidence: 0.85 }
          }
        });
      }
    }, index * 100 + 200);
  });

  // Send some reasoning steps to show connections
  const reasoningSteps = [
    {
      id: `step_${now}_1`,
      timestamp: now + 300,
      input: '<cat --> animal>., <animal --> mammal>.',
      output: '<cat --> mammal>.',
      rule: 'deduction',
      confidence: 0.8,
      priority: 0.75
    },
    {
      id: `step_${now}_2`,
      timestamp: now + 400,
      input: '<cat --> pet>?, <cat --> animal>.',
      output: 'Implication: <animal --> pet>?',
      rule: 'induction',
      confidence: 0.7,
      priority: 0.7
    }
  ];

  reasoningSteps.forEach((step, index) => {
    setTimeout(() => {
      wsService.routeMessage({
        type: 'reasoningStep',
        payload: step
      });
    }, index * 100 + 500);
  });

  // Send system metrics to show the NAR status
  setTimeout(() => {
    wsService.routeMessage({
      type: 'systemMetrics',
      payload: {
        wsConnected: true,
        clock: 100,
        running: true,
        cpu: 15,
        memory: 25,
        activeTasks: 5,
        reasoningSpeed: 75,
        concepts: concepts.length
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