import { SeNARSUI } from './SeNARSUI.js';
import { LocalConnectionManager } from './connection/LocalConnectionManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Golden Layout
    const config = {
        content: [{
            type: 'row',
            content: [{
                type: 'column',
                width: 20,
                content: [{
                    type: 'component',
                    componentName: 'control',
                    title: 'Controls'
                }, {
                    type: 'component',
                    componentName: 'repl',
                    title: 'REPL / Log'
                }]
            }, {
                type: 'component',
                componentName: 'graph',
                title: 'Concept Graph',
                width: 80
            }]
        }]
    };

    const myLayout = new GoldenLayout(config);

    // Register Components
    myLayout.registerComponent('graph', function (container, state) {
        const template = document.getElementById('graph-template');
        container.getElement().append(template.innerHTML);
    });

    myLayout.registerComponent('repl', function (container, state) {
        const template = document.getElementById('repl-template');
        container.getElement().append(template.innerHTML);
    });

    myLayout.registerComponent('control', function (container, state) {
        const template = document.getElementById('control-template');
        container.getElement().append(template.innerHTML);
    });

    myLayout.init();

    // 2. Wait for layout initialization then start UI
    // We strictly need elements to be in DOM for UI to attach
    await new Promise(r => setTimeout(r, 500));

    // 3. Initialize SeNARS UI with Local Connection
    const localConnection = new LocalConnectionManager();
    const ui = new SeNARSUI(localConnection);

    // Connect to "Local Server"
    await localConnection.connect();

    console.log('Browser IDE Initialized');
});
