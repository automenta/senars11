import { CommandHandlers } from './handlers/CommandHandlers.js';
import { ControlHandlers } from './handlers/ControlHandlers.js';

export class UIEventHandlers {
    constructor(uiElements, commandProcessor, demoManager, graphManager, connectionManager, controlPanel = null) {
        this.uiElements = uiElements;
        this.commandHandlers = new CommandHandlers(uiElements, commandProcessor, controlPanel);
        this.controlHandlers = new ControlHandlers(uiElements, commandProcessor, demoManager, graphManager);
        this.eventHandlers = new Map();
    }

    setupEventListeners() {
        const bind = (id, event, handler) => {
            const el = this.uiElements.get(id);
            if (!el) return;
            el.addEventListener(event, handler);
            this.eventHandlers.set(`${id}-${event}`, { el, event, handler });
        };

        const cmd = this.commandHandlers;
        const ctrl = this.controlHandlers;

        // Command Inputs
        bind('sendButton', 'click', () => cmd.handleCommandSubmit());
        bind('commandInput', 'keydown', (e) => cmd.handleCommandKeyPress(e));
        bind('commandInput', 'input', (e) => cmd.handleCommandInput(e));
        bind('execQuick', 'click', () => cmd.handleQuickCommand());
        bind('showHistory', 'click', () => cmd.showCommandHistory());

        // Controls
        bind('clearLogs', 'click', () => ctrl.handleClearLogs());
        bind('refreshGraph', 'click', () => ctrl.handleRefresh());
        bind('toggleLive', 'click', () => ctrl.handleToggleLive());
        bind('runDemo', 'click', () => ctrl.handleRunDemo());
        bind('btnToggleTrace', 'click', () => ctrl.handleToggleTrace());
        bind('btnToggleContrast', 'click', () => ctrl.handleToggleContrast());
        bind('btnZoomIn', 'click', () => ctrl.handleZoomIn());
        bind('btnZoomOut', 'click', () => ctrl.handleZoomOut());
        bind('btnFit', 'click', () => ctrl.handleFitToScreen());
        bind('showTasksToggle', 'change', (e) => ctrl.handleTaskVisibility(e.target.checked));
    }

    removeEventListeners() {
        this.eventHandlers.forEach(({ el, event, handler }) => el.removeEventListener(event, handler));
        this.eventHandlers.clear();
    }
}
