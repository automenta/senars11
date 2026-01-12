import { GoldenLayout } from 'golden-layout';
import { SeNARSUI } from './SeNARSUI.js';
import { LocalConnectionManager } from './connection/LocalConnectionManager.js';
import { ConnectionManager } from './connection/ConnectionManager.js';

// Setup Layout Configuration
const LAYOUT_CONFIG = {
    root: {
        type: 'row',
        content: [{
            title: 'Graph Visualization', type: 'component', componentType: 'graphComponent', width: 60
        }, {
            type: 'column',
            content: [{
                title: 'Activity Log', type: 'component', componentType: 'logComponent', height: 40
            }, {
                title: 'REPL / Control', type: 'component', componentType: 'replComponent', height: 30
            }, {
                title: 'System Metrics', type: 'component', componentType: 'metricsComponent', height: 30
            }]
        }]
    }
};

async function start() {
    const layout = new GoldenLayout(document.getElementById('layout-root'));
    const connection = new ConnectionManager(new LocalConnectionManager());
    const app = new SeNARSUI(connection);

    layout.registerComponentFactoryFunction('graphComponent', (container) => {
        const el = document.createElement('div');
        el.id = 'graphContainer';
        Object.assign(el.style, { width: '100%', height: '100%' });
        container.element.appendChild(el);
        app.uiElements.register('graphContainer', el);
    });

    layout.registerComponentFactoryFunction('logComponent', (container) => {
        const el = document.createElement('div');
        el.id = 'tracePanel';
        container.element.appendChild(el);
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
            <input type="text" id="replInput" style="width: 100%;" />`;
        container.element.appendChild(el);

        ['controlPanel', 'cycleCount', 'messageCount', 'replOutput', 'replInput'].forEach(id =>
            app.uiElements.register(id, el.querySelector(`#${id}`))
        );
    });

    layout.registerComponentFactoryFunction('metricsComponent', (container) => {
        const el = document.createElement('div');
        el.innerHTML = `
            <div class="metric"><span>Concepts:</span> <span id="metric-concepts">0</span></div>
            <div class="metric"><span>Att. Focus:</span> <span id="metric-focus">0</span></div>
            <div id="connectionStatus">Disconnected</div>
            <div id="statusIndicator"></div>`;
        container.element.appendChild(el);

        ['metricsPanel', 'metric-concepts', 'metric-focus', 'connectionStatus', 'statusIndicator'].forEach(id => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('metric', 'metric'); // quick hack to match original keys if needed, or just map manually
            app.uiElements.register(id.replace('metric-', 'metric').replace('Panel', 'Panel'), el.querySelector(`#${id}`) || el);
        });

        // Manual mapping for consistency with previous specific keys
        app.uiElements.register('metricsPanel', el);
        app.uiElements.register('metricConcepts', el.querySelector('#metric-concepts'));
        app.uiElements.register('metricFocus', el.querySelector('#metric-focus'));
        app.uiElements.register('connectionStatus', el.querySelector('#connectionStatus'));
        app.uiElements.register('statusIndicator', el.querySelector('#statusIndicator'));
    });

    layout.loadLayout(LAYOUT_CONFIG);

    setTimeout(() => {
        app.initialize();
        console.log('SeNARS Started');
    }, 0);

    window.addEventListener('resize', () => layout.updateRootSize());
}

window.addEventListener('DOMContentLoaded', start);
