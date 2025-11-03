/**
 * DemoWrapper - A system that wraps demos to provide remote control and introspection
 */
export class DemoWrapper {
    constructor(config = {}) {
        this.config = {
            autoStart: false,
            stepInterval: 1000, // ms for auto-stepping if needed
            ...config
        };

        this.isRunning = false;
        this.isPaused = false;
        this.currentStep = 0;
        this.currentDemoId = null;
        this.demos = new Map();
        this.demoStates = {}; // Track individual demo states
        this.webSocketMonitor = null;
        this.nar = null;

        // Register built-in demos
        this.registerBuiltinDemos();
    }

    async initialize(nar, webSocketMonitor) {
        this.nar = nar;
        this.webSocketMonitor = webSocketMonitor;

        // Register demo control message handler
        if (webSocketMonitor) {
            webSocketMonitor.registerClientMessageHandler('demoControl', this.handleDemoControl.bind(this));
        }
    }

    registerBuiltinDemos() {
        const demos = [
            {
                id: 'basicUsage',
                name: 'Basic Usage Demo',
                description: 'Demonstrates basic NARS operations',
                handler: this.runBasicUsageDemo.bind(this),
                stepDelay: 1000
            },
            {
                id: 'syllogism',
                name: 'Syllogistic Reasoning Demo',
                description: 'Demonstrates syllogistic reasoning',
                handler: this.runSyllogismDemo.bind(this),
                stepDelay: 1500
            },
            {
                id: 'inductive',
                name: 'Inductive Reasoning Demo',
                description: 'Demonstrates inductive reasoning',
                handler: this.runInductiveDemo.bind(this),
                stepDelay: 2000
            }
        ];

        demos.forEach(demo => {
            this.registerDemo(demo.id, {
                name: demo.name,
                description: demo.description,
                handler: demo.handler,
                parameters: {
                    stepDelay: {type: 'number', defaultValue: demo.stepDelay, description: 'Delay between steps in ms'}
                }
            });
        });
    }

    registerDemo(id, config) {
        this.demos.set(id, {
            id,
            ...config
        });
    }

    getAvailableDemos() {
        return Array.from(this.demos.values()).map(demo => ({
            id: demo.id,
            name: demo.name,
            description: demo.description,
            parameters: Object.entries(demo.parameters || {}).map(([name, param]) => ({
                name,
                type: param.type,
                defaultValue: param.defaultValue,
                description: param.description
            }))
        }));
    }

    async handleDemoControl(data) {
        try {
            // Validate input data
            if (!this._validateDemoControl(data)) {
                return;
            }

            const {command, demoId, parameters} = data.payload;

            const commandHandlers = {
                'start': () => this.startDemo(demoId, parameters || {}),
                'stop': () => this.stopDemo(demoId),
                'pause': () => this.pauseDemo(demoId),
                'resume': () => this.resumeDemo(demoId),
                'step': () => this.stepDemo(demoId, parameters || {}),
                'configure': () => this.configureDemo(demoId, parameters || {})
            };

            if (commandHandlers[command]) {
                await commandHandlers[command]();
            } else {
                await this._handleUnknownCommand(demoId, command);
            }
        } catch (error) {
            console.error('Error handling demo control:', error);
            // Notify client about the error
            if (this.webSocketMonitor && data && data.payload) {
                this.webSocketMonitor.broadcastCustomEvent('demoError', {
                    demoId: data.payload.demoId,
                    error: error.message,
                    timestamp: Date.now(),
                    stack: error.stack
                });
            }
        }
    }

    _validateDemoControl(data) {
        if (!data || !data.payload) {
            console.error('Invalid demo control message: missing payload');
            return false;
        }

        const {command, demoId, parameters} = data.payload;

        // Validate required fields
        if (!command || typeof command !== 'string') {
            console.error('Invalid demo control message: missing or invalid command');
            return false;
        }

        if (!demoId || typeof demoId !== 'string') {
            console.error('Invalid demo control message: missing or invalid demoId');
            return false;
        }

        // Validate parameters if present
        if (parameters && typeof parameters !== 'object') {
            console.error('Invalid demo control message: parameters must be an object');
            return false;
        }

        return true;
    }

    async _handleUnknownCommand(demoId, command) {
        console.warn(`Unknown demo command: ${command}`);
        // Optionally notify the client about the unknown command
        if (this.webSocketMonitor) {
            this.webSocketMonitor.broadcastCustomEvent('demoError', {
                demoId,
                error: `Unknown command: ${command}`,
                command,
                timestamp: Date.now()
            });
        }
    }

    async startDemo(demoId, parameters = {}) {
        const demo = this.demos.get(demoId);
        if (!demo) {
            console.error(`Demo ${demoId} not found`);
            await this.sendDemoState(demoId, {
                state: 'error',
                error: `Demo ${demoId} not found`
            });
            return false;
        }

        // Stop any currently running demo to avoid conflicts
        if (this.isRunning && this.currentDemoId && this.currentDemoId !== demoId) {
            await this.stopDemo(this.currentDemoId);
        }

        this.currentDemoId = demoId;
        this.isRunning = true;
        this.isPaused = false;
        this.currentStep = 0;
        this.demoStates[demoId] = {
            state: 'running',
            progress: 0,
            currentStep: 0,
            parameters,
            demoId,
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };

        // Notify UI of demo state
        await this.sendDemoState(demoId, {
            state: 'running',
            progress: 0,
            currentStep: 0,
            parameters,
            startTime: Date.now()
        });

        try {
            await demo.handler(parameters);

            // Update final state when demo completes successfully
            if (this.demoStates[demoId]) {
                this.demoStates[demoId] = {
                    ...this.demoStates[demoId],
                    state: 'completed',
                    endTime: Date.now(),
                    progress: 100
                };

                await this.sendDemoState(demoId, {
                    state: 'completed',
                    progress: 100,
                    endTime: Date.now()
                });
            }
        } catch (error) {
            console.error(`Error running demo ${demoId}:`, error);
            this.demoStates[demoId] = {
                state: 'error',
                error: error.message,
                demoId,
                endTime: Date.now(),
                errorMessage: error.message,
                errorStack: error.stack
            };
            await this.sendDemoState(demoId, {
                state: 'error',
                error: error.message,
                errorMessage: error.message,
                endTime: Date.now()
            });

            // Ensure we clean up after an error
            this.isRunning = false;
            this.isPaused = false;
            this.currentDemoId = null;
        } finally {
            // Only clear running flags if we're still the running demo
            if (this.currentDemoId === demoId) {
                this.isRunning = false;
                this.isPaused = false;
                this.currentDemoId = null;

                // Ensure the final state is stopped if not already set to completed or error
                if (this.demoStates[demoId]?.state === 'running') {
                    this.demoStates[demoId] = {
                        state: 'stopped',
                        demoId,
                        endTime: Date.now()
                    };

                    await this.sendDemoState(demoId, {
                        state: 'stopped',
                        endTime: Date.now()
                    });
                }
            }
        }

        return true;
    }

    async stopDemo(demoId) {
        this.isRunning = false;
        this.isPaused = false;
        this.currentDemoId = null;

        const targetDemoId = demoId || this.currentDemoId;
        if (targetDemoId) {
            this._updateDemoState(targetDemoId, { state: 'stopped', demoId: targetDemoId });
            await this.sendDemoState(targetDemoId, { state: 'stopped' });
        }
    }

    async pauseDemo(demoId) {
        this.isPaused = true;
        this._updateDemoState(demoId, { state: 'paused' });
        await this.sendDemoState(demoId, { state: 'paused' });
    }

    async resumeDemo(demoId) {
        this.isPaused = false;
        this._updateDemoState(demoId, { state: 'running' });
        await this.sendDemoState(demoId, { state: 'running' });
    }

    _updateDemoState(demoId, stateUpdate) {
        if (demoId && this.demoStates[demoId]) {
            this.demoStates[demoId] = {
                ...this.demoStates[demoId],
                ...stateUpdate
            };
        } else if (demoId) {
            this.demoStates[demoId] = stateUpdate;
        }
    }

    async stepDemo(demoId, parameters = {}) {
        // For demos that support stepping
        console.log(`Step demo ${demoId} with parameters:`, parameters);
    }

    async configureDemo(demoId, parameters) {
        // Update demo configuration
        console.log(`Configure demo ${demoId} with parameters:`, parameters);
    }

    async sendDemoState(demoId, state) {
        if (this.webSocketMonitor) {
            this.webSocketMonitor.broadcastEvent('demoState', {
                type: 'demoState',
                payload: {
                    demoId,
                    ...state,
                    timestamp: Date.now()
                }
            });
        }
    }

    async sendDemoStep(demoId, step, description, data = {}) {
        if (this.webSocketMonitor) {
            // Update the demo state with current step and progress
            if (this.demoStates[demoId]) {
                // Estimate progress based on step number (assuming ~5-6 steps per demo)
                const estimatedTotalSteps = 6;
                const progress = Math.min(100, Math.round((step / estimatedTotalSteps) * 100));

                this.demoStates[demoId] = {
                    ...this.demoStates[demoId],
                    currentStep: step,
                    description,
                    progress,
                    lastStepTime: Date.now()
                };
            }

            this.webSocketMonitor.broadcastEvent('demoStep', {
                type: 'demoStep',
                payload: {
                    demoId,
                    step,
                    description,
                    data,
                    progress: this.demoStates[demoId]?.progress || 0,
                    timestamp: Date.now()
                }
            });
        }
    }

    async sendDemoMetrics(demoId, metrics) {
        if (this.webSocketMonitor) {
            try {
                this.webSocketMonitor.broadcastEvent('demoMetrics', {
                    type: 'demoMetrics',
                    payload: {
                        demoId,
                        systemMetrics: {
                            ...metrics,
                            timestamp: Date.now()
                        }
                    }
                });
            } catch (error) {
                console.error('Error sending demo metrics:', error);
            }
        }
    }

    async sendDemoList() {
        if (this.webSocketMonitor) {
            // Send the demo list as an event
            this.webSocketMonitor.broadcastEvent('demoList', {
                type: 'demoList',
                payload: {
                    demos: this.getAvailableDemos()
                }
            });

            // Also send individual demo status updates for currently running demos
            for (const [demoId, state] of Object.entries(this.demoStates || {})) {
                this.sendDemoState(demoId, state);
            }
        }
    }

    // Demo implementations
    async runBasicUsageDemo(params = {}) {
        const steps = [
            { description: 'Initializing basic usage demo' },
            { description: 'Adding belief: <cat --> animal>.', input: 'cat --> animal.' },
            { description: 'Adding belief: <dog --> animal>.', input: 'dog --> animal.' },
            { description: 'Asking question: <cat --> animal>?', input: 'cat --> animal?' },
            { description: 'Adding goal: <cat --> pet>!', input: 'cat --> pet!' },
            { description: 'Demo completed' }
        ];
        await this._executeDemoSteps('basicUsage', steps, params);
    }

    async runSyllogismDemo(params = {}) {
        const steps = [
            { description: 'Initializing syllogistic reasoning demo' },
            { description: 'Adding premise: <bird --> animal>.', input: 'bird --> animal.' },
            { description: 'Adding premise: <robin --> bird>.', input: 'robin --> bird.' },
            { description: 'Deriving conclusion: <robin --> animal>' },
            { description: 'Asking: <robin --> animal>?', input: 'robin --> animal?' },
            { description: 'Syllogistic reasoning demo completed' }
        ];
        await this._executeDemoSteps('syllogism', steps, params);
    }

    async runInductiveDemo(params = {}) {
        const steps = [
            { description: 'Initializing inductive reasoning demo' },
            { description: 'Adding observations: <swan1 --> white>.', input: 'swan1 --> white.' },
            { description: 'Adding observations: <swan2 --> white>.', input: 'swan2 --> white.' },
            { description: 'Adding observations: <swan3 --> white>.', input: 'swan3 --> white.' },
            { description: 'Inductive inference: <swan --> white>?', input: 'swan --> white?' },
            { description: 'Inductive reasoning demo completed' }
        ];
        await this._executeDemoSteps('inductive', steps, params);
    }

    async _executeDemoSteps(demoId, steps, params = {}) {
        const stepDelay = params.stepDelay || 1000;
        this.currentStep = 0;

        for (const step of steps) {
            this.currentStep++;
            await this.sendDemoStep(demoId, this.currentStep, step.description);
            
            if (step.input) {
                try {
                    await this.nar.input(step.input);
                } catch (error) {
                    console.error(`Error processing input for step ${this.currentStep}:`, error);
                    await this.sendDemoStep(demoId, this.currentStep, `Error processing input: ${error.message}`);
                }
            }
            
            if (this.currentStep < steps.length) { // Don't wait after the last step
                await this.waitIfNotPaused(stepDelay);
            }
        }
    }

    async waitIfNotPaused(delay = 1000) {
        const checkInterval = 100;
        let waited = 0;

        while (waited < delay && this.isRunning) {
            if (!this.isPaused) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waited += checkInterval;
            } else {
                // If paused, wait a bit longer before checking again
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Check if we're still running after the delay
        if (!this.isRunning) {
            throw new Error('Demo stopped during wait');
        }
    }

    async runPeriodicMetricsUpdate() {
        if (!this.nar || !this.webSocketMonitor) return;

        // Track previous concept priorities to detect changes
        let previousPriorities = new Map();
        let previousTaskCounts = new Map();

        // Send periodic system metrics to visualize in UI
        const updateMetrics = async () => {
            if (this.isRunning || Object.keys(this.demoStates).some(state => state.state !== 'stopped')) {
                // Get current system state
                const stats = this.nar.getStats ? this.nar.getStats() : {};
                const taskManagerStats = stats.taskManagerStats || {};

                const metrics = {
                    tasksProcessed: taskManagerStats.totalTasks || 0,
                    conceptsActive: this.nar.memory ? this.nar.memory.getAllConcepts().length : 0,
                    cyclesCompleted: this.nar.cycleCount || 0,
                    memoryUsage: this.nar.memory ? this.nar.memory.getDetailedStats?.().totalResourceUsage || 0 : 0,
                    activeDemos: Object.keys(this.demoStates).filter(id => this.demoStates[id].state === 'running').length,
                    systemLoad: 0 // Placeholder for system load metric
                };

                // Track concept priority fluctuations
                const priorityFluctuations = [];
                const conceptMetrics = [];

                if (this.nar) {
                    try {
                        const currentConceptPriorities = this.nar.getConceptPriorities();
                        const currentPriorities = new Map();
                        const currentTaskCounts = new Map();

                        for (const concept of currentConceptPriorities) {
                            const conceptName = concept.term;
                            const currentPriority = concept.priority;
                            const currentTaskCount = concept.totalTasks || 0;

                            currentPriorities.set(conceptName, currentPriority);
                            currentTaskCounts.set(conceptName, currentTaskCount);

                            // Check if this concept's priority has changed significantly
                            const previousPriority = previousPriorities.get(conceptName);
                            if (previousPriority !== undefined && Math.abs(currentPriority - previousPriority) > 0.001) { // Reduced threshold for more sensitivity
                                priorityFluctuations.push({
                                    concept: conceptName,
                                    oldPriority: previousPriority,
                                    newPriority: currentPriority,
                                    priorityChange: currentPriority - previousPriority,
                                    timestamp: Date.now()
                                });
                            }

                            // Track concept metrics for visualization
                            conceptMetrics.push({
                                term: conceptName,
                                priority: currentPriority,
                                activation: concept.activation || 0,
                                useCount: concept.useCount || 0,
                                totalTasks: currentTaskCount,
                                quality: concept.quality || 0
                            });
                        }

                        // Check for task count changes as well
                        for (const [conceptName, taskCount] of currentTaskCounts.entries()) {
                            const previousTaskCount = previousTaskCounts.get(conceptName);
                            if (previousTaskCount !== undefined && previousTaskCount !== taskCount) {
                                priorityFluctuations.push({
                                    concept: conceptName,
                                    oldTaskCount: previousTaskCount,
                                    newTaskCount: taskCount,
                                    changeType: 'taskCount',
                                    timestamp: Date.now()
                                });
                            }
                        }

                        // Update our reference to previous priorities and task counts
                        previousPriorities = currentPriorities;
                        previousTaskCounts = currentTaskCounts;

                    } catch (e) {
                        console.warn('Could not get concepts for priority tracking:', e);
                    }
                }

                // Add metrics to the data
                metrics.priorityFluctuations = priorityFluctuations;
                metrics.conceptMetrics = conceptMetrics;

                // Send metrics to all connected clients
                this.sendDemoMetrics('system', metrics);
            }

            setTimeout(updateMetrics, 500); // Update metrics every 500ms for better visualization
        };

        updateMetrics();
    }
}