import { ReplEngine } from './ReplEngine.js';
import { EventEmitter } from 'events';
import { TaskEditorComponent } from './components/TaskEditorComponent.js';
import { LogViewerComponent } from './components/LogViewerComponent.js';
import { StatusBarComponent } from './components/StatusBarComponent.js';
import { ViewManager } from '../repl/ViewManager.js';
import blessed from 'blessed';

/**
 * New TUI REPL with component-based architecture
 * Implements the full observability and control of system state through editing the active set of Input Tasks
 */
export class TUIRepl extends EventEmitter {
    constructor(config = {}) {
        super();

        this.engine = new ReplEngine(config);
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SeNARS Reasoning Engine 🚀',
            dockBorders: true,
            fullUnicode: true // Enable Unicode characters like emojis
        });

        this.components = {};
        this.viewManager = null;

        this._setupComponents();
        this._setupEventListeners();
        this._setupViewManager();
        this._setupGlobalKeyBindings();
    }

    _setupComponents() {
        this.components.statusBar = new StatusBarComponent({
            elementConfig: {
                bottom: '0',
                left: '0',
                width: '100%',
                height: '1',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'blue', border: { fg: 'yellow' } },
                content: ''
            },
            parent: this.screen,
            eventEmitter: this,
            engine: this.engine
        });

        this.components.taskEditor = new TaskEditorComponent({
            elementConfig: {
                top: '0',
                left: '0',
                width: '40%',
                height: '100%-1',
                border: { type: 'line' },
                style: {
                    fg: 'white',
                    bg: 'black',
                    border: { fg: 'green' },
                    selected: { fg: 'black', bg: 'lightgreen' }
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

        this.components.logViewer = new LogViewerComponent({
            elementConfig: {
                top: '0',
                left: '40%',
                width: '60%',
                height: '100%-1',
                border: { type: 'line' },
                style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } },
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

        this.components.taskInput = this.components.taskEditor.addNewTaskInput(this.screen);
    }

    _setupViewManager() {
        this.viewManager = new ViewManager({
            screen: this.screen,
            eventEmitter: this,
            components: this.components
        });

        this.viewManager.addViewShortcuts(this.screen);
        this.viewManager.switchView('vertical-split');
    }

    _setupEventListeners() {
        // Engine event handlers
        const engineHandlers = {
            'engine.ready': (data) => {
                this.components.logViewer.addInfo(data.message);
                this.components.statusBar.updateContent();
            },
            'narsese.processed': (data) => {
                this.components.logViewer.addInfo(data.result);
                this._displayLatestBeliefs(data.beliefs);
                this._updateTaskStatus(data.taskId, {
                    processed: true, pending: false, success: true, completionTime: Date.now()
                });
            },
            'narsese.error': (data) => {
                this.components.logViewer.addError(`❌ Error: ${data.error}`);
                this._updateTaskStatus(data.taskId, {
                    processed: true, pending: false, error: true, errorTime: Date.now(), error: data.error
                });
            },
            'command.error': (data) => this.components.logViewer.addError(`❌ Error executing command: ${data.error}`),
            'engine.quit': () => { this.screen.destroy(); process.exit(0); },
            'nar.cycle.step': (data) => this.components.logViewer.addInfo(`⏭️  Single cycle executed. Cycle: ${data.cycle}`),
            'nar.cycle.running': () => this.components.logViewer.addInfo('🏃 Running continuously...'),
            'nar.cycle.stop': () => this.components.logViewer.addInfo('🛑 Run stopped by user.'),
            'engine.reset': () => this.components.logViewer.addInfo('🔄 NAR system reset successfully.'),
            'engine.save': (data) => this.components.logViewer.addInfo(`💾 NAR state saved successfully to ${data.filePath}`),
            'engine.load': (data) => this.components.logViewer.addInfo(`💾 NAR state loaded successfully from ${data.filePath}`)
        };

        // Register command-specific handlers
        ['help', 'status', 'memory', 'trace', 'reset', 'save', 'load', 'demo'].forEach(cmd => {
            engineHandlers[`command.${cmd}`] = (data) => this.components.logViewer.addInfo(data.result);
        });

        // Register all event handlers
        Object.entries(engineHandlers).forEach(([event, handler]) => this.engine.on(event, handler));

        // Component-specific events
        this._setupComponentEventHandlers();
    }

    _displayLatestBeliefs(beliefs) {
        if (beliefs?.length > 0) {
            this.components.logViewer.addInfo('🎯 Latest beliefs:');
            beliefs.slice(-3).forEach(task => {
                const truthStr = task.truth?.toString() ?? '';
                this.components.logViewer.addInfo(`  ${task.term?.name ?? 'Unknown'} ${truthStr} [P: ${task.priority?.toFixed(3) ?? 'N/A'}]`);
            });
        }
    }

    _updateTaskStatus(taskId, updates) {
        if (taskId) {
            this.components.taskEditor.updateTaskStatus(taskId, updates);
        }
    }

    _setupComponentEventHandlers() {
        this.components.taskEditor.on('new-task', (data) => {
            this.engine.processInput(data.task.content).catch(error => {
                this.components.logViewer.addError(`❌ Error processing task: ${error.message}`);
            });
        });

        const taskActions = {
            'task-deleted': (data) => this.components.logViewer.addInfo(`🗑️ Task deleted: ${data.task.content}`),
            'task-edited': (data) => this.components.logViewer.addInfo(`✏️ Task edited: ${data.newTask.content}`),
            'priority-adjusted': (data) => {
                if (data.task.id) {
                    this.engine.inputManager.updatePriorityById(data.task.id, data.newPriority, data.mode);
                }
                this.components.logViewer.addInfo(`⚖️ Priority adjusted for task: ${data.newPriority} (mode: ${data.mode})`);
            }
        };

        Object.entries(taskActions).forEach(([event, handler]) => {
            this.components.taskEditor.on(event, handler);
        });

        this.components.logViewer.on('log-added', (data) => {
            if (data.level === 'error') {
                this.components.statusBar.addAlert();
            }
        });

        this.components.statusBar.on('pulldown-menu-toggle', (data) => {
            if (data.isOpen) {
                this.components.logViewer.addInfo('📁 Menu opened: Use shortcuts for options');
            }
        });

        this.components.statusBar.on('menu-exit', () => {
            this.engine.shutdown();
            this.screen.destroy();
            process.exit(0);
        });

        this.components.statusBar.on('connection-state-changed', (data) => {
            this.components.logViewer.addInfo(`🌐 Connection state changed to: ${data.state}`);
        });
    }

    _setupGlobalKeyBindings() {
        // Exit on Ctrl+C
        this.screen.key(['C-c'], () => {
            this.engine.shutdown();
            this.screen.destroy();
            process.exit(0);
        });

        const keyBindings = {
            'C-l': () => this.viewManager.switchView('log-only'),
            'C-t': () => this.viewManager.switchView('vertical-split'),
            'C-g': () => this.viewManager.switchView('dynamic-grouping'),
            'C-k': () => {
                this.components.logViewer.clearLogs();
                this.components.logViewer.addInfo('🗑️ Logs cleared');
            }
        };

        Object.entries(keyBindings).forEach(([key, handler]) => {
            this.screen.key([key], handler);
        });
    }

    async start() {
        this.components.logViewer.addInfo('Welcome to SeNARS! 🚀');
        this.components.logViewer.addInfo('Type commands or enter Narsese statements.');
        this.components.logViewer.addInfo('Use Ctrl+L/T/G to switch views, F1 for menu, Ctrl+C to exit.');

        if (this.components.taskInput) {
            this.components.taskInput.focus();
        }

        await this.engine.initialize();
        this.screen.render();
    }
}