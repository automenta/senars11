import {UIElements} from './ui/UIElements.js';
import {WebSocketManager} from './connection/WebSocketManager.js';
import {GraphManager} from './visualization/GraphManager.js';
import {Logger} from './logging/Logger.js';
import {CommandProcessor} from './command/CommandProcessor.js';
import {DemoManager} from './demo/DemoManager.js';
import {UIEventHandlers} from './ui/UIEventHandlers.js';
import {MessageHandler} from '@senars/agent';
import {capitalizeFirst} from './utils/Helpers.js';
import {ControlPanel} from './ui/ControlPanel.js';
import {SystemMetricsPanel} from './components/SystemMetricsPanel.js';
import {ActivityLogPanel} from './components/ActivityLogPanel.js';
import {LMActivityIndicator} from './components/LMActivityIndicator.js';

export class SeNARSUI {
    constructor() {
        this.uiElements = new UIElements();
        this.logger = new Logger();
        this.webSocketManager = new WebSocketManager();
        this.commandProcessor = new CommandProcessor(this.webSocketManager, this.logger);

        this.graphManager = new GraphManager(this.uiElements.getAll(), {
            onNodeAction: (action, data) => this._handleNodeAction(action, data),
            commandProcessor: null
        });
        this.graphManager.callbacks.commandProcessor = this.commandProcessor;
        this.commandProcessor.graphManager = this.graphManager;

        this.controlPanel = new ControlPanel(this.uiElements, this.commandProcessor, this.logger);
        this.demoManager = new DemoManager(this.uiElements, this.commandProcessor, this.logger);
        this.metricsPanel = new SystemMetricsPanel(this.uiElements.get('metricsPanel'));
        this.activityLogPanel = new ActivityLogPanel(this.uiElements.get('tracePanel'));
        this.lmActivityIndicator = new LMActivityIndicator(this.uiElements.get('graphContainer'));

        this.uiEventHandlers = new UIEventHandlers(
            this.uiElements,
            this.commandProcessor,
            this.demoManager,
            this.graphManager,
            this.webSocketManager,
            this.controlPanel
        );

        this.messageHandler = new MessageHandler(this.graphManager);
        this.logger.setUIElements(this.uiElements.getAll());
        this.initialize();
    }

    initialize() {
        this.graphManager.initialize();
        this.uiEventHandlers.setupEventListeners();
        this._setupWebSocketHandlers();

        document.addEventListener('senars:action', (e) => {
            const {type, payload, context} = e.detail;
            this.webSocketManager.sendMessage('activity.action', {type, payload, context, id: Date.now()});
            this.logger.addLogEntry(`Action dispatched: ${type}`, 'info', '⚡');
        });

        this.webSocketManager.connect();
        this.webSocketManager.subscribe('connection.status', (status) => {
            status === 'connected' && this.demoManager.initialize();
        });

        this.logger.addLogEntry('SeNARS UI2 - Ready', 'info', '🚀');
    }

    _setupWebSocketHandlers() {
        this.webSocketManager.subscribe('*', (message) => this._handleMessage(message));
        this.webSocketManager.subscribe('connection.status', (status) => this._updateStatus(status));

        const animationHandlers = {
            'reasoning:derivation': (msg) => {
                const nodeId = msg.payload?.nodeId ?? msg.payload?.conceptId;
                nodeId && this.graphManager.animateNode(nodeId, 'pulse');
            },
            'memory:focus:promote': (msg) => {
                const nodeId = msg.payload?.nodeId ?? msg.payload?.conceptId;
                nodeId && this.graphManager.animateGlow(nodeId, 1.0);
            },
            'memory:focus:demote': (msg) => {
                const nodeId = msg.payload?.nodeId ?? msg.payload?.conceptId;
                nodeId && this.graphManager.animateGlow(nodeId, 0.3);
            },
            'concept.created': (msg) => {
                const nodeId = msg.payload?.id;
                nodeId && setTimeout(() => this.graphManager.animateFadeIn(nodeId), 50);
            },
            'lm:prompt:start': () => this.lmActivityIndicator.show(),
            'lm:prompt:complete': () => this.lmActivityIndicator.hide(),
            'lm:error': (msg) => this.lmActivityIndicator.showError(msg.payload?.error ?? 'LM Error')
        };

        Object.entries(animationHandlers).forEach(([type, handler]) =>
            this.webSocketManager.subscribe(type, handler)
        );
    }

    _handleMessage(message) {
        if (!message) return;

        try {
            this._updateMessageCount();
            this._updateSystemState(message);

            if (this._handleSpecializedMessages(message)) return;

            const {content, type, icon} = this.messageHandler.processMessage(message);

            if (message.type === 'metrics.updated') {
                this.metricsPanel.update(message.payload);
                return;
            }

            if (message.type === 'metrics.anomaly') return;

            if (message.type === 'activity.new') {
                this.activityLogPanel.addActivity(message.payload);
            }

            this.logger.addLogEntry(content, type, icon);
            this.graphManager.updateFromMessage(message);
        } catch (error) {
            this.logger.log(`Error handling message of type ${message?.type ?? 'unknown'}: ${error.message}`, 'error', '❌');
            process?.env?.NODE_ENV !== 'production' && console.error('Full error details:', error, message);
        }
    }

    _handleSpecializedMessages(message) {
        const handlers = {
            'demoList': (p) => this.demoManager.handleDemoList(p),
            'demoStep': (p) => this.demoManager.handleDemoStep(p),
            'demoState': (p) => this.demoManager.handleDemoState(p),
            'demoMetrics': (p) => {
                p?.metrics?.cyclesCompleted !== undefined && this.controlPanel.updateCycleCount(p.metrics.cyclesCompleted);
                return true;
            },
            'agent/result': (p) => {
                this.logger.addLogEntry(
                    typeof p.result === 'string' ? p.result : JSON.stringify(p.result),
                    'info',
                    '🤖'
                );
            }
        };

        const handler = handlers[message.type];
        return handler ? handler(message.payload) || message.type === 'demoMetrics' : false;
    }

    _updateSystemState(message) {
        const cycleExtractors = {
            'nar.cycle.step': (p) => p?.cycle,
            'narInstance': (p) => p?.cycleCount
        };

        const extractor = cycleExtractors[message.type];
        const cycleValue = extractor?.(message.payload);
        cycleValue !== undefined && this.controlPanel.updateCycleCount(cycleValue);
    }

    _updateMessageCount() {
        const el = this.uiElements.get('messageCount');
        el && (el.textContent = (parseInt(el.textContent) || 0) + 1);
    }

    _handleNodeAction(action, data) {
        this.logger.log(`Graph Action: ${action} on ${data.term}`, 'info', '🖱️');
    }

    _updateStatus(status) {
        const {connectionStatus, statusIndicator} = this.uiElements.getAll();
        connectionStatus && (connectionStatus.textContent = capitalizeFirst(status));
        statusIndicator && (statusIndicator.className = `status-indicator status-${status}`);
    }
}


document.addEventListener('DOMContentLoaded', () => new SeNARSUI());