/**
 * Initial data generator for Graph UI
 * Provides sample data to populate the graph visualization on load
 */

// Default configuration for initial data
const DEFAULT_CONFIG = Object.freeze({
    delay: {
        concept: 100,
        task: 200,
        reasoningStep: 500,
        systemMetrics: 700
    },
    conceptCount: 5,
    taskCount: 6
});

/**
 * Creates a unique ID with timestamp prefix
 * @param {string} prefix - ID prefix
 * @param {number} now - Current timestamp
 * @returns {string} Unique ID
 */
const createId = (prefix, now = Date.now()) => `${prefix}_${now}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generates initial concept data
 * @param {number} now - Current timestamp
 * @param {Object} config - Configuration object
 * @returns {Array} Array of concept objects
 */
const generateConcepts = (now, config = DEFAULT_CONFIG) => {
    const conceptTerms = ['cat', 'animal', 'mammal', 'pet', 'dog'];
    return conceptTerms.slice(0, config.conceptCount).map((term, index) => ({
        term,
        priority: 0.9 - (index * 0.05),
        occurrenceTime: now,
        taskCount: index < 3 ? 2 : 1,
        beliefCount: index < 4 ? 1 : 2,
        questionCount: index % 2,
        lastAccess: now
    }));
};

/**
 * Generates initial task data (beliefs, questions, goals)
 * @param {number} now - Current timestamp
 * @returns {Array} Array of task objects
 */
const generateTasks = (now) => {
    const taskTypes = [
        {term: '<cat --> animal>.', type: 'belief', priority: 0.85, truth: {frequency: 0.9, confidence: 0.8}},
        {term: '<animal --> mammal>.', type: 'belief', priority: 0.82, truth: {frequency: 0.85, confidence: 0.75}},
        {term: '<cat --> pet>?', type: 'question', priority: 0.78, truth: {frequency: 0.5, confidence: 0.6}},
        {term: '<dog --> pet>.', type: 'belief', priority: 0.75, truth: {frequency: 0.8, confidence: 0.7}},
        {term: '<cat --> mammal>?', type: 'question', priority: 0.72, truth: {frequency: 0.6, confidence: 0.55}},
        {term: '<become_loved --> pet>!', type: 'goal', priority: 0.90, truth: {frequency: 0.95, confidence: 0.85}}
    ];

    return taskTypes.map((taskData, index) => ({
        id: createId('task', now + index),
        term: taskData.term,
        type: taskData.type,
        creationTime: now + 100 + (index * 10),
        occurrenceTime: now + 100 + (index * 10),
        truth: taskData.truth,
        budget: {
            priority: taskData.priority,
            durability: taskData.priority - 0.15,
            quality: taskData.priority - 0.1
        }
    }));
};

/**
 * Generates initial reasoning step data
 * @param {number} now - Current timestamp
 * @returns {Array} Array of reasoning step objects
 */
const generateReasoningSteps = (now) => [
    {
        id: createId('step', now),
        step: 1,
        description: 'Deduction: <cat --> animal>., <animal --> mammal>. => <cat --> mammal>.',
        result: '<cat --> mammal>.',
        timestamp: now + 300,
        metadata: {rule: 'deduction', confidence: 0.8, priority: 0.75}
    },
    {
        id: createId('step', now + 1),
        step: 2,
        description: 'Induction: <cat --> pet>?, <cat --> animal>. => Implication: <animal --> pet>?',
        result: 'Implication: <animal --> pet>?',
        timestamp: now + 400,
        metadata: {rule: 'induction', confidence: 0.7, priority: 0.7}
    }
];

/**
 * Sends a message via WebSocket with optional delay
 * @param {WebSocketService} wsService - WebSocket service instance
 * @param {Object} message - Message to send
 * @param {number} delay - Delay in milliseconds
 */
const sendDelayedMessage = (wsService, message, delay = 0) => {
    if (delay > 0) {
        setTimeout(() => wsService.routeMessage(message), delay);
    } else {
        wsService.routeMessage(message);
    }
};

/**
 * Sends initial data to populate the Graph UI with various data types
 * @param {WebSocketService} wsService - The WebSocket service instance
 * @param {Object} config - Configuration for initial data generation
 */
export const sendGraphInitialData = (wsService, config = DEFAULT_CONFIG) => {
    if (!wsService) {
        console.warn('WebSocket service not available for initial data');
        return;
    }

    console.log('Sending initial data for Graph UI');

    const now = Date.now();
    const concepts = generateConcepts(now, config);
    const tasks = generateTasks(now);
    const reasoningSteps = generateReasoningSteps(now);

    // Send concepts with staggered delays
    concepts.forEach((concept, index) => {
        sendDelayedMessage(wsService, {
            type: 'conceptUpdate',
            payload: {
                concept,
                changeType: 'added'
            }
        }, index * config.delay.concept);
    });

    // Send tasks with staggered delays
    tasks.forEach((task, index) => {
        sendDelayedMessage(wsService, {
            type: 'taskUpdate',
            payload: {
                task,
                changeType: 'input'
            }
        }, index * config.delay.concept + config.delay.task);
    });

    // Send reasoning steps with staggered delays
    reasoningSteps.forEach((step, index) => {
        sendDelayedMessage(wsService, {
            type: 'reasoningStep',
            payload: {step}
        }, index * config.delay.concept + config.delay.reasoningStep);
    });

    // Send system metrics
    sendDelayedMessage(wsService, {
        type: 'systemMetrics',
        payload: {
            cycleCount: 100,
            taskCount: tasks.length,
            conceptCount: concepts.length,
            runtime: 5000,
            connectedClients: 1,
            startTime: now - 5000
        }
    }, config.delay.systemMetrics);

    console.log('Initial data sent for Graph UI');
};

/**
 * Checks if WebSocket is connected and sends initial data when ready
 * @param {WebSocketService} wsService - The WebSocket service instance
 * @param {Function} onReady - Optional callback when data is sent
 * @param {Object} config - Configuration for initial data
 */
export const setupGraphInitialData = (wsService, onReady = null, config = DEFAULT_CONFIG) => {
    if (!wsService) {
        console.warn('WebSocket service not available for initial data setup');
        return;
    }

    // If already connected, send data immediately
    if (wsService.state === 'connected') {
        sendGraphInitialData(wsService, config);
        onReady?.();
        return;
    }

    // Otherwise, wait for connection then send data
    const handleOpen = () => {
        // Remove listener after connection
        wsService.ws?.removeEventListener('open', handleOpen);

        // Send initial data
        sendGraphInitialData(wsService, config);

        onReady?.();
    };

    // Add connection listener if WebSocket exists
    wsService.ws?.addEventListener('open', handleOpen);
};