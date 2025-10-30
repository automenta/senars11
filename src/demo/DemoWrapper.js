import {WebSocketMonitor} from '../server/WebSocketMonitor.js';
import {NAR} from '../nar/NAR.js';

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
        // Register all example demos
        this.registerDemo('basicUsage', {
            name: 'Basic Usage Demo',
            description: 'Demonstrates basic NARS operations',
            handler: this.runBasicUsageDemo.bind(this),
            parameters: {
                stepDelay: { type: 'number', defaultValue: 1000, description: 'Delay between steps in ms' }
            }
        });
        
        this.registerDemo('syllogism', {
            name: 'Syllogistic Reasoning Demo',
            description: 'Demonstrates syllogistic reasoning',
            handler: this.runSyllogismDemo.bind(this),
            parameters: {
                stepDelay: { type: 'number', defaultValue: 1500, description: 'Delay between steps in ms' }
            }
        });
        
        this.registerDemo('inductive', {
            name: 'Inductive Reasoning Demo',
            description: 'Demonstrates inductive reasoning',
            handler: this.runInductiveDemo.bind(this),
            parameters: {
                stepDelay: { type: 'number', defaultValue: 2000, description: 'Delay between steps in ms' }
            }
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
            if (!data || !data.payload) {
                console.error('Invalid demo control message: missing payload');
                return;
            }
            
            const { command, demoId, parameters } = data.payload;
            
            // Validate required fields
            if (!command || typeof command !== 'string') {
                console.error('Invalid demo control message: missing or invalid command');
                return;
            }
            
            if (!demoId || typeof demoId !== 'string') {
                console.error('Invalid demo control message: missing or invalid demoId');
                return;
            }
            
            // Validate parameters if present
            if (parameters && typeof parameters !== 'object') {
                console.error('Invalid demo control message: parameters must be an object');
                return;
            }
            
            switch (command) {
                case 'start':
                    await this.startDemo(demoId, parameters || {});
                    break;
                case 'stop':
                    await this.stopDemo(demoId);
                    break;
                case 'pause':
                    await this.pauseDemo(demoId);
                    break;
                case 'resume':
                    await this.resumeDemo(demoId);
                    break;
                case 'step':
                    await this.stepDemo(demoId, parameters || {});
                    break;
                case 'configure':
                    await this.configureDemo(demoId, parameters || {});
                    break;
                default:
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
        
        if (demoId) {
            this.demoStates[demoId] = {
                state: 'stopped',
                demoId
            };
            
            await this.sendDemoState(demoId, {
                state: 'stopped'
            });
        } else if (this.currentDemoId) {
            this.demoStates[this.currentDemoId] = {
                state: 'stopped',
                demoId: this.currentDemoId
            };
            
            await this.sendDemoState(this.currentDemoId, {
                state: 'stopped'
            });
        }
    }
    
    async pauseDemo(demoId) {
        if (demoId) {
            this.demoStates[demoId] = {
                ...this.demoStates[demoId],
                state: 'paused'
            };
        }
        
        this.isPaused = true;
        
        await this.sendDemoState(demoId, {
            state: 'paused'
        });
    }
    
    async resumeDemo(demoId) {
        if (demoId) {
            this.demoStates[demoId] = {
                ...this.demoStates[demoId],
                state: 'running'
            };
        }
        
        this.isPaused = false;
        
        await this.sendDemoState(demoId, {
            state: 'running'
        });
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
        const stepDelay = params.stepDelay || 1000;
        
        this.currentStep = 1;
        await this.sendDemoStep('basicUsage', this.currentStep, 'Initializing basic usage demo');
        await this.waitIfNotPaused(stepDelay);
        
        // Example NARS operations using narsese input
        await this.sendDemoStep('basicUsage', ++this.currentStep, 'Adding belief: <cat --> animal>.');
        try {
            await this.nar.input('cat --> animal.');
        } catch (error) {
            console.error('Error adding cat belief:', error);
            await this.sendDemoStep('basicUsage', this.currentStep, `Error adding cat belief: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('basicUsage', ++this.currentStep, 'Adding belief: <dog --> animal>.');
        try {
            await this.nar.input('dog --> animal.');
        } catch (error) {
            console.error('Error adding dog belief:', error);
            await this.sendDemoStep('basicUsage', this.currentStep, `Error adding dog belief: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('basicUsage', ++this.currentStep, 'Asking question: <cat --> animal>?');
        try {
            await this.nar.input('cat --> animal?');
        } catch (error) {
            console.error('Error asking cat question:', error);
            await this.sendDemoStep('basicUsage', this.currentStep, `Error asking cat question: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('basicUsage', ++this.currentStep, 'Adding goal: <cat --> pet>!');
        try {
            await this.nar.input('cat --> pet!');
        } catch (error) {
            console.error('Error adding cat goal:', error);
            await this.sendDemoStep('basicUsage', this.currentStep, `Error adding cat goal: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('basicUsage', ++this.currentStep, 'Demo completed');
    }
    
    async runSyllogismDemo(params = {}) {
        const stepDelay = params.stepDelay || 1500;
        
        this.currentStep = 1;
        await this.sendDemoStep('syllogism', this.currentStep, 'Initializing syllogistic reasoning demo');
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('syllogism', ++this.currentStep, 'Adding premise: <bird --> animal>.');
        try {
            await this.nar.input('bird --> animal.');
        } catch (error) {
            console.error('Error adding bird premise:', error);
            await this.sendDemoStep('syllogism', this.currentStep, `Error adding bird premise: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('syllogism', ++this.currentStep, 'Adding premise: <robin --> bird>.');
        try {
            await this.nar.input('robin --> bird.');
        } catch (error) {
            console.error('Error adding robin premise:', error);
            await this.sendDemoStep('syllogism', this.currentStep, `Error adding robin premise: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('syllogism', ++this.currentStep, 'Deriving conclusion: <robin --> animal>');
        // The system should derive this automatically
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('syllogism', ++this.currentStep, 'Asking: <robin --> animal>?');
        try {
            await this.nar.input('robin --> animal?');
        } catch (error) {
            console.error('Error asking robin question:', error);
            await this.sendDemoStep('syllogism', this.currentStep, `Error asking robin question: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('syllogism', ++this.currentStep, 'Syllogistic reasoning demo completed');
    }
    
    async runInductiveDemo(params = {}) {
        const stepDelay = params.stepDelay || 2000;
        
        this.currentStep = 1;
        await this.sendDemoStep('inductive', this.currentStep, 'Initializing inductive reasoning demo');
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('inductive', ++this.currentStep, 'Adding observations: <swan1 --> white>.');
        try {
            await this.nar.input('swan1 --> white.');
        } catch (error) {
            console.error('Error adding swan1 observation:', error);
            await this.sendDemoStep('inductive', this.currentStep, `Error adding swan1 observation: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('inductive', ++this.currentStep, 'Adding observations: <swan2 --> white>.');
        try {
            await this.nar.input('swan2 --> white.');
        } catch (error) {
            console.error('Error adding swan2 observation:', error);
            await this.sendDemoStep('inductive', this.currentStep, `Error adding swan2 observation: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('inductive', ++this.currentStep, 'Adding observations: <swan3 --> white>.');
        try {
            await this.nar.input('swan3 --> white.');
        } catch (error) {
            console.error('Error adding swan3 observation:', error);
            await this.sendDemoStep('inductive', this.currentStep, `Error adding swan3 observation: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('inductive', ++this.currentStep, 'Inductive inference: <swan --> white>?');
        try {
            await this.nar.input('swan --> white?');
        } catch (error) {
            console.error('Error asking swan question:', error);
            await this.sendDemoStep('inductive', this.currentStep, `Error asking swan question: ${error.message}`);
        }
        await this.waitIfNotPaused(stepDelay);
        
        await this.sendDemoStep('inductive', ++this.currentStep, 'Inductive reasoning demo completed');
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