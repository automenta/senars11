import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { GoldenLayout } from 'golden-layout';
import { SeNARSUI } from './SeNARSUI.js';
import { WebSocketManager } from './connection/WebSocketManager.js';
import { ConnectionManager } from './connection/ConnectionManager.js';
import { LayoutFactory } from './ui/LayoutFactory.js';

console.log('--- main-online.js loading ---');

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

async function start() {
    const layout = new GoldenLayout(document.getElementById('layout-root'));
    const connection = new ConnectionManager(new WebSocketManager());
    const app = new SeNARSUI(connection);

    // Use Factory to register all components
    LayoutFactory.registerComponents(app, layout);

    layout.loadLayout(LAYOUT_CONFIG);

    setTimeout(() => {
        app.initialize();
        console.log('SeNARS UI 2.0 (Online) Started');
    }, 100);

    window.addEventListener('resize', () => layout.updateRootSize());
}

window.addEventListener('DOMContentLoaded', start);
