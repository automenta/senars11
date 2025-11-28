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
        const eventConfigs = this._getEventConfigurations();
        eventConfigs.forEach(config => this._attachEventHandler(config));
    }

    /**
     * Get event configurations for all UI elements
     */
    _getEventConfigurations() {
        return [
            // Command Input handlers
            { element: 'sendButton', event: 'click', handler: () => this.commandHandlers.handleCommandSubmit() },
            { element: 'commandInput', event: 'keypress', handler: (e) => this.commandHandlers.handleCommandKeyPress(e) },
            { element: 'execQuick', event: 'click', handler: () => this.commandHandlers.handleQuickCommand() },
            { element: 'showHistory', event: 'click', handler: () => this.commandHandlers.showCommandHistory() },

            // Controls & Logs handlers
            { element: 'clearLogs', event: 'click', handler: () => this.controlHandlers.handleClearLogs() },
            { element: 'refreshGraph', event: 'click', handler: () => this.controlHandlers.handleRefresh() },
            { element: 'toggleLive', event: 'click', handler: () => this.controlHandlers.handleToggleLive() },
            { element: 'runDemo', event: 'click', handler: () => this.controlHandlers.handleRunDemo() },
            {
                element: 'showTasksToggle',
                event: 'change',
                handler: (e) => this.controlHandlers.handleTaskVisibility(e.target.checked)
            }
        ];
    }

    /**
     * Attach a single event handler based on configuration
     */
    _attachEventHandler({element, event, handler}) {
        const elementRef = this.uiElements.get(element);
        if (elementRef) {
            elementRef.addEventListener(event, handler);
            this._eventHandlers.set(`${element}-${event}`, {element: elementRef, event, handler});
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
