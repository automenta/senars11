import { WebSocketManager } from '../connection/WebSocketManager.js';
import { DemoClient } from './DemoClient.js';
import { Sidebar } from '../components/Sidebar.js';
import { Console } from '../components/Console.js';
import { ConfigPanel } from '../components/ConfigPanel.js';
import { DemoControls } from '../components/DemoControls.js';
import { GraphPanel } from '../components/GraphPanel.js';

export class DemoRunnerApp {
    constructor() {
        this.wsManager = new WebSocketManager();
        this.client = new DemoClient(this.wsManager);

        this.sidebar = new Sidebar('sidebar');
        this.console = new Console('console-container', 'command-input');
        this.configPanel = new ConfigPanel('config-overlay');
        this.graphPanel = new GraphPanel('graph-container');
        this.controls = new DemoControls();
        this.controls.setClient(this.client);

        this.currentDemoId = null;
        this.connectionStatus = document.getElementById('connection-status');

        // Sidebar State
        this.rightSidebar = document.getElementById('right-sidebar');
        this.sourceView = document.getElementById('source-view');
        this.graphView = document.getElementById('graph-view');
        this.metricsView = document.getElementById('metrics-view');
        this.sidebarTitle = document.getElementById('right-sidebar-title');
    }

    initialize() {
        this.setupWebSocket();
        this._setupSidebarControls();

        const btnConfig = document.getElementById('btn-config');
        if (btnConfig) btnConfig.addEventListener('click', () => this.configPanel.show());

        const btnSend = document.getElementById('send-button'); // Only if this exists?
        // Actually console component handles input via 'command-input' ID.
        // But if there is a separate send button, we should hook it up.
        // demo.html doesn't have a send button, just input. Wait, main UI has it.
        // demo.html has <input ...> inside .input-wrapper.

        // Setup console input handler
        this.console.onInput((input) => {
             // Send as Narsese input
             this.wsManager.sendMessage('narseseInput', { text: input });
        });

        this.sidebar.onSelect((demoId, demo) => {
            const title = document.getElementById('demo-title');
            const desc = document.getElementById('demo-description');
            if (title) title.textContent = demo.name;
            if (desc) desc.textContent = demo.description;
            this.runDemo(demoId);
        });

        // Connect
        this.wsManager.connect();

        // Init graph
        this.graphPanel.initialize();
    }

    _setupSidebarControls() {
        const btnToggleSource = document.getElementById('btn-toggle-source');
        const btnToggleGraph = document.getElementById('btn-toggle-graph');
        const btnToggleMetrics = document.getElementById('btn-toggle-metrics');
        const btnCloseRightSidebar = document.getElementById('btn-close-right-sidebar');

        if (btnToggleSource) {
            btnToggleSource.addEventListener('click', () => this._openRightSidebar('source'));
        }

        if (btnToggleGraph) {
            btnToggleGraph.addEventListener('click', () => this._openRightSidebar('graph'));
        }

        if (btnToggleMetrics) {
            btnToggleMetrics.addEventListener('click', () => this._openRightSidebar('metrics'));
        }

        if (btnCloseRightSidebar) {
            btnCloseRightSidebar.addEventListener('click', () => this._closeRightSidebar());
        }
    }

    _openRightSidebar(view) {
        if (!this.rightSidebar) return;

        this.rightSidebar.classList.remove('hidden');

        // Enable/Disable graph updates
        if (this.graphPanel && this.graphPanel.graphManager) {
            this.graphPanel.graphManager.setUpdatesEnabled(view === 'graph');
        }

        if (view === 'source') {
            this.sourceView.classList.remove('hidden');
            this.graphView.classList.add('hidden');
            if (this.metricsView) this.metricsView.classList.add('hidden');
            if (this.sidebarTitle) this.sidebarTitle.textContent = 'Source Code';
        } else if (view === 'graph') {
            this.sourceView.classList.add('hidden');
            this.graphView.classList.remove('hidden');
            if (this.metricsView) this.metricsView.classList.add('hidden');
            if (this.sidebarTitle) this.sidebarTitle.textContent = 'Graph View';

            // Resize graph
            setTimeout(() => {
                if (this.graphPanel.graphManager && this.graphPanel.graphManager.cy) {
                    this.graphPanel.graphManager.cy.resize();
                    this.graphPanel.graphManager.cy.fit();
                }
            }, 100);
        } else if (view === 'metrics') {
            this.sourceView.classList.add('hidden');
            this.graphView.classList.add('hidden');
            if (this.metricsView) this.metricsView.classList.remove('hidden');
            if (this.sidebarTitle) this.sidebarTitle.textContent = 'Demo Metrics';
        }
    }

    _closeRightSidebar() {
        if (this.rightSidebar) {
            this.rightSidebar.classList.add('hidden');

            // Disable graph updates when sidebar is closed
            if (this.graphPanel && this.graphPanel.graphManager) {
                this.graphPanel.graphManager.setUpdatesEnabled(false);
            }
        }
    }

    setupWebSocket() {
        this.wsManager.subscribe('connection.status', (status) => {
            if (this.connectionStatus) {
                this.connectionStatus.textContent = status;
                this.connectionStatus.className = `status-badge status-${status}`;
            }
            if (status === 'connected') {
                this.client.listDemos();
            }
        });

        this.wsManager.subscribe('demoList', (message) => {
            const demos = message.payload;
            this.sidebar.setDemos(demos);

            const urlParams = new URLSearchParams(window.location.search);
            const demoId = urlParams.get('demo');
            if (demoId && !this.currentDemoId) {
                this.runDemo(demoId);
            }
        });

        this.wsManager.subscribe('demoStep', (message) => {
            const payload = message.payload;
            this.console.log(`[Step ${payload.step}] ${payload.description}`, 'info');
            if (payload.data && payload.data.input) {
                this.console.log(`> ${payload.data.input}`, 'input');
            }
        });

        this.wsManager.subscribe('demoState', (message) => {
            const payload = message.payload;
            this.controls.updateState(payload.state);

            if (payload.state === 'running') {
                 this.console.log('--- Demo Started ---', 'success');
            } else if (payload.state === 'completed') {
                 this.console.log('--- Demo Completed ---', 'success');
            } else if (payload.state === 'error') {
                 this.console.log(`Error: ${payload.error}`, 'error');
            } else if (payload.state === 'paused') {
                 this.console.log('--- Demo Paused ---', 'warning');
            } else if (payload.state === 'stopped') {
                 this.console.log('--- Demo Stopped ---', 'warning');
            }
        });

        // General output handler
        this.wsManager.subscribe('*', (msg) => {
             // Handle demoMetrics specifically
             if (msg.type === 'demoMetrics') {
                 this._updateMetrics(msg.payload);
                 // Also update status bar cycle count if available
                 if (msg.payload?.metrics?.cyclesCompleted !== undefined) {
                      // There's no global cycle count UI element in demo.html currently, but we can verify or add one.
                      // Looking at demo.html, there isn't a dedicated cycle counter in the header,
                      // but main UI has one.
                      // For now, we will leave it as is, or consider adding it.
                 }
                 return;
             }

             this.graphPanel.update(msg);

             // Use MessageHandler logic via Console if possible, or manual here.
             // For now, keeping manual but improving handling.

             if (msg.type === 'narsese.output') {
                 this.console.log(msg.payload, 'reasoning');
             } else if (msg.type === 'reasoning.derivation' || msg.type === 'reasoning.step') {
                 this.console.log(msg.payload || 'Processing...', 'reasoning');
             } else if (msg.type === 'task.added' || msg.type.includes('task')) {
                 this.console.log(msg.payload || 'Task processed', 'task');
             } else if (msg.type.includes('question') || msg.type.includes('answer')) {
                 this.console.log(msg.payload || 'Question processed', 'question');
             } else if (msg.type.includes('concept')) {
                 this.console.log(msg.payload || 'Concept processed', 'concept');
             }
        });

        this.wsManager.subscribe('demoSource', (message) => {
             if (message.payload.demoId === this.currentDemoId) {
                 const editor = document.getElementById('source-editor');
                 if (editor) editor.value = message.payload.source;
             }
        });
    }

    _updateMetrics(payload) {
        const content = document.getElementById('metrics-content');
        if (content) {
            content.textContent = JSON.stringify(payload, null, 2);
        }
    }

    runDemo(demoId) {
        if (this.currentDemoId && this.currentDemoId !== demoId) {
            this.console.log(`Stopping previous demo: ${this.currentDemoId}`, 'info');
            this.client.stopDemo(this.currentDemoId);
        }

        this.graphPanel.reset();
        this.currentDemoId = demoId;
        this.controls.setDemoId(demoId);

        const config = this.configPanel.getConfig();

        this.console.clear();
        this.console.log(`Starting demo: ${demoId}...`, 'info');

        this.client.startDemo(demoId, config);
        this.client.getDemoSource(demoId);

        const url = new URL(window.location);
        url.searchParams.set('demo', demoId);
        window.history.pushState({}, '', url);
    }
}
