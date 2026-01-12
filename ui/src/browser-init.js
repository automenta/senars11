import { GoldenLayout } from 'golden-layout';
import { SeNARSUI } from './SeNARSUI.js';
import { LocalConnectionManager } from './connection/LocalConnectionManager.js';
import { ConnectionManager } from './connection/ConnectionManager.js';

// Setup Layout Configuration
const config = {
    root: {
        type: 'row',
        content: [{
            title: 'Graph Visualization',
            type: 'component',
            componentType: 'graphComponent',
            width: 60
        }, {
            type: 'column',
            content: [{
                title: 'Activity Log',
                type: 'component',
                componentType: 'logComponent',
                height: 40
            }, {
                title: 'REPL / Control',
                type: 'component',
                componentType: 'replComponent',
                height: 30
            }, {
                title: 'System Metrics',
                type: 'component',
                componentType: 'metricsComponent',
                height: 30
            }]
        }]
    }
};

async function init() {
    console.log('Initializing SeNARS Offline IDE...');

    // 1. Initialize Layout
    const layoutRoot = document.getElementById('layout-root');
    const layout = new GoldenLayout(layoutRoot);

    // 2. Initialize SeNARS with Local Connection
    const connection = new ConnectionManager(new LocalConnectionManager());
    const app = new SeNARSUI(connection); // Calls connect() internally

    // 3. Register Layout Components
    layout.registerComponentFactoryFunction('graphComponent', (container, state) => {
        const el = document.createElement('div');
        el.className = 'component-container senars-panel';
        el.id = 'graphContainer'; // ID expected by GraphManager
        container.element.appendChild(el);

        // Pass this element to UI Elements registry?
        // SeNARSUI expects elements to be present or registered.
        // We might need to manually register these elements into UIElements
        app.uiElements.register('graphContainer', el);
    });

    layout.registerComponentFactoryFunction('logComponent', (container, state) => {
        const el = document.createElement('div');
        el.className = 'component-container senars-panel';
        el.id = 'tracePanel'; // ID expected by ActivityLogPanel
        container.element.appendChild(el);
        app.uiElements.register('tracePanel', el);
    });

    layout.registerComponentFactoryFunction('replComponent', (container, state) => {
        const el = document.createElement('div');
        el.className = 'component-container senars-panel';

        // Create Repl Structure
        el.innerHTML = `
            <div id="controlPanel">
                 <div id="cycleCount">Cycles: 0</div>
            </div>
            <div id="replContainer">
                <div id="replOutput"></div>
                <input type="text" id="replInput" placeholder="Enter Narsese or MeTTa..." />
            </div>
        `;
        container.element.appendChild(el);

        app.uiElements.register('controlPanel', el.querySelector('#controlPanel'));
        app.uiElements.register('cycleCount', el.querySelector('#cycleCount'));
        app.uiElements.register('replOutput', el.querySelector('#replOutput'));
        app.uiElements.register('replInput', el.querySelector('#replInput'));
    });

    layout.registerComponentFactoryFunction('metricsComponent', (container, state) => {
        const el = document.createElement('div');
        el.className = 'component-container senars-panel';
        el.id = 'metricsPanel';
        container.element.appendChild(el);

        // Create Metrics Structure
        el.innerHTML = `
            <div class="metric"><span>Concepts:</span> <span id="metric-concepts">0</span></div>
            <div class="metric"><span>Att. Focus:</span> <span id="metric-focus">0</span></div>
            <div id="connectionStatus">Disconnected</div>
            <div id="statusIndicator"></div>
        `;

        app.uiElements.register('metricsPanel', el);
        app.uiElements.register('metricConcepts', el.querySelector('#metric-concepts'));
        app.uiElements.register('metricFocus', el.querySelector('#metric-focus'));
        app.uiElements.register('connectionStatus', el.querySelector('#connectionStatus'));
        app.uiElements.register('statusIndicator', el.querySelector('#statusIndicator'));
    });

    // 4. Load Layout
    layout.loadLayout(config);

    // 5. Start SeNARS (after layout is ready and elements are registered)
    // SeNARSUI constructor called initialize() which called connect().
    // But update: UIElements might be missing if we called constructor first.
    // We should probably delay initialization until layout is ready.
    // Or we rely on component creation callbacks to populate UIElements.

    // Note: SeNARSUI constructor creates managers that look for elements immediately?
    // Let's check SeNARSUI again.
    // this.uiElements = new UIElements(); is sync.
    // Managers are created. GraphManager(this.uiElements.getAll()...)

    // If UIElements relies on `document.getElementById` by default, it will fail if elements aren't in DOM.
    // UIElements likely grabs elements from DOM.

    // FIX: Refactor init flow.
    // We need to wait for GoldenLayout to create elements BEFORE we pass them to SeNARSUI
}

// Improved Init Flow for GoldenLayout Integration
async function start() {
    const layoutRoot = document.getElementById('layout-root');
    const layout = new GoldenLayout(layoutRoot);

    // Create connection manager first
    const connection = new ConnectionManager(new LocalConnectionManager());

    // Create SeNARSUI instance but delay initialization
    const app = new SeNARSUI(connection);

    // Pre-register components so they exist when we load layout
    layout.registerComponentFactoryFunction('graphComponent', (container) => {
        const el = document.createElement('div');
        el.id = 'graphContainer';
        el.style.width = '100%'; el.style.height = '100%';
        container.element.appendChild(el);

        // Register the element with the UI elements registry
        app.uiElements.register('graphContainer', el);
    });

    layout.registerComponentFactoryFunction('logComponent', (container) => {
        const el = document.createElement('div');
        el.id = 'tracePanel';
        container.element.appendChild(el);

        // Register the element with the UI elements registry
        app.uiElements.register('tracePanel', el);
    });

    layout.registerComponentFactoryFunction('replComponent', (container) => {
        const el = document.createElement('div');
        el.innerHTML = `
            <div class="control-bar" id="controlPanel">
                 <div id="cycleCount">0</div>
                 <div id="messageCount">0</div>
            </div>
            <div id="replOutput" style="height: calc(100% - 60px); overflow-y: auto;"></div>
            <input type="text" id="replInput" style="width: 100%;" />
          `;
        container.element.appendChild(el);

        // Register the elements with the UI elements registry
        app.uiElements.register('controlPanel', el.querySelector('#controlPanel'));
        app.uiElements.register('cycleCount', el.querySelector('#cycleCount'));
        app.uiElements.register('messageCount', el.querySelector('#messageCount'));
        app.uiElements.register('replOutput', el.querySelector('#replOutput'));
        app.uiElements.register('replInput', el.querySelector('#replInput'));
    });

    layout.registerComponentFactoryFunction('metricsComponent', (container) => {
        const el = document.createElement('div');
        el.innerHTML = `
            <div class="metric"><span>Concepts:</span> <span id="metric-concepts">0</span></div>
            <div class="metric"><span>Att. Focus:</span> <span id="metric-focus">0</span></div>
            <div id="connectionStatus">Disconnected</div>
            <div id="statusIndicator"></div>
          `;
        container.element.appendChild(el);

        // Register the elements with the UI elements registry
        app.uiElements.register('metricsPanel', el);
        app.uiElements.register('metricConcepts', el.querySelector('#metric-concepts'));
        app.uiElements.register('metricFocus', el.querySelector('#metric-focus'));
        app.uiElements.register('connectionStatus', el.querySelector('#connectionStatus'));
        app.uiElements.register('statusIndicator', el.querySelector('#statusIndicator'));
    });

    // Load the layout
    layout.loadLayout(config);

    // Now that elements are registered, initialize the app
    // We need to wait a tick to ensure the DOM elements are actually created
    setTimeout(() => {
        app.initialize();
        console.log('SeNARS Started');
    }, 0);

    // Resize listener
    window.addEventListener('resize', () => {
        layout.updateRootSize();
    });
}

// Start on load
window.addEventListener('DOMContentLoaded', start);
