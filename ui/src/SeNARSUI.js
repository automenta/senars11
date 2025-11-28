import {UIElements} from './ui/UIElements.js';
import {WebSocketManager} from './connection/WebSocketManager.js';
import {GraphManager} from './visualization/GraphManager.js';
import {Logger} from './logging/Logger.js';
import {CommandProcessor} from './command/CommandProcessor.js';
import {DemoManager} from './demo/DemoManager.js';
import {UIEventHandlers} from './ui/UIEventHandlers.js';
import {MessageHandler} from './message-handlers/MessageHandler.js';
import {capitalizeFirst} from './utils/Helpers.js';
import {ControlPanel} from './ui/ControlPanel.js';

/**
 * Main SeNARS UI Application class - orchestrator that combines all modules
 */
export class SeNARSUI {
    constructor() {
        this.uiElements = new UIElements();

        // Initialize core modules with dependency injection
        this.logger = new Logger();
        this.webSocketManager = new WebSocketManager();
        this.graphManager = new GraphManager(this.uiElements.getAll());
        this.commandProcessor = new CommandProcessor(this.webSocketManager, this.logger, this.graphManager);
        this.controlPanel = new ControlPanel(this.uiElements, this.commandProcessor, this.logger);
        this.demoManager = new DemoManager(this.uiElements, this.commandProcessor, this.logger);
        this.uiEventHandlers = new UIEventHandlers(
            this.uiElements,
            this.commandProcessor,
            this.demoManager,
            this.graphManager,
            this.webSocketManager,
            this.controlPanel
        );
        this.messageHandler = new MessageHandler(this.graphManager);

        // Set logger UI elements
        this.logger.setUIElements(this.uiElements.getAll());

        // Initialize the application
        this.initialize();
    }

    /**
     * Initialize the application
     */
    initialize() {
        this.graphManager.initialize();
        this.uiEventHandlers.setupEventListeners();
        this._setupWebSocketHandlers();
        this.webSocketManager.connect();
        this._setupConnectionStatusListener();
        this.logger.addLogEntry('SeNARS UI2 - Ready', 'info', '🚀');
    }

    /**
     * Setup WebSocket message handlers
     */
    _setupWebSocketHandlers() {
        // Subscribe to general messages
        this.webSocketManager.subscribe('*', this._handleMessage.bind(this));
        // Subscribe to connection status changes
        this.webSocketManager.subscribe('connection.status', this._updateStatus.bind(this));
    }

    /**
     * Setup connection status listener for demo initialization
     */
    _setupConnectionStatusListener() {
        this.webSocketManager.subscribe('connection.status', (status) => {
            if (status === 'connected') {
                this.demoManager.initialize();
            }
        });
    }

    /**
     * Handle incoming messages
     */
    _handleMessage(message) {
        try {
            // Early return if message is null/undefined
            if (!message) return;

            // Process message components sequentially
            this._updateMessageCount();
            this._updateSystemState(message);

            // Handle specialized messages that shouldn't go through the generic logger
            if (this._handleSpecializedMessages(message)) return;

            // Process and log message
            const {content, type, icon} = this.messageHandler.processMessage(message);
            this._logAndVisualizeMessage(content, type, icon, message);
        } catch (error) {
            this._handleMessageError(message, error);
        }
    }

    /**
     * Log content and update graph visualization
     */
    _logAndVisualizeMessage(content, type, icon, message) {
        this.logger.addLogEntry(content, type, icon);
        this.graphManager.updateFromMessage(message);
    }

    /**
     * Handle message processing errors
     */
    _handleMessageError(message, error) {
        const errorMsg = `Error handling message of type ${message?.type ?? 'unknown'}: ${error.message}`;
        this.logger.log(errorMsg, 'error', '❌');

        // Only log to console in development mode to avoid spam
        if (process?.env?.NODE_ENV !== 'production') {
            console.error('Full error details:', error, message);
        }
    }

    /**
     * Handle specialized messages (demos, agent results)
     * Returns true if message was handled and should stop processing
     */
    _handleSpecializedMessages(message) {
        const specializedMessageHandlers = {
            'demoList': (payload) => this.demoManager.handleDemoList(payload),
            'demoStep': (payload) => this.demoManager.handleDemoStep(payload),
            'demoState': (payload) => this.demoManager.handleDemoState(payload),
            'demoMetrics': (payload) => this._handleDemoMetrics(payload),
            'agent/result': (payload) => this._handleAgentResult(payload)
        };

        const handler = specializedMessageHandlers[message.type];
        return handler ? handler(message.payload) : false;
    }

    /**
     * Handle demo metrics message
     */
    _handleDemoMetrics(payload) {
        // Update cycle count from metrics
        const metrics = payload?.metrics;
        if (metrics?.cyclesCompleted !== undefined) {
            this.controlPanel.updateCycleCount(metrics.cyclesCompleted);
        }
        return true; // Suppress from logs
    }

    /**
     * Handle agent result message
     */
    _handleAgentResult(payload) {
        const result = typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result);
        this.logger.addLogEntry(result, 'info', '🤖');
        return false; // Don't suppress from logs
    }

    /**
     * Update system state based on message
     */
    _updateSystemState(message) {
        const cycleUpdateMap = {
            'nar.cycle.step': (payload) => payload?.cycle,
            'narInstance': (payload) => payload?.cycleCount
        };

        const getCycleValue = cycleUpdateMap[message.type];
        if (!getCycleValue) return;

        const cycleValue = getCycleValue(message.payload);
        if (cycleValue !== undefined) {
            this.controlPanel.updateCycleCount(cycleValue);
        }
    }

    /**
     * Update the message count display
     */
    _updateMessageCount() {
        const element = this.uiElements.get('messageCount');
        if (element) {
            const currentCount = parseInt(element.textContent) ?? 0;
            element.textContent = currentCount + 1;
        }
    }

    /**
     * Update connection status display
     */
    _updateStatus(status) {
        const {connectionStatus, statusIndicator} = this.uiElements.getAll();

        connectionStatus?.textContent = capitalizeFirst(status);
        statusIndicator?.className = `status-indicator status-${status}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => new SeNARSUI());