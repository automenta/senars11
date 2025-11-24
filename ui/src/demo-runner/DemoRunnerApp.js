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
    }

    initialize() {
        this.setupWebSocket();

        const btnConfig = document.getElementById('btn-config');
        if (btnConfig) btnConfig.addEventListener('click', () => this.configPanel.show());

        const btnSend = document.getElementById('send-button');
        if (btnSend) {
            btnSend.addEventListener('click', () => {
                 const input = document.getElementById('command-input');
                 if (input && input.value.trim()) {
                     this.console.handleInput(input.value.trim());
                     input.value = '';
                 }
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const target = btn.dataset.target;
                const el = document.getElementById(target);
                if (el) el.classList.add('active');

                if (target === 'graph-view') {
                    setTimeout(() => {
                        if (this.graphPanel.graphManager && this.graphPanel.graphManager.cy) {
                            this.graphPanel.graphManager.cy.resize();
                            this.graphPanel.graphManager.cy.fit();
                        }
                    }, 100);
                }
            });
        });

        this.sidebar.onSelect((demoId, demo) => {
            const title = document.getElementById('demo-title');
            const desc = document.getElementById('demo-description');
            if (title) title.textContent = demo.name;
            if (desc) desc.textContent = demo.description;
            this.runDemo(demoId);
        });

        this.console.onInput((input) => {
             // Send as Narsese input
             this.wsManager.sendMessage('narseseInput', { text: input });
        });

        // Connect
        this.wsManager.connect();

        // Init graph
        this.graphPanel.initialize();
    }

    setupWebSocket() {
        this.wsManager.subscribe('connection.status', (status) => {
            if (this.connectionStatus) {
                this.connectionStatus.textContent = status;
                // Simple class mapping
                this.connectionStatus.className = `status-badge status-${status}`;
            }
            if (status === 'connected') {
                this.client.listDemos();
            }
        });

        this.wsManager.subscribe('demoList', (message) => {
            const demos = message.payload;
            this.sidebar.setDemos(demos);

            // If we have a demo selected in query param, run it
            const urlParams = new URLSearchParams(window.location.search);
            const demoId = urlParams.get('demo');
            if (demoId && !this.currentDemoId) {
                const demo = demos.find(d => d.id === demoId);
                if (demo) {
                     this.sidebar.renderList(demos); // Ensure rendered
                     // Manually trigger selection or just run
                     const demoItem = this.sidebar.listContainer.querySelector(`.demo-item`);
                     // Better: verify demo exists and call runDemo
                     this.runDemo(demoId);
                }
            }
        });

        this.wsManager.subscribe('demoStep', (message) => {
            // {demoId, step, description, data}
            const payload = message.payload;
            this.console.log(`[Step ${payload.step}] ${payload.description}`, 'info');
            if (payload.data && payload.data.input) {
                this.console.log(`> ${payload.data.input}`, 'input');
            }
        });

        this.wsManager.subscribe('demoState', (message) => {
            // {demoId, state, ...}
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
             this.graphPanel.update(msg);

             // Handle different reasoning-related message types
             if (msg.type === 'narsese.output') {
                 this.console.log(msg.payload, 'reasoning');
             } else if (msg.type === 'reasoning.derivation' || msg.type === 'reasoning.step') {
                 this.console.log(`[Reasoning] ${msg.payload ? JSON.stringify(msg.payload) : 'Processing...'}`, 'reasoning');
             } else if (msg.type === 'task.added' || msg.type.includes('task')) {
                 this.console.log(`[Task] ${msg.payload ? JSON.stringify(msg.payload) : 'Task processed'}`, 'task');
             } else if (msg.type.includes('question') || msg.type.includes('answer')) {
                 this.console.log(`[Question] ${msg.payload ? JSON.stringify(msg.payload) : 'Question processed'}`, 'question');
             } else if (msg.type.includes('concept')) {
                 this.console.log(`[Concept] ${msg.payload ? JSON.stringify(msg.payload) : 'Concept processed'}`, 'concept');
             }
        });

        this.wsManager.subscribe('demoSource', (message) => {
             if (message.payload.demoId === this.currentDemoId) {
                 const editor = document.getElementById('source-editor');
                 if (editor) editor.value = message.payload.source;
             }
        });
    }

    runDemo(demoId) {
        // Stop current demo if one is running
        if (this.currentDemoId && this.currentDemoId !== demoId) {
            this.console.log(`Stopping previous demo: ${this.currentDemoId}`, 'info');
            this.client.stopDemo(this.currentDemoId);
        }

        this.graphPanel.reset();
        this.currentDemoId = demoId;
        this.controls.setDemoId(demoId);

        const config = this.configPanel.getConfig();

        // Clear console and provide clear feedback about demo transition
        this.console.clear();
        this.console.log(`Starting demo: ${demoId}...`, 'info');

        this.client.startDemo(demoId, config);
        this.client.getDemoSource(demoId);

        // Update URL to reflect current demo
        const url = new URL(window.location);
        url.searchParams.set('demo', demoId);
        window.history.pushState({}, '', url);
    }
}
