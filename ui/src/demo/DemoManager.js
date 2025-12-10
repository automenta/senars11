/**
 * DemoManager handles demo sequences and execution via backend integration
 */
export class DemoManager {
    constructor(uiElements, commandProcessor, logger) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.logger = logger;
        this.demos = new Map();
    }

    /**
     * Initialize and request available demos
     */
    initialize() {
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
        // Payload is array of demo objects
        this.demos.clear();
        const select = this.uiElements.get('demoSelect');
        if (!select) return;

        // Clear existing options (keep first default option)
        while (select.options.length > 1) {
            select.remove(1);
        }

        if (Array.isArray(payload)) {
            // Use for...of for better performance
            for (const demo of payload) {
                this.demos.set(demo.id, demo);
                const option = document.createElement('option');
                option.value = demo.id;
                option.textContent = demo.name;
                option.title = demo.description || '';
                select.appendChild(option);
            }

            // Only log if we actually loaded something, to avoid noise on re-connect
            if (payload.length > 0) {
                // Log silently or as debug to avoid spam on refresh
                console.debug(`Loaded ${payload.length} demos`);
            }
        }
    }

    /**
     * Run a specific demo by ID
     */
    runDemo(demoId) {
        if (!demoId) {
            this.logger.log('Please select a demo', 'warning', '⚠️');
            return false;
        }

        this.commandProcessor.executeControlCommand('demoControl', {
            command: 'start',
            demoId: demoId
        });
        this.logger.log(`Requested demo start: ${demoId}`, 'info', '🚀');
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
