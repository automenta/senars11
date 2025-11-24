import { WebSocketManager } from '../connection/WebSocketManager.js';
import { DemoClient } from './DemoClient.js';
import { Sidebar } from '../components/Sidebar.js';
import { Console } from '../components/Console.js';
import { ConfigPanel } from '../components/ConfigPanel.js';

export class DemoRunnerApp {
    constructor() {
        this.wsManager = new WebSocketManager();
        this.client = new DemoClient(this.wsManager);

        this.sidebar = new Sidebar('sidebar');
        this.console = new Console('console-container', 'command-input');
        this.configPanel = new ConfigPanel('config-overlay');

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
            if (payload.state === 'running') {
                 this.console.log('--- Demo Started ---', 'success');
            } else if (payload.state === 'completed') {
                 this.console.log('--- Demo Completed ---', 'success');
            } else if (payload.state === 'error') {
                 this.console.log(`Error: ${payload.error}`, 'error');
            }
        });

        // General output handler
        this.wsManager.subscribe('*', (msg) => {
             if (msg.type === 'narsese.output') {
                 this.console.log(msg.payload, 'reasoning');
             }
        });
    }

    runDemo(demoId) {
        if (this.currentDemoId) {
            this.client.stopDemo(this.currentDemoId);
        }
        this.currentDemoId = demoId;
        const config = this.configPanel.getConfig();

        this.console.clear();
        this.console.log(`Starting demo: ${demoId}...`, 'info');

        this.client.startDemo(demoId, config);

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('demo', demoId);
        window.history.pushState({}, '', url);
    }
}
