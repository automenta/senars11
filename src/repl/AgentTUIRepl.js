import {BaseTUIRepl} from './BaseTUIRepl.js';
import {TaskEditorComponent} from './components/TaskEditorComponent.js';
import {LogViewerComponent} from './components/LogViewerComponent.js';
import {StatusBarComponent} from './components/StatusBarComponent.js';
import {TaskInputComponent} from './components/TaskInputComponent.js';
import {AgentStatusComponent} from './components/AgentStatusComponent.js';
import {ReasoningTraceComponent} from './components/ReasoningTraceComponent.js';
import {MetricsDashboardComponent} from './components/MetricsDashboardComponent.js';
import {ViewManager} from '../repl/ViewManager.js';
import blessed from 'blessed';
import WebSocket from 'ws';

/**
 * Agent TUI REPL with enhanced observability and agent-specific components
 * Implements the features described in PLAN.agent.md
 */
export class AgentTUIRepl extends BaseTUIRepl {
    constructor(config = {}) {
        config.title = config.title || 'SeNARS Agent REPL 🧠';
        super(config);
    }

    // Override component setup methods for agent-specific layout
    _setupComponents() {
        // Status bar as before
        this.components.statusBar = new StatusBarComponent({
            elementConfig: {
                bottom: '0',
                left: '0',
                width: '100%',
                height: '1',
                border: {type: 'line'},
                style: {fg: 'white', bg: 'blue', border: {fg: 'yellow'}},
                content: ''
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        // Agent Status Panel (left side, top)
        this.components.agentStatus = new AgentStatusComponent({
            elementConfig: {
                top: '0',
                left: '0',
                width: '30%',
                height: '30%',
                border: {type: 'line'},
                style: {fg: 'white', bg: 'black', border: {fg: 'magenta'}},
                content: '🤖 Agent Status'
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        // Task Editor (left side, middle)
        this.components.taskEditor = new TaskEditorComponent({
            elementConfig: {
                top: '30%',
                left: '0',
                width: '30%',
                height: '40%',
                border: {type: 'line'},
                style: {
                    fg: 'white',
                    bg: 'black',
                    border: {fg: 'green'},
                    selected: {fg: 'black', bg: 'lightgreen'}
                },
                selectedFg: 'black',
                selectedBg: 'lightgreen',
                selectedBold: true,
                items: [],
                interactive: true,
                scrollable: true,
                mouse: true,
                keys: true,
                vi: true
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        // Metrics Dashboard (left side, bottom)
        this.components.metricsDashboard = new MetricsDashboardComponent({
            elementConfig: {
                top: '70%',
                left: '0',
                width: '30%',
                height: '29%',
                border: {type: 'line'},
                style: {fg: 'white', bg: 'black', border: {fg: 'blue'}}
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        // Reasoning Trace (right side, top)
        this.components.reasoningTrace = new ReasoningTraceComponent({
            elementConfig: {
                top: '0',
                left: '30%',
                width: '70%',
                height: '50%',
                border: {type: 'line'},
                style: {fg: 'white', bg: 'black', border: {fg: 'cyan'}},
                scrollable: true,
                alwaysScroll: true,
                mouse: true,
                keys: true,
                vi: true
            },
            parent: this.screen,
            eventEmitter: this,
            maxBufferSize: 200
        });

        // Log Viewer (right side, bottom)
        this.components.logViewer = new LogViewerComponent({
            elementConfig: {
                top: '50%',
                left: '30%',
                width: '70%',
                height: '49%',
                border: {type: 'line'},
                style: {fg: 'white', bg: 'black', border: {fg: 'cyan'}},
                scrollable: true,
                alwaysScroll: true,
                mouse: true,
                keys: true,
                vi: true
            },
            parent: this.screen,
            eventEmitter: this,
            maxScrollback: 1000
        });

        // Initialize all components
        Object.values(this.components).forEach(component => component.init());

        // Create and initialize task input component
        this.components.taskInput = new TaskInputComponent({
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine,
            onSubmit: (inputText) => {
                if (inputText?.trim()) {
                    const newTask = {
                        id: Date.now().toString(),
                        content: inputText.trim(),
                        priority: 0.5, // Default priority
                        timestamp: Date.now(),
                        processed: false,
                        pending: true
                    };

                    this.components.taskEditor.addTask(newTask);
                    this.engine.processInput(inputText.trim()).catch(error => {
                        this.components.logViewer.addError(`❌ Error processing task: ${error.message}`);
                    });
                }
            }
        });

        this.components.taskInput.init();

        // Add taskInput to screen so ViewManager can manage its positioning
        if (this.screen && this.components.taskInput.getElement()) {
            this.screen.append(this.components.taskInput.getElement());
        }
    }

    // Enhanced View management methods
    _setupViewManager() {
        this.viewManager = new ViewManager({
            screen: this.screen,
            eventEmitter: this,
            components: this.components
        });

        this.viewManager.addViewShortcuts(this.screen);
        
        // Default to agent view
        this.viewManager.switchView('agent-dashboard');
    }

    _setupAgentDashboardView() {
        // This view is already set up in _setupAgentComponents
        Object.values(this.components).forEach(component => {
            if (component.getElement && this.screen) {
                this.screen.append(component.getElement());
            }
        });
        this.screen.render();
    }

    // Enhanced event handling methods
    _setupEventListeners() {
        // Call parent method to get base event handlers
        super._setupEventListeners();

        // Agent-specific event handlers
        this.engine.on('agent.action', (data) => {
            this.components.logViewer.addInfo(`🤖 Agent Action: ${data.action}`);
            this.components.reasoningTrace.addTraceEntry('AGENT', data.action, 'executed', data.details || '');
        });

        this.engine.on('agent.decision', (data) => {
            this.components.logViewer.addInfo(`🧠 Agent Decision: ${data.decision}`);
            this.components.reasoningTrace.addTraceEntry('AGENT', data.decision, 'executed', data.reasoning || '');
        });

        this.engine.on('hybrid.reasoning', (data) => {
            this.components.logViewer.addInfo(`🔗 Hybrid Reasoning: ${data.description}`);
            this.components.reasoningTrace.addTraceEntry('HYBRID', data.description, 'executed', data.result || '');
        });
    }
    
    _getExtendedRemoteMessageHandlers() {
        // Return additional message handlers for agent-specific remote messages
        const baseHandlers = typeof super._getExtendedRemoteMessageHandlers === 'function' 
            ? super._getExtendedRemoteMessageHandlers() 
            : {};
        return {
            ...baseHandlers,
            'agent.action': (payload) => this.components.logViewer.addInfo(`🌐 Remote agent action: ${payload?.action || 'Unknown'}`),
            'agent.decision': (payload) => this.components.logViewer.addInfo(`🌐 Remote agent decision: ${payload?.decision || 'Unknown'}`)
        };
    }

    // Override the remote event listeners to include agent events
    _getExtendedRemoteEvents() {
        // Call parent method to get base events and add agent-specific ones
        const baseEvents = typeof super._getExtendedRemoteEvents === 'function' 
            ? super._getExtendedRemoteEvents() 
            : {};
        return {
            ...baseEvents,
            'agent.action': 'agent.action',  // Agent-specific events
            'agent.decision': 'agent.decision'
        };
    }
    
    _getRemoteSource() {
        return 'agent-tui-client';
    }

    // Enhanced key binding and startup methods
    _setupGlobalKeyBindings() {
        // Call parent method to maintain base functionality
        super._setupGlobalKeyBindings();

        // Add agent-specific key bindings
        const agentKeyBindings = {
            'C-e': () => {
                // Toggle reasoning trace view
                if (this.components.reasoningTrace?.getElement) {
                    this.components.reasoningTrace.getElement().toggle();
                    this.screen.render();
                    this.components.logViewer.addInfo('🔍 Toggled reasoning trace visibility');
                }
            }
        };

        Object.entries(agentKeyBindings).forEach(([key, handler]) => {
            this.screen.key([key], handler);
        });
    }

    async start() {
        const welcomeMessages = [
            '🤖 Welcome to SeNARS Agent REPL! 🚀',
            'Hybrid Intelligence Lab - Where NAL meets Language Models',
            'Use Ctrl+1/2/3 to switch views, Ctrl+H for menu, Ctrl+C to exit.',
            'Try: "agent create myagent", "goal achieve <something>", "think about <topic>"'
        ];

        welcomeMessages.forEach((msg, index) => {
            if (index === 0) {
                this.components.logViewer.addInfo(msg);
            } else {
                setTimeout(() => {
                    this.components.logViewer.addInfo(msg);
                }, index * 500); // Stagger the welcome messages
            }
        });
        
        if (this.remoteConfig.enabled) {
            this.components.logViewer.addInfo(`🌐 Remote console: ${this.remoteConfig.wsUrl} (Ctrl+U to toggle)`);
        }

        await this.engine.initialize();
        this.screen.render();

        // Add a slight delay to ensure all components are properly sized
        setTimeout(() => {
            this.components.taskInput?.focus?.();
        }, 200);
    }

    _cleanup() {
        // Call parent cleanup method
        super._cleanup();
        
        // Clean up agent-specific resources
        if (this.components.metricsDashboard?.destroy) {
            this.components.metricsDashboard.destroy();
        }
    }
}