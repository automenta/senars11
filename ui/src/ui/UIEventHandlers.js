import {CommandHandlers} from './handlers/CommandHandlers.js';
import {ControlHandlers} from './handlers/ControlHandlers.js';

/**
 * UIEventHandlers module to handle all UI events and connect UI to business logic
 * Now delegates specific handling to sub-handler classes for better organization.
 */
export class UIEventHandlers {
    constructor(uiElements, commandProcessor, demoManager, graphManager, webSocketManager, controlPanel = null) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;

        // Initialize specific handlers
        this.commandHandlers = new CommandHandlers(uiElements, commandProcessor, controlPanel);
        this.controlHandlers = new ControlHandlers(uiElements, commandProcessor, demoManager, graphManager);

        this._eventHandlers = new Map();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const eventConfig = this._getEventConfigurations();
        eventConfig.forEach(config => this._attachEventHandler(config));
    }

    /**
     * Get event configurations for all UI elements
     */
    _getEventConfigurations() {
        // Define handler mapping to reduce duplication
        const handlerMap = {
            // Command Input handlers
            'sendButton': {event: 'click', handler: () => this.commandHandlers.handleCommandSubmit()},
            'commandInput': {event: 'keydown', handler: (e) => this.commandHandlers.handleCommandKeyPress(e)},
            'commandInputChange': {
                element: 'commandInput',
                event: 'input',
                handler: (e) => this.commandHandlers.handleCommandInput(e)
            },
            'execQuick': {event: 'click', handler: () => this.commandHandlers.handleQuickCommand()},
            'showHistory': {event: 'click', handler: () => this.commandHandlers.showCommandHistory()},

            // Controls & Logs handlers
            'clearLogs': {event: 'click', handler: () => this.controlHandlers.handleClearLogs()},
            'refreshGraph': {event: 'click', handler: () => this.controlHandlers.handleRefresh()},
            'toggleLive': {event: 'click', handler: () => this.controlHandlers.handleToggleLive()},
            'runDemo': {event: 'click', handler: () => this.controlHandlers.handleRunDemo()},
            'btnToggleTrace': {event: 'click', handler: () => this.controlHandlers.handleToggleTrace()},
            'btnToggleContrast': {event: 'click', handler: () => this.controlHandlers.handleToggleContrast()},
            'btnZoomIn': {event: 'click', handler: () => this.controlHandlers.handleZoomIn()},
            'btnZoomOut': {event: 'click', handler: () => this.controlHandlers.handleZoomOut()},
            'btnFit': {event: 'click', handler: () => this.controlHandlers.handleFitToScreen()},
            'showTasksToggle': {
                event: 'change',
                handler: (e) => this.controlHandlers.handleTaskVisibility(e.target.checked)
            }
        };

        // Transform the handlerMap into the required format
        return Object.entries(handlerMap).map(([key, config]) => ({
            element: config.element || key,
            event: config.event,
            handler: config.handler
        }));
    }

    /**
     * Attach a single event handler based on configuration
     */
    _attachEventHandler({element, event, handler}) {
        const elementRef = this.uiElements.get(element);
        if (elementRef) {
            elementRef.addEventListener(event, handler);
            this._eventHandlers.set(`${element}-${event}`, {element: elementRef, event, handler});
        } else {
            // Optional: log warning only in debug mode to reduce noise
            // this.commandProcessor.logger.log(`UI element not found: ${element}`, 'warning', '⚠️');
        }
    }

    /**
     * Remove all attached event handlers
     */
    removeEventListeners() {
        for (const [key, {element: elementRef, event, handler}] of this._eventHandlers) {
            elementRef.removeEventListener(event, handler);
        }
        this._eventHandlers.clear();
    }
}
