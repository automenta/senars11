import { GoldenLayout } from 'golden-layout';
import { GraphPanel } from '../components/GraphPanel.js';
import { MemoryInspector } from '../components/MemoryInspector.js';
import { DerivationTree } from '../components/DerivationTree.js';
import { SystemMetricsPanel } from '../components/SystemMetricsPanel.js';
import { NotebookPanel } from '../components/NotebookPanel.js';
import { ExampleBrowser } from '../components/ExampleBrowser.js';
import { LMActivityIndicator } from '../components/LMActivityIndicator.js';
import { LayoutPresets } from '../config/LayoutPresets.js';

export class LayoutManager {
    constructor(app, containerId) {
        this.app = app;
        this.containerId = containerId;
        this.layout = null;
    }

    initialize(presetName) {
        const layoutRoot = document.getElementById(this.containerId);
        if (!layoutRoot) {
            console.error('Layout root not found');
            return;
        }

        this.layout = new GoldenLayout(layoutRoot);
        this._registerComponents();
        this._loadLayout(presetName);
        this._setupStateSaving(presetName);

        window.addEventListener('resize', () => this.layout.updateRootSize());
    }

    _registerComponents() {
        const factories = {
            notebookComponent: (c) => this._createNotebookComponent(c),
            replComponent: (c) => this._createNotebookComponent(c), // Legacy alias
            graphComponent: (c) => this._createGraphComponent(c),
            memoryComponent: (c) => this._createMemoryComponent(c),
            derivationComponent: (c) => this._createDerivationComponent(c),
            metricsComponent: (c) => this._createMetricsComponent(c),
            settingsComponent: (c) => this._createSettingsComponent(c),
            examplesComponent: (c) => this._createExamplesComponent(c)
        };

        Object.entries(factories).forEach(([name, factory]) => {
            this.layout.registerComponentFactoryFunction(name, factory);
        });
    }

    _loadLayout(presetName) {
        let config = LayoutPresets[presetName] || LayoutPresets.ide;
        // Attempt to load user saved state if matches current preset could go here
        this.layout.loadLayout(config);
    }

    _setupStateSaving(presetName) {
        this.layout.on('stateChanged', () => {
            if (this.layout.isInitialised) {
                localStorage.setItem(`senars-layout-${presetName}`, JSON.stringify(this.layout.toConfig()));
            }
        });
    }

    _createNotebookComponent(container) {
        const panel = new NotebookPanel(container.element);
        panel.initialize(this.app);
        this.app.registerComponent('notebook', panel);
        this.app.updateStats();
    }

    _createGraphComponent(container) {
        const panel = new GraphPanel(container.element);
        panel.initialize();
        this.app.registerComponent('graph', panel);

        // Pass graphManager back to app if needed, or app accesses it via component
        if (this.app.commandProcessor) {
             this.app.commandProcessor.graphManager = panel.graphManager;
             panel.graphManager.setCommandProcessor(this.app.commandProcessor);
        }

        if (panel.container) {
            this.app.lmActivityIndicator = new LMActivityIndicator(panel.container);
        }

        container.on('resize', () => panel.resize());
    }

    _createMemoryComponent(container) {
        const panel = new MemoryInspector(container.element);
        panel.initialize();
        this.app.registerComponent('memory', panel);
    }

    _createDerivationComponent(container) {
        const panel = new DerivationTree(container.element);
        panel.initialize();
        this.app.registerComponent('derivation', panel);
        container.on('resize', () => panel.resize?.());
    }

    _createMetricsComponent(container) {
        const panel = new SystemMetricsPanel(container.element);
        panel.render();
        this.app.registerComponent('metrics', panel);
    }

    _createSettingsComponent(container) {
        import('../components/SettingsPanel.js').then(({ SettingsPanel }) => {
            const panel = new SettingsPanel(container.element);
            panel.app = this.app;
            panel.initialize();
            this.app.registerComponent('settings', panel);
        });
    }

    _createExamplesComponent(container) {
        const panel = new ExampleBrowser(container.element, {
            onSelect: (node) => {
                if (node.type === 'file') {
                    this.app.getNotebook()?.loadDemoFile(node.path, { autoRun: true, clearFirst: true });
                }
            }
        });
        panel.initialize();
        this.app.registerComponent('examples', panel);
    }
}
