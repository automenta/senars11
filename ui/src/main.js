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

document.addEventListener('DOMContentLoaded', () => {
    console.log('SeNARS UI Initialized');

    // Initialize core services
    const store = new StateStore();
    const service = new WebSocketService(null, store);
    window.service = service; // Expose for verification
    const eventProcessor = new EventProcessor(store);

    // Initialize REPL components
    let replController = null;
    const replContainer = document.getElementById('repl-container');
    if (replContainer) {
        const replView = initReplView(replContainer, () => {});
        replController = new REPLController(replView, store, service);
    } else {
        console.error('REPL container not found');
    }

    // Initialize graph components
    const graphContainer = document.getElementById('cy-container');
    let graphController = null;
    if (graphContainer) {
        const graphView = initGraphView(graphContainer, { rendererType: 'batched-cytoscape' });
        graphController = new GraphController(graphView, store, service);
    }

    // WebSocket event handlers
    const eventHandlers = {
        'open': () => store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'connected' }),
        'close': () => store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'disconnected' }),
        'error': (error) => {
            store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'error' });
            console.error('WebSocket error:', error);
        },
        'message': (message) => {
            // Process the message with the event processor
            eventProcessor.process(message);

            // Handle the message in the REPL controller if it exists
            if (replController) {
                replController.handleIncomingMessage(message);
            }
        }
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
        service.subscribe(event, handler);
    });

    service.connect().catch(error => {
        console.error('Failed to connect to WebSocket:', error);
        store.dispatch({ type: SET_CONNECTION_STATUS, payload: 'error' });
    });

    // Set up refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn?.addEventListener('click', () => {
        graphController ? graphController.requestRefresh() :
            console.error('Graph controller not initialized');
    });

    // Set up live updates toggle
    const toggleLiveBtn = document.getElementById('toggle-live-btn');
    if (toggleLiveBtn) {
        let liveUpdatesEnabled = true;
        toggleLiveBtn.textContent = 'Pause Live Updates';

        toggleLiveBtn.addEventListener('click', () => {
            liveUpdatesEnabled = !liveUpdatesEnabled;
            store.dispatch({ type: SET_LIVE_UPDATE_ENABLED, payload: liveUpdatesEnabled });
            toggleLiveBtn.textContent = liveUpdatesEnabled ? 'Pause Live Updates' : 'Resume Live Updates';
        });
    }

    // Initialize status bar view
    new StatusBarView(store);

    // Set up demo controls
    const demoSelect = document.getElementById('demo-select');
    const demoBtn = document.getElementById('run-demo-btn');

    if (demoSelect && demoBtn) {
        Object.keys(demos).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            demoSelect.appendChild(option);
        });

        demoBtn.addEventListener('click', () => {
            const selectedDemo = demoSelect.value;
            const demoScript = demos[selectedDemo];
            if (!demoScript) return;

            service.sendMessage('control/reset', {});

            let i = 0;
            const interval = setInterval(() => {
                if (i < demoScript.length) {
                    service.sendMessage('narseseInput', { input: demoScript[i] });
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 1000);
        });
    }
});
