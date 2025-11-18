import cytoscape from 'cytoscape';
import WebSocketService from './websocket-service.js';
import StateStore from './state-store.js';
import { init as initReplView } from './repl-view.js';
import { init as initGraphView } from './graph-view.js';
import REPLController from './repl-controller.js';
import GraphController from './graph-controller.js';
import StatusBarView from './status-bar-view.js';
import EventProcessor from './event-processor.js';
import { demos } from './demo.js';
import { SET_CONNECTION_STATUS, SET_LIVE_UPDATE_ENABLED } from './constants/actions.js';
import { Dropdown, Button, FormGroup } from './utils/form-components.js';
import { selectElement, createElement } from './utils/common.js';

// Application initialization
class AppInitializer {
    constructor() {
        this.store = null;
        this.service = null;
        this.eventProcessor = null;
        this.replController = null;
        this.graphController = null;
    }

    async initialize() {
        console.log('SeNARS UI Initialized');

        this.initializeCoreServices();
        await this.setupWebSocketConnection();
        this.initializeComponents();
        this.setupEventHandlers();
        this.setupUIControls();
    }

    initializeCoreServices() {
        this.store = new StateStore();
        this.service = new WebSocketService(null, this.store);
        window.service = this.service; // Expose for verification
        this.eventProcessor = new EventProcessor(this.store);
    }

    async setupWebSocketConnection() {
        try {
            await this.service.connect();
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'error' });
        }
    }

    initializeComponents() {
        this.initializeReplComponent();
        this.initializeGraphComponent();
        this.initializeStatusBarView();
    }

    initializeReplComponent() {
        const replContainer = selectElement('#repl-container');
        if (replContainer) {
            const replView = initReplView(replContainer, () => {});
            this.replController = new REPLController(replView, this.store, this.service);
        } else {
            console.error('REPL container not found');
        }
    }

    initializeGraphComponent() {
        const graphContainer = selectElement('#cy-container');
        if (graphContainer) {
            const graphView = initGraphView(graphContainer, { rendererType: 'batched-cytoscape' });
            this.graphController = new GraphController(graphView, this.store, this.service);
        }
    }

    initializeStatusBarView() {
        new StatusBarView(this.store);
    }

    setupEventHandlers() {
        const eventHandlers = this.createWebSocketEventHandlers();

        for (const [event, handler] of Object.entries(eventHandlers)) {
            this.service.subscribe(event, handler);
        }
    }

    createWebSocketEventHandlers() {
        return {
            'open': () => this.store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'connected' }),
            'close': () => this.store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'disconnected' }),
            'error': (error) => {
                this.store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'error' });
                console.error('WebSocket error:', error);
            },
            'message': (message) => {
                // Process the message with the event processor
                this.eventProcessor.process(message);

                // Handle the message in the REPL controller if it exists
                this.replController?.handleIncomingMessage?.(message);
            }
        };
    }

    setupUIControls() {
        this.setupRefreshButton();
        this.setupLiveUpdatesToggle();
        this.setupDemoControls();
    }

    setupRefreshButton() {
        const refreshBtn = selectElement('#refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.graphController
                ? this.graphController.requestRefresh()
                : console.error('Graph controller not initialized');
        });
    }

    setupLiveUpdatesToggle() {
        const toggleLiveBtn = selectElement('#toggle-live-btn');
        if (toggleLiveBtn) {
            let liveUpdatesEnabled = true;
            toggleLiveBtn.textContent = 'Pause Live Updates';

            toggleLiveBtn.addEventListener('click', () => {
                liveUpdatesEnabled = !liveUpdatesEnabled;
                this.store.dispatch({ type: SET_LIVE_UPDATE_ENABLED, payload: liveUpdatesEnabled });
                toggleLiveBtn.textContent = liveUpdatesEnabled ? 'Pause Live Updates' : 'Resume Live Updates';
            });
        }
    }

    setupDemoControls() {
        const demoContainer = selectElement('#demo-controls') ?? selectElement('.demo-controls');

        if (demoContainer) {
            this.createModernDemoControls(demoContainer);
        } else {
            this.createLegacyDemoControls();
        }
    }

    createModernDemoControls(container) {
        // Create dropdown for demo selection
        const demoDropdown = new Dropdown({
            name: 'demo-select',
            options: Object.keys(demos).map(name => ({ value: name, text: name })),
            className: 'demo-select'
        });

        // Create run demo button
        const runDemoBtn = new Button({
            text: 'Run Demo',
            variant: 'primary',
            className: 'run-demo-btn'
        });

        // Create form group for demo controls
        const demoFormGroup = new FormGroup({
            label: 'Select Demo',
            input: demoDropdown,
            className: 'demo-form-group'
        });

        // Add elements to container
        container.appendChild(demoFormGroup.element);
        container.appendChild(runDemoBtn.element);

        // Add event listener to run demo button
        runDemoBtn.element.addEventListener('click', () => {
            this.runSelectedDemo(demoDropdown.getValue());
        });
    }

    createLegacyDemoControls() {
        const demoSelect = selectElement('#demo-select');
        const demoBtn = selectElement('#run-demo-btn');

        if (demoSelect && demoBtn) {
            // Populate demo selection dropdown
            Object.keys(demos).forEach(name => {
                const option = createElement('option', {
                    value: name,
                    textContent: name
                });
                demoSelect.appendChild(option);
            });

            demoBtn.addEventListener('click', () => {
                this.runSelectedDemo(demoSelect.value);
            });
        }
    }

    runSelectedDemo(selectedDemo) {
        const demoScript = demos[selectedDemo];
        if (!demoScript) return;

        this.service.sendMessage('control/reset', {});

        let i = 0;
        const interval = setInterval(() => {
            if (i < demoScript.length) {
                this.service.sendMessage('narseseInput', { input: demoScript[i] });
                i++;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppInitializer();
    app.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});
