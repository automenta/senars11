import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { GoldenLayout } from 'golden-layout';
import { SeNARSUI } from './SeNARSUI.js';
import { LocalConnectionManager } from './connection/LocalConnectionManager.js';
import { ConnectionManager } from './connection/ConnectionManager.js';
import { UIConfig } from './config/UIConfig.js';
import { ExampleBrowser } from './components/ExampleBrowser.js';
import { DerivationTree } from './components/DerivationTree.js';
import { MemoryInspector } from './components/MemoryInspector.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { ConsolePanel } from './components/ConsolePanel.js';

console.log('--- browser-init.js loading ---');

cytoscape.use(fcose);
window.cytoscape = cytoscape;

// Hackerish Dashboard Layout
const LAYOUT_CONFIG = {
    settings: {
        hasHeaders: true,
        constrainDragToContainer: true,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: true,
        showMaximiseIcon: true,
        showCloseIcon: false
    },
    dimensions: {
        borderWidth: 2,
        minItemHeight: 10,
        minItemWidth: 10,
        headerHeight: 24,
        dragProxyWidth: 300,
        dragProxyHeight: 200
    },
    root: {
        type: 'row',
        content: [{
            type: 'component',
            componentName: 'graphComponent',
            title: 'KNOWLEDGE GRAPH',
            width: 60,
            componentState: { label: 'Graph' }
        }, {
            type: 'stack',
            width: 40,
            content: [
                {
                    type: 'component',
                    componentName: 'consoleComponent',
                    title: 'CONSOLE',
                    isClosable: false
                },
                {
                    type: 'component',
                    componentName: 'derivationComponent',
                    title: 'DERIVATION TREE'
                },
                {
                    type: 'component',
                    componentName: 'memoryComponent',
                    title: 'MEMORY INSPECTOR'
                },
                {
                    type: 'component',
                    componentName: 'metricsComponent',
                    title: 'METRICS'
                },
                {
                    type: 'component',
                    componentName: 'examplesComponent',
                    title: 'EXAMPLES'
                },
                {
                    type: 'component',
                    componentName: 'settingsComponent',
                    title: 'SETTINGS'
                }
            ]
        }]
    }
};

function createGraphComponent(app, container) {
    const el = document.createElement('div');
    el.id = UIConfig.ELEMENT_IDS.graphContainer;
    el.className = 'cytoscape-container';
    // Use CSS vars
    Object.assign(el.style, { width: '100%', height: '100%', background: 'var(--bg-dark)' });

    const controls = document.createElement('div');
    controls.className = 'graph-overlay-controls';

    controls.innerHTML = `
        <button id="${UIConfig.ELEMENT_IDS.btnZoomIn}" title="Zoom In">➕</button>
        <button id="${UIConfig.ELEMENT_IDS.btnZoomOut}" title="Zoom Out">➖</button>
        <button id="${UIConfig.ELEMENT_IDS.btnFit}" title="Fit to Screen">⬜</button>
        <button id="${UIConfig.ELEMENT_IDS.refreshGraph}" title="Refresh Graph">🔄</button>
        <div style="height:1px; background:var(--border-color); margin:2px 0;"></div>
        <button id="btn-layout-fcose" title="Force Directed" style="font-size:10px">F</button>
        <button id="btn-layout-grid" title="Grid Layout" style="font-size:10px">G</button>
        <button id="btn-layout-circle" title="Circle Layout" style="font-size:10px">C</button>
    `;

    container.element.append(el, controls);

    // Register basic graph controls
    const ids = ['btnZoomIn', 'btnZoomOut', 'btnFit', 'refreshGraph'];
    app.uiElements.register('graphContainer', el);
    ids.forEach(id => {
        const btn = controls.querySelector(`#${UIConfig.ELEMENT_IDS[id]}`);
        if(btn) app.uiElements.register(id, btn);
    });
}

function createMetricsComponent(app, container) {
    const el = document.createElement('div');
    el.className = 'panel-container';

    el.innerHTML = `
        <div class="status-bar" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
            <div class="status-item" style="margin-bottom: 5px;">
                <div class="status-indicator status-disconnected" id="${UIConfig.ELEMENT_IDS.statusIndicator}" style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px;"></div>
                <span id="${UIConfig.ELEMENT_IDS.connectionStatus}" style="font-size:11px; color:var(--text-muted);">OFFLINE</span>
            </div>
            <div class="status-item">
                 <span class="cycle-badge" id="${UIConfig.ELEMENT_IDS.cycleCount}" style="color:var(--accent-primary); font-family:var(--font-mono);">Cycle: 0</span>
                 <span class="divider" style="color:var(--border-color); margin:0 5px;">|</span>
                 <span id="${UIConfig.ELEMENT_IDS.messageCount}" style="color:var(--text-main);">0</span> msgs
            </div>
        </div>
        <div id="${UIConfig.ELEMENT_IDS.metricsPanel}" class="metrics-container"></div>
    `;

    container.element.appendChild(el);

    const ids = ['metricsPanel', 'connectionStatus', 'statusIndicator', 'cycleCount', 'messageCount'];
    ids.forEach(id => app.uiElements.register(id, el.querySelector(`#${UIConfig.ELEMENT_IDS[id]}`)));
}

async function start() {
    const layout = new GoldenLayout(document.getElementById('layout-root'));
    const connection = new ConnectionManager(new LocalConnectionManager());
    const app = new SeNARSUI(connection);

    // Register Core Components
    layout.registerComponentFactoryFunction('graphComponent', (c) => createGraphComponent(app, c));
    layout.registerComponentFactoryFunction('metricsComponent', (c) => createMetricsComponent(app, c));

    // Consolidated Console
    layout.registerComponentFactoryFunction('consoleComponent', (container) => {
        const el = document.createElement('div');
        el.className = 'panel-container';
        container.element.appendChild(el);
        const comp = new ConsolePanel(el);
        comp.initialize(app);
    });

    // Register New / Auxiliary Components
    layout.registerComponentFactoryFunction('derivationComponent', (container) => {
        const el = document.createElement('div');
        el.className = 'panel-container';
        container.element.appendChild(el);
        const comp = new DerivationTree(el);
        comp.initialize();
        app.registerComponent('derivationTree', comp);
    });

    layout.registerComponentFactoryFunction('memoryComponent', (container) => {
        const el = document.createElement('div');
        el.className = 'panel-container';
        container.element.appendChild(el);
        const comp = new MemoryInspector(el);
        comp.initialize();
        app.registerComponent('memoryInspector', comp);
    });

    layout.registerComponentFactoryFunction('settingsComponent', (container) => {
        const el = document.createElement('div');
        el.className = 'panel-container';
        container.element.appendChild(el);
        const comp = new SettingsPanel(el);
        comp.initialize();
    });

    layout.registerComponentFactoryFunction('examplesComponent', (container) => {
        const el = document.createElement('div');
        const containerId = 'example-browser-container-gl';
        el.id = containerId;
        el.className = 'example-browser-container panel-container';
        el.style.padding = '10px';
        container.element.appendChild(el);

        new ExampleBrowser(containerId, {
            onSelect: (node) => {
                 if (node.type === 'file') {
                    app.demoManager.runStaticDemo({
                        id: node.id,
                        name: node.name,
                        path: node.path
                    });
                }
            }
        }).initialize();
    });

    layout.loadLayout(LAYOUT_CONFIG);

    setTimeout(() => {
        app.initialize();
        app._updateStatus('connected');
        console.log('SeNARS Offline IDE Started (Redesigned)');
    }, 100);

    window.addEventListener('resize', () => layout.updateRootSize());
}

window.addEventListener('DOMContentLoaded', start);
