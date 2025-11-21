import WebSocketService from './websocket-service.js';
import StateStore from './state-store.js';
import { init as initReplView } from './repl-view.js';
import { init as initGraphView } from './graph-view.js';
import REPLController from './repl-controller.js';
import GraphController from './graph-controller.js';
import StatusBarView from './status-bar-view.js';
import EventProcessor from './event-processor.js';

console.log('SeNARS UI Initialized');

// Initialize core services
const store = new StateStore();
const service = new WebSocketService();
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
const graphController = graphContainer ?
    new GraphController(initGraphView(graphContainer), store, service) :
    null;

// WebSocket event handlers
const eventHandlers = {
    'open': () => store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' }),
    'close': () => store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' }),
    'error': (error) => {
        store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
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
    store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
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
        store.dispatch({ type: 'SET_LIVE_UPDATE_ENABLED', payload: liveUpdatesEnabled });
        toggleLiveBtn.textContent = liveUpdatesEnabled ? 'Pause Live Updates' : 'Resume Live Updates';
    });
}

// Initialize status bar view
new StatusBarView(store);