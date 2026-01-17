import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { GoldenLayout } from 'golden-layout';
import { LocalConnectionManager } from './connection/LocalConnectionManager.js';
import { WebSocketManager } from './connection/WebSocketManager.js';
import { ConnectionManager } from './connection/ConnectionManager.js';
import { GraphPanel } from './components/GraphPanel.js';
import { MemoryInspector } from './components/MemoryInspector.js';
import { DerivationTree } from './components/DerivationTree.js';
import { MessageFilter, categorizeMessage } from './repl/MessageFilter.js';
import { NotebookManager } from './repl/NotebookManager.js';
import { FilterToolbar } from './repl/FilterToolbar.js';
import { DemoLibrary } from './components/DemoLibrary.js';

console.log('--- SeNARS IDE loading ---');

cytoscape.use(fcose);
window.cytoscape = cytoscape;

class SeNARSIDE {
    constructor() {
        this.layout = null;
        this.connection = null;
        this.connectionMode = 'local';
        this.components = new Map();
        this.graphManager = null;
        this.messageFilter = new MessageFilter();
        this.notebook = null;
        this.filterToolbar = null;
        this.cycleCount = 0;
        this.messageCount = 0;
        this.isRunning = false;
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('senars-ide-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.connectionMode = settings.mode || 'local';
            this.serverUrl = settings.serverUrl || 'localhost:3000';
        }
    }

    saveSettings() {
        localStorage.setItem('senars-ide-settings', JSON.stringify({
            mode: this.connectionMode,
            serverUrl: this.serverUrl
        }));
    }

    async initialize() {
        console.log('Initializing SeNARS IDE...');
        this.setupLayout();
        await this.switchMode(this.connectionMode);
        this.setupKeyboardShortcuts();

        // Welcome cells
        if (this.notebook && this.notebook.cells.length === 0) {
            this.notebook.createMarkdownCell("# Welcome to SeNARS IDE v1.0\n\nDouble-click this cell to edit.\n- **Local Mode**: Runs entirely in browser\n- **Remote Mode**: Connects to backend\n- **Widgets**: Interactive tools");
        }

        console.log(`SeNARS IDE initialized in ${this.connectionMode} mode`);
    }

    setupLayout() {
        const layoutRoot = document.getElementById('layout-root');
        if (!layoutRoot) {
            console.error('Layout root not found');
            return;
        }

        this.layout = new GoldenLayout(layoutRoot);

        const factories = {
            'replComponent': (c) => this.createREPLComponent(c),
            'graphComponent': (c) => this.createGraphComponent(c),
            'memoryComponent': (c) => this.createMemoryComponent(c),
            'derivationComponent': (c) => this.createDerivationComponent(c)
        };

        Object.entries(factories).forEach(([k, v]) => this.layout.registerComponentFactoryFunction(k, v));

        this.layout.loadLayout({
            settings: { hasHeaders: true, constrainDragToContainer: true, reorderEnabled: true, selectionEnabled: false, showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: false },
            dimensions: { borderWidth: 2, minItemHeight: 100, minItemWidth: 200, headerHeight: 24 },
            root: {
                type: 'row',
                content: [
                    { type: 'component', componentName: 'replComponent', title: 'REPL', width: 80 },
                    {
                        type: 'stack', width: 20,
                        isClosable: true,
                        content: [
                            { type: 'component', componentName: 'graphComponent', title: 'KNOWLEDGE GRAPH', isClosable: true },
                            { type: 'component', componentName: 'memoryComponent', title: 'MEMORY INSPECTOR' },
                            { type: 'component', componentName: 'derivationComponent', title: 'DERIVATION TRACER' }
                        ]
                    }
                ]
            }
        });

        window.addEventListener('resize', () => this.layout.updateRootSize());
    }

    createREPLComponent(container) {
        const replContainer = container.element;
        Object.assign(replContainer.style, { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e', color: '#d4d4d4' });

        const statusBar = document.createElement('div');
        statusBar.className = 'connection-status-bar';
        statusBar.style.cssText = 'padding: 8px; background: #252526; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';

        const modeIndicator = document.createElement('div');
        modeIndicator.id = 'mode-indicator';
        modeIndicator.innerHTML = `<span style="cursor: pointer;" title="Click to switch mode">💻 Local Mode</span>`;
        modeIndicator.onclick = () => this.showConnectionModal();

        const stats = document.createElement('div');
        stats.id = 'connection-stats';
        stats.innerHTML = 'Cycles: <span id="cycle-count">0</span> | Messages: <span id="message-count">0</span>';
        Object.assign(stats.style, { fontSize: '0.9em', color: '#888' });

        statusBar.append(modeIndicator, stats);
        replContainer.appendChild(statusBar);

        this.filterToolbar = new FilterToolbar(this.messageFilter, { onFilterChange: () => this.filterMessages(), onExport: () => this.exportLogs() });
        replContainer.appendChild(this.filterToolbar.render());

        const notebookContainer = document.createElement('div');
        notebookContainer.id = 'repl-notebook';
        notebookContainer.style.cssText = 'flex: 1; overflow-y: auto; padding: 10px;';
        replContainer.appendChild(notebookContainer);

        this.notebook = new NotebookManager(notebookContainer);

        const inputArea = document.createElement('div');
        inputArea.style.cssText = 'padding: 10px; background: #252526; border-top: 1px solid #333;';

        const inputBox = document.createElement('textarea');
        inputBox.id = 'repl-input';
        inputBox.placeholder = 'Enter Narsese or MeTTa...';
        inputBox.rows = 3;
        inputBox.style.cssText = 'width: 100%; background: #1e1e1e; color: #d4d4d4; border: 1px solid #3c3c3c; padding: 8px; font-family: monospace; resize: vertical;';
        inputBox.addEventListener('keydown', (e) => (e.ctrlKey && e.key === 'Enter') && (e.preventDefault(), this.executeInput()));

        const buttonBar = document.createElement('div');
        buttonBar.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';

        const reasonerControls = document.createElement('div');
        reasonerControls.style.cssText = 'display: flex; gap: 4px; margin-right: 12px; padding-right: 12px; border-right: 1px solid #444;';

        const createControlBtn = (icon, title, action, bg = '#333', color = 'white') => {
            const btn = document.createElement('button');
            btn.innerHTML = icon;
            btn.title = title;
            btn.onclick = () => this.controlReasoner(action);
            btn.style.cssText = `padding: 6px 10px; background: ${bg}; color: ${color}; border: none; cursor: pointer; border-radius: 3px;`;
            return btn;
        };

        reasonerControls.append(
            createControlBtn('▶️', 'Start reasoner', 'start', '#0e639c'),
            createControlBtn('⏸️', 'Pause reasoner', 'pause'),
            createControlBtn('⏹️', 'Stop reasoner', 'stop', '#b30000'),
            createControlBtn('⏭️', 'Step reasoner', 'step'),
            createControlBtn('🔄', 'Reset reasoner', 'reset')
        );

        const runButton = document.createElement('button');
        runButton.textContent = '▶️ Run (Ctrl+Enter)';
        runButton.onclick = () => this.executeInput();
        runButton.style.cssText = 'padding: 6px 12px; background: #0e639c; color: white; border: none; cursor: pointer; border-radius: 3px;';

        const clearButton = document.createElement('button');
        clearButton.textContent = '🗑️ Clear';
        clearButton.onclick = () => this.clearREPL();
        clearButton.style.cssText = 'padding: 6px 12px; background: #333; color: white; border: none; cursor: pointer; border-radius: 3px;';

        const demoButton = document.createElement('button');
        demoButton.innerHTML = '📚 Load Demo';
        demoButton.title = 'Browse demo library (Ctrl+Shift+D)';
        demoButton.onclick = () => this.showDemoLibrary();
        demoButton.style.cssText = 'padding: 6px 12px; background: #5c2d91; color: white; border: none; cursor: pointer; border-radius: 3px;';

        // Extra Tools
        const extraTools = document.createElement('div');
        extraTools.style.cssText = 'display: flex; gap: 4px; border-left: 1px solid #444; padding-left: 12px; margin-left: 12px;';

        const addMdBtn = document.createElement('button');
        addMdBtn.innerHTML = '📝 Text';
        addMdBtn.title = 'Add Markdown Cell';
        addMdBtn.onclick = () => this.notebook.createMarkdownCell('Double-click to edit...');
        addMdBtn.style.cssText = 'padding: 6px 10px; background: #333; color: white; border: none; cursor: pointer; border-radius: 3px;';

        const addWidgetBtn = document.createElement('button');
        addWidgetBtn.innerHTML = '🧩 Graph';
        addWidgetBtn.title = 'Add Graph Widget';
        addWidgetBtn.onclick = () => this.notebook.createWidgetCell('GraphWidget', [
            { id: 'a', label: 'Concept A' },
            { id: 'b', label: 'Concept B' },
            { source: 'a', target: 'b', label: 'relates' }
        ]);
        addWidgetBtn.style.cssText = 'padding: 6px 10px; background: #333; color: white; border: none; cursor: pointer; border-radius: 3px;';

        const addSliderBtn = document.createElement('button');
        addSliderBtn.innerHTML = '🎚️ Slider';
        addSliderBtn.title = 'Add Truth Slider';
        addSliderBtn.onclick = () => this.notebook.createWidgetCell('TruthSlider', { frequency: 0.5, confidence: 0.9 });
        addSliderBtn.style.cssText = 'padding: 6px 10px; background: #333; color: white; border: none; cursor: pointer; border-radius: 3px;';

        const simBtn = document.createElement('button');
        simBtn.innerHTML = '⚡ Simulation';
        simBtn.title = 'Run Epic Simulation';
        simBtn.style.cssText = 'padding: 6px 10px; background: #00ff9d; color: #000; border: none; cursor: pointer; border-radius: 3px; font-weight: bold;';
        simBtn.onclick = () => this.runEpicSimulation();

        extraTools.append(addMdBtn, addWidgetBtn, addSliderBtn, simBtn);

        buttonBar.append(reasonerControls, runButton, clearButton, demoButton, extraTools);
        inputArea.append(inputBox, buttonBar);
        replContainer.appendChild(inputArea);

        this.components.set('repl', {
            container: replContainer,
            notebook: notebookContainer,
            input: inputBox,
            modeIndicator,
            cycleCount: document.getElementById('cycle-count'),
            messageCount: document.getElementById('message-count')
        });
    }

    createGraphComponent(container) {
        const graphContainer = container.element;
        graphContainer.style.backgroundColor = '#1e1e1e';
        graphContainer.innerHTML = '';

        const panel = new GraphPanel(graphContainer);
        panel.initialize();
        this.components.set('graph', { container: graphContainer, panel });

        container.on('resize', () => {
            panel.graphManager?.cy && (panel.graphManager.cy.resize(), panel.graphManager.cy.fit());
        });
    }

    createMemoryComponent(container) {
        const memoryContainer = container.element;
        memoryContainer.style.backgroundColor = '#1e1e1e';
        memoryContainer.innerHTML = '';
        const panel = new MemoryInspector(memoryContainer);
        panel.initialize();
        this.components.set('memory', { container: memoryContainer, panel });
    }

    createDerivationComponent(container) {
        const derivationContainer = container.element;
        derivationContainer.style.backgroundColor = '#1e1e1e';
        derivationContainer.innerHTML = '';
        const panel = new DerivationTree(derivationContainer);
        panel.initialize();
        this.components.set('derivation', { container: derivationContainer, panel });
        container.on('resize', () => panel.resize?.());
    }

    async switchMode(mode) {
        console.log(`Switching to ${mode} mode...`);
        this.connection?.disconnect();
        this.connectionMode = mode;

        const manager = mode === 'local' ? new LocalConnectionManager() : new WebSocketManager();
        this.connection = new ConnectionManager(manager);
        await this.connection.connect();

        this.connection.subscribe('*', (message) => this.handleMessage(message));
        this.updateModeIndicator();
        this.saveSettings();
        this.notebook?.createResultCell(`🚀 Connected in ${mode} mode`, 'system');
    }

    updateModeIndicator() {
        const repl = this.components.get('repl');
        if (!repl) return;
        const icon = this.connectionMode === 'local' ? '💻' : '🌐';
        const label = this.connectionMode === 'local' ? 'Local Mode' : 'Remote Mode';
        repl.modeIndicator.innerHTML = `<span style="cursor: pointer;" title="Click to switch mode">${icon} ${label}</span>`;
    }

    showConnectionModal() {
        const switchTo = this.connectionMode === 'local' ? 'remote' : 'local';
        confirm(`Switch to ${switchTo} mode?`) && this.switchMode(switchTo);
    }

    handleMessage(message) {
        console.log('Received message:', message);
        this.messageCount++;
        this.updateStats();

        if (this.notebook) {
            const category = categorizeMessage(message);
            const content = message.payload?.result || message.content || JSON.stringify(message.payload);
            const viewMode = this.messageFilter.getMessageViewMode(message);
            this.notebook.createResultCell(content, category, viewMode);
        }

        if (message.payload?.cycle) {
            this.cycleCount = message.payload.cycle;
            this.updateStats();
        }

        try {
            const graphComp = this.components.get('graph');
            graphComp?.panel?.update(message);

            const memComp = this.components.get('memory');
            if (memComp?.panel && message.type === 'memorySnapshot') memComp.panel.update(message.payload);

            const derComp = this.components.get('derivation');
            if (derComp?.panel && message.type === 'reasoning:derivation') derComp.panel.addDerivation(message.payload);
        } catch (e) {
            console.error('Error updating components:', e);
        }
    }

    filterMessages() {
        this.notebook?.applyFilter(this.messageFilter);
    }

    exportLogs() {
        if (!this.notebook) return;
        const data = this.notebook.exportNotebook();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `senars-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    executeInput() {
        const repl = this.components.get('repl');
        const input = repl?.input.value.trim();
        if (!input) return;

        this.notebook.createCodeCell(input, (content) => {
            this.connection?.isConnected() && this.connection.sendMessage('agent/input', { text: content });
        }).execute();

        repl.input.value = '';
    }

    clearREPL() {
        this.notebook?.clear();
    }

    controlReasoner(action) {
        console.log('Reasoner control:', action);
        if (!this.connection?.isConnected()) {
            this.notebook?.createResultCell('⚠️ Not connected', 'system');
            return;
        }

        this.connection.sendMessage(`control/${action}`, {});
        this.notebook?.createResultCell(`🎛️ Reasoner ${action}`, 'system');

        this.isRunning = action === 'start';
        if (action === 'stop' || action === 'pause') this.isRunning = false;
        if (action === 'reset') {
            this.cycleCount = 0;
            this.messageCount = 0;
            this.updateStats();
        }
    }

    updateStats() {
        const repl = this.components.get('repl');
        if (repl) {
            if (repl.cycleCount) repl.cycleCount.textContent = this.cycleCount;
            if (repl.messageCount) repl.messageCount.textContent = this.messageCount;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearREPL();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.showDemoLibrary();
            }
        });
    }

    runEpicSimulation() {
        this.notebook.clear();
        this.notebook.createMarkdownCell('# 🚀 System Simulation: Cognitive Load Test\n\nInitiating high-frequency inference simulation...');

        // 1. Add Chart Widget
        const chartCell = this.notebook.createWidgetCell('ChartWidget', {
            type: 'line',
            options: {
                plugins: { title: { display: true, text: 'Real-time Inference Metrics' } }
            }
        });

        // 2. Add Graph Widget
        const graphCell = this.notebook.createWidgetCell('GraphWidget', [
            { id: 'SELF', type: 'concept', val: 100, label: 'SELF' }
        ]);

        // 3. Simulate Activity
        let tick = 0;
        const interval = setInterval(() => {
            tick++;

            // Update Chart
            const val = Math.sin(tick * 0.1) * 20 + 50 + Math.random() * 10;
            const widget = chartCell.element.querySelector('canvas')?.__chartWidget; // Hack or need better way to get instance
            // Actually, we don't have reference to widget instance from cell easily.
            // Let's modify NotebookManager to return instance or allow access.
            // For now, let's look up by cell ID or assume the cell has a way.

            // Accessing the widget instance stored on the element (we need to update WidgetCell to store it)
            if (chartCell.widgetInstance) {
                chartCell.widgetInstance.updateData(new Date().toLocaleTimeString(), val);
            }

            // Update Graph
            if (tick % 5 === 0 && graphCell.widgetInstance) {
                const id = `NODE_${tick}`;
                const source = tick > 5 ? `NODE_${tick-5}` : 'SELF';
                graphCell.widgetInstance.updateData([
                    { group: 'nodes', data: { id, label: `Concept ${tick}`, val: Math.random() * 50 + 10 } },
                    { group: 'edges', data: { source, target: id, label: 'implies' } }
                ]);
            }

            // Log messages
            if (tick % 10 === 0) {
                 this.notebook.createResultCell(`[SIM] Cycle ${tick}: Inference completed with confidence ${(Math.random()).toFixed(2)}`, 'reasoning', 'compact');
            }

            if (tick > 100) clearInterval(interval);
        }, 200);
    }

    showDemoLibrary() {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 1000; display: flex;
            align-items: center; justify-content: center;
        `;

        const modalContainer = document.createElement('div');
        modalContainer.style.cssText = `
            width: 900px; max-width: 90vw; height: 80vh; background: #1e1e1e;
            border: 1px solid #3c3c3c; border-radius: 8px; overflow: hidden;
            display: flex; flex-direction: column;
        `;

        const demoLib = new DemoLibrary(modalContainer, async (path, options) => {
            // Close modal
            document.body.removeChild(backdrop);

            // Load demo
            try {
                await this.notebook.loadDemoFile(path, options);
            } catch (error) {
                this.notebook.createResultCell(
                    `❌ Error loading demo: ${error.message}`,
                    'system'
                );
            }
        });

        demoLib.initialize();

        backdrop.appendChild(modalContainer);
        document.body.appendChild(backdrop);

        // Click backdrop to close
        backdrop.onclick = (e) => {
            if (e.target === backdrop) document.body.removeChild(backdrop);
        };

        // ESC to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(backdrop);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
}

async function start() {
    const ide = new SeNARSIDE();
    await ide.initialize();
    window.SeNARSIDE = ide;
}

window.addEventListener('DOMContentLoaded', start);
