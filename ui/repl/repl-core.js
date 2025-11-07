/**
 * REPL Core Functionality for SeNARS
 * Handles WebSocket communication and REPL interactions
 */
import WebSocketClient from '../shared/ws.js';
import {
  addOutputLine,
  addStructuredOutputLine,
  createCellGroup,
  getCurrentCellGroup
} from '../src/utils/cellRenderer.js';

class REPLCore {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.sessionManager = window.sessionManager;
        this.websocket = null;

        const session = this.getSession(sessionId);
        if (!session) {
            console.error(`Session ${sessionId} not found`);
            return;
        }

        this.inputElement = session.input;
        this.outputElement = session.output;
        this.statusElement = session.status;
        this.historyPosition = -1;
        this.lastUpdate = 0;

        this.sessionManager?.registerReplCore?.(this.sessionId, this);
        this.initWebSocket();
        this.createReasonerControls();
        this.bindEvents();
    }

    createReasonerControls() {
        const session = this.sessionManager?.getSession(this.sessionId);
        if (!session?.element || !session?.input) return;

        const controlsContainer = this.createControlsContainer();
        const inputParent = session.input.parentElement;

        inputParent ?
            session.element.insertBefore(controlsContainer, inputParent) :
            session.element.appendChild(controlsContainer);
    }

    createControlsContainer() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'reasoner-controls';

        const buttons = [
            {className: 'control-btn start-btn', text: 'Start', command: 'start'},
            {className: 'control-btn stop-btn', text: 'Stop', command: 'stop'},
            {className: 'control-btn step-btn', text: 'Step', command: 'step'}
        ];

        buttons
            .map(({className, text, command}) => this.createControlButton(className, text, command))
            .forEach(button => controlsContainer.appendChild(button));

        return controlsContainer;
    }

    createControlButton(className, text, command) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        button.setAttribute('aria-label', `${text} for session ${this.sessionId}`);
        button.addEventListener('click', () => this.sendControlCommand(command));
        return button;
    }

    sendControlCommand(command) {
        this.websocket?.send({
            sessionId: this.sessionId,
            type: `control/${command}`,
            payload: {}
        });
    }

    initWebSocket() {
        // Initialize WebSocket client with base URL, client will handle session parameter
        this.websocket = new WebSocketClient('ws://localhost:8080/ws', this.sessionId);

        this.websocket.onopen = () => {
            this.setStatus('connected');
            console.log(`WebSocket connected for session ${this.sessionId}`);
            this.sessionManager?.updateSessionStatus?.(this.sessionId, 'connected');
        };

        this.websocket.onclose = () => {
            this.setStatus('disconnected');
            console.log(`WebSocket disconnected for session ${this.sessionId}`);
            this.sessionManager?.updateSessionStatus?.(this.sessionId, 'disconnected');
        };

        this.websocket.onerror = (error) => {
            this.setStatus('error');
            console.error(`WebSocket error for session ${this.sessionId}:`, error);
            this.sessionManager?.updateSessionStatus?.(this.sessionId, 'error');
        };

        this.websocket.onmessage = (event) => {
            try {
                this.handleMessage(event);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
                this.addOutputLine({type: 'error', text: `Message processing error: ${error.message}`});
            }
        };
    }

    bindEvents() {
        this.handleInputKeydown = (event) => {
            switch (event.key) {
                case 'ArrowUp':
                    this.navigateHistory(-1);
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    this.navigateHistory(1);
                    event.preventDefault();
                    break;
                case 'Enter':
                    if (!event.shiftKey) {
                        event.preventDefault();
                        this.submitInput();
                    }
                    break;
            }
        };
        this.inputElement.addEventListener('keydown', this.handleInputKeydown);

        const submitButton = this.inputElement.parentElement?.querySelector('.submit-btn');
        submitButton?.addEventListener('click', () => this.submitInput());
    }

    submitInput() {
        const inputText = this.inputElement.value.trim();
        if (!inputText) return;

        if (inputText.startsWith('/')) {
            this.handleCommand(inputText);
            return;
        }

        this.inputElement.value = '';
        this.addOutputLine({type: 'input', text: inputText});
        this.sessionManager.addCellToHistory(this.sessionId, 'input', inputText);

        this.websocket.send({
            sessionId: this.sessionId,
            type: 'reason/step',
            payload: {text: inputText}
        });
    }

    handleCommand(command) {
        const [cmd, ...args] = command.substring(1).split(' ');
        this.inputElement.value = '';

        const commandHandler = this.getCommandHandler(cmd);
        commandHandler ?
            commandHandler() :
            this.addOutputLine({
                type: 'error',
                text: `Unknown command: ${cmd}. Available commands: /start, /stop, /step, /agents`
            });
    }

    getCommandHandler(cmd) {
        const commandMap = {
            'start': () => this.sendControlCommand('start'),
            'stop': () => this.sendControlCommand('stop'),
            'step': () => this.sendControlCommand('step'),
            'agents': () => window.sessionManager?.createAgentHUD?.(),
            'hide-agents': () => window.sessionManager?.hideAgentHUD?.()
        };

        return commandMap[cmd] ?? null;
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);

            // Only check sessionId if it's present in the message (some system messages may not have it)
            if (message.sessionId && message.sessionId !== this.sessionId) {
                return;
            }

            this.routeMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.log('Raw message:', event.data);
        }
    }

    routeMessage(message) {
        const handler = this.getMessageHandler(message.type);
        if (handler) {
            try {
                handler(message.payload || message.data);
            } catch (error) {
                console.error('Error in message handler for type:', message.type, error);
            }
        } else {
            console.warn('Unknown message type:', message.type, 'with data:', message);
            // Add a fallback for system events that might not have a specific handler
            if (message.type === 'event') {
                this.handleSystemEvent(message);
            }
        }
    }

    getMessageHandler(type) {
        const handlers = {
            'output': (payload) => this.handleOutput(payload),
            'status': (payload) => this.handleStatus(payload),
            'reason/output': (payload) => this.handleReasonOutput(payload),
            'task.added': (payload) => this.handleTaskAdded(payload),
            'task.processed': (payload) => this.handleTaskProcessed(payload),
            'cycle.complete': (payload) => this.handleCycleComplete(payload)
        };

        return handlers[type] ?? null;
    }

    // Handler for system events
    handleSystemEvent(message) {
        // Handle various event types that come through the 'event' message type
        const eventType = message.eventType;
        const data = message.data;

        switch (eventType) {
            case 'task.added':
                this.handleTaskAdded(data?.data?.task || data?.task);
                break;
            case 'task.processed':
                this.handleTaskProcessed(data);
                break;
            case 'cycle.complete':
                this.handleCycleComplete(data);
                break;
            case 'system.started':
            case 'system.stopped':
                // These might be status updates
                this.handleStatus(data);
                break;
            default:
                console.log('Unhandled system event:', eventType);
                break;
        }
    }

    handleTaskAdded(taskData) {
        if (taskData && taskData.term) {
            // Format the task for display
            let outputText = taskData.term._name || taskData.term || 'Unknown task';
            if (taskData.truth) {
                outputText += ` %${taskData.truth.frequency || 0.0};${taskData.truth.confidence || 0.0}%`;
            }

            this.addOutputLine({
                type: 'task.added',
                text: outputText,
                task: taskData
            });
        }
    }

    handleTaskProcessed(taskData) {
        if (taskData) {
            this.addOutputLine({
                type: 'task.processed',
                text: 'Task processed',
                task: taskData
            });
        }
    }

    handleCycleComplete(cycleData) {
        this.addOutputLine({
            type: 'cycle',
            text: 'Reasoning cycle completed',
            data: cycleData
        });
    }

    shouldThrottle() {
        const limits = this.sessionManager?.sessionResourceLimits?.[this.sessionId];
        if (!limits) return false;

        const now = Date.now();
        const shouldUpdate = now - this.lastUpdate >= limits.throttleRate;

        return shouldUpdate ? (this.lastUpdate = now, false) : true;
    }

    handleOutput(payload) {
        if (!this.shouldThrottle()) this.handleGenericOutput(payload);
    }

    handleReasonOutput(payload) {
        if (!this.shouldThrottle()) this.handleGenericOutput(payload);
    }

    handleGenericOutput(payload) {
        this.processOutputLines(payload?.lines ?? []);
    }

    processOutputLines(lines) {
        if (!Array.isArray(lines)) return;

        lines.length > 10 ?
            this.batchProcessOutputLines(lines) :
            lines.forEach(line => {
                this.addStructuredOutputLine(line);
                this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
            });
    }

    batchProcessOutputLines(lines) {
        const fragment = document.createDocumentFragment();
        lines.forEach(line => {
            this.addStructuredOutputLine(line);
            this.sessionManager.addCellToHistory(this.sessionId, 'output', line);
        });
        this.outputElement.appendChild(fragment);
    }

    handleStatus(payload) {
        if (this.shouldThrottle()) return;
        console.log(`Session ${this.sessionId} status:`, payload);

        const sessionManager = window.sessionManager;
        sessionManager?.updateAgentCard?.(this.sessionId, {
            cycles: payload?.cycles ?? 0,
            memory: payload?.memory ?? '0MB',
            state: payload?.state ?? 'idle',
            status: this.getStatusFromPayload(payload)
        });
    }

    getStatusFromPayload(payload) {
        return {
            'running': 'processing',
            'stopped': 'disconnected',
            'error': 'disconnected'
        }[payload?.state] ?? 'connected';
    }

    addOutputLine(line) {
        addOutputLine(this.outputElement, this.sessionId, line);
    }

    navigateHistory(direction) {
        if (this.historyPosition === -1) {
            this.historyPosition = this.sessionManager.sessionHistories[this.sessionId]?.length ?? 0;
        }

        const newPosition = this.historyPosition + direction;
        const history = this.sessionManager.sessionHistories[this.sessionId] || [];

        if (newPosition >= 0 && newPosition <= history.length) {
            this.historyPosition = newPosition;

            if (this.historyPosition === history.length) {
                this.inputElement.value = '';
            } else {
                const cell = history[this.historyPosition];
                if (cell?.type === 'input') {
                    this.inputElement.value = cell.content;
                }
            }
        }
    }

    addStructuredOutputLine(line) {
        addStructuredOutputLine(this.outputElement, line);
    }

    setStatus(status) {
        this.statusElement.setAttribute('data-status', status);

        const statusLabels = {
            'connected': 'Connected',
            'disconnected': 'Disconnected',
            'error': 'Error',
            'processing': 'Processing'
        };

        this.statusElement.setAttribute('aria-label', `${statusLabels[status] || status} - Session ${this.sessionId}`);
        this.sessionManager?.updateSessionStatus?.(this.sessionId, status);
        this.statusElement.style.color = this.getStatusColor(status);
    }

    getStatusColor(status) {
        return {
            'connected': 'var(--status-connected)',
            'disconnected': 'var(--status-disconnected)',
            'error': 'var(--status-error)',
            'processing': 'var(--status-processing)'
        }[status] ?? 'var(--text-secondary)';
    }

    getCurrentCellGroup() {
        return getCurrentCellGroup(this.outputElement);
    }

    createCellGroup() {
        const cellGroup = createCellGroup();
        this.outputElement.appendChild(cellGroup);
        return cellGroup;
    }

    close() {
        this.websocket?.close();
        this.inputElement?.removeEventListener('keydown', this.handleInputKeydown);
    }

    getSession(sessionId) {
        return this.sessionManager?.getSession(sessionId) ?? null;
    }
}

// Initialize REPL cores for existing sessions
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.sessionManager) {
            new REPLCore('main');

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-session-id')) {
                            const sessionId = node.getAttribute('data-session-id');
                            const replKey = `repl-${sessionId}`;
                            if (!window.sessionManager[replKey]) {
                                window.sessionManager[replKey] = new REPLCore(sessionId);
                            }
                        }
                    });
                });
            });

            const container = document.getElementById('session-container');
            if (container) {
                observer.observe(container, {childList: true});
            }
        }
    }, 100);
});

export default REPLCore;