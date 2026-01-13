/**
 * DemoManager handles demo sequences and execution via backend integration
 */
export class DemoManager {
    constructor(uiElements, commandProcessor, logger) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.logger = logger;
        this.demos = new Map();

        // Define static demos (Universal Demos)
        this.STATIC_DEMOS = [
            {
                id: 'static-adaptive-reasoning',
                name: 'Adaptive Reasoning (Static)',
                description: 'Demonstrates adaptation to new evidence (client-side execution)',
                path: 'examples/metta/demos/adaptive_reasoning.metta'
            },
            {
                id: 'static-maze-solver',
                name: 'Maze Solver (Static)',
                description: 'Pathfinding in a grid (client-side execution)',
                path: 'examples/metta/demos/maze_solver.metta'
            },
            {
                id: 'static-truth-chain',
                name: 'Truth Chain (Static)',
                description: 'Multi-step deduction (client-side execution)',
                path: 'examples/metta/demos/truth_chain.metta'
            }
        ];
    }

    /**
     * Initialize and request available demos
     */
    initialize() {
        // Load static demos first
        this.renderDemoList([]);

        // Request demo list from backend
        this.requestDemoList();
    }

    /**
     * Request the list of demos from the backend
     */
    requestDemoList() {
        this.commandProcessor.executeControlCommand('demoControl', {
            command: 'list',
            demoId: 'system' // Dummy ID required by validator
        });
    }

    /**
     * Handle received demo list
     */
    handleDemoList(payload) {
        this.renderDemoList(payload);
    }

    /**
     * Render the demo list (combining static and backend demos)
     */
    renderDemoList(backendDemos = []) {
        this.demos.clear();
        const select = this.uiElements.get('demoSelect');
        if (!select) return;

        // Clear existing options (keep first default option)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // 1. Add Backend Demos
        if (Array.isArray(backendDemos) && backendDemos.length > 0) {
            const group = document.createElement('optgroup');
            group.label = 'Backend Demos';
            for (const demo of backendDemos) {
                this.demos.set(demo.id, demo);
                const option = document.createElement('option');
                option.value = demo.id;
                option.textContent = demo.name;
                option.title = demo.description || '';
                group.appendChild(option);
            }
            select.appendChild(group);
        }

        // 2. Add Static Demos
        if (this.STATIC_DEMOS.length > 0) {
            const group = document.createElement('optgroup');
            group.label = 'Static Demos (Offline)';
            for (const demo of this.STATIC_DEMOS) {
                this.demos.set(demo.id, demo);
                const option = document.createElement('option');
                option.value = demo.id;
                option.textContent = demo.name;
                option.title = demo.description || '';
                group.appendChild(option);
            }
            select.appendChild(group);
        }

        // Log if backend demos were loaded
        if (Array.isArray(backendDemos) && backendDemos.length > 0) {
            console.debug(`Loaded ${backendDemos.length} backend demos`);
        }
    }

    /**
     * Run a specific demo by ID
     */
    async runDemo(demoId) {
        if (!demoId) {
            this.logger.log('Please select a demo', 'warning', '⚠️');
            return false;
        }

        const demo = this.demos.get(demoId);

        // Check if it's a static demo
        if (demo && demo.path) {
            return this.runStaticDemo(demo);
        }

        // Otherwise assume backend demo
        this.commandProcessor.executeControlCommand('demoControl', {
            command: 'start',
            demoId: demoId
        });
        this.logger.log(`Requested demo start: ${demoId}`, 'info', '🚀');
        return true;
    }

    /**
     * Run a static demo by fetching and executing it line-by-line
     */
    async runStaticDemo(demo) {
        this.logger.log(`Starting static demo: ${demo.name}`, 'info', '🚀');

        try {
            const response = await fetch(`/${demo.path}`);
            if (!response.ok) {
                throw new Error(`Failed to load demo file: ${response.statusText}`);
            }

            const text = await response.text();
            const lines = text.split('\n');

            let delay = 0;
            const stepDelay = 1000; // ms between steps

            for (let line of lines) {
                line = line.trim();
                if (!line || line.startsWith(';')) continue; // Skip empty lines and comments

                // Simple simulation of delay
                setTimeout(() => {
                    this.logger.log(`Executing: ${line}`, 'info', '▶️');
                    // Treat as user input
                    this.commandProcessor.processCommand(line);
                }, delay);

                delay += stepDelay;
            }

            setTimeout(() => {
                this.logger.log(`Demo ${demo.name} finished queuing commands.`, 'success', '🏁');
            }, delay);

        } catch (error) {
            this.logger.log(`Error running static demo: ${error.message}`, 'error', '❌');
        }

        return true;
    }

    /**
     * Handle demo step updates
     */
    handleDemoStep(payload) {
        // {demoId, step, description, data}
        if (payload && payload.description) {
            this.logger.log(`Demo Step ${payload.step || '?'}: ${payload.description}`, 'info', '👣');
        }
    }

    /**
     * Handle demo state updates
     */
    handleDemoState(payload) {
        if (!payload) return;

        // Use a mapping approach for better maintainability
        const stateHandlers = {
            'completed': () => this.logger.log('Demo completed successfully', 'success', '🏁'),
            'error': () => this.logger.log(`Demo error: ${payload.error || 'Unknown error'}`, 'error', '❌'),
            'running': () => this.logger.log('Demo started...', 'info', '▶️'),
            'stopped': () => this.logger.log('Demo stopped', 'warning', '⏹️')
        };

        const handler = stateHandlers[payload.state];
        if (handler) {
            handler();
        }
    }
}
